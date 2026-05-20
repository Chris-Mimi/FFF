import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';
import { cleanupAthleteScoresForWod, resolveAuthUserId } from '@/lib/coach/scoreCleanup';

// Deletes a weekly_sessions row entirely. Cascade-FK on bookings drops the
// booking rows for that session, but wsr/lift_records/reactions are keyed on
// wod_id (NOT booking_id), so they would orphan without explicit cleanup.
// Cleanup ran browser-side previously and was blocked by RLS (S344 class).
//
// A WOD can span multiple class times (`wods.class_times` array), so the same
// wod_id can be linked from several weekly_sessions rows. Cleanup must skip
// members who still have a booking on the same wod via a different session —
// otherwise we'd wipe scores they entered for the class they actually attended.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const coach = await requireCoach(request);
    if (isAuthError(coach)) return coach;

    const { sessionId } = (await request.json()) as { sessionId?: string };
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const { data: session, error: sessionError } = await supabaseAdmin
      .from('weekly_sessions')
      .select('id, workout_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const workoutId: string | null = session.workout_id;

    let wsrDeleted = 0;
    let liftRecordsDeleted = 0;
    let reactionsDeleted = 0;
    let wodDeleted = false;

    if (workoutId) {
      const { data: sessionBookings } = await supabaseAdmin
        .from('bookings')
        .select('member_id')
        .eq('session_id', sessionId);

      const memberIds = [...new Set((sessionBookings || []).map(b => b.member_id as string).filter(Boolean))];

      // Find members who still have a booking on the same wod via a DIFFERENT
      // session — those keep their scores.
      const { data: siblingSessions } = await supabaseAdmin
        .from('weekly_sessions')
        .select('id')
        .eq('workout_id', workoutId)
        .neq('id', sessionId);

      const siblingSessionIds = (siblingSessions || []).map(s => s.id as string);
      const protectedMemberIds = new Set<string>();
      if (siblingSessionIds.length > 0 && memberIds.length > 0) {
        const { data: siblingBookings } = await supabaseAdmin
          .from('bookings')
          .select('member_id')
          .in('session_id', siblingSessionIds)
          .in('member_id', memberIds);
        for (const b of siblingBookings || []) {
          if (b.member_id) protectedMemberIds.add(b.member_id as string);
        }
      }

      for (const memberId of memberIds) {
        if (protectedMemberIds.has(memberId)) continue;
        const authUserId = await resolveAuthUserId(supabaseAdmin, memberId);
        const result = await cleanupAthleteScoresForWod(
          supabaseAdmin,
          workoutId,
          memberId,
          authUserId,
        );
        wsrDeleted += result.wsrDeleted;
        liftRecordsDeleted += result.liftRecordsDeleted;
        reactionsDeleted += result.reactionsDeleted;
      }
    }

    const { error: deleteSessionError } = await supabaseAdmin
      .from('weekly_sessions')
      .delete()
      .eq('id', sessionId);

    if (deleteSessionError) {
      console.error('delete-session failed:', deleteSessionError);
      return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
    }

    // Orphan-wod cleanup: drop the wod if no session still references it.
    if (workoutId) {
      const { data: remaining } = await supabaseAdmin
        .from('weekly_sessions')
        .select('id')
        .eq('workout_id', workoutId)
        .limit(1);

      if (!remaining || remaining.length === 0) {
        await supabaseAdmin.from('wods').delete().eq('id', workoutId);
        wodDeleted = true;
      }
    }

    return NextResponse.json({
      success: true,
      wsrDeleted,
      liftRecordsDeleted,
      reactionsDeleted,
      wodDeleted,
    });
  } catch (error) {
    console.error('delete-session error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
