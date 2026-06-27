import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';

// Service-role: reads bookings/weekly_sessions across many athletes (RLS would
// hide other members' rows from the coach's own auth context).
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * GET /api/coach/attended-workouts?memberIds=a,b,c
 * Returns { workoutNames: string[] } — the distinct workout names that AT LEAST
 * ONE of the given members attended (confirmed booking on any session that ran
 * the workout). The Workouts panel uses this to show only workouts NONE of a
 * selected group has done.
 */
export async function GET(request: NextRequest) {
  const coach = await requireCoach(request);
  if (isAuthError(coach)) return coach;

  const memberIds = (request.nextUrl.searchParams.get('memberIds') || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  if (memberIds.length === 0) {
    return NextResponse.json({ workoutNames: [] });
  }

  // 1) Confirmed bookings for these members -> session ids (paginated; bookings
  //    is a growing table, but member_id IN (...) is a narrowing filter).
  const sessionIds = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select('session_id')
      .in('member_id', memberIds)
      .eq('status', 'confirmed')
      .range(from, from + 999);
    if (error) {
      console.error('attended-workouts bookings error:', error);
      return NextResponse.json({ error: 'Failed to load attendance' }, { status: 500 });
    }
    if (!data || data.length === 0) break;
    for (const b of data) if (b.session_id) sessionIds.add(b.session_id);
    if (data.length < 1000) break;
  }

  // 2) Resolve those sessions -> workout_name (chunked IN lookups).
  const workoutNames = new Set<string>();
  const ids = [...sessionIds];
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const { data, error } = await supabaseAdmin
      .from('weekly_sessions')
      .select('wods(workout_name)')
      .in('id', chunk);
    if (error) {
      console.error('attended-workouts sessions error:', error);
      return NextResponse.json({ error: 'Failed to load attendance' }, { status: 500 });
    }
    for (const s of data || []) {
      const name = (s as { wods?: { workout_name?: string | null } | null }).wods?.workout_name;
      if (name) workoutNames.add(name);
    }
  }

  return NextResponse.json({ workoutNames: [...workoutNames] });
}
