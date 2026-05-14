import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';

// Service-role: write to subscription_archive + reset members subscription fields.
// Per S344 rule, coach mutations on athlete-owned state bypass RLS server-side.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const coach = await requireCoach(request);
    if (isAuthError(coach)) return coach;

    const {
      memberId,
      newStatus,
      newStartDate,
      newEndDate,
      newTier,
      newNotes,
    } = (await request.json()) as {
      memberId?: string;
      newStatus?: 'trial' | 'active' | 'past_due' | 'expired';
      newStartDate?: string;  // YYYY-MM-DD; defaults to today
      newEndDate?: string | null;  // YYYY-MM-DD or null (unlimited)
      newTier?: 'member' | 'wellpass' | null;
      newNotes?: string;
    };

    if (!memberId) {
      return NextResponse.json({ error: 'memberId is required' }, { status: 400 });
    }

    // Snapshot current subscription state.
    const { data: member, error: memberError } = await supabaseAdmin
      .from('members')
      .select('id, athlete_subscription_status, athlete_subscription_start, athlete_subscription_end, subscription_tier, subscription_notes')
      .eq('id', memberId)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Normalize possibly-ISO timestamps back to YYYY-MM-DD for DATE columns.
    const normalizeDate = (v: string | null): string | null => {
      if (!v) return null;
      return v.includes('T') ? v.split('T')[0] : v;
    };

    const { error: archiveError } = await supabaseAdmin.from('subscription_archive').insert({
      member_id: memberId,
      status: member.athlete_subscription_status ?? null,
      tier: member.subscription_tier ?? null,
      start_date: normalizeDate(member.athlete_subscription_start as string | null),
      end_date: normalizeDate(member.athlete_subscription_end as string | null),
      notes: member.subscription_notes ?? null,
    });

    if (archiveError) {
      console.error('Failed to insert subscription archive:', archiveError);
      return NextResponse.json({ error: 'Failed to archive subscription' }, { status: 500 });
    }

    // Compute new defaults: status='active', start=today, end=today+1y.
    const todayDate = new Date();
    const today = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
    const startDate = newStartDate || today;

    let defaultEnd: string | null = null;
    if (newEndDate === undefined) {
      // No explicit value — default to start+1y for annual upfront pattern.
      const [y, m, d] = startDate.split('-').map(Number);
      const e = new Date(y, m - 1, d);
      e.setFullYear(e.getFullYear() + 1);
      defaultEnd = `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, '0')}-${String(e.getDate()).padStart(2, '0')}`;
    } else {
      defaultEnd = newEndDate; // can be null for unlimited
    }

    const finalStatus = newStatus || 'active';
    const finalTier = newTier !== undefined ? newTier : member.subscription_tier;

    const { error: resetError } = await supabaseAdmin
      .from('members')
      .update({
        athlete_subscription_status: finalStatus,
        athlete_subscription_start: startDate,
        athlete_subscription_end: defaultEnd,
        subscription_tier: finalTier,
        subscription_notes: newNotes ?? null,
      })
      .eq('id', memberId);

    if (resetError) {
      console.error('Failed to reset subscription:', resetError);
      return NextResponse.json(
        { error: 'Subscription archived but member reset failed — contact support' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      newSubscription: {
        status: finalStatus,
        start_date: startDate,
        end_date: defaultEnd,
        tier: finalTier,
      },
    });
  } catch (error) {
    console.error('close-subscription error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
