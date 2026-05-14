import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';

// Service-role: write to ten_card_archive + reset members.ten_card_* (a potentially
// shared parent row). Per the S344 rule, coach mutations on athlete-owned state
// bypass RLS server-side.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

type BookingSnapshot = {
  booking_id: string;
  date: string;
  time: string;
  status: 'confirmed' | 'no_show' | 'late_cancel';
  booker_name: string;
  is_self: boolean;
};

export async function POST(request: NextRequest) {
  try {
    const coach = await requireCoach(request);
    if (isAuthError(coach)) return coach;

    const {
      memberId,
      newPurchaseDate,
      newExpiryDate,
      newTotal,
      newSessionsUsed,
      newNotes,
    } = (await request.json()) as {
      memberId?: string;
      newPurchaseDate?: string;  // YYYY-MM-DD; defaults to today
      newExpiryDate?: string;    // YYYY-MM-DD; defaults to newPurchaseDate + 12 months
      newTotal?: number;         // defaults to current card's total
      newSessionsUsed?: number;  // defaults to 0
      newNotes?: string;         // notes to set on the NEW active card (old notes are archived)
    };
    if (!memberId) {
      return NextResponse.json({ error: 'memberId is required' }, { status: 400 });
    }

    // Load current card state on this member (the holder).
    const { data: member, error: memberError } = await supabaseAdmin
      .from('members')
      .select('id, name, display_name, ten_card_total, ten_card_sessions_used, ten_card_purchase_date, ten_card_notes')
      .eq('id', memberId)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (member.ten_card_purchase_date == null) {
      return NextResponse.json(
        { error: 'Member has no active 10-card to close' },
        { status: 400 }
      );
    }

    const purchaseDate: string = member.ten_card_purchase_date.includes('T')
      ? member.ten_card_purchase_date.split('T')[0]
      : member.ten_card_purchase_date;
    const total: number = member.ten_card_total ?? 10;
    const sessionsUsed: number = member.ten_card_sessions_used ?? 0;

    // Build the debiting-members set: holder herself (only if her effective method is
    // ten_card — Miriam has WP + ten_card and her own bookings shouldn't burn the kids'
    // card) plus any sharer pointing here.
    const { data: candidates } = await supabaseAdmin
      .from('members')
      .select('id, primary_payment_method, membership_types, ten_card_holder_id')
      .or(`id.eq.${memberId},ten_card_holder_id.eq.${memberId}`);

    const debitMemberIds = (candidates || [])
      .filter(c => {
        const effective =
          c.primary_payment_method ||
          (c.membership_types as string[] | null)?.[0] ||
          null;
        return effective === 'ten_card';
      })
      .map(c => c.id);

    // Snapshot the bookings list at close-time. Frozen audit trail — won't change
    // if bookings get cancelled or rescheduled later.
    let bookingsSnapshot: BookingSnapshot[] = [];
    if (debitMemberIds.length > 0) {
      const { data: bookings } = await supabaseAdmin
        .from('bookings')
        .select(
          'id, status, member_id, weekly_sessions!inner(date, time), members!inner(id, name, display_name)'
        )
        .in('member_id', debitMemberIds)
        .in('status', ['confirmed', 'no_show', 'late_cancel'])
        .gte('weekly_sessions.date', purchaseDate);

      type RawRow = {
        id: string;
        status: 'confirmed' | 'no_show' | 'late_cancel';
        member_id: string;
        weekly_sessions:
          | { date: string; time: string }
          | { date: string; time: string }[];
        members:
          | { id: string; name: string; display_name: string | null }
          | { id: string; name: string; display_name: string | null }[];
      };
      bookingsSnapshot = ((bookings as RawRow[]) || [])
        .map(r => {
          const ws = Array.isArray(r.weekly_sessions) ? r.weekly_sessions[0] : r.weekly_sessions;
          const mb = Array.isArray(r.members) ? r.members[0] : r.members;
          return {
            booking_id: r.id,
            date: ws?.date || '',
            time: ws?.time || '',
            status: r.status,
            booker_name: mb?.display_name || mb?.name || '—',
            is_self: r.member_id === memberId,
          };
        })
        .sort((a, b) =>
          `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)
        );
    }

    // Insert the archive row. Old card's notes carry over so the audit trail
    // captures how the athlete paid for the now-closed card.
    const { error: archiveError } = await supabaseAdmin.from('ten_card_archive').insert({
      member_id: memberId,
      total,
      sessions_used: sessionsUsed,
      purchase_date: purchaseDate,
      bookings_snapshot: bookingsSnapshot,
      notes: member.ten_card_notes ?? null,
    });

    if (archiveError) {
      console.error('Failed to insert archive row:', archiveError);
      return NextResponse.json({ error: 'Failed to archive card' }, { status: 500 });
    }

    // Reset the active card on the member row. Coach can override start date via
    // newPurchaseDate (e.g. set to tomorrow when today's session was the last on
    // the old card and the new card shouldn't pick it up). Defaults to today.
    const todayDate = new Date();
    const today = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
    const purchase = newPurchaseDate || today;

    // Default expiry = purchase date + 12 months. Coach can override.
    const [py, pm, pd] = purchase.split('-').map(Number);
    const expiryBase = new Date(py, pm - 1, pd);
    expiryBase.setFullYear(expiryBase.getFullYear() + 1);
    const expiryDefault = `${expiryBase.getFullYear()}-${String(expiryBase.getMonth() + 1).padStart(2, '0')}-${String(expiryBase.getDate()).padStart(2, '0')}`;
    const expiry = newExpiryDate || expiryDefault;

    const finalTotal = typeof newTotal === 'number' ? newTotal : total;
    const finalSessionsUsed = typeof newSessionsUsed === 'number' ? newSessionsUsed : 0;

    const { error: resetError } = await supabaseAdmin
      .from('members')
      .update({
        ten_card_purchase_date: purchase,
        ten_card_expiry_date: expiry,
        ten_card_sessions_used: finalSessionsUsed,
        ten_card_total: finalTotal,
        ten_card_notes: newNotes ?? null,
      })
      .eq('id', memberId);

    if (resetError) {
      console.error('Failed to reset member card:', resetError);
      return NextResponse.json(
        { error: 'Card archived but member reset failed — contact support' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      newCard: {
        purchase_date: purchase,
        expiry_date: expiry,
        sessions_used: finalSessionsUsed,
        total: finalTotal,
      },
    });
  } catch (error) {
    console.error('close-ten-card error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
