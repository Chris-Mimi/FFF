import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';
import { notifySessionCancelled } from '@/lib/notifications';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const coach = await requireCoach(request);
    if (isAuthError(coach)) return coach;

    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Get session details for notification message
    const { data: session } = await supabaseAdmin
      .from('weekly_sessions')
      .select('date, time')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get all members who had confirmed or waitlist bookings (now cancelled)
    const { data: cancelledBookings } = await supabaseAdmin
      .from('bookings')
      .select('member_id')
      .eq('session_id', sessionId)
      .eq('status', 'cancelled');

    if (!cancelledBookings || cancelledBookings.length === 0) {
      return NextResponse.json({ success: true, notified: 0 });
    }

    // Send notification to each affected member (fire-and-forget)
    const memberIds = [...new Set(cancelledBookings.map(b => b.member_id))];
    for (const memberId of memberIds) {
      notifySessionCancelled(memberId, session.date, session.time);
    }

    return NextResponse.json({ success: true, notified: memberIds.length });
  } catch (error) {
    console.error('Session cancelled notification error:', error);
    return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 });
  }
}
