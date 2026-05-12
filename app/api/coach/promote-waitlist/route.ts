import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';
import { promoteFromWaitlist } from '@/lib/coach/promoteFromWaitlist';

// Service-role: helper writes to members.ten_card_sessions_used (potentially
// a shared parent's row) — per S344 rule, coach-initiated mutations on
// athlete-owned data must bypass RLS.
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
      .select('id, status, session_id')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.status !== 'waitlist') {
      return NextResponse.json({ error: 'Booking is not on the waitlist' }, { status: 400 });
    }

    const { data: session, error: sessionError } = await supabaseAdmin
      .from('weekly_sessions')
      .select('date, time')
      .eq('id', booking.session_id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const result = await promoteFromWaitlist(
      supabaseAdmin,
      booking.session_id,
      { date: session.date, time: session.time },
      bookingId
    );

    return NextResponse.json({ success: true, promotedMemberId: result.promotedMemberId });
  } catch (error) {
    console.error('promote-waitlist error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
