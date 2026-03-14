import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const user = await requireCoach(request);
    if (isAuthError(user)) return user;

    const { sessionId } = await params;

    // 1. Fetch session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('weekly_sessions')
      .select('id, date, time, workout_id, capacity, status')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (!session.workout_id) {
      return NextResponse.json({ error: 'No workout assigned to this session' }, { status: 400 });
    }

    // 2. Fetch WOD with sections
    const { data: wod, error: wodError } = await supabaseAdmin
      .from('wods')
      .select('id, date, session_type, workout_name, sections')
      .eq('id', session.workout_id)
      .single();

    if (wodError || !wod) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    // 3. Fetch confirmed bookings with member info
    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select(`
        id, status, booked_at,
        members!bookings_member_id_fkey (id, name, email)
      `)
      .eq('session_id', sessionId)
      .in('status', ['confirmed'])
      .order('booked_at', { ascending: true });

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      return NextResponse.json({ error: 'Failed to load bookings' }, { status: 500 });
    }

    // 4. Extract member emails and look up auth.users IDs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const members = (bookings || []).map((b: any) => b.members);
    const memberEmails = members.map((m: { email: string }) => m.email);

    // Look up user IDs from auth via admin API
    const emailToUserId: Record<string, string> = {};
    if (memberEmails.length > 0) {
      // Batch lookup: fetch all users and match by email
      const { data: authUsers } = await supabaseAdmin
        .from('members')
        .select('id, email')
        .in('email', memberEmails);

      // We need auth.users, not members. Use admin auth API.
      const { data: { users: allAuthUsers } } = await supabaseAdmin.auth.admin.listUsers({
        perPage: 1000,
      });

      for (const authUser of allAuthUsers || []) {
        if (authUser.email && memberEmails.includes(authUser.email)) {
          emailToUserId[authUser.email] = authUser.id;
        }
      }
    }

    // 5. Build athletes array
    const athletes = members.map((m: { id: string; name: string; email: string }) => ({
      memberId: m.id,
      userId: emailToUserId[m.email] || null,
      name: m.name,
    }));

    // 6. Fetch existing results for this WOD
    const memberIds = athletes.map((a: { memberId: string }) => a.memberId);
    const userIds = athletes
      .map((a: { userId: string | null }) => a.userId)
      .filter((id: string | null): id is string => id !== null);

    let existingResults: Record<string, unknown>[] = [];
    if (memberIds.length > 0 || userIds.length > 0) {
      // Fetch by member_id OR user_id
      const { data: resultsByMember } = await supabaseAdmin
        .from('wod_section_results')
        .select('*')
        .eq('wod_id', wod.id)
        .in('member_id', memberIds);

      const { data: resultsByUser } = await supabaseAdmin
        .from('wod_section_results')
        .select('*')
        .eq('wod_id', wod.id)
        .in('user_id', userIds);

      // Merge and deduplicate by id
      const allResults = [...(resultsByMember || []), ...(resultsByUser || [])];
      const seen = new Set<string>();
      existingResults = allResults.filter(r => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });
    }

    return NextResponse.json({
      session: {
        id: session.id,
        date: session.date,
        time: session.time,
        workout_id: session.workout_id,
        capacity: session.capacity,
      },
      wod: {
        id: wod.id,
        session_type: wod.session_type,
        workout_name: wod.workout_name,
        sections: wod.sections,
      },
      athletes,
      existingResults,
    });
  } catch (err) {
    console.error('Score entry GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
