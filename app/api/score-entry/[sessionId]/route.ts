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
      .select('id, date, session_type, workout_name, sections, publish_sections')
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
      const { data: _authUsers } = await supabaseAdmin
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

    // 5. Build athletes array from booked members
    const athletes: { id: string; memberId: string | null; userId: string | null; name: string; whiteboardName: string | null }[] =
      members.map((m: { id: string; name: string; email: string }) => ({
        id: m.id,
        memberId: m.id,
        userId: emailToUserId[m.email] || null,
        name: m.name,
        whiteboardName: null,
      }));

    // 5b. Parse Whiteboard Intro section for additional attendees
    const sections = wod.sections as { id: string; type: string; content: string }[] || [];
    const whiteboardSection = sections.find(s => s.type === 'Whiteboard Intro');
    if (whiteboardSection && whiteboardSection.content) {
      // Strip HTML tags, then split by comma
      const rawContent = whiteboardSection.content.replace(/<[^>]*>/g, '').trim();
      const whiteboardNames = rawContent
        .split(',')
        .map((n: string) => n.trim())
        .filter((n: string) => n.length > 0);

      // Build dedup set from booked members: both whiteboard_name AND member name
      const bookedMemberIds = members.map((m: { id: string }) => m.id);
      const bookedNamesSet = new Set<string>();
      // Add booked member names (always available)
      for (const m of members as { id: string; name: string }[]) {
        // Add first name (whiteboard typically uses first name only)
        const firstName = m.name.split(' ')[0];
        bookedNamesSet.add(firstName.toLowerCase());
        bookedNamesSet.add(m.name.toLowerCase());
      }
      // Also add explicit whiteboard_name values
      if (bookedMemberIds.length > 0) {
        const { data: bookedMembers } = await supabaseAdmin
          .from('members')
          .select('whiteboard_name')
          .in('id', bookedMemberIds)
          .not('whiteboard_name', 'is', null);
        for (const m of bookedMembers || []) {
          bookedNamesSet.add((m.whiteboard_name as string).toLowerCase());
        }
      }

      // Add whiteboard-only athletes (not already in booked list)
      for (const wbName of whiteboardNames) {
        if (bookedNamesSet.has(wbName.toLowerCase())) continue;
        athletes.push({
          id: `wb:${wbName}`,
          memberId: null,
          userId: null,
          name: wbName,
          whiteboardName: wbName,
        });
      }
    }

    // 6. Fetch existing results for this WOD
    const memberIds = athletes
      .map(a => a.memberId)
      .filter((id): id is string => id !== null);
    const userIds = athletes
      .map(a => a.userId)
      .filter((id): id is string => id !== null);
    const whiteboardNames = athletes
      .map(a => a.whiteboardName)
      .filter((n): n is string => n !== null);

    let existingResults: Record<string, unknown>[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allResults: any[] = [];

    if (memberIds.length > 0) {
      const { data } = await supabaseAdmin
        .from('wod_section_results').select('*').eq('wod_id', wod.id).in('member_id', memberIds);
      if (data) allResults.push(...data);
    }
    if (userIds.length > 0) {
      const { data } = await supabaseAdmin
        .from('wod_section_results').select('*').eq('wod_id', wod.id).in('user_id', userIds);
      if (data) allResults.push(...data);
    }
    if (whiteboardNames.length > 0) {
      const { data } = await supabaseAdmin
        .from('wod_section_results').select('*').eq('wod_id', wod.id).in('whiteboard_name', whiteboardNames);
      if (data) allResults.push(...data);
    }

    if (allResults.length > 0) {
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
        publish_sections: wod.publish_sections,
      },
      athletes,
      existingResults,
    });
  } catch (err) {
    console.error('Score entry GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
