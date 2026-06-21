/**
 * Pendlay Row Testing 5RM recovery. The WSR weights survived (sections were
 * scoring_fields=undefined, so the load:false null-cleanup never fired), but the
 * registered athletes' lift_records were deleted — so only ~5 show on the
 * leaderboard. Rebuild the missing lift_records from the intact WSR weights, and
 * set scoring_fields.load=true on the affected sections for consistency.
 *
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
const findPendlay = (o: any): any => {
  if (!o || typeof o !== 'object') return null;
  if (/pendlay/i.test(o.name || '') && o.rm_test) return o;
  for (const v of Object.values(o)) { const r = findPendlay(v); if (r) return r; }
  return null;
};

async function main() {
  console.log(APPLY ? '🔴 APPLY MODE\n' : '🟢 DRY RUN\n');
  const { data: mem } = await supabase.from('members').select('id,name');
  const id2name = new Map((mem || []).map((m: any) => [m.id, m.name]));

  // Locate all Pendlay RM sections
  const targets: Array<{ wod: string; date: string; secId: string; lift: any; sf: any }> = [];
  let from = 0;
  while (true) {
    const { data } = await supabase.from('wods').select('id,date,sections').range(from, from + 499);
    if (!data || !data.length) break;
    for (const w of data) for (const sec of (w.sections as any[]) || []) {
      const l = findPendlay(sec);
      if (l) targets.push({ wod: w.id, date: w.date, secId: sec.id, lift: l, sf: sec.scoring_fields });
    }
    if (data.length < 500) break; from += 500;
  }

  // Existing Pendlay lift_records
  const dates = [...new Set(targets.map((t) => t.date))];
  const { data: lr } = await supabase
    .from('lift_records')
    .select('user_id, rep_max_type, lift_date')
    .eq('lift_name', 'Pendlay Row')
    .in('lift_date', dates);
  const have = new Set((lr || []).map((r) => `${r.user_id}|${r.rep_max_type}|${r.lift_date}`));

  const seen = new Set<string>();
  const toInsert: any[] = [];
  for (const t of targets) {
    const { data: wsr } = await supabase
      .from('wod_section_results')
      .select('member_id, user_id, whiteboard_name, weight_result, workout_date')
      .eq('wod_id', t.wod).eq('section_id', `${t.secId}-content-0`).not('weight_result', 'is', null);
    for (const r of wsr || []) {
      if (r.whiteboard_name || (r.weight_result ?? 0) <= 0) continue;
      const uid = r.member_id || r.user_id;
      const rm = t.lift.rm_test;
      const key = `${uid}|${rm}|${r.workout_date}`;
      if (have.has(key) || seen.has(key)) continue;
      seen.add(key);
      const reps = RM_TYPE_TO_REPS[rm];
      toInsert.push({
        user_id: uid, lift_name: 'Pendlay Row', weight_kg: r.weight_result, reps,
        rep_max_type: rm, calculated_1rm: calculateEpley1RM(r.weight_result, reps),
        lift_date: r.workout_date, wod_id: t.wod,
      });
    }
  }

  console.log(`Pendlay sections: ${targets.length} | existing lift_records: ${(lr || []).length}`);
  console.log(`→ INSERT ${toInsert.length} lift_records:`);
  toInsert.forEach((r) => console.log(`   ${r.lift_date} ${(id2name.get(r.user_id) || '?').padEnd(20)} ${r.rep_max_type}: ${r.weight_kg}kg (1RM≈${r.calculated_1rm})`));

  if (APPLY && toInsert.length) {
    const { error } = await supabase.from('lift_records').insert(toInsert);
    console.log(error ? `❌ ${error.message}` : '✅ inserted');
  }

  // Flip load:true on the Pendlay sections
  let wodsFixed = 0;
  const byWod = new Map<string, string[]>();
  for (const t of targets) { const a = byWod.get(t.wod) || []; a.push(t.secId); byWod.set(t.wod, a); }
  for (const [wodId, secIds] of byWod) {
    const { data } = await supabase.from('wods').select('sections').eq('id', wodId).single();
    if (!data) continue;
    const sections = data.sections as any[]; let changed = false;
    for (const sec of sections) if (secIds.includes(sec.id) && sec.scoring_fields?.load !== true) {
      sec.scoring_fields = { ...sec.scoring_fields, load: true }; changed = true;
    }
    if (changed) { wodsFixed++; if (APPLY) await supabase.from('wods').update({ sections }).eq('id', wodId); }
  }
  console.log(`\nload:true ${APPLY ? 'fixed' : 'would fix'} on ${wodsFixed} wods`);
  console.log(APPLY ? '🔴 DONE' : '🟢 DRY RUN — re-run with --apply');
}
main().then(() => process.exit(0));
