import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';
import { cleanupAthleteScoresForWod, resolveAuthUserId } from '@/lib/coach/scoreCleanup';

// Permanently removes a no-show / late-cancel booking row from the Admin
// Incidents tab. Differs from cancel-member-booking (which UPDATEs status to
// 'coach_cancelled' for audit trail): this DELETEs the row entirely. Cleanup
// of wsr/lift_records/reactions must still run so the athlete's score doesn't
// orphan on the Leaderboard.
//
// Was previously browser-side (S344 RLS class) — moved here so the cross-user
// cleanup actually completes.
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
      .select('id, member_id, session_id, status')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const memberId: string = booking.member_id;

    const { data: session } = await supabaseAdmin
      .from('weekly_sessions')
      .select('workout_id')
      .eq('id', booking.session_id)
      .single();

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

    const { error: deleteError } = await supabaseAdmin
      .from('bookings')
      .delete()
      .eq('id', bookingId);

    if (deleteError) {
      console.error('delete-incident booking delete failed:', deleteError);
      return NextResponse.json({ error: 'Failed to delete incident' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      wsrDeleted,
      liftRecordsDeleted,
      reactionsDeleted,
    });
  } catch (error) {
    console.error('delete-incident error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
