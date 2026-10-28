/**
 * S425 — Week 44.2 corrections (Chris):
 *  1. Chris Hiles trained 27.10 17:15 (he booked himself in), not 28.10 09:30 →
 *     move his 2 speed-test WSR rows (SkiErg + Airbike) onto the 27.10 17:15 wod
 *     and re-date his 2 Forge Benchmark entries.
 *  2. Magdalena Gebska 27.10 Rower 2km = 10:37.5 (I had read 10:17.5).
 * Guarded: each step must touch exactly the expected number of rows.
 *
 *   npx tsx scripts/fix-week44-chris-magdalena.ts [--commit]
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const COMMIT = process.argv.includes('--commit');

const WOD_2810_0930 = 'ca20de17-6d62-48fa-949a-61236a36ef1e';
const WOD_2710_1715 = '3aac89c6-f7e0-4dba-beab-676a7ba56f6a';
const WOD_2710_1830 = '7826a83c-671b-4b45-9e9c-028183f98d76';
const SKI = 'cfc5c45d-353a-4e5f-950b-e2a60c13d16e';
const ROW = 'db4fcef9-fc55-4e06-a08f-b83b08064d13';
const AIR = '2c6b450d-d26f-4d94-896f-6c34685ed3e7';

async function memberId(name: string) {
  const { data, error } = await db.from('members').select('id, name').eq('name', name);
  if (error) throw error;
  if (data?.length !== 1) throw new Error(`${name}: ${data?.length} members`);
  return data[0].id as string;
}

function expect(n: number | undefined, want: number, what: string) {
  if (n !== want) throw new Error(`${what}: ${n} rows (expected ${want}) — stopping`);
  console.log(`  ${what}: ${n} row(s)`);
}

async function main() {
  const chris = await memberId('Chris Hiles');
  const magda = await memberId('Magdalena Gebska');

  // Chris must be booked on 27.10 17:15 (he added himself).
  const { data: sess, error: sErr } = await db.from('weekly_sessions').select('id').eq('workout_id', WOD_2710_1715);
  if (sErr) throw sErr;
  const { data: bk, error: bkErr } = await db.from('bookings').select('id')
    .eq('session_id', sess![0].id).eq('member_id', chris).eq('status', 'confirmed');
  if (bkErr) throw bkErr;
  expect(bk?.length, 1, 'Chris confirmed booking on 27.10 17:15');

  const { data: wsr, error: wErr } = await db.from('wod_section_results').select('id, section_id, time_result')
    .eq('wod_id', WOD_2810_0930).eq('member_id', chris);
  if (wErr) throw wErr;
  expect(wsr?.length, 2, 'Chris WSR on 28.10 09:30');
  const { data: clash, error: cErr } = await db.from('wod_section_results').select('id')
    .eq('wod_id', WOD_2710_1715).eq('member_id', chris);
  if (cErr) throw cErr;
  expect(clash?.length, 0, 'Chris WSR already on 27.10 17:15');

  const { data: bres, error: bErr } = await db.from('benchmark_results').select('id, forge_benchmark_id')
    .eq('user_id', chris).eq('result_date', '2026-10-28').in('forge_benchmark_id', [SKI, AIR]);
  if (bErr) throw bErr;
  expect(bres?.length, 2, 'Chris Forge Benchmark entries dated 28.10');

  const { data: mw, error: mErr } = await db.from('wod_section_results').select('id, time_result')
    .eq('wod_id', WOD_2710_1830).eq('member_id', magda).eq('time_result', '10:17.5');
  if (mErr) throw mErr;
  expect(mw?.length, 1, 'Magdalena WSR 10:17.5');
  const { data: mb, error: mbErr } = await db.from('benchmark_results').select('id')
    .eq('user_id', magda).eq('result_date', '2026-10-27').eq('forge_benchmark_id', ROW).eq('time_result', '10:17.5');
  if (mbErr) throw mbErr;
  expect(mb?.length, 1, 'Magdalena Forge Benchmark 10:17.5');

  if (!COMMIT) { console.log('\nDry run — add --commit.'); return; }

  const now = new Date().toISOString();
  const r1 = await db.from('wod_section_results').update({ wod_id: WOD_2710_1715, workout_date: '2026-10-27', updated_at: now })
    .in('id', wsr!.map(r => r.id));
  if (r1.error) throw r1.error;
  const r2 = await db.from('benchmark_results').update({ result_date: '2026-10-27', updated_at: now }).in('id', bres!.map(r => r.id));
  if (r2.error) throw r2.error;
  const r3 = await db.from('wod_section_results').update({ time_result: '10:37.5', updated_at: now }).eq('id', mw![0].id);
  if (r3.error) throw r3.error;
  const r4 = await db.from('benchmark_results').update({ time_result: '10:37.5', result_value: '10:37.5', updated_at: now }).eq('id', mb![0].id);
  if (r4.error) throw r4.error;
  console.log('\n✅ Chris moved to 27.10 17:15 (2 WSR + 2 Forge Benchmark dates); Magdalena → 10:37.5');
  // publish_sections on the 27.10 17:15 wod already includes the Ski + Airbike sections (preflight).
}
main().catch(e => { console.error(e); process.exit(1); });
