import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';
import { notifyCoachBooked, notifyCoachRemoved, notifyWaitlistPromoted } from '@/lib/notifications';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const coach = await requireCoach(request);
    if (isAuthError(coach)) return coach;

    const { sessionId, memberId, action, status, promotedMemberIds } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Get session details
    const { data: session } = await supabaseAdmin
      .from('weekly_sessions')
      .select('date, time')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (action === 'added' && memberId && status) {
      notifyCoachBooked(memberId, session.date, session.time, status);
      return NextResponse.json({ success: true });
    }

    if (action === 'removed' && memberId) {
      notifyCoachRemoved(memberId, session.date, session.time);
      return NextResponse.json({ success: true });
    }

    if (action === 'waitlist_promoted' && promotedMemberIds?.length > 0) {
      for (const id of promotedMemberIds) {
        notifyWaitlistPromoted(id, session.date, session.time);
      }
      return NextResponse.json({ success: true, notified: promotedMemberIds.length });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Coach booking notification error:', error);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
