/**
 * S397 — rebuild Sergej Felsing's missing Deadlift 5RM lift_record.
 * His 2026-07-01 "DL Testing 5RM" WSR (100kg) shows on the leaderboard but has
 * no lift_records row (S395 Sergej-cleanup leftover), so it's absent from his
 * personal Lifts/Records view. INSERT-only, deduped.
 *   npx tsx scripts/rebuild-sergej-deadlift-liftrecord.ts --write
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const WRITE = process.argv.includes('--write');

async function main() {
  const { data: mem } = await s.from('members').select('id, name');
  const sf = (mem ?? []).find(m => m.name === 'Sergej Felsing');
  if (!sf) { console.log('Sergej not found'); return; }

  const rec = {
    user_id: sf.id,
    lift_name: 'Deadlift',
    weight_kg: 100,
    reps: 5,
    calculated_1rm: Math.round(100 * (1 + 5 / 30) * 100) / 100, // Epley = 116.67
    rep_max_type: '5RM',
    lift_date: '2026-07-01',
  };

  const { data: ex } = await s.from('lift_records').select('id')
    .eq('user_id', sf.id).eq('lift_name', 'Deadlift')
    .eq('rep_max_type', '5RM').eq('lift_date', '2026-07-01').limit(1);
  if (ex?.length) { console.log('already exists — nothing to do'); return; }

  console.log('plan:', JSON.stringify(rec));
  if (!WRITE) { console.log('(dry-run — pass --write)'); return; }
  const { error } = await s.from('lift_records').insert(rec);
  console.log(error ? `ERROR: ${error.message}` : '✅ inserted Sergej Deadlift 5RM 100kg');
}
main().catch(e => { console.error(e); process.exit(2); });
