import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';
import { berlinToday, isMinor } from '@/lib/bookingRules';

// S430: Foundations clearance for the coach Members page.
// GET  → { notCleared: { [memberId]: { foundations, other } } } — attended sessions so far.
//        Members missing from the map are cleared.
// POST { memberId, cleared } → clear / return to Foundations.

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(request: NextRequest) {
  const auth = await requireCoach(request);
  if (isAuthError(auth)) return auth;
  const db = adminClient();

  const [membersRes, clearedRes] = await Promise.all([
    db.from('members').select('id, date_of_birth').range(0, 4999),
    db.from('foundations_clearances').select('member_id').range(0, 4999),
  ]);
  if (membersRes.error || clearedRes.error) {
    console.error('foundations GET:', membersRes.error || clearedRes.error);
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }
  const cleared = new Set((clearedRes.data || []).map((r) => r.member_id as string));
  // Kids (under 18) never need clearance (S431) — leave them out like cleared members.
  const ids = (membersRes.data || [])
    .filter((m) => !isMinor(m.date_of_birth))
    .map((m) => m.id as string)
    .filter((id) => !cleared.has(id));

  const notCleared: Record<string, { foundations: number; other: number }> = {};
  for (const id of ids) notCleared[id] = { foundations: 0, other: 0 };

  if (ids.length > 0) {
    const { data, error } = await db
      .from('bookings')
      .select('member_id, weekly_sessions!inner(workout_type, date)')
      .in('member_id', ids)
      .eq('status', 'confirmed')
      .lt('weekly_sessions.date', berlinToday())
      .range(0, 4999);
    if (error) {
      console.error('foundations GET bookings:', error);
      return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
    }
    type Row = { member_id: string; weekly_sessions: { workout_type: string | null } | { workout_type: string | null }[] };
    for (const b of (data || []) as Row[]) {
      const ws = Array.isArray(b.weekly_sessions) ? b.weekly_sessions[0] : b.weekly_sessions;
      const isFoundations = (ws?.workout_type || '').toLowerCase().includes('foundations');
      notCleared[b.member_id][isFoundations ? 'foundations' : 'other']++;
    }
  }

  return NextResponse.json({ notCleared });
}

export async function POST(request: NextRequest) {
  const auth = await requireCoach(request);
  if (isAuthError(auth)) return auth;

  const { memberId, cleared } = await request.json();
  if (typeof memberId !== 'string' || typeof cleared !== 'boolean') {
    return NextResponse.json({ error: 'memberId and cleared required' }, { status: 400 });
  }

  const db = adminClient();
  const { error } = cleared
    ? await db.from('foundations_clearances').upsert({ member_id: memberId, cleared_by: auth.id, cleared_at: new Date().toISOString() })
    : await db.from('foundations_clearances').delete().eq('member_id', memberId);
  if (error) {
    console.error('foundations POST:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
