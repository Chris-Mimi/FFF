/**
 * Count remaining orphan wod_section_results rows: whiteboard_name set,
 * member_id null. Lists distinct whiteboard_names + occurrence count.
 *
 * Usage: npx tsx scripts/check-wsr-orphans.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const { data, error } = await supabase
    .from('wod_section_results')
    .select('id, whiteboard_name, workout_date')
    .not('whiteboard_name', 'is', null)
    .is('member_id', null);
  if (error) { console.error(error.message); process.exit(1); }

  console.log(`Total orphan WSR rows: ${data?.length ?? 0}\n`);
  if (!data?.length) return;

  const counts = new Map<string, number>();
  for (const r of data) {
    counts.set(r.whiteboard_name, (counts.get(r.whiteboard_name) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  console.log('whiteboard_name           count');
  console.log('-'.repeat(40));
  for (const [name, count] of sorted) {
    console.log(`  ${name.padEnd(25)} ${count}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
