import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, key);

const WODS = [
  ['2026-03-23', 'efd2abea-941c-4441-9184-a30a14036f9d'],
  ['2026-03-23', 'e5ad0c30-df00-489a-9178-cc73b0bdba0d'],
  ['2026-03-24', 'e954edad-e1d6-4304-a2b4-36e7ef991c96'],
  ['2026-03-24', 'a1f2d37c-31bd-4605-a3e8-7f77f40f366e'],
  ['2026-04-01', '5c3fe17b-b7b8-4dbe-901e-cd9f0c073449'],
];
const LIFT_SECS = ['section-1774269586230-content-0', 'section-1774191503053-4-content-0'];

async function main() {
  console.log('=== wod_section_results for the 2 lift sections, per WOD ===');
  for (const [date, wodId] of WODS) {
    const { data } = await supabase
      .from('wod_section_results')
      .select('section_id, member_id, user_id, whiteboard_name, weight_result, scaling_level')
      .eq('wod_id', wodId)
      .in('section_id', LIFT_SECS);
    const total = (data || []).length;
    const withWeight = (data || []).filter((r) => (r.weight_result ?? 0) > 0).length;
    console.log(`\n[${date}] wod=${wodId.slice(0, 8)}  rows=${total}  withWeight=${withWeight}`);
    for (const r of data || []) {
      const who = r.whiteboard_name || `member:${(r.member_id || r.user_id || '?').toString().slice(0, 8)}`;
      console.log(`   ${r.section_id.includes('1774269586230') ? '3RM' : '1RM'}  ${who.padEnd(24)} wt=${r.weight_result ?? ''}`);
    }
  }

  console.log('\n\n=== ALL wod_section_results per WOD (every section) — counts ===');
  for (const [date, wodId] of WODS) {
    const { data } = await supabase
      .from('wod_section_results')
      .select('section_id')
      .eq('wod_id', wodId);
    const bySec = new Map<string, number>();
    for (const r of data || []) bySec.set(r.section_id, (bySec.get(r.section_id) || 0) + 1);
    console.log(`\n[${date}] wod=${wodId.slice(0, 8)} totalRows=${(data || []).length}`);
    [...bySec.entries()].sort().forEach(([s, n]) => console.log(`   ${n.toString().padStart(3)}x ${s}`));
  }

  console.log('\n\n=== Surviving lift_records (created_at / updated_at) ===');
  const { data: lr } = await supabase
    .from('lift_records')
    .select('lift_name, rep_max_type, lift_date, weight_kg, user_id, wod_id, created_at, updated_at')
    .in('lift_date', ['2026-03-23', '2026-03-24', '2026-04-01'])
    .order('created_at');
  for (const r of lr || []) {
    console.log(
      `   ${r.lift_date} ${r.lift_name} ${r.rep_max_type ?? ''} wt=${r.weight_kg} wod=${(r.wod_id || '?').toString().slice(0, 8)} created=${r.created_at} updated=${r.updated_at}`
    );
  }
}
main().then(() => process.exit(0));
