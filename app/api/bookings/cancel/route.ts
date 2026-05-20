import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { promoteFromWaitlist } from '@/lib/coach/promoteFromWaitlist';
import { getBookingRules, getLockLeadMinutesForSessionType, sessionStartInstant } from '@/lib/bookingRules';
import { cleanupAthleteScoresForWod, resolveAuthUserId } from '@/lib/coach/scoreCleanup';

// Service-role client used ONLY for the score-cleanup step below. Anon-supabase
// cannot delete reactions (owned by other users) or family-member rows, so the
// cleanup must run with service role to be complete.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    // Get auth token from Authorization header
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const accessToken = authHeader.replace('Bearer ', '');

    // Create Supabase client with auth token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // Fetch booking to verify ownership
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, member_id, status, session_id, is_trial')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Verify user owns this booking (either their own or their family member's)
    const { data: bookingMember, error: _memberError } = await supabase
      .from('members')
      .select('id, primary_member_id, account_type')
      .eq('id', booking.member_id)
      .single();

    const canCancel =
      booking.member_id === user.id || // User's own booking
      bookingMember?.primary_member_id === user.id; // Family member's booking

    if (!canCancel) {
      return NextResponse.json(
        { error: 'You can only cancel your own bookings' },
        { status: 403 }
      );
    }

    if (booking.status === 'cancelled') {
      return NextResponse.json(
        { error: 'This booking is already cancelled' },
        { status: 400 }
      );
    }

    // Fetch session details (needed for lock-threshold decision + refund timing + waitlist promotion notification)
    const { data: session } = await supabase
      .from('weekly_sessions')
      .select('date, time, workout_type, is_locked')
      .eq('id', booking.session_id)
      .single();

    // Decide final status: confirmed bookings cancelled past the auto-lock threshold
    // become 'late_cancel' (audit trail). Waitlist cancels are always plain 'cancelled'.
    let newStatus: 'cancelled' | 'late_cancel' = 'cancelled';
    if (booking.status === 'confirmed' && session) {
      const leadMinutes = await getLockLeadMinutesForSessionType(session.workout_type);
      const sessionDateTime = sessionStartInstant(session.date, session.time);
      const lockThreshold = new Date(sessionDateTime.getTime() - leadMinutes * 60 * 1000);
      const isLocked =
        session.is_locked === true ||
        (session.is_locked === null && lockThreshold < new Date());
      if (isLocked) newStatus = 'late_cancel';
    }

    // 10-card refund decision (S351 Path B): flip ten_card_consumed=false on the
    // booking row when the athlete is within grace. The DB trigger then drops the
    // holder's counter automatically. Past grace = no refund (consumed stays true).
    let refundMessage = '';
    let refundConsumed = false;
    let isTenCardCancel = false;

    if (booking.status === 'confirmed' && !booking.is_trial) {
      const { data: member } = await supabase
        .from('members')
        .select('id, membership_types, primary_payment_method')
        .eq('id', booking.member_id)
        .single();

      const effectiveMethod = member?.primary_payment_method || member?.membership_types?.[0] || null;
      isTenCardCancel = effectiveMethod === 'ten_card';

      if (isTenCardCancel && session) {
        const rules = await getBookingRules();
        const gracePeriodHours = rules.ten_card_refund_hours;
        const sessionDateTime = sessionStartInstant(session.date, session.time);
        const now = new Date();
        const hoursUntilSession = (sessionDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        const withinGracePeriod = hoursUntilSession >= gracePeriodHours;

        if (withinGracePeriod) {
          refundConsumed = true;
          refundMessage = ' Your 10-card session has been refunded.';
        } else {
          refundMessage = ` Note: 10-card session NOT refunded (cancellation less than ${gracePeriodHours} hours before class).`;
        }
      }
    }

    const cancelUpdate: { status: typeof newStatus; updated_at: string; ten_card_consumed?: boolean } = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
    if (refundConsumed) {
      cancelUpdate.ten_card_consumed = false;
    }

    const { error: cancelError } = await supabase
      .from('bookings')
      .update(cancelUpdate)
      .eq('id', bookingId);

    if (cancelError) {
      console.error('Booking cancellation error:', cancelError);
      return NextResponse.json(
        { error: 'Failed to cancel booking' },
        { status: 500 }
      );
    }

    const { data: sessionData } = await supabaseAdmin
      .from('weekly_sessions')
      .select('workout_id')
      .eq('id', booking.session_id)
      .single();

    if (sessionData?.workout_id) {
      const authUserId = await resolveAuthUserId(supabaseAdmin, booking.member_id);
      await cleanupAthleteScoresForWod(
        supabaseAdmin,
        sessionData.workout_id,
        booking.member_id,
        authUserId,
      );
    }

    // Auto-promote first waitlist member if cancelled booking was confirmed
    if (booking.status === 'confirmed' && session) {
      await promoteFromWaitlist(supabase, booking.session_id, {
        date: session.date,
        time: session.time,
      });
    }

    return NextResponse.json(
      {
        success: true,
        status: newStatus,
        message: `Booking cancelled successfully.${refundMessage}`
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Cancel booking error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
