/**
 * Nils Weihe — restore 3 missing `lift_records` rows (March 2026).
 *
 * Why they were missing: the scores existed in `wod_section_results` under his
 * WHITEBOARD name, so no lift_record was possible at the time. When the rows were
 * later linked to his login profile, the migration relabelled the WSR rows but never
 * created the paired lift_records — so the scores show on the workout while his
 * Lifts/Records page stays empty. Flagged by scripts/check-wsr-liftrecord-parity.ts
 * (the S385 detection net).
 *
 * INSERT-only, scoped to these 3 rows, skips anything already present.
 * Mirrors what app/api/score-entry/save/route.ts writes, including Epley.
 *
 * Run: npx tsx scripts/restore-nils-march-lift-records.ts          (dry run)
 *      npx tsx scripts/restore-nils-march-lift-records.ts --write
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const WRITE = process.argv.includes('--write');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// identical to calculateEpley1RM in app/api/score-entry/save/route.ts
const epley = (weight: number, reps: number): number | null => {
  if (reps === 1) return weight;
  if (reps <= 0 || reps > 36) return null;
  return Math.round(weight * 36 / (37 - reps) * 10) / 10;
};

const USER_ID = '3f0f2781-cf61-4f40-b0a9-d12052bfa7c1'; // Nils Weihe

const ROWS = [
  { wsr: 'section-1774191503053-4-content-0', wod_id: 'efd2abea-941c-4441-9184-a30a14036f9d',
    lift_name: 'Back Squat',  weight_kg: 65, reps: 1, rep_max_type: '1RM', lift_date: '2026-03-23' },
  { wsr: 'section-1774269586230-content-0',   wod_id: 'efd2abea-941c-4441-9184-a30a14036f9d',
    lift_name: 'Back Squat',  weight_kg: 60, reps: 3, rep_max_type: '3RM', lift_date: '2026-03-23' },
  { wsr: 'section-1774448225252-content-0',   wod_id: '7222ab2c-ff33-4cc7-b211-9b1c9affa40b',
    lift_name: 'Pendlay Row', weight_kg: 50, reps: 5, rep_max_type: '5RM', lift_date: '2026-03-25' },
];

(async () => {
  console.log(WRITE ? '=== WRITING ===\n' : '=== DRY RUN (pass --write to commit) ===\n');

  // Re-verify each against the live WSR row before trusting the hard-coded weight
  const { data: wsr, error: we } = await sb.from('wod_section_results')
    .select('section_id, weight_result, workout_date, wod_id')
    .eq('member_id', USER_ID).in('section_id', ROWS.map(r => r.wsr));
  if (we) throw new Error(`wsr: ${we.message}`);

  const { data: existing, error: ee } = await sb.from('lift_records')
    .select('lift_name, weight_kg, reps, lift_date').eq('user_id', USER_ID);
  if (ee) throw new Error(`lift_records: ${ee.message}`);
  const have = new Set((existing ?? []).map(r => `${r.lift_name}|${r.weight_kg}|${r.reps}|${r.lift_date}`));

  const inserts = [];
  for (const r of ROWS) {
    const src = (wsr ?? []).find(w => w.section_id === r.wsr);
    if (!src) { console.log(`❌ ${r.lift_name} ${r.rep_max_type}: source WSR row not found — skipped`); continue; }
    if (src.weight_result !== r.weight_kg || src.workout_date !== r.lift_date) {
      console.log(`❌ ${r.lift_name} ${r.rep_max_type}: WSR says ${src.weight_result}kg on ${src.workout_date}, script says ${r.weight_kg}kg on ${r.lift_date} — skipped`);
      continue;
    }
    const key = `${r.lift_name}|${r.weight_kg}|${r.reps}|${r.lift_date}`;
    if (have.has(key)) { console.log(`⏭  ${r.lift_name} ${r.rep_max_type}: already present`); continue; }
    const rec = {
      user_id: USER_ID,
      lift_name: r.lift_name,
      weight_kg: r.weight_kg,
      reps: r.reps,
      rep_max_type: r.rep_max_type,
      calculated_1rm: epley(r.weight_kg, r.reps),
      lift_date: r.lift_date,
      wod_id: r.wod_id,
    };
    inserts.push(rec);
    console.log(`   ${r.lift_date}  ${r.lift_name.padEnd(13)} ${r.rep_max_type}  ${r.weight_kg}kg × ${r.reps}  → est. 1RM ${rec.calculated_1rm}kg`);
  }

  if (!WRITE) { console.log(`\n${inserts.length} row(s) would be inserted. Dry run only.`); return; }
  if (!inserts.length) { console.log('\nNothing to insert.'); return; }

  const { error } = await sb.from('lift_records').insert(inserts);
  if (error) throw new Error(`insert: ${error.message}`);
  console.log(`\n✅ inserted ${inserts.length} lift_records`);
})();
