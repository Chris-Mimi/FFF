/**
 * S423 — delete Chris Hiles' stray Front Squat 5RM 12 kg Lifts entry (20.04.26).
 * Also lists any WSR row with the same weight on that date, so the parity
 * check doesn't flag it afterwards.
 *
 *   npx tsx scripts/delete-chris-fs-12kg.ts            # dry run
 *   npx tsx scripts/delete-chris-fs-12kg.ts --commit
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const COMMIT = process.argv.includes('--commit');

async function main() {
  const { data: mem, error: mErr } = await db.from('members').select('id, name').eq('name', 'Chris Hiles');
  if (mErr) throw new Error(mErr.message);
  if (mem?.length !== 1) throw new Error(`Chris Hiles matched ${mem?.length} members`);
  const uid = mem[0].id;

  const { data: recs, error: rErr } = await db
    .from('lift_records')
    .select('*')
    .eq('user_id', uid)
    .eq('lift_name', 'Front Squat')
    .eq('lift_date', '2026-04-20')
    .eq('weight_kg', 12);
  if (rErr) throw new Error(rErr.message);
  console.log(`lift_records to delete (${recs?.length ?? 0}):`);
  for (const r of recs ?? []) console.log('  ', JSON.stringify(r));

  const { data: wods, error: wErr } = await db.from('wods').select('id, workout_name').eq('date', '2026-04-20');
  if (wErr) throw new Error(wErr.message);
  const { data: wsr, error: sErr } = await db
    .from('wod_section_results')
    .select('id, wod_id, section_id, weight_result')
    .eq('user_id', uid)
    .in('wod_id', (wods ?? []).map(w => w.id));
  if (sErr) throw new Error(sErr.message);
  console.log(`\nChris's WSR rows on 2026-04-20 (${wsr?.length ?? 0}):`);
  for (const r of wsr ?? []) console.log('  ', JSON.stringify(r));

  // The paired score row: same wod, the FS 5RM section, 12 kg. Chris wasn't booked
  // into this 18:15 class — the whole score is a stray, not just the Lifts entry.
  const stray = (wsr ?? []).filter(r =>
    r.wod_id === recs?.[0]?.wod_id && r.section_id === 'section-1776596966051-3-content-0' && r.weight_result === 12);

  if (recs?.length !== 1) throw new Error('Expected exactly 1 lift_record — not deleting.');
  if (stray.length !== 1) throw new Error(`Expected exactly 1 paired WSR row, found ${stray.length} — not deleting.`);
  if (!COMMIT) { console.log('\nDry run — add --commit to delete both.'); return; }

  const { error: dErr } = await db.from('lift_records').delete().eq('id', recs[0].id);
  if (dErr) throw new Error(dErr.message);
  console.log('\n✅ lift_record deleted');
  const { error: wDel } = await db.from('wod_section_results').delete().eq('id', stray[0].id);
  if (wDel) throw new Error(wDel.message);
  console.log('✅ WSR row deleted');
}

main().catch(e => { console.error(e); process.exit(1); });
