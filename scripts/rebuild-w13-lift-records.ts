/**
 * Rebuild the lift_records deleted in the 05-11 trim for registered athletes on
 * the restored RM-test sections. Derived directly from the now-correct
 * wod_section_results weights (no backup, no duplicate risk — only creates the
 * (user_id, rep_max_type, lift_date) tuples that are currently missing).
 *
 * lift_records.user_id === members.id === wod_section_results.member_id (verified).
 * DRY RUN by default. Pass --apply to write. Service-role required.
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const APPLY = process.argv.includes('--apply');

const RM_TYPE_TO_REPS: Record<string, number> = { '1RM': 1, '3RM': 3, '5RM': 5, '10RM': 10 };
function calculateEpley1RM(weight: number, reps: number): number | null {
  if (reps === 1) return weight;
  if (reps <= 0 || reps > 36) return null;
  return Math.round((weight * 36) / (37 - reps) * 10) / 10;
}

const BS = {
  name: 'Back Squat',
  wods: ['efd2abea-941c-4441-9184-a30a14036f9d', 'e5ad0c30-df00-489a-9178-cc73b0bdba0d', 'e954edad-e1d6-4304-a2b4-36e7ef991c96', 'a1f2d37c-31bd-4605-a3e8-7f77f40f366e', '5c3fe17b-b7b8-4dbe-901e-cd9f0c073449'],
  secs: { 'section-1774269586230-content-0': '3RM', 'section-1774191503053-4-content-0': '1RM' } as Record<string, string>,
  dates: ['2026-03-23', '2026-03-24', '2026-04-01'],
};
const FS = {
  name: 'Front Squat',
  wods: ['43a3c11d-f65d-48cd-897f-7c1a3640d0fe', '7d98ed20-087a-463d-ac3f-e5e078999cbb', 'e988eb5d-6a06-459a-915c-67586f97799e', '0c2ff079-f7c4-418b-8c48-805a00633eae'],
  secs: { 'section-1776596966051-3-content-0': '5RM' } as Record<string, string>,
  dates: ['2026-04-20', '2026-04-21'],
};

async function main() {
  console.log(APPLY ? '🔴 APPLY MODE\n' : '🟢 DRY RUN\n');
  const { data: mem } = await supabase.from('members').select('id,name');
  const id2name = new Map((mem || []).map((m: any) => [m.id, m.name]));
  let totalInsert = 0;

  for (const G of [BS, FS]) {
    const { data: wsr } = await supabase
      .from('wod_section_results')
      .select('member_id, user_id, section_id, wod_id, weight_result, workout_date, whiteboard_name')
      .in('wod_id', G.wods)
      .in('section_id', Object.keys(G.secs))
      .not('weight_result', 'is', null);
    const reg = (wsr || []).filter((r) => !r.whiteboard_name && (r.member_id || r.user_id) && (r.weight_result ?? 0) > 0);

    const { data: lr } = await supabase
      .from('lift_records')
      .select('user_id, rep_max_type, lift_date')
      .eq('lift_name', G.name)
      .in('lift_date', G.dates);
    const have = new Set((lr || []).map((r) => `${r.user_id}|${r.rep_max_type}|${r.lift_date}`));

    const seen = new Set<string>();
    const toInsert: any[] = [];
    for (const r of reg) {
      const uid = r.member_id || r.user_id;
      const rm = G.secs[r.section_id];
      const key = `${uid}|${rm}|${r.workout_date}`;
      if (have.has(key) || seen.has(key)) continue;
      seen.add(key);
      const reps = RM_TYPE_TO_REPS[rm];
      toInsert.push({
        user_id: uid,
        lift_name: G.name,
        weight_kg: r.weight_result,
        reps,
        rep_max_type: rm,
        calculated_1rm: calculateEpley1RM(r.weight_result, reps),
        lift_date: r.workout_date,
        wod_id: r.wod_id,
      });
    }

    console.log(`── ${G.name} ── will INSERT ${toInsert.length} lift_records`);
    toInsert.slice(0, 50).forEach((r) => console.log(`   ${r.lift_date} ${(id2name.get(r.user_id) || '?').padEnd(20)} ${r.rep_max_type}: ${r.weight_kg}kg (1RM≈${r.calculated_1rm})`));

    if (APPLY && toInsert.length > 0) {
      const { error } = await supabase.from('lift_records').insert(toInsert);
      if (error) console.error('   ❌', error.message);
      else console.log('   ✅ inserted');
    }
    totalInsert += toInsert.length;
    console.log('');
  }
  console.log(`TOTAL lift_records ${APPLY ? 'inserted' : 'to insert'}: ${totalInsert}`);
}
main().then(() => process.exit(0));
