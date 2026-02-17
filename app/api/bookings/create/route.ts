import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { notifyBookingConfirmed, notifyBookingWaitlisted } from '@/lib/notifications';

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
    const { sessionId, memberId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Determine which member to book for (default to authenticated user)
    const bookingMemberId = memberId || user.id;

    // If booking for someone else, verify they're a family member
    if (bookingMemberId !== user.id) {
      const { data: familyMember, error: familyError } = await supabase
        .from('members')
        .select('id, primary_member_id, account_type')
        .eq('id', bookingMemberId)
        .single();

      if (familyError || !familyMember) {
        return NextResponse.json(
          { error: 'Family member not found' },
          { status: 404 }
        );
      }

      // Verify the authenticated user is the primary member
      if (familyMember.account_type !== 'family_member' || familyMember.primary_member_id !== user.id) {
        return NextResponse.json(
          { error: 'You can only book for your own family members' },
          { status: 403 }
        );
      }
    }

    // Check if member is active and get payment/subscription info
    const { data: member } = await supabase
      .from('members')
      .select(`
        id, status, membership_types,
        ten_card_sessions_used, ten_card_total, ten_card_expiry_date,
        athlete_subscription_status, athlete_subscription_end
      `)
      .eq('id', bookingMemberId)
      .single();

    if (!member || member.status !== 'active') {
      return NextResponse.json(
        { error: 'Only active members can book sessions' },
        { status: 403 }
      );
    }

    // Check 10-card status (if member has ten_card membership type)
    const hasTenCardMembership = member.membership_types?.includes('ten_card') || false;
    const now = new Date();

    const tenCardTotal = member.ten_card_total || 10;
    const tenCardUsed = member.ten_card_sessions_used || 0;
    const tenCardRemaining = tenCardTotal - tenCardUsed;
    const tenCardExpired = member.ten_card_expiry_date && new Date(member.ten_card_expiry_date) < now;
    const hasTenCardSessions = tenCardRemaining > 0 && !tenCardExpired;

    // Determine if we should decrement 10-card counter
    const use10Card = hasTenCardMembership && hasTenCardSessions;

    // Block booking ONLY if member has 10-card membership but no sessions left
    if (hasTenCardMembership && !hasTenCardSessions) {
      let errorMessage = 'Your 10-card has no sessions remaining. ';
      if (tenCardExpired) {
        errorMessage = 'Your 10-card has expired. ';
      }
      errorMessage += 'Please purchase a new 10-card to book classes.';
      return NextResponse.json(
        { error: errorMessage },
        { status: 402 } // Payment Required
      );
    }

    // Check if session exists and is published
    const { data: session, error: sessionError } = await supabase
      .from('weekly_sessions')
      .select('*, bookings(*)')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (session.status !== 'published') {
      return NextResponse.json(
        { error: 'This session is not available for booking' },
        { status: 400 }
      );
    }

    // Check if member already has a booking for this session
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingBooking = session.bookings?.find((b: any) => b.member_id === bookingMemberId && b.status !== 'cancelled');
    if (existingBooking) {
      return NextResponse.json(
        { error: 'This member has already booked this session' },
        { status: 400 }
      );
    }

    // Count confirmed bookings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const confirmedCount = session.bookings?.filter((b: any) => b.status === 'confirmed').length || 0;

    // Determine booking status (confirmed or waitlist)
    const bookingStatus = confirmedCount < session.capacity ? 'confirmed' : 'waitlist';

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        session_id: sessionId,
        member_id: bookingMemberId,
        status: bookingStatus,
        booked_at: new Date().toISOString()
      })
      .select()
      .single();

    if (bookingError) {
      console.error('Booking creation error:', bookingError);
      return NextResponse.json(
        { error: 'Failed to create booking' },
        { status: 500 }
      );
    }

    // Increment 10-card sessions used if using 10-card payment method
    let newTenCardRemaining = tenCardRemaining;
    if (booking.status === 'confirmed' && use10Card) {
      try {
        // Safety check: ensure counter doesn't exceed total
        const newSessionsUsed = Math.min(tenCardUsed + 1, tenCardTotal);

        // Increment the sessions used counter
        const { error: updateError } = await supabase
          .from('members')
          .update({
            ten_card_sessions_used: newSessionsUsed
          })
          .eq('id', bookingMemberId);

        if (updateError) {
          console.error('Failed to increment 10-card sessions:', updateError);
          // Don't fail the booking for this - just log it
        } else {
          newTenCardRemaining = tenCardTotal - newSessionsUsed;
        }
      } catch (error) {
        console.error('Error handling 10-card logic:', error);
        // Don't fail the booking for this
      }
    }

    // Fire-and-forget push notification
    if (bookingStatus === 'confirmed') {
      notifyBookingConfirmed(bookingMemberId, session.date, session.time);
    } else {
      notifyBookingWaitlisted(bookingMemberId, session.date, session.time);
    }

    // Build response with payment info for UI warnings
    const response: {
      success: boolean;
      message: string;
      booking: { id: string; status: string };
      paymentInfo?: {
        type: 'subscription' | '10card';
        sessionsRemaining?: number;
        lowSessionsWarning?: boolean;
      };
    } = {
      success: true,
      message: bookingStatus === 'confirmed'
        ? 'Session booked successfully'
        : 'Added to waitlist. Coach will be notified.',
      booking: {
        id: booking.id,
        status: booking.status
      }
    };

    // Add 10-card warning if applicable
    if (use10Card && booking.status === 'confirmed') {
      response.paymentInfo = {
        type: '10card',
        sessionsRemaining: newTenCardRemaining,
        lowSessionsWarning: newTenCardRemaining <= 3
      };

      if (newTenCardRemaining === 1) {
        response.message = '⚠️ LAST SESSION REMAINING on your 10-card! Session booked successfully.';
      } else if (newTenCardRemaining === 0) {
        response.message = '🎫 This was your FINAL 10-card session! Session booked successfully.';
      } else if (newTenCardRemaining <= 3) {
        response.message += ` ⚠️ (${newTenCardRemaining} sessions remaining on your 10-card)`;
      }
    }

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Book session error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
