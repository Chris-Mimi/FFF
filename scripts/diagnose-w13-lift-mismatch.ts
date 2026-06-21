import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, key);

const DATES = ['2026-03-23', '2026-03-24', '2026-04-01'];

async function main() {
  // 1. WODs on those dates — show section lift names
  const { data: wods } = await supabase
    .from('wods')
    .select('id, date, workout_name, sections')
    .in('date', DATES)
    .order('date');

  console.log('=== WODs on W13 dates ===');
  for (const w of wods || []) {
    const sections = (w.sections || []) as any[];
    const liftSecs = sections
      .map((s, i) => ({ i, s }))
      .filter(({ s }) =>
        JSON.stringify(s).match(/rm_test|lift|squat|pendlay|row/i)
      );
    if (!/squat|pendlay|row|testing/i.test(w.workout_name)) continue;
    console.log(`\n[${w.date}] "${w.workout_name}" wod=${w.id}`);
    for (const { i, s } of liftSecs) {
      const liftObjs = findLifts(s);
      for (const lo of liftObjs) {
        console.log(
          `   section[${i}] id=${s.id}  lift.name="${lo.name}" rm_test=${lo.rm_test ?? ''} reps=${lo.reps ?? ''} sets=${lo.sets ?? ''}`
        );
      }
    }
  }

  // 2. lift_records on those dates
  const { data: lr } = await supabase
    .from('lift_records')
    .select('lift_name, rep_max_type, rep_scheme, lift_date, weight_kg, user_id, wod_id')
    .in('lift_date', DATES)
    .order('lift_date');

  console.log('\n\n=== lift_records on W13 dates (grouped by name|rmtype) ===');
  const groups = new Map<string, number>();
  for (const r of lr || []) {
    const k = `${r.lift_date} | "${r.lift_name}" | rm=${r.rep_max_type ?? ''} | scheme=${r.rep_scheme ?? ''}`;
    groups.set(k, (groups.get(k) || 0) + 1);
  }
  [...groups.entries()].sort().forEach(([k, n]) => console.log(`  ${n.toString().padStart(3)}x  ${k}`));

  // 3. barbell_lifts library — current names matching squat/row
  const { data: bl } = await supabase
    .from('barbell_lifts')
    .select('name, acronym')
    .or('name.ilike.%squat%,name.ilike.%row%,name.ilike.%pendlay%');
  console.log('\n=== barbell_lifts library (squat/row) ===');
  (bl || []).forEach((b) => console.log(`  "${b.name}" acr=${b.acronym ?? ''}`));
}

function findLifts(obj: any, out: any[] = []): any[] {
  if (!obj || typeof obj !== 'object') return out;
  if (obj.name && (obj.rm_test || obj.reps !== undefined || obj.sets !== undefined)) {
    out.push(obj);
  }
  for (const v of Object.values(obj)) {
    if (Array.isArray(v)) v.forEach((x) => findLifts(x, out));
    else if (typeof v === 'object') findLifts(v, out);
  }
  return out;
}

main().then(() => process.exit(0));
