import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';

// Service-role per the S344 coach-mutation rule — inserts a bookings row on
// behalf of an athlete, which is athlete-owned data and blocked by RLS for the
// coach's auth token.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const coach = await requireCoach(request);
    if (isAuthError(coach)) return coach;

    const { sessionId, trialName, memberId } = (await request.json()) as {
      sessionId?: string;
      trialName?: string;
      memberId?: string;
    };

    if (!sessionId || !trialName || !memberId) {
      return NextResponse.json(
        { error: 'sessionId, trialName, memberId required' },
        { status: 400 }
      );
    }

    const { data: session, error: sessionError } = await supabaseAdmin
      .from('weekly_sessions')
      .select('id, trial_names')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const currentTrials = (session.trial_names as string[] | null) ?? [];
    if (!currentTrials.includes(trialName)) {
      return NextResponse.json(
        { error: `Trial name "${trialName}" not on this session` },
        { status: 400 }
      );
    }

    const { data: existingBooking } = await supabaseAdmin
      .from('bookings')
      .select('id, status')
      .eq('session_id', sessionId)
      .eq('member_id', memberId)
      .in('status', ['confirmed', 'waitlist'])
      .maybeSingle();

    if (existingBooking) {
      return NextResponse.json(
        { error: 'Member already has a booking for this session' },
        { status: 400 }
      );
    }

    // Block double-linking: if any booking on this session already references
    // this trial_name, refuse rather than create a duplicate.
    const { data: existingLinked } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('session_id', sessionId)
      .eq('linked_trial_name', trialName)
      .maybeSingle();

    if (existingLinked) {
      return NextResponse.json(
        { error: `"${trialName}" is already linked to a member booking on this session` },
        { status: 400 }
      );
    }

    // Keep the trial_names entry intact — it's Chris's historical record of trials
    // over time. We add an is_trial booking with linked_trial_name for the
    // attribution side; capacity math skips is_trial so we don't double-count.
    const { data: booking, error: insertError } = await supabaseAdmin
      .from('bookings')
      .insert({
        session_id: sessionId,
        member_id: memberId,
        status: 'confirmed',
        is_trial: true,
        is_og: false,
        linked_trial_name: trialName,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('link-trial-to-member insert failed:', insertError);
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
    }

    return NextResponse.json({ bookingId: booking.id });
  } catch (error) {
    console.error('link-trial-to-member error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
