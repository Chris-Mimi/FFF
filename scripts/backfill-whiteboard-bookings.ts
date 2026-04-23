/**
 * Backfill bookings + historical score attribution from Whiteboard Intro names.
 *
 * Phase 1: For each WOD's "Whiteboard Intro" section, extract names. Match each
 *          to a registered member (whiteboard_name → first name → full name,
 *          case-insensitive). For each match, find the weekly_session for that
 *          WOD and INSERT a booking (status='confirmed') if one doesn't already
 *          exist. Multi-session days are flagged for manual review (ambiguous).
 *
 * Phase 2: Find historical wod_section_results rows where whiteboard_name is
 *          set but member_id is NULL. Match the whiteboard_name to a member
 *          and UPDATE the row to set member_id + user_id, re-attributing the
 *          score to the athlete's profile.
 *
 * Defaults to dry-run. Pass --apply to commit changes.
 *
 * Usage:
 *   npx tsx scripts/backfill-whiteboard-bookings.ts
 *   npx tsx scripts/backfill-whiteboard-bookings.ts --apply
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const APPLY = process.argv.includes('--apply');

/**
 * Manual alias overrides for whiteboard names that don't map to a member's
 * `whiteboard_name` or first name. Format: alias (lowercase) → target
 * whiteboard_name OR first name (lowercase) of the existing member.
 *
 * Add a row here if you spot a "real member, wrong alias" case in the
 * dry-run unmatched list. Re-run dry-run to verify before --apply.
 */
const ALIAS_OVERRIDES: Record<string, string> = {
  'kathih': 'kathi', // Katharina Herbst — also written as KathiH
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

interface Section {
  id: string;
  type: string;
  content?: string;
}

interface WOD {
  id: string;
  date: string;
  session_type: string;
  sections: Section[];
}

interface Member {
  id: string;
  name: string;
  email: string;
  whiteboard_name: string | null;
}

interface WeeklySession {
  id: string;
  date: string;
  time: string;
  workout_id: string | null;
}

interface Booking {
  session_id: string;
  member_id: string;
}

interface OrphanResult {
  id: string;
  whiteboard_name: string;
  wod_id: string;
  member_id: string | null;
  user_id: string | null;
}

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
    if (m.whiteboard_name) {
      map.set(m.whiteboard_name.toLowerCase(), m);
    }
  }
  for (const [alias, target] of Object.entries(ALIAS_OVERRIDES)) {
    const member = map.get(target.toLowerCase())
      ?? members.find(m => (m.name || '').split(' ')[0].toLowerCase() === target.toLowerCase());
    if (member) {
      map.set(alias.toLowerCase(), member);
    } else {
      console.warn(`  ⚠️  ALIAS_OVERRIDES: target "${target}" not found for alias "${alias}"`);
    }
  }
  for (const m of members) {
    const firstName = (m.name || '').split(' ')[0];
    if (firstName && !map.has(firstName.toLowerCase())) {
      map.set(firstName.toLowerCase(), m);
    }
    if (m.name && !map.has(m.name.toLowerCase())) {
      map.set(m.name.toLowerCase(), m);
    }
  }
  return map;
}

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY (will write to DB)' : 'DRY-RUN (no changes)'}`);
  console.log('='.repeat(60));

  // Fetch members
  const { data: members, error: memberErr } = await supabase
    .from('members')
    .select('id, name, email, whiteboard_name')
    .eq('status', 'active');
  if (memberErr) { console.error('member fetch:', memberErr.message); process.exit(1); }
  console.log(`Active members: ${members?.length ?? 0}`);

  const matchMap = buildMatchMap(members as Member[]);

  // Fetch WODs
  const { data: wods, error: wodErr } = await supabase
    .from('wods').select('id, date, session_type, sections')
    .order('date', { ascending: true });
  if (wodErr) { console.error('wod fetch:', wodErr.message); process.exit(1); }
  console.log(`WODs total: ${wods?.length ?? 0}`);

  // Fetch all weekly_sessions (small table — entire date range)
  const { data: sessions, error: sessErr } = await supabase
    .from('weekly_sessions').select('id, date, time, workout_id');
  if (sessErr) { console.error('session fetch:', sessErr.message); process.exit(1); }
  console.log(`Weekly sessions total: ${sessions?.length ?? 0}`);

  // Group sessions by workout_id
  const sessionsByWodId = new Map<string, WeeklySession[]>();
  for (const s of (sessions ?? []) as WeeklySession[]) {
    if (!s.workout_id) continue;
    if (!sessionsByWodId.has(s.workout_id)) sessionsByWodId.set(s.workout_id, []);
    sessionsByWodId.get(s.workout_id)!.push(s);
  }

  // Fetch existing bookings (for dedup) — paginate to bypass Supabase 1000-row cap
  const bookedSet = new Set<string>();
  let bookingsTotal = 0;
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('bookings').select('session_id, member_id')
      .range(from, from + PAGE - 1);
    if (error) { console.error('booking fetch:', error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    for (const b of data as Booking[]) bookedSet.add(`${b.session_id}::${b.member_id}`);
    bookingsTotal += data.length;
    if (data.length < PAGE) break;
  }
  console.log(`Existing bookings: ${bookingsTotal}`);

  // ============ PHASE 1: BOOKINGS ============
  console.log('\n=== PHASE 1: BOOKING BACKFILL ===\n');

  const proposedBookings: { session_id: string; member_id: string; date: string; whiteboardName: string; memberName: string }[] = [];
  const unmatchedNames = new Map<string, number>();
  let multiSessionSkips = 0;
  let noSessionSkips = 0;
  let alreadyBookedSkips = 0;
  let wodsWithIntro = 0;

  for (const wod of (wods ?? []) as WOD[]) {
    const intro = wod.sections?.find?.(s => s.type === 'Whiteboard Intro');
    if (!intro?.content?.trim()) continue;
    wodsWithIntro++;

    const names = extractNames(intro.content);
    const wodSessions = sessionsByWodId.get(wod.id) ?? [];

    for (const name of names) {
      const match = matchMap.get(name.toLowerCase());
      if (!match) {
        unmatchedNames.set(name, (unmatchedNames.get(name) ?? 0) + 1);
        continue;
      }
      if (wodSessions.length === 0) { noSessionSkips++; continue; }
      if (wodSessions.length > 1) { multiSessionSkips++; continue; }

      const sess = wodSessions[0];
      const key = `${sess.id}::${match.id}`;
      if (bookedSet.has(key)) { alreadyBookedSkips++; continue; }

      bookedSet.add(key); // dedup within this run
      proposedBookings.push({
        session_id: sess.id,
        member_id: match.id,
        date: wod.date,
        whiteboardName: name,
        memberName: match.name,
      });
    }
  }

  console.log(`WODs with Whiteboard Intro content: ${wodsWithIntro}`);
  console.log(`Bookings proposed: ${proposedBookings.length}`);
  console.log(`Skipped — already booked: ${alreadyBookedSkips}`);
  console.log(`Skipped — multi-session day (ambiguous): ${multiSessionSkips}`);
  console.log(`Skipped — no weekly_session linked to WOD: ${noSessionSkips}`);
  console.log(`Unmatched names (no member found): ${unmatchedNames.size}`);

  if (unmatchedNames.size > 0) {
    console.log('\n--- Unmatched names (top 30 by occurrence) ---');
    const sorted = [...unmatchedNames.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
    for (const [name, count] of sorted) {
      console.log(`  ${name.padEnd(25)} ${count}x`);
    }
  }

  if (proposedBookings.length > 0) {
    console.log('\n--- Sample bookings (first 20) ---');
    for (const b of proposedBookings.slice(0, 20)) {
      console.log(`  ${b.date}  "${b.whiteboardName}" → ${b.memberName}  (session ${b.session_id.slice(0, 8)})`);
    }
  }

  if (APPLY && proposedBookings.length > 0) {
    console.log(`\nInserting ${proposedBookings.length} bookings...`);
    const rows = proposedBookings.map(b => ({
      session_id: b.session_id,
      member_id: b.member_id,
      status: 'confirmed' as const,
    }));
    // Insert in chunks of 500 to stay under PostgREST limits
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error } = await supabase.from('bookings').insert(chunk);
      if (error) { console.error(`booking insert chunk ${i}:`, error.message); process.exit(1); }
      console.log(`  Inserted ${Math.min(i + 500, rows.length)}/${rows.length}`);
    }
    console.log('Phase 1 complete.');
  }

  // ============ PHASE 2: HISTORICAL RESULT ATTRIBUTION ============
  console.log('\n=== PHASE 2: HISTORICAL RESULT ATTRIBUTION ===\n');

  const { data: orphans, error: orphanErr } = await supabase
    .from('wod_section_results')
    .select('id, whiteboard_name, wod_id, member_id, user_id')
    .not('whiteboard_name', 'is', null)
    .is('member_id', null);
  if (orphanErr) { console.error('orphan fetch:', orphanErr.message); process.exit(1); }

  console.log(`Orphan results (whiteboard_name set, member_id null): ${orphans?.length ?? 0}`);

  const proposedUpdates: { id: string; member_id: string; whiteboard_name: string; member_name: string }[] = [];
  const orphanUnmatched = new Map<string, number>();

  for (const r of (orphans ?? []) as OrphanResult[]) {
    const match = matchMap.get(r.whiteboard_name.toLowerCase());
    if (!match) {
      orphanUnmatched.set(r.whiteboard_name, (orphanUnmatched.get(r.whiteboard_name) ?? 0) + 1);
      continue;
    }
    proposedUpdates.push({
      id: r.id,
      member_id: match.id,
      whiteboard_name: r.whiteboard_name,
      member_name: match.name,
    });
  }

  console.log(`Updates proposed: ${proposedUpdates.length}`);
  console.log(`Unmatched whiteboard names: ${orphanUnmatched.size}`);

  if (orphanUnmatched.size > 0) {
    console.log('\n--- Unmatched orphan whiteboard names ---');
    const sorted = [...orphanUnmatched.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
    for (const [name, count] of sorted) {
      console.log(`  ${name.padEnd(25)} ${count}x`);
    }
  }

  if (proposedUpdates.length > 0) {
    console.log('\n--- Sample updates (first 10) ---');
    for (const u of proposedUpdates.slice(0, 10)) {
      console.log(`  result ${u.id.slice(0, 8)}  "${u.whiteboard_name}" → ${u.member_name}`);
    }
  }

  if (APPLY && proposedUpdates.length > 0) {
    console.log(`\nUpdating ${proposedUpdates.length} results...`);
    let done = 0;
    const conflicts: { id: string; whiteboard_name: string; member_name: string; reason: string }[] = [];
    for (const u of proposedUpdates) {
      const { error } = await supabase
        .from('wod_section_results')
        .update({ member_id: u.member_id, user_id: u.member_id })
        .eq('id', u.id);
      if (error) {
        // Most common: unique constraint on (user_id, wod_id, section_id, workout_date)
        // — the matched member already has a registered-account score for the same slot.
        // Log + skip; the orphan whiteboard row stays in place for manual review.
        conflicts.push({
          id: u.id,
          whiteboard_name: u.whiteboard_name,
          member_name: u.member_name,
          reason: error.message,
        });
        continue;
      }
      done++;
    }
    console.log(`  Updated ${done}/${proposedUpdates.length}`);
    if (conflicts.length > 0) {
      console.log(`\n  ⚠️  ${conflicts.length} updates skipped (already have a registered-account score for same slot):`);
      for (const c of conflicts) {
        console.log(`     orphan ${c.id.slice(0, 8)}  "${c.whiteboard_name}" → ${c.member_name}`);
        console.log(`        reason: ${c.reason}`);
      }
      console.log(`  → Inspect manually and either delete the orphan row or merge it.`);
    }
    console.log('Phase 2 complete.');
  }

  console.log('\n' + '='.repeat(60));
  console.log(APPLY ? 'DONE — changes applied.' : 'DRY-RUN complete. Re-run with --apply to commit.');
}

main().catch(err => { console.error(err); process.exit(1); });
