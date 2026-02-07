import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

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
      .select('id, member_id, status, session_id')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Verify user owns this booking (either their own or their family member's)
    const { data: bookingMember, error: memberError } = await supabase
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

    // Cancel the booking
    const { error: cancelError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    if (cancelError) {
      console.error('Booking cancellation error:', cancelError);
      return NextResponse.json(
        { error: 'Failed to cancel booking' },
        { status: 500 }
      );
    }

    // Refund 10-card session with grace period
    let refundMessage = '';
    if (booking.status === 'confirmed') {
      // Fetch session to check timing
      const { data: session } = await supabase
        .from('weekly_sessions')
        .select('date, time')
        .eq('id', booking.session_id)
        .single();

      const { data: member } = await supabase
        .from('members')
        .select('ten_card_sessions_used, membership_types')
        .eq('id', booking.member_id)
        .single();

      const hasTenCardMembership = member?.membership_types?.includes('ten_card') || false;
      const tenCardUsed = member?.ten_card_sessions_used || 0;

      // Calculate grace period (12 hours before class)
      const GRACE_PERIOD_HOURS = 12;
      let withinGracePeriod = false;

      if (session) {
        const sessionDateTime = new Date(`${session.date}T${session.time}`);
        const now = new Date();
        const hoursUntilSession = (sessionDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        withinGracePeriod = hoursUntilSession >= GRACE_PERIOD_HOURS;
      }

      // Refund if: 10-card member, has used sessions, and within grace period
      if (hasTenCardMembership && tenCardUsed > 0 && withinGracePeriod) {
        try {
          const { error: updateError } = await supabase
            .from('members')
            .update({
              ten_card_sessions_used: tenCardUsed - 1
            })
            .eq('id', booking.member_id);

          if (updateError) {
            console.error('Failed to refund 10-card session:', updateError);
          } else {
            refundMessage = ' Your 10-card session has been refunded.';
          }
        } catch (error) {
          console.error('Error handling 10-card refund:', error);
        }
      } else if (hasTenCardMembership && !withinGracePeriod) {
        refundMessage = ' Note: 10-card session NOT refunded (cancellation less than 12 hours before class).';
      }
    }

    // Auto-promote first waitlist member if cancelled booking was confirmed
    if (booking.status === 'confirmed') {
      const { data: waitlistBookings } = await supabase
        .from('bookings')
        .select('id, member_id')
        .eq('session_id', booking.session_id)
        .eq('status', 'waitlist')
        .order('booked_at', { ascending: true })
        .limit(1);

      if (waitlistBookings && waitlistBookings.length > 0) {
        const firstWaitlist = waitlistBookings[0];

        // Promote to confirmed
        await supabase
          .from('bookings')
          .update({ status: 'confirmed', updated_at: new Date().toISOString() })
          .eq('id', firstWaitlist.id);

        // Increment 10-card if promoted member has 10-card membership
        const { data: promotedMember } = await supabase
          .from('members')
          .select('membership_types, ten_card_sessions_used, ten_card_total')
          .eq('id', firstWaitlist.member_id)
          .single();

        const promotedHasTenCardMembership = promotedMember?.membership_types?.includes('ten_card') || false;
        const promotedTenCardUsed = promotedMember?.ten_card_sessions_used || 0;
        const promotedTenCardTotal = promotedMember?.ten_card_total || 10;
        const promotedHasSessions = promotedTenCardUsed < promotedTenCardTotal;

        if (promotedHasTenCardMembership && promotedHasSessions) {
          await supabase
            .from('members')
            .update({
              ten_card_sessions_used: promotedTenCardUsed + 1
            })
            .eq('id', firstWaitlist.member_id);
        }

        // TODO: Send notification to promoted member (Phase 3)
      }
    }

    // TODO: Notify coach of cancellation

    return NextResponse.json(
      {
        success: true,
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
