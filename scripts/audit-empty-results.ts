/**
 * Audit for silently-lost / empty results across ALL sessions (coach app).
 *
 * Two detection nets, read-only, service-role (WSR is behind RLS):
 *
 *   Report A — EMPTY RESULT ROWS. A wod_section_results row that exists but
 *     carries no score in ANY field (time/reps/weight1-3/rounds/cals/metres),
 *     is not task_completed and not dnf. A row only exists because a save
 *     happened, so an empty row = a result that was entered and later wiped
 *     (the S385 load-flip null bug signature). Strongest "went missing" signal.
 *
 *   Report B — PARTIAL SESSIONS. A session where >=1 confirmed athlete has a
 *     real (non-empty) result AND >=1 confirmed athlete has NO result row at
 *     all. Self-calibrating: only flags sessions that were clearly being
 *     scored, so "not filled in yet" sessions don't show up. Catches the
 *     Karen-type partial loss (most athletes lost, a few survivors remain).
 *
 *   npx tsx scripts/audit-empty-results.ts
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type WSR = {
  id: string; wod_id: string; section_id: string; workout_date: string; member_id: string | null;
  user_id: string | null; whiteboard_name: string | null;
  time_result: number | null; reps_result: number | null;
  weight_result: number | null; weight_result_2: number | null; weight_result_3: number | null;
  rounds_result: number | null; calories_result: number | null; metres_result: number | null;
  task_completed: boolean | null; dnf: boolean | null;
  scaling_level: string | null; scaling_level_2: string | null; scaling_level_3: string | null;
};

// Mirror the save route's isScoreEmpty() exactly: a row is "content" if ANY of
// these is set. A row that fails this should never be persisted by a normal save,
// so its existence = a value was entered then wiped (the loss signal).
const hasScore = (r: WSR) =>
  !!r.time_result || r.reps_result != null || r.weight_result != null ||
  r.weight_result_2 != null || r.weight_result_3 != null || r.rounds_result != null ||
  r.calories_result != null || r.metres_result != null || r.task_completed != null ||
  !!r.dnf || !!r.scaling_level || !!r.scaling_level_2 || !!r.scaling_level_3;

async function pageAll<T>(table: string, cols: string, build: (q: any) => any = (q) => q): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await build(supabase.from(table).select(cols)).range(from, from + 999);
    if (error) throw error;
    if (!data || !data.length) break;
    out.push(...(data as T[]));
    if (data.length < 1000) break;
    from += 1000;
  }
  return out;
}

async function main() {
  const [members, wods, wsr] = await Promise.all([
    pageAll<{ id: string; name: string }>('members', 'id, name'),
    pageAll<{ id: string; workout_name: string; date: string }>('wods', 'id, workout_name, date'),
    pageAll<WSR>(
      'wod_section_results',
      'id, wod_id, section_id, workout_date, member_id, user_id, whiteboard_name, time_result, reps_result, weight_result, weight_result_2, weight_result_3, rounds_result, calories_result, metres_result, task_completed, dnf, scaling_level, scaling_level_2, scaling_level_3'
    ),
  ]);
  const id2name = new Map(members.map((m) => [m.id, m.name]));
  const wodInfo = new Map(wods.map((w) => [w.id, w]));
  const who = (r: WSR) =>
    r.member_id ? (id2name.get(r.member_id) || r.member_id.slice(0, 8))
    : r.whiteboard_name ? `${r.whiteboard_name} (wb)`
    : r.user_id ? r.user_id.slice(0, 8) : '???';

  // ---- Report A: section-level MIXED (some scored, some blank in the SAME section) ----
  // A blank row alone is benign (non-scoring section: warmup/skill/hold). It's only
  // a loss signal when OTHER athletes scored that same section => the section IS a
  // scoring section and this athlete's value was wiped/never landed.
  const bySection = new Map<string, WSR[]>();
  for (const r of wsr) {
    const k = `${r.wod_id}|${r.section_id}`;
    (bySection.get(k) ?? bySection.set(k, []).get(k)!).push(r);
  }
  const suspicious: { date: string; name: string; blanks: WSR[]; scored: number }[] = [];
  for (const rows of bySection.values()) {
    const scored = rows.filter(hasScore);
    const blanks = rows.filter((r) => !hasScore(r));
    if (scored.length > 0 && blanks.length > 0) {
      const w = wodInfo.get(rows[0].wod_id);
      suspicious.push({ date: w?.date || '????', name: w?.workout_name || '(no name)', blanks, scored: scored.length });
    }
  }
  suspicious.sort((a, b) => a.date.localeCompare(b.date));
  console.log(`\n=== Report A: section-level MIXED (some athletes scored, some blank) ===`);
  console.log(`Scanned ${wsr.length} rows / ${bySection.size} sections; ${suspicious.length} scoring sections have a blank row.\n`);
  for (const s of suspicious) {
    console.log(`  ${s.date}  ${s.name.slice(0, 38).padEnd(38)} scored ${s.scored}, BLANK ${s.blanks.length}: ${[...new Set(s.blanks.map(who))].join(', ')}`);
  }

  // ---- Report B: partial sessions ----
  // group real-score + no-result presence per (wod_id)
  const bookings = await pageAll<{ member_id: string; session_id: string; status: string }>(
    'bookings', 'member_id, session_id, status', (q) => q.eq('status', 'confirmed')
  );
  const sessions = await pageAll<{ id: string; workout_id: string | null; date: string }>(
    'weekly_sessions', 'id, workout_id, date'
  );
  const sessByWod = new Map<string, { date: string; sessionIds: string[] }>();
  for (const s of sessions) {
    if (!s.workout_id) continue;
    const e = sessByWod.get(s.workout_id) ?? { date: s.date, sessionIds: [] };
    e.sessionIds.push(s.id);
    sessByWod.set(s.workout_id, e);
  }
  // confirmed members per session
  const confirmedBySession = new Map<string, Set<string>>();
  for (const b of bookings) {
    (confirmedBySession.get(b.session_id) ?? confirmedBySession.set(b.session_id, new Set()).get(b.session_id)!).add(b.member_id);
  }
  // members with a real score per wod
  const scoredByWod = new Map<string, Set<string>>();
  for (const r of wsr) {
    if (!r.member_id || !hasScore(r)) continue;
    (scoredByWod.get(r.wod_id) ?? scoredByWod.set(r.wod_id, new Set()).get(r.wod_id)!).add(r.member_id);
  }

  console.log(`\n=== Report B: PARTIAL sessions (some scored, some missing) ===\n`);
  const today = new Date().toISOString().slice(0, 10);
  const partials: { date: string; name: string; scored: number; missing: string[] }[] = [];
  for (const [wodId, info] of sessByWod) {
    if (info.date > today) continue; // future
    const scored = scoredByWod.get(wodId);
    if (!scored || scored.size === 0) continue; // nothing scored => "not filled in", skip
    const confirmed = new Set<string>();
    for (const sid of info.sessionIds) for (const m of confirmedBySession.get(sid) ?? []) confirmed.add(m);
    const missing = [...confirmed].filter((m) => !scored.has(m));
    if (missing.length === 0) continue; // fully scored
    partials.push({
      date: info.date,
      name: wodInfo.get(wodId)?.workout_name || '(no name)',
      scored: scored.size,
      missing: missing.map((m) => id2name.get(m) || m.slice(0, 8)),
    });
  }
  partials.sort((a, b) => a.date.localeCompare(b.date));
  console.log(`${partials.length} past sessions are partially scored (>=1 scored, >=1 confirmed athlete with no result):\n`);
  for (const p of partials) {
    console.log(`  ${p.date}  ${p.name.slice(0, 38).padEnd(38)} scored ${p.scored}, missing ${p.missing.length}: ${p.missing.join(', ')}`);
  }

  // ---- Report C: cross-check Report B "missing" athletes vs benchmark_results / lift_records ----
  // The Karen-26-Jan signature: WSR row deleted but the score survives in the
  // secondary table. If a "missing" athlete HAS a benchmark/lift result on that
  // exact date, their WSR was genuinely lost (not just never entered).
  const memberToUser = new Map<string, string>();
  for (const r of wsr) if (r.member_id && r.user_id) memberToUser.set(r.member_id, r.user_id);
  const bench = await pageAll<{ user_id: string; result_date: string }>('benchmark_results', 'user_id, result_date');
  const lifts = await pageAll<{ user_id: string; lift_date: string }>('lift_records', 'user_id, lift_date');
  const scoredElsewhere = new Set<string>();
  for (const b of bench) scoredElsewhere.add(`${b.user_id}|${b.result_date}`);
  for (const l of lifts) scoredElsewhere.add(`${l.user_id}|${l.lift_date}`);

  console.log(`\n=== Report C: REAL WSR losses (missing from WSR but present in benchmark/lift table) ===\n`);
  let cFound = 0;
  for (const p of partials) {
    const date = p.date;
    const hits = p.missing.filter((nm) => {
      const mid = [...id2name.entries()].find(([, n]) => n === nm)?.[0];
      const uid = mid ? memberToUser.get(mid) : undefined;
      return uid && scoredElsewhere.has(`${uid}|${date}`);
    });
    if (hits.length) {
      cFound += hits.length;
      console.log(`  ${p.date}  ${p.name.slice(0, 38).padEnd(38)} LOST from WSR: ${hits.join(', ')}`);
    }
  }
  if (!cFound) console.log('  ✅ None — every "missing" athlete has NO score in the secondary tables either (genuinely not-entered, not lost).');

  console.log(`\nDone. A=${suspicious.length} nulled rows, B=${partials.length} partial sessions (review), C=${cFound} confirmed WSR losses.`);
}

main().catch((e) => { console.error(e); process.exit(2); });
