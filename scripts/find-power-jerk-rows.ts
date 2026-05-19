/**
 * One-shot diagnostic: show every lift_records row where lift_name='Power Jerk'.
 * "Power Jerk" isn't in barbell_lifts so these rows render nowhere in the app.
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data, error } = await s
    .from('lift_records')
    .select('id, user_id, lift_name, weight_kg, reps, rep_max_type, lift_date')
    .eq('lift_name', 'Power Jerk')
    .order('lift_date', { ascending: false });
  if (error) { console.error(error); process.exit(1); }

  console.log(`Found ${data?.length ?? 0} row(s) with lift_name='Power Jerk':\n`);
  if (!data?.length) return;

  // Resolve user_ids to member names for readability
  const userIds = [...new Set(data.map(r => r.user_id))];
  const { data: members } = await s
    .from('members')
    .select('id, name')
    .in('id', userIds);
  const nameById = new Map((members ?? []).map(m => [m.id, m.name]));

  data.forEach(r => {
    console.log(
      `  ${r.lift_date}  ${nameById.get(r.user_id) ?? r.user_id}  ` +
      `${r.weight_kg}kg × ${r.reps}  [${r.rep_max_type}]  id=${r.id}`
    );
  });
}
main();
