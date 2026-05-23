import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';

// Service-role: backfill ten_card_consumed on athlete-owned bookings (RLS hides
// cross-user bookings from a coach session). Per the S344 rule, coach mutations
// on athlete-owned state run server-side with service-role.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const coach = await requireCoach(request);
    if (isAuthError(coach)) return coach;

    const { memberId } = (await request.json()) as { memberId?: string };
    if (!memberId) {
      return NextResponse.json({ error: 'memberId is required' }, { status: 400 });
    }

    // Load holder's card window.
    const { data: holder, error: holderError } = await supabaseAdmin
      .from('members')
      .select('id, ten_card_purchase_date')
      .eq('id', memberId)
      .single();

    if (holderError || !holder) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (!holder.ten_card_purchase_date) {
      return NextResponse.json({ count: 0, updated: 0 });
    }

    const purchaseDate: string = holder.ten_card_purchase_date.includes('T')
      ? holder.ten_card_purchase_date.split('T')[0]
      : holder.ten_card_purchase_date;

    // Same debit-members logic as close-ten-card: holder herself (only if effective
    // method = ten_card) plus any sharers pointing at this card.
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

    if (debitMemberIds.length === 0) {
      return NextResponse.json({ count: 0, updated: 0 });
    }

    // Fetch in-window bookings that count toward this card (confirmed / no_show /
    // late_cancel — all three consume per the existing UX). Cancelled bookings are
    // refunded by the cancel endpoint and stay consumed=false.
    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select('id, ten_card_consumed, weekly_sessions!inner(date)')
      .in('member_id', debitMemberIds)
      .in('status', ['confirmed', 'no_show', 'late_cancel'])
      .gte('weekly_sessions.date', purchaseDate);

    if (bookingsError) {
      console.error('recalc-ten-card fetch error:', bookingsError);
      return NextResponse.json({ error: 'Failed to load bookings' }, { status: 500 });
    }

    const idsToFlag = (bookings ?? [])
      .filter(b => b.ten_card_consumed !== true)
      .map(b => b.id);

    if (idsToFlag.length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('bookings')
        .update({ ten_card_consumed: true })
        .in('id', idsToFlag);

      if (updateError) {
        console.error('recalc-ten-card update error:', updateError);
        return NextResponse.json({ error: 'Failed to backfill flags' }, { status: 500 });
      }
    }

    // Recalc means "trust bookings, drop the manual override." The S362 trigger
    // formula is `ten_card_sessions_used = offset + COUNT(consumed bookings)` — if
    // offset stays non-zero, the recomputed counter is bookings_count + offset,
    // which contradicts the user's intent on clicking Recalc.
    const { error: offsetResetError } = await supabaseAdmin
      .from('members')
      .update({ ten_card_sessions_used_offset: 0 })
      .eq('id', memberId);

    if (offsetResetError) {
      console.error('recalc-ten-card offset reset error:', offsetResetError);
      return NextResponse.json({ error: 'Failed to reset manual override' }, { status: 500 });
    }

    const count = bookings?.length || 0;

    return NextResponse.json({ count, updated: idsToFlag.length });
  } catch (error) {
    console.error('recalc-ten-card error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
