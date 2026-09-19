/**
 * Audit: RM-test lift sections whose `scoring_fields.load` is not true.
 *
 * Why this matters (S385): the edit-cleanup in useWODOperations nulls
 * `weight_result` when a section's `load` flips true -> false on save. An RM-test
 * section with load off is therefore a live hazard — the recorded weights survive
 * until the next time that workout is saved, then vanish silently. That is how two
 * months of Back Squat / Front Squat / Pendlay PRs were lost before anyone noticed.
 *
 * Read-only. Reports every offending section and whether it already holds weights.
 *
 * Run: npx tsx scripts/audit-rm-sections-load-off.ts
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

(async () => {
  const wods: any[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await sb.from('wods')
      .select('id, title, workout_name, date, sections').range(from, from + 499);
    if (error) throw new Error(error.message);
    wods.push(...(data ?? []));
    if (!data || data.length < 500) break;
  }
  console.log(`scanned ${wods.length} wods`);

  const wsr: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('wod_section_results')
      .select('wod_id, section_id, weight_result').range(from, from + 999);
    if (error) throw new Error(error.message);
    wsr.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  const weightsBy = new Map<string, number>();
  for (const r of wsr) {
    if (r.weight_result == null) continue;
    const k = `${r.wod_id}|${String(r.section_id).replace(/-content-0$/, '')}`;
    weightsBy.set(k, (weightsBy.get(k) ?? 0) + 1);
  }

  const hits: any[] = [];
  for (const w of wods) {
    for (const s of (w.sections as any[]) ?? []) {
      const rmLift = (s.lifts ?? []).find((l: any) => l.rm_test);
      if (!rmLift) continue;
      if (s.scoring_fields?.load === true) continue;
      hits.push({
        date: w.date, title: w.workout_name || w.title, wodId: w.id, sectionId: s.id,
        lift: rmLift.name, rm: rmLift.rm_test,
        sf: s.scoring_fields === undefined ? 'unset' : JSON.stringify(s.scoring_fields),
        weights: weightsBy.get(`${w.id}|${s.id}`) ?? 0,
      });
    }
  }
  hits.sort((a, b) => (a.date < b.date ? 1 : -1));

  console.log(`\nRM sections with load NOT true: ${hits.length}`);
  const atRisk = hits.filter(h => h.weights > 0);
  console.log(`of those, holding recorded weights RIGHT NOW: ${atRisk.length}\n`);
  for (const h of hits) {
    const flag = h.weights > 0 ? `⚠️  ${h.weights} weights AT RISK` : '   (no weights recorded)';
    console.log(`${flag}  ${h.date}  ${h.lift} ${h.rm}  "${String(h.title).slice(0, 44)}"`);
    console.log(`      wod=${h.wodId}  section=${h.sectionId}  scoring_fields=${h.sf}`);
  }
})();
