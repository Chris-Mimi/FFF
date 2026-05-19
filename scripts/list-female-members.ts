/**
 * One-shot diagnostic: list all female members so we can map S357
 * lift-import athlete keys → DB members.name.
 * Uses SUPABASE_SERVICE_ROLE_KEY (RLS blocks anon).
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data, error } = await supabase
    .from('members')
    .select('name, gender, status, account_type')
    .eq('gender', 'F')
    .order('name');
  if (error) { console.error(error); process.exit(1); }
  console.log(`Found ${data?.length ?? 0} female members:`);
  data?.forEach(m => console.log(`  ${m.name}  [${m.status}, ${m.account_type ?? '-'}]`));
}
main();
