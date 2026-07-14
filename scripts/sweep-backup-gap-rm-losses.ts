/**
 * Backup-gap RM-loss sweep (S397).
 *
 * The DB backup gap runs 2025-12-09 → 2026-03-19. RM-testing weeks inside it
 * may have silently lost scores (S385 weight-loss class) with NO DB-recoverable
 * source — whiteboard photos are the only recovery path. The parity check
 * (check-wsr-liftrecord-parity) only catches losses where the WSR score
 * SURVIVED; here both the WSR weight AND the lift_record can be gone, so we
 * compare confirmed BOOKINGS against SCORES to spot missing-entirely results.
 *
 * For every RM-testing WOD in the gap window it prints:
 *   confirmed-booked athletes  vs  athletes with a score  →  who is missing.
 *
 * Read-only. Service-role required (WSR/bookings behind RLS).
 *   npx tsx scripts/sweep-backup-gap-rm-losses.ts
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GAP_START = '2025-12-09';
const GAP_END = '2026-03-19';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const hasRmLift = (o: any): boolean => {
  if (!o || typeof o !== 'object') return false;
  if (o.rm_test && o.name) return true;
  for (const v of Object.values(o)) {
    if (Array.isArray(v)) { if (v.some(hasRmLift)) return true; }
    else if (typeof v === 'object' && hasRmLift(v)) return true;
  }
  return false;
};

async function main() {
  // 1. RM-testing WODs in the gap window.
  const { data: wods } = await supabase
    .from('wods')
    .select('id, date, workout_name, session_type, sections')
    .gte('date', GAP_START)
    .lte('date', GAP_END)
    .order('date');

  const rmWods = (wods ?? []).filter(w =>
    ((w.sections as unknown[]) ?? []).some(hasRmLift)
  );
  console.log(`Backup gap ${GAP_START} → ${GAP_END}: ${rmWods.length} RM-testing WODs.\n`);

  const { data: mem } = await supabase.from('members').select('id, name');
  const name = new Map((mem ?? []).map(m => [m.id, m.name]));

  // lift_records for the gap window, keyed user_id|lift_date. If a "missing"
  // athlete has a lift_record on the WOD date, their score survived there (shows
  // on the leaderboard) — the WSR gap is not a real loss.
  const lrByUserDate = new Set<string>();
  let lrFrom = 0;
  for (;;) {
    const { data } = await supabase
      .from('lift_records')
      .select('user_id, lift_date')
      .gte('lift_date', GAP_START)
      .lte('lift_date', GAP_END)
      .range(lrFrom, lrFrom + 999);
    if (!data || !data.length) break;
    for (const r of data) lrByUserDate.add(`${r.user_id}|${r.lift_date}`);
    if (data.length < 1000) break;
    lrFrom += 1000;
  }

  let flagged = 0;
  for (const w of rmWods) {
    // 2. Confirmed, non-OG, non-trial bookings across every session using this WOD.
    const { data: sessions } = await supabase
      .from('weekly_sessions')
      .select('id, time')
      .eq('workout_id', w.id);
    const sessionIds = (sessions ?? []).map(s => s.id);
    if (!sessionIds.length) continue;

    const { data: bookings } = await supabase
      .from('bookings')
      .select('member_id, status, is_og, is_trial')
      .in('session_id', sessionIds);
    const booked = new Set(
      (bookings ?? [])
        .filter(b => b.status === 'confirmed' && !b.is_og && !b.is_trial && b.member_id)
        .map(b => b.member_id as string)
    );

    // 3. Registered athletes with any score row for this WOD.
    const { data: wsr } = await supabase
      .from('wod_section_results')
      .select('member_id')
      .eq('wod_id', w.id)
      .not('member_id', 'is', null);
    const scored = new Set((wsr ?? []).map(r => r.member_id as string));

    // Missing from WSR AND with no surviving lift_record on that date = real loss.
    const missing = [...booked].filter(id => !scored.has(id));
    const realLoss = missing.filter(id => !lrByUserDate.has(`${id}|${w.date}`));
    const safeInLr = missing.length - realLoss.length;
    if (realLoss.length === 0) continue;

    flagged++;
    const times = (sessions ?? []).map(s => s.time).join(', ');
    console.log(
      `🚩 ${w.date}  ${w.session_type} / ${w.workout_name ?? '(no name)'}  [${times}]`
    );
    console.log(
      `     booked ${booked.size}, scored ${scored.size}, LOST ${realLoss.length}` +
      (safeInLr ? ` (+${safeInLr} safe in lift_records)` : '') + ': ' +
      realLoss.map(id => name.get(id) ?? id.slice(0, 8)).sort().join(', ')
    );
  }

  console.log(
    flagged === 0
      ? '\n✅ No RM-testing WOD in the gap has genuinely lost scores (all recoverable in lift_records or were no-shows).'
      : `\n${flagged} RM-testing WOD(s) with genuinely lost scores — pull whiteboard photos for these dates.`
  );
}
main().catch(e => { console.error(e); process.exit(2); });
