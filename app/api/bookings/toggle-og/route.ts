import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';
import { promoteFromWaitlist } from '@/lib/coach/promoteFromWaitlist';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const coach = await requireCoach(request);
    if (isAuthError(coach)) return coach;

    const { bookingId, isOg } = await request.json();
    if (!bookingId || typeof isOg !== 'boolean') {
      return NextResponse.json({ error: 'bookingId and isOg are required' }, { status: 400 });
    }

    const { data: booking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('id, status, is_og, session_id')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({ is_og: isOg })
      .eq('id', bookingId);

    if (updateError) {
      console.error('toggle-og update failed:', updateError);
      return NextResponse.json({ error: 'Failed to update Open Gym flag' }, { status: 500 });
    }

    // Slot freed: confirmed booking flipped from non-OG → OG. Promote first waitlister.
    let promotedMemberId: string | null = null;
    if (booking.status === 'confirmed' && !booking.is_og && isOg === true) {
      const { data: session } = await supabaseAdmin
        .from('weekly_sessions')
        .select('date, time')
        .eq('id', booking.session_id)
        .single();

      if (session) {
        const result = await promoteFromWaitlist(supabaseAdmin, booking.session_id, {
          date: session.date,
          time: session.time,
        });
        promotedMemberId = result.promotedMemberId;
      }
    }

    return NextResponse.json({ success: true, promotedMemberId });
  } catch (error) {
    console.error('toggle-og error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
