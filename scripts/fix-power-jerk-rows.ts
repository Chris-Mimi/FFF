/**
 * One-shot: relabel 5 lift_records rows from 'Power Jerk' → 'Push Jerk'.
 *
 * "Power Jerk" was an incorrect entry in the importer's LIFT_NAME_MAP
 * (S315). The Forge catalog (barbell_lifts) only contains "Push Jerk",
 * so these 5 rows were orphaned — present in lift_records but invisible
 * on the athlete-app Lifts tab.
 *
 * Pass --apply to commit. Default is dry-run.
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const APPLY = process.argv.includes('--apply');

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: before, error: selErr } = await s
    .from('lift_records')
    .select('id, lift_name, lift_date, weight_kg, reps')
    .eq('lift_name', 'Power Jerk');
  if (selErr) { console.error(selErr); process.exit(1); }
  console.log(`Before: ${before?.length ?? 0} row(s) with lift_name='Power Jerk'`);

  if (!APPLY) {
    console.log('\nDry-run only. Re-run with --apply to commit.');
    return;
  }

  const { error: updErr, count } = await s
    .from('lift_records')
    .update({ lift_name: 'Push Jerk' }, { count: 'exact' })
    .eq('lift_name', 'Power Jerk');
  if (updErr) { console.error(updErr); process.exit(1); }
  console.log(`✅ Updated ${count} row(s) → 'Push Jerk'`);

  const { data: after } = await s
    .from('lift_records')
    .select('id')
    .eq('lift_name', 'Power Jerk');
  console.log(`Verify: ${after?.length ?? 0} remaining row(s) with 'Power Jerk' (should be 0)`);
}
main();
