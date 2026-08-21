import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/auth-api';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * GET /api/bookings/attendees?sessionIds=id1,id2&memberId=xxx
 * Returns attendee first names for sessions where the given member is booked.
 * Uses service role to bypass RLS on members table.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = new URL(request.url);
  const sessionIdsParam = searchParams.get('sessionIds');
  const memberId = searchParams.get('memberId');

  if (!sessionIdsParam || !memberId) {
    return NextResponse.json({ attendees: {} });
  }

  const sessionIds = sessionIdsParam.split(',').filter(Boolean);
  if (sessionIds.length === 0) {
    return NextResponse.json({ attendees: {} });
  }

  // Fetch all confirmed bookings for these sessions. OG and trial bookings are
  // intentionally excluded from the public attendee list — they don't consume
  // a seat and aren't part of the visible "who else is in this class" view that
  // gets shown to other athletes. The viewer's own booking, if marked OG/trial,
  // is still used to determine whether they're booked in a session (so they see
  // the attendee list when attending in any form).
  const { data: bookings, error } = await supabaseAdmin
    .from('bookings')
    .select('session_id, member_id, is_og, is_trial')
    .in('session_id', sessionIds)
    .eq('status', 'confirmed');

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch attendees' }, { status: 500 });
  }

  // Group bookings by session. The viewer is added to bookedSessionIds for any
  // session they're in (including OG/trial). Other members' OG/trial bookings
  // are skipped — they don't show up on the public attendee list.
  const sessionBookings: Record<string, string[]> = {};
  const bookedSessionIds = new Set<string>();

  for (const b of bookings || []) {
    if (b.member_id === memberId) {
      bookedSessionIds.add(b.session_id);
      continue;
    }
    if (b.is_og || b.is_trial) continue;
    if (!sessionBookings[b.session_id]) sessionBookings[b.session_id] = [];
    sessionBookings[b.session_id].push(b.member_id);
  }

  // Collect all other member IDs from sessions where user is booked
  const otherMemberIds = new Set<string>();
  for (const sid of bookedSessionIds) {
    for (const mid of sessionBookings[sid] ?? []) {
      if (mid !== memberId) otherMemberIds.add(mid);
    }
  }

  if (otherMemberIds.size === 0) {
    return NextResponse.json({ attendees: {} });
  }

  // Fetch names for those members
  const { data: members } = await supabaseAdmin
    .from('members')
    .select('id, name, display_name')
    .in('id', Array.from(otherMemberIds));

  const nameMap: Record<string, string> = {};
  for (const m of members || []) {
    nameMap[m.id] = m.display_name || (m.name ? m.name.split(' ')[0] : 'Athlete');
  }

  // Build result: { sessionId: ["Chris", "Mimi"] }. A session can be in
  // bookedSessionIds without any entries in sessionBookings (viewer is the
  // only non-OG/trial booking) — guard with the array fallback.
  const attendees: Record<string, string[]> = {};
  for (const sid of bookedSessionIds) {
    const names = (sessionBookings[sid] ?? [])
      .filter((mid) => mid !== memberId && nameMap[mid])
      .map((mid) => nameMap[mid])
      .sort();
    if (names.length > 0) attendees[sid] = names;
  }

  return NextResponse.json(
    { attendees },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
