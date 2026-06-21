/**
 * Generalized lift-record rebuild. For every weighted RM-test result in
 * wod_section_results (registered athlete) that has NO matching lift_records row
 * — exactly what check-wsr-liftrecord-parity.ts flags — recreate the lift PR
 * from the intact whiteboard weight. Same proven method as the W13 / Pendlay
 * rebuilds, applied across all sessions.
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
type RmLift = { name: string; rmTest: string };
const findRmLifts = (o: any, out: RmLift[] = []): RmLift[] => {
  if (!o || typeof o !== 'object') return out;
  if (o.rm_test && o.name) out.push({ name: o.name, rmTest: o.rm_test });
  for (const v of Object.values(o)) {
    if (Array.isArray(v)) v.forEach((x) => findRmLifts(x, out));
    else if (typeof v === 'object') findRmLifts(v, out);
  }
  return out;
};

async function main() {
  console.log(APPLY ? '🔴 APPLY MODE\n' : '🟢 DRY RUN\n');

  // section map
  const sectionLift = new Map<string, { liftName: string; rmTest: string; date: string }>();
  let from = 0;
  while (true) {
    const { data } = await supabase.from('wods').select('id, date, sections').range(from, from + 499);
    if (!data || !data.length) break;
    for (const w of data) for (const sec of (w.sections as any[]) || []) {
      const lifts = findRmLifts(sec);
      if (lifts.length !== 1) continue;
      sectionLift.set(`${w.id}|${sec.id}-content-0`, { liftName: lifts[0].name, rmTest: lifts[0].rmTest, date: w.date as string });
    }
    if (data.length < 500) break; from += 500;
  }

  // existing lift_records lookup
  const lrSet = new Set<string>();
  from = 0;
  while (true) {
    const { data } = await supabase.from('lift_records').select('user_id, lift_name, rep_max_type, lift_date').range(from, from + 999);
    if (!data || !data.length) break;
    for (const r of data) lrSet.add(`${r.user_id}|${r.lift_name}|${r.rep_max_type}|${r.lift_date}`);
    if (data.length < 1000) break; from += 1000;
  }

  const { data: mem } = await supabase.from('members').select('id, name');
  const id2name = new Map((mem || []).map((m: any) => [m.id, m.name]));

  // walk weighted registered RM WSR rows, build missing lift_records
  const seen = new Set<string>();
  const toInsert: any[] = [];
  from = 0;
  while (true) {
    const { data } = await supabase
      .from('wod_section_results')
      .select('wod_id, section_id, member_id, weight_result, workout_date')
      .not('member_id', 'is', null).not('weight_result', 'is', null).range(from, from + 999);
    if (!data || !data.length) break;
    for (const r of data) {
      if ((r.weight_result ?? 0) <= 0) continue;
      const lift = sectionLift.get(`${r.wod_id}|${r.section_id}`);
      if (!lift) continue;
      const key = `${r.member_id}|${lift.liftName}|${lift.rmTest}|${r.workout_date}`;
      if (lrSet.has(key) || seen.has(key)) continue;
      seen.add(key);
      const reps = RM_TYPE_TO_REPS[lift.rmTest];
      if (!reps) continue;
      toInsert.push({
        user_id: r.member_id, lift_name: lift.liftName, weight_kg: r.weight_result, reps,
        rep_max_type: lift.rmTest, calculated_1rm: calculateEpley1RM(r.weight_result, reps),
        lift_date: r.workout_date, wod_id: r.wod_id,
      });
    }
    if (data.length < 1000) break; from += 1000;
  }

  console.log(`Will INSERT ${toInsert.length} lift_records:`);
  toInsert.sort((a, b) => a.lift_date.localeCompare(b.lift_date)).forEach((r) =>
    console.log(`   ${r.lift_date}  ${(id2name.get(r.user_id) || '?').padEnd(22)} ${r.lift_name} ${r.rep_max_type}: ${r.weight_kg}kg (1RM≈${r.calculated_1rm})`)
  );

  if (APPLY && toInsert.length) {
    // insert in batches of 100
    for (let i = 0; i < toInsert.length; i += 100) {
      const { error } = await supabase.from('lift_records').insert(toInsert.slice(i, i + 100));
      if (error) { console.error('❌', error.message); break; }
    }
    console.log(`\n✅ Inserted ${toInsert.length} lift_records`);
  } else {
    console.log(`\n🟢 DRY RUN — re-run with --apply`);
  }
}
main().then(() => process.exit(0));
