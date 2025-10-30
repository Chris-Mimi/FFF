import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client with cookies
    const cookieStore = await cookies();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            cookie: cookieStore.toString()
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
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Check if member is active (and get 10-card info)
    const { data: member } = await supabase
      .from('members')
      .select('id, status, membership_types, ten_card_sessions_used')
      .eq('id', user.id)
      .single();

    if (!member || member.status !== 'active') {
      return NextResponse.json(
        { error: 'Only active members can book sessions' },
        { status: 403 }
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

    // Check if user already has a booking for this session
    const existingBooking = session.bookings?.find((b: any) => b.member_id === user.id && b.status !== 'cancelled');
    if (existingBooking) {
      return NextResponse.json(
        { error: 'You have already booked this session' },
        { status: 400 }
      );
    }

    // Count confirmed bookings
    const confirmedCount = session.bookings?.filter((b: any) => b.status === 'confirmed').length || 0;

    // Determine booking status (confirmed or waitlist)
    const bookingStatus = confirmedCount < session.capacity ? 'confirmed' : 'waitlist';

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        session_id: sessionId,
        member_id: user.id,
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

    // Increment 10-card sessions used if member has 10-card membership
    if (booking.status === 'confirmed' && member.membership_types?.includes('ten_card')) {
      try {
        console.log('🐾 10-card increment: User', user.id, 'has', member.membership_types, 'starting count:', member.ten_card_sessions_used);

        // Increment the sessions used counter
        const { error: updateError } = await supabase
          .from('members')
          .update({
            ten_card_sessions_used: member.ten_card_sessions_used + 1
          })
          .eq('id', user.id);

        if (updateError) {
          console.error('Failed to increment 10-card sessions:', updateError);
          // Don't fail the booking for this - just log it
        } else {
          console.log('✅ 10-card incremented to:', member.ten_card_sessions_used + 1);
        }
      } catch (error) {
        console.error('Error handling 10-card logic:', error);
        // Don't fail the booking for this
      }
    }

    // TODO: Create notification for coach if waitlist
    // TODO: Send confirmation email (Phase 3)

    return NextResponse.json(
      {
        success: true,
        message: bookingStatus === 'confirmed'
          ? 'Session booked successfully'
          : 'Added to waitlist. Coach will be notified.',
        booking: {
          id: booking.id,
          status: booking.status
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Book session error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
