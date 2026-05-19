import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
async function main() {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: m } = await s
    .from('members')
    .select('id, name, status, gender, account_type')
    .ilike('name', '%peter%kroll%');
  console.log('Members matching "Peter Kroll":');
  if (!m?.length) console.log('  (none)');
  else m.forEach(r => console.log(`  ${r.name} [${r.status}, ${r.gender ?? '-'}, ${r.account_type ?? '-'}]  id=${r.id}`));

  if (m?.length === 1) {
    const { data: lr } = await s
      .from('lift_records')
      .select('id, lift_name, lift_date, weight_kg, reps, rep_max_type')
      .eq('user_id', m[0].id)
      .order('lift_date', { ascending: false });
    console.log(`\nlift_records for ${m[0].name}: ${lr?.length ?? 0} row(s)`);
    lr?.slice(0, 5).forEach(r => console.log(`  ${r.lift_date}  ${r.lift_name}  ${r.weight_kg}kg × ${r.reps} [${r.rep_max_type}]`));
    if ((lr?.length ?? 0) > 5) console.log(`  ... (${(lr?.length ?? 0) - 5} more)`);
  }
}
main();
