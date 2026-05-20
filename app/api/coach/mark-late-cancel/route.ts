import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';
import { cleanupAthleteScoresForWod, resolveAuthUserId } from '@/lib/coach/scoreCleanup';

// Service-role client bypasses RLS so cleanup of cross-user wod_section_results
// + lift_records + reactions actually completes. Browser-side cleanup with the
// coach's auth token hides the athlete's rows (S344-class incident).
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

    // Late-cancel DOES consume the 10-card (per the existing UX copy), so we do
    // NOT flip ten_card_consumed here — unlike coach-cancel which refunds.
    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({ status: 'late_cancel', updated_at: new Date().toISOString() })
      .eq('id', bookingId);

    if (updateError) {
      console.error('mark-late-cancel update failed:', updateError);
      return NextResponse.json({ error: 'Failed to mark late cancellation' }, { status: 500 });
    }

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

    return NextResponse.json({
      success: true,
      wsrDeleted,
      liftRecordsDeleted,
      reactionsDeleted,
    });
  } catch (error) {
    console.error('mark-late-cancel error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
