/**
 * Deep sweep for the RM-test weight-loss bug class.
 *
 * For every WOD section containing an rm_test lift, compare:
 *   - scoring_fields.load state (true / false / undefined)
 *   - wod_section_results rows for that section: total vs how many carry a weight
 *   - lift_records for that (lift_name, rep_max_type, date)
 *
 * A section is FLAGGED when athletes were scored on it (result rows exist) but
 * the lifted weight is gone (0 rows with weight_result AND no/few lift_records).
 * Service-role required — wod_section_results / lift_records are behind RLS.
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type LiftObj = { name?: string; rm_test?: string };
const findRmLifts = (o: any, out: LiftObj[] = []): LiftObj[] => {
  if (!o || typeof o !== 'object') return out;
  if (o.rm_test && o.name) out.push({ name: o.name, rm_test: o.rm_test });
  for (const v of Object.values(o)) {
    if (Array.isArray(v)) v.forEach((x) => findRmLifts(x, out));
    else if (typeof v === 'object') findRmLifts(v, out);
  }
  return out;
};

interface Candidate {
  wodId: string;
  date: string;
  name: string;
  sectionId: string;
  liftName: string;
  rmTest: string;
  loadState: string;
}

async function main() {
  // 1. Gather all RM-test sections
  const candidates: Candidate[] = [];
  let from = 0;
  while (true) {
    const { data } = await supabase
      .from('wods')
      .select('id, date, workout_name, sections')
      .range(from, from + 499);
    if (!data || data.length === 0) break;
    for (const w of data) {
      for (const sec of (w.sections as any[]) || []) {
        const lifts = findRmLifts(sec);
        if (lifts.length === 0) continue;
        const sf = sec.scoring_fields;
        const loadState = sf === undefined ? 'undefined' : sf === null ? 'null' : `load=${sf.load}`;
        for (const l of lifts) {
          candidates.push({
            wodId: w.id,
            date: w.date,
            name: (w.workout_name || '').slice(0, 38),
            sectionId: sec.id,
            liftName: l.name!,
            rmTest: l.rm_test!,
            loadState,
          });
        }
      }
    }
    if (data.length < 500) break;
    from += 500;
  }

  // 2. For each candidate, fetch wod_section_results for its section + lift_records
  const flagged: Array<Candidate & { rows: number; withWeight: number; liftRecs: number }> = [];
  const clean: Array<Candidate & { rows: number; withWeight: number; liftRecs: number }> = [];

  for (const c of candidates) {
    const { data: wsr } = await supabase
      .from('wod_section_results')
      .select('weight_result')
      .eq('wod_id', c.wodId)
      .eq('section_id', `${c.sectionId}-content-0`);
    const rows = (wsr || []).length;
    const withWeight = (wsr || []).filter((r) => (r.weight_result ?? 0) > 0).length;

    const { count: liftRecs } = await supabase
      .from('lift_records')
      .select('id', { count: 'exact', head: true })
      .eq('lift_name', c.liftName)
      .eq('rep_max_type', c.rmTest)
      .eq('lift_date', c.date);

    const rec = { ...c, rows, withWeight, liftRecs: liftRecs ?? 0 };
    // Flag: athletes were scored on this section, but no weights survive in WSR
    // and there are fewer lift_records than scored athletes.
    if (rows > 0 && withWeight === 0 && (liftRecs ?? 0) < rows) {
      flagged.push(rec);
    } else {
      clean.push(rec);
    }
  }

  console.log(`\nScanned ${candidates.length} RM-test lift sections across all WODs.\n`);
  console.log(`🚩 FLAGGED (scored, weights wiped): ${flagged.length}`);
  flagged
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((f) =>
      console.log(
        `   [${f.date}] ${f.liftName} ${f.rmTest}  rows=${f.rows} weights=${f.withWeight} liftRecs=${f.liftRecs}  ${f.loadState}  "${f.name}" wod=${f.wodId.slice(0, 8)}`
      )
    );

  // Surface load:false sections even if not flagged (latent risk)
  const latentFalse = clean.filter((c) => c.loadState === 'load=false');
  console.log(`\n⚠️  load=false but not flagged (check manually): ${latentFalse.length}`);
  latentFalse
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((f) =>
      console.log(
        `   [${f.date}] ${f.liftName} ${f.rmTest}  rows=${f.rows} weights=${f.withWeight} liftRecs=${f.liftRecs}  "${f.name}" wod=${f.wodId.slice(0, 8)}`
      )
    );

  console.log(`\n✅ Healthy sections: ${clean.length - latentFalse.length}`);
}

main().then(() => process.exit(0));
