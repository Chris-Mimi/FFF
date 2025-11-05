import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Get auth token from Authorization header
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No Authorization header found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const accessToken = authHeader.replace('Bearer ', '');
    console.log('✅ Found access token in header');

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
      .select('*')
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

    console.log('🔍 Authorization check:', {
      authenticated_user: user.id,
      booking_member_id: booking.member_id,
      booking_member_data: bookingMember,
      member_fetch_error: memberError
    });

    const canCancel =
      booking.member_id === user.id || // User's own booking
      bookingMember?.primary_member_id === user.id; // Family member's booking

    if (!canCancel) {
      console.log('❌ Authorization failed - cannot cancel');
      return NextResponse.json(
        { error: 'You can only cancel your own bookings' },
        { status: 403 }
      );
    }

    console.log('✅ Authorization passed');

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

    // Decrement 10-card sessions if booking was confirmed and member has 10-card
    if (booking.status === 'confirmed') {
      const { data: member } = await supabase
        .from('members')
        .select('membership_types, ten_card_sessions_used')
        .eq('id', booking.member_id)
        .single();

      if (member?.membership_types?.includes('ten_card') && member.ten_card_sessions_used > 0) {
        try {
          console.log('🔄 10-card decrement: Member', booking.member_id, 'cancelling, current:', member.ten_card_sessions_used);

          const { error: updateError } = await supabase
            .from('members')
            .update({
              ten_card_sessions_used: member.ten_card_sessions_used - 1
            })
            .eq('id', booking.member_id);

          if (updateError) {
            console.error('Failed to decrement 10-card sessions:', updateError);
          } else {
            console.log('✅ 10-card decremented to:', member.ten_card_sessions_used - 1);
          }
        } catch (error) {
          console.error('Error handling 10-card decrement:', error);
        }
      }
    }

    // TODO: If user was confirmed, promote first waitlist member to confirmed
    // TODO: Send notification to promoted member (Phase 3)
    // TODO: Notify coach of cancellation

    return NextResponse.json(
      {
        success: true,
        message: 'Booking cancelled successfully'
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
