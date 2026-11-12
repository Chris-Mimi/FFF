/**
 * Probe: print a member's full row + their subscriptions rows (live).
 *   npx tsx scripts/probe-member.ts "<name part>"
 */
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data, error } = await db.from('members').select('*').ilike('name', `%${process.argv[2]}%`);
  if (error) throw new Error(`members: ${error.message}`);
  for (const m of data) {
    const set = Object.fromEntries(Object.entries(m).filter(([, v]) => v !== null && v !== '' && !(Array.isArray(v) && !v.length)));
    console.log(JSON.stringify(set, null, 1));
    const subs = await db.from('subscriptions').select('*').eq('user_id', m.id);
    console.log('subscriptions:', subs.error ? 'ERR ' + subs.error.message : JSON.stringify(subs.data, null, 1));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
