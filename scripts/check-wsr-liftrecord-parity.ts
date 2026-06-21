/**
 * Integrity / detection net for silent lift-record loss (S385).
 *
 * Every weighted RM-test result in wod_section_results for a REGISTERED athlete
 * (member_id set) should have a matching lift_records row (same user, lift, rep-
 * max type, date). When they diverge, a lift PR has been silently lost — exactly
 * the April-import-reset failure that hid for ~2 months because nothing compared
 * the two tables.
 *
 * Run this with the periodic orphan/data-integrity checks. Read-only.
 * Service-role required (lift_records / wod_section_results are behind RLS).
 *
 *   npx tsx scripts/check-wsr-liftrecord-parity.ts
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
  // 1. Build map: `${wod_id}|${section-content-id}` -> { liftName, rmTest, date }
  const sectionLift = new Map<string, { liftName: string; rmTest: string; date: string }>();
  let from = 0;
  while (true) {
    const { data } = await supabase.from('wods').select('id, date, sections').range(from, from + 499);
    if (!data || !data.length) break;
    for (const w of data) {
      for (const sec of (w.sections as any[]) || []) {
        const lifts = findRmLifts(sec);
        if (lifts.length !== 1) continue; // 1 RM lift per section is the norm; skip ambiguous
        sectionLift.set(`${w.id}|${sec.id}-content-0`, {
          liftName: lifts[0].name,
          rmTest: lifts[0].rmTest,
          date: w.date as string,
        });
      }
    }
    if (data.length < 500) break;
    from += 500;
  }

  // 2. Pull all lift_records into a lookup set (paginated — table is past 1k rows)
  const lrSet = new Set<string>();
  from = 0;
  while (true) {
    const { data } = await supabase
      .from('lift_records')
      .select('user_id, lift_name, rep_max_type, lift_date')
      .range(from, from + 999);
    if (!data || !data.length) break;
    for (const r of data) lrSet.add(`${r.user_id}|${r.lift_name}|${r.rep_max_type}|${r.lift_date}`);
    if (data.length < 1000) break;
    from += 1000;
  }

  // 3. Walk weighted, registered RM-section WSR rows; flag any with no lift_record
  const { data: mem } = await supabase.from('members').select('id, name');
  const id2name = new Map((mem || []).map((m: any) => [m.id, m.name]));

  const missing: string[] = [];
  let checked = 0;
  from = 0;
  while (true) {
    const { data } = await supabase
      .from('wod_section_results')
      .select('wod_id, section_id, member_id, weight_result, workout_date')
      .not('member_id', 'is', null)
      .not('weight_result', 'is', null)
      .range(from, from + 999);
    if (!data || !data.length) break;
    for (const r of data) {
      if ((r.weight_result ?? 0) <= 0) continue;
      const lift = sectionLift.get(`${r.wod_id}|${r.section_id}`);
      if (!lift) continue; // not an RM-test lift section
      checked++;
      const key = `${r.member_id}|${lift.liftName}|${lift.rmTest}|${r.workout_date}`;
      if (!lrSet.has(key)) {
        missing.push(
          `${lift.date}  ${(id2name.get(r.member_id!) || r.member_id!.slice(0, 8)).padEnd(22)} ${lift.liftName} ${lift.rmTest}: ${r.weight_result}kg  (wod ${r.wod_id.slice(0, 8)})`
        );
      }
    }
    if (data.length < 1000) break;
    from += 1000;
  }

  console.log(`Checked ${checked} weighted RM results from registered athletes.\n`);
  if (missing.length === 0) {
    console.log('✅ Parity OK — every weighted RM result has a matching lift_record.');
  } else {
    console.log(`🚩 ${missing.length} results with NO matching lift_record (silent PR loss):`);
    missing.sort().forEach((m) => console.log('   ' + m));
  }
  return missing.length;
}
// Exit non-zero when records are missing so CI (the monthly GitHub Action) fails
// and emails Chris. Exit 2 on an unexpected error so a crash can't read as "OK".
main()
  .then((bad) => process.exit(bad > 0 ? 1 : 0))
  .catch((err) => {
    console.error('❌ parity check crashed:', err);
    process.exit(2);
  });
