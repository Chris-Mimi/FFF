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
      .select('id, date, time, workout_id, capacity, status, trial_names, drop_in_names')
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

    // 3. Fetch confirmed bookings with member info. OG bookings are excluded — those
    // athletes are attending the session for Open Gym and aren't doing the WOD, so they
    // shouldn't appear in score entry. If an OG athlete changes their mind, the coach
    // toggles off the OG flag in Session Management and they reappear here.
    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select(`
        id, status, booked_at,
        members!bookings_member_id_fkey (id, name, display_name, email, gender)
      `)
      .eq('session_id', sessionId)
      .eq('is_og', false)
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
    // Family-member rows (kids added via book/page) have display_name set but no name —
    // fall back so kids don't render as blank rows.
    const athletes: { id: string; memberId: string | null; userId: string | null; name: string; whiteboardName: string | null; gender: 'M' | 'F' | null }[] =
      members.map((m: { id: string; name: string | null; display_name: string | null; email: string; gender: 'M' | 'F' | null }) => ({
        id: m.id,
        memberId: m.id,
        userId: emailToUserId[m.email] || null,
        name: m.display_name || m.name || '',
        whiteboardName: null,
        gender: m.gender || null,
      }));

    // 5b. (Removed) Whiteboard-Intro-section name parsing.
    // The intro section is free text; comma-splitting it turned prose into bogus
    // whiteboard-only attendee rows. All attendees are registered/booked members now —
    // trials + drop-ins below cover the only remaining name-only (unregistered) cases.

    // 5c. Append trial athletes (pre-known, not yet registered) as whiteboard-style entries
    const trialNames = (session.trial_names as string[] | null) || [];
    for (const trialName of trialNames) {
      const trialNameLower = trialName.toLowerCase();
      const alreadyAdded = athletes.some(
        a => (a.whiteboardName && a.whiteboardName.toLowerCase() === trialNameLower) ||
             (a.name && a.name.toLowerCase() === trialNameLower)
      );
      if (alreadyAdded) continue;
      athletes.push({
        id: `trial:${trialName}`,
        memberId: null,
        userId: null,
        name: `${trialName} (trial)`,
        whiteboardName: trialName,
        gender: null,
      });
    }

    // 5d. Append drop-ins (one-time visitors, no login) as whiteboard-style entries
    const dropInNames = (session.drop_in_names as string[] | null) || [];
    for (const dropInName of dropInNames) {
      const dropInNameLower = dropInName.toLowerCase();
      const alreadyAdded = athletes.some(
        a => (a.whiteboardName && a.whiteboardName.toLowerCase() === dropInNameLower) ||
             (a.name && a.name.toLowerCase() === dropInNameLower)
      );
      if (alreadyAdded) continue;
      athletes.push({
        id: `dropin:${dropInName}`,
        memberId: null,
        userId: null,
        name: `${dropInName} (drop-in)`,
        whiteboardName: dropInName,
        gender: null,
      });
    }

    // Sort: girls first (alphabetical), then boys (alphabetical), then unknown gender
    // (whiteboard-only + trial). Matches Chris's whiteboard writing order.
    const genderRank = (g: 'M' | 'F' | null) => (g === 'F' ? 0 : g === 'M' ? 1 : 2);
    athletes.sort((a, b) => {
      const r = genderRank(a.gender) - genderRank(b.gender);
      if (r !== 0) return r;
      return a.name.localeCompare(b.name);
    });

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
