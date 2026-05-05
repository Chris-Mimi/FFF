/**
 * Read-only probe: registered athletes who appear in a session's whiteboard
 * (Whiteboard Intro names OR wod_section_results.whiteboard_name) but who
 * have NO booking for that session.
 *
 * Output is grouped per athlete with one row per missing booking — gives Chris
 * a clean to-do list for manual booking via the Session Management modal.
 *
 * No writes. Pure diagnostic.
 *
 * Usage:
 *   npx tsx scripts/probe-unbooked-whiteboard-athletes.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

interface Section { id: string; type: string; content?: string }
interface WOD { id: string; date: string; session_type: string; sections: Section[] }
interface Member { id: string; name: string; whiteboard_name: string | null; primary_payment_method: string | null; membership_types: string[] | null }
interface WeeklySession { id: string; date: string; time: string; workout_id: string | null }

// Mirror of the alias map in backfill-whiteboard-bookings.ts so this probe
// matches what the backfill would do.
const ALIAS_OVERRIDES: Record<string, string> = {
  'kathih': 'kathi',
};

const EXCLUDE_PATTERNS = [
  /^whiteboard/i, /^intro/i, /^warm.?up/i, /^coach/i, /^notes?:?$/i,
  /^-+$/, /^\d+$/, /^https?:/i, /^workout/i, /^session/i, /^today/i,
  /^welcome/i,
];

function extractNames(content: string): string[] {
  const stripped = content.replace(/<[^>]*>/g, '');
  return stripped
    .split(/[,\n]+|(?:\s*\/\s*)/)
    .map(n => n.trim())
    .filter(n => n.length > 0)
    .filter(n => !EXCLUDE_PATTERNS.some(p => p.test(n)));
}

function buildMatchMap(members: Member[]): Map<string, Member> {
  const map = new Map<string, Member>();
  for (const m of members) {
    if (m.whiteboard_name) map.set(m.whiteboard_name.toLowerCase(), m);
  }
  for (const [alias, target] of Object.entries(ALIAS_OVERRIDES)) {
    const member = map.get(target.toLowerCase())
      ?? members.find(m => (m.name || '').split(' ')[0].toLowerCase() === target.toLowerCase());
    if (member) map.set(alias.toLowerCase(), member);
  }
  for (const m of members) {
    const firstName = (m.name || '').split(' ')[0];
    if (firstName && !map.has(firstName.toLowerCase())) map.set(firstName.toLowerCase(), m);
    if (m.name && !map.has(m.name.toLowerCase())) map.set(m.name.toLowerCase(), m);
  }
  return map;
}

interface Hit {
  memberId: string;
  memberName: string;
  effectiveMethod: string | null;
  date: string;
  sessionId: string;
  sessionTime: string;
  whiteboardName: string;
  source: 'intro' | 'score';
}

async function main() {
  console.log('Probe: 10-card athletes with whiteboard names but no booking');
  console.log('='.repeat(70));

  const { data: members, error: memberErr } = await supabase
    .from('members')
    .select('id, name, whiteboard_name, primary_payment_method, membership_types')
    .eq('status', 'active');
  if (memberErr) { console.error('member fetch:', memberErr.message); process.exit(1); }
  console.log(`Active members: ${members?.length ?? 0}`);

  const matchMap = buildMatchMap(members as Member[]);

  const { data: wods, error: wodErr } = await supabase
    .from('wods')
    .select('id, date, session_type, sections')
    .order('date', { ascending: true });
  if (wodErr) { console.error('wod fetch:', wodErr.message); process.exit(1); }

  const { data: sessions, error: sessErr } = await supabase
    .from('weekly_sessions')
    .select('id, date, time, workout_id');
  if (sessErr) { console.error('session fetch:', sessErr.message); process.exit(1); }

  const sessionsByWodId = new Map<string, WeeklySession[]>();
  for (const s of (sessions ?? []) as WeeklySession[]) {
    if (!s.workout_id) continue;
    if (!sessionsByWodId.has(s.workout_id)) sessionsByWodId.set(s.workout_id, []);
    sessionsByWodId.get(s.workout_id)!.push(s);
  }

  // Existing bookings keyed by session_id::member_id (paginate to bypass 1000 cap)
  const bookedSet = new Set<string>();
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('bookings').select('session_id, member_id')
      .range(from, from + PAGE - 1);
    if (error) { console.error('booking fetch:', error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    for (const b of data) bookedSet.add(`${b.session_id}::${b.member_id}`);
    if (data.length < PAGE) break;
  }

  const hits: Hit[] = [];
  const seen = new Set<string>();
  let multiSessionSkips = 0;
  let unmatchedNames = new Map<string, number>();

  // Source 1: Whiteboard Intro section names
  for (const wod of (wods ?? []) as WOD[]) {
    const intro = wod.sections?.find?.(s => s.type === 'Whiteboard Intro');
    if (!intro?.content?.trim()) continue;
    const names = extractNames(intro.content);
    const wodSessions = sessionsByWodId.get(wod.id) ?? [];

    for (const name of names) {
      const match = matchMap.get(name.toLowerCase());
      if (!match) {
        unmatchedNames.set(name, (unmatchedNames.get(name) ?? 0) + 1);
        continue;
      }
      if (wodSessions.length === 0) continue;
      if (wodSessions.length > 1) { multiSessionSkips++; continue; }
      const sess = wodSessions[0];
      const key = `${sess.id}::${match.id}`;
      if (bookedSet.has(key) || seen.has(key)) continue;
      seen.add(key);
      const effectiveMethod = match.primary_payment_method || match.membership_types?.[0] || null;
      if (effectiveMethod !== 'ten_card') continue;
      hits.push({
        memberId: match.id,
        memberName: match.name,
        effectiveMethod,
        date: wod.date,
        sessionId: sess.id,
        sessionTime: sess.time,
        whiteboardName: name,
        source: 'intro',
      });
    }
  }

  // Source 2: wod_section_results with whiteboard_name set, member already resolvable
  const { data: results, error: resultErr } = await supabase
    .from('wod_section_results')
    .select('id, whiteboard_name, wod_id, workout_date, member_id')
    .not('whiteboard_name', 'is', null);
  if (resultErr) { console.error('results fetch:', resultErr.message); process.exit(1); }

  for (const r of (results ?? [])) {
    if (!r.whiteboard_name) continue;
    const match = matchMap.get(r.whiteboard_name.toLowerCase());
    if (!match) continue;
    const wodSessions = sessionsByWodId.get(r.wod_id) ?? [];
    if (wodSessions.length !== 1) continue;
    const sess = wodSessions[0];
    const key = `${sess.id}::${match.id}`;
    if (bookedSet.has(key) || seen.has(key)) continue;
    seen.add(key);
    const effectiveMethod = match.primary_payment_method || match.membership_types?.[0] || null;
    hits.push({
      memberId: match.id,
      memberName: match.name,
      effectiveMethod,
      date: r.workout_date || sess.date,
      sessionId: sess.id,
      sessionTime: sess.time,
      whiteboardName: r.whiteboard_name,
      source: 'score',
    });
  }

  // Group by member
  const byMember = new Map<string, Hit[]>();
  for (const h of hits) {
    if (!byMember.has(h.memberId)) byMember.set(h.memberId, []);
    byMember.get(h.memberId)!.push(h);
  }

  console.log(`\nRegistered athletes with unbooked whiteboard appearances: ${byMember.size}`);
  console.log(`Total missing bookings: ${hits.length}`);
  console.log(`Skipped — multi-session day (ambiguous): ${multiSessionSkips}`);

  if (byMember.size === 0) {
    console.log('\n✅ Nothing to do.');
    return;
  }

  console.log('\n--- By athlete ---');
  const sorted = [...byMember.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [, list] of sorted) {
    list.sort((a, b) => `${a.date}T${a.sessionTime}`.localeCompare(`${b.date}T${b.sessionTime}`));
    const first = list[0];
    const method = first.effectiveMethod ? ` [${first.effectiveMethod}]` : '';
    console.log(`\n  ${first.memberName}${method} — ${list.length} missing`);
    for (const h of list) {
      const tag = h.source === 'intro' ? 'intro' : 'score';
      console.log(`    ${h.date} ${h.sessionTime?.slice(0,5)}  "${h.whiteboardName}"  [${tag}]`);
    }
  }

  if (unmatchedNames.size > 0) {
    console.log(`\n--- Unmatched whiteboard names (top 20, no member found — ignored) ---`);
    const top = [...unmatchedNames.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
    for (const [n, c] of top) console.log(`  ${n.padEnd(25)} ${c}x`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
