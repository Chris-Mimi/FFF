import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';
import { cleanupAthleteScoresForWod, resolveAuthUserId } from '@/lib/coach/scoreCleanup';
import { promoteFromWaitlist } from '@/lib/coach/promoteFromWaitlist';
import { sessionStartInstant } from '@/lib/bookingRules';

// Service-role client bypasses RLS so cleanup of cross-user wod_section_results
// + lift_records + reactions actually completes. The browser-side equivalent in
// useBookingManagement used the coach's auth token; RLS hid the athlete's rows
// → SELECT returned 0 → cleanup silently skipped → ghost rows on leaderboard
// / Lifts / Records (S344).
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const coach = await requireCoach(request);
    if (isAuthError(coach)) return coach;

    const { bookingId } = (await request.json()) as { bookingId?: string };
    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId is required' }, { status: 400 });
    }

    const { data: booking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('id, member_id, session_id, status, is_trial, is_og')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const memberId: string = booking.member_id;
    const isTrialBooking: boolean = booking.is_trial ?? false;

    // S351 Path B: coach cancel always refunds. Flip ten_card_consumed=false in
    // the same UPDATE so the DB trigger drops the counter automatically. is_trial
    // bookings were never consumed, so skip the flip.
    const cancelUpdate: { status: string; updated_at: string; ten_card_consumed?: boolean } = {
      status: 'coach_cancelled',
      updated_at: new Date().toISOString(),
    };
    if (!isTrialBooking) {
      cancelUpdate.ten_card_consumed = false;
    }

    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update(cancelUpdate)
      .eq('id', bookingId);

    if (updateError) {
      console.error('cancel-member-booking update failed:', updateError);
      return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 });
    }

    const { data: session } = await supabaseAdmin
      .from('weekly_sessions')
      .select('workout_id, date, time, capacity, trial_names, drop_in_names')
      .eq('id', booking.session_id)
      .single();

    // Freed a place → promote the longest-waiting waitlister, like an athlete's
    // own cancel does (S418: Annerose stayed on the waitlist after a coach
    // removal). Only for upcoming sessions, only if a place is really free —
    // same count as the Session Management modal (OG + is_trial excluded,
    // trial/drop-in names included). Capacity 0 = unlimited, no waitlist.
    let promotedMemberId: string | null = null;
    if (
      session &&
      booking.status === 'confirmed' &&
      !booking.is_og &&
      !isTrialBooking &&
      session.capacity > 0 &&
      sessionStartInstant(String(session.date).slice(0, 10), session.time) > new Date()
    ) {
      const { data: confirmed, error: countErr } = await supabaseAdmin
        .from('bookings')
        .select('id')
        .eq('session_id', booking.session_id)
        .eq('status', 'confirmed')
        .eq('is_og', false)
        .eq('is_trial', false);
      if (countErr) {
        console.error('cancel-member-booking capacity count failed:', countErr);
      } else {
        const taken =
          (confirmed?.length ?? 0) +
          ((session.trial_names as string[] | null)?.length ?? 0) +
          ((session.drop_in_names as string[] | null)?.length ?? 0);
        if (taken < session.capacity) {
          const result = await promoteFromWaitlist(supabaseAdmin, booking.session_id, {
            date: session.date,
            time: session.time,
          });
          promotedMemberId = result.promotedMemberId;
        }
      }
    }

    let wsrDeleted = 0;
    let liftRecordsDeleted = 0;
    let reactionsDeleted = 0;

    if (session?.workout_id) {
      const authUserId = await resolveAuthUserId(supabaseAdmin, memberId);
      const result = await cleanupAthleteScoresForWod(
        supabaseAdmin,
        session.workout_id,
        memberId,
        authUserId,
      );
      wsrDeleted = result.wsrDeleted;
      liftRecordsDeleted = result.liftRecordsDeleted;
      reactionsDeleted = result.reactionsDeleted;
    }

    return NextResponse.json({
      success: true,
      promotedMemberId,
      wsrDeleted,
      liftRecordsDeleted,
      reactionsDeleted,
    });
  } catch (error) {
    console.error('cancel-member-booking error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
