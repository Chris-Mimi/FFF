/**
 * Whiteboard protocol — "2026 Week 27.2" right block: "Annie" (05/07 10:00).
 * Session 59abcd87-8a01-4a7b-9d9d-a0549083de47, wod 33ba3da9-…, date 2026-07-05.
 * WOD "Handstand Drills plus Annie". Scored section:
 *   section-1780825794590-4  [reps,time,scaling]  benchmark "Annie" (For Time).
 * Writes BOTH: wod_section_results (coach modal + leaderboard) AND benchmark_results
 * (athlete Records/Benchmarks). Score = Time + DUs scaling level.
 * Gloria Stoffer = AB (DNF, no time) → SKIPPED, Chris enters manually.
 *
 * Usage: npx tsx scripts/enter-week27-2-annie.ts   |   WRITE=1 … to commit.
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const WRITE = process.env.WRITE === '1';

const SESSION = '59abcd87-8a01-4a7b-9d9d-a0549083de47';
const WOD = '33ba3da9-5c94-4e78-b70b-6819dff36810';
const DATE = '2026-07-05';
const SEC = 'section-1780825794590-4-content-0';
const BENCH_ID = 'fa92e1d7-539e-41f5-a9f2-56236da064c4';

type Row = { name: string; scale: 'Rx' | 'Sc1' | 'Sc2' | 'Sc3'; time: string };
const ROWS: Row[] = [
  { name: 'Franziska Herndorf', scale: 'Sc3', time: '13:08' },
  { name: 'Susi Glocker',       scale: 'Sc3', time: '11:30' },
  { name: 'Justine Baumstark',  scale: 'Sc3', time: '16:00' },
  { name: 'Sonja Hujo',         scale: 'Sc3', time: '14:22' },
  { name: 'Kathrin Mühlen',     scale: 'Rx',  time: '14:12' },
  { name: 'Anna Krautwald',     scale: 'Sc3', time: '15:30' },
  { name: 'Michael Weber',      scale: 'Sc3', time: '10:35' },
  { name: 'Christian Tanner',   scale: 'Sc2', time: '15:50' },
  { name: 'Stefan G',           scale: 'Sc3', time: '11:45' },
  { name: 'Sven Hujo',          scale: 'Sc3', time: '11:48' },
];

(async () => {
  console.log(`\n=== Week 27.2 "Annie" — ${WRITE ? 'WRITE' : 'DRY RUN'} ===`);
  const { data: bk } = await sb.from('bookings').select('member_id, members(name)').eq('session_id', SESSION).eq('status', 'confirmed');
  const byName = new Map<string, string>();
  (bk || []).forEach((b: any) => { if (b.members?.name) byName.set(b.members.name, b.member_id); });

  let wsr = 0, br = 0, fail = 0;
  for (const r of ROWS) {
    const memberId = byName.get(r.name);
    if (!memberId) { console.log(`  ❌ NOT confirmed-booked: ${r.name}`); fail++; continue; }
    console.log(`  ${WRITE ? '✍️ ' : '•'} ${r.name.padEnd(22)} ${r.scale}  ${r.time}`);
    if (!WRITE) { wsr++; br++; continue; }

    // WSR
    await sb.from('wod_section_results').delete().eq('wod_id', WOD).eq('section_id', SEC).eq('workout_date', DATE).eq('user_id', memberId);
    const e1 = (await sb.from('wod_section_results').insert({
      wod_id: WOD, section_id: SEC, workout_date: DATE,
      user_id: memberId, member_id: memberId, whiteboard_name: null,
      time_result: r.time, scaling_level: r.scale,
    } as any)).error;
    if (e1) { console.log(`     ❌ WSR: ${e1.message}`); fail++; } else wsr++;

    // benchmark_results
    await sb.from('benchmark_results').delete().eq('user_id', memberId).eq('benchmark_id', BENCH_ID).eq('result_date', DATE);
    const e2 = (await sb.from('benchmark_results').insert({
      user_id: memberId, benchmark_id: BENCH_ID, benchmark_name: 'Annie', benchmark_type: 'For Time',
      result_value: r.time, time_result: r.time, scaling_level: r.scale, result_date: DATE,
    } as any)).error;
    if (e2) { console.log(`     ❌ benchmark_results: ${e2.message}`); fail++; } else br++;
  }
  console.log(`\nDone. ${WRITE ? 'Written' : 'Dry run'} — WSR=${wsr} benchmark_results=${br} fail=${fail}. (Gloria Stoffer skipped — DNF)\n`);
})();
