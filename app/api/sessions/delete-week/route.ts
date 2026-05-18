import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

interface WodSection {
  content?: string;
  lifts?: unknown[];
  benchmarks?: unknown[];
  forge_benchmarks?: unknown[];
}

// Mirror of utils/card-utils.ts isDefaultDraft: a WOD is "untouched" if every
// section has empty content and no structured movements attached.
function isDefaultDraft(sections: unknown): boolean {
  if (!Array.isArray(sections) || sections.length === 0) return true;
  return (sections as WodSection[]).every(s =>
    !s.content?.trim() &&
    (!s.lifts || s.lifts.length === 0) &&
    (!s.benchmarks || s.benchmarks.length === 0) &&
    (!s.forge_benchmarks || s.forge_benchmarks.length === 0)
  );
}

export async function POST(request: NextRequest) {
  try {
    const coach = await requireCoach(request);
    if (isAuthError(coach)) return coach;

    const body = await request.json();
    const { start_date } = body;
    if (!start_date || !/^\d{4}-\d{2}-\d{2}$/.test(start_date)) {
      return NextResponse.json({ error: 'start_date (YYYY-MM-DD) is required' }, { status: 400 });
    }

    // Compute end date (exclusive): start + 7 days
    const start = new Date(`${start_date}T00:00:00`);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

    // Fetch all weekly_sessions in [start, end) with attached bookings
    const { data: sessions, error: sErr } = await supabaseAdmin
      .from('weekly_sessions')
      .select('id, date, time, workout_id, bookings(id)')
      .gte('date', start_date)
      .lt('date', endStr);

    if (sErr) {
      console.error('Failed to fetch weekly_sessions:', sErr);
      return NextResponse.json({ error: 'Failed to load sessions' }, { status: 500 });
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ error: 'No sessions found for this week.' }, { status: 404 });
    }

    // Block if ANY session has bookings
    const sessionsWithBookings = sessions.filter(s => Array.isArray(s.bookings) && s.bookings.length > 0);
    if (sessionsWithBookings.length > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${sessionsWithBookings.length} session(s) already have bookings. Cancel those bookings first.` },
        { status: 409 }
      );
    }

    // Block if ANY linked WOD has been published or content-edited
    const wodIds = sessions.map(s => s.workout_id).filter((id): id is string => !!id);
    if (wodIds.length > 0) {
      const { data: wods, error: wErr } = await supabaseAdmin
        .from('wods')
        .select('id, workout_publish_status, sections')
        .in('id', wodIds);

      if (wErr) {
        console.error('Failed to fetch WODs:', wErr);
        return NextResponse.json({ error: 'Failed to load workouts' }, { status: 500 });
      }

      const blocked = (wods || []).filter(w =>
        w.workout_publish_status === 'published' || !isDefaultDraft(w.sections)
      );
      if (blocked.length > 0) {
        return NextResponse.json(
          { error: `Cannot delete: ${blocked.length} session(s) have edited or published workout content. Delete or revert those individually first.` },
          { status: 409 }
        );
      }
    }

    // Safe to delete. Sessions first (their workout_id FK references wods), then WODs.
    const sessionIds = sessions.map(s => s.id);
    const { error: delSessionsErr } = await supabaseAdmin
      .from('weekly_sessions')
      .delete()
      .in('id', sessionIds);
    if (delSessionsErr) {
      console.error('Failed to delete weekly_sessions:', delSessionsErr);
      return NextResponse.json({ error: 'Failed to delete sessions' }, { status: 500 });
    }

    if (wodIds.length > 0) {
      const { error: delWodsErr } = await supabaseAdmin
        .from('wods')
        .delete()
        .in('id', wodIds);
      if (delWodsErr) {
        // Non-fatal: sessions are gone; orphan WODs are harmless and can be cleaned later.
        console.error('Failed to delete WODs (sessions already removed):', delWodsErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${sessionIds.length} session(s) and ${wodIds.length} workout(s) for week starting ${start_date}`,
      deleted_count: sessionIds.length,
      week_start: start_date,
    });
  } catch (error) {
    console.error('Delete week error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
