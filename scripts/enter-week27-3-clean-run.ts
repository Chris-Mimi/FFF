/**
 * Whiteboard protocol — "2026 Week 27.3": Clean, Run, Farmers Carry, Bear Crawl.
 * 03/07 17:15 (session 556962f1, wod dcb4baf8) + 18:30 (session 83fa6022, wod 1e012314).
 * Scored WOD section-1782650645859-4  [time,track,scaling] (Chris switched load→scale).
 *   time_result = finish time · track '1'/'2' (Run col: ok=Trk1, AB=Trk2) · scaling_level (KB Rx/Sc2).
 * Metcon for time — no lift_records, no benchmark. Miriam Jacht & Patrik Gruber = DNF (no time).
 *
 * Usage: npx tsx scripts/enter-week27-3-clean-run.ts   |   WRITE=1 … to commit.
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
const SEC = 'section-1782650645859-4-content-0';

type Row = { name: string; track: '1' | '2'; scale: 'Rx' | 'Sc2'; time: string | null };
type Session = { label: string; sessionId: string; wodId: string; rows: Row[] };
const DATE = '2026-07-03';

const SESSIONS: Session[] = [
  {
    label: '03/07 17:15', sessionId: '556962f1-0a3f-4550-868a-082b116ae57c', wodId: 'dcb4baf8-bdb0-4fd8-8c24-5bf30c2e367b',
    rows: [
      { name: 'Nikolina Vlasalija', track: '1', scale: 'Rx',  time: '24:32' },
      { name: 'Valerie Mesenburg',  track: '1', scale: 'Rx',  time: '15:20' },
      { name: 'Miriam Jacht',       track: '2', scale: 'Rx',  time: null },     // DNF
      { name: 'Paul Bielenski',     track: '1', scale: 'Rx',  time: '21:41' },
      { name: 'Lukas Simnacher',    track: '1', scale: 'Rx',  time: '15:25' },
      { name: 'Daniel Braatz',      track: '1', scale: 'Rx',  time: '15:02' },
      { name: 'Patrik Gruber',      track: '2', scale: 'Rx',  time: null },     // DNF
      { name: 'Wayne Lucas',        track: '2', scale: 'Rx',  time: '15:08' },
    ],
  },
  {
    label: '03/07 18:30', sessionId: '83fa6022-d408-4cb7-9135-b1ed71cd00c4', wodId: '1e012314-1104-480f-95ec-3b2961e199f8',
    rows: [
      { name: 'Daniela Simm',        track: '1', scale: 'Rx',  time: '22:30' },
      { name: 'Franziska Herndorf',  track: '1', scale: 'Rx',  time: '23:50' },
      { name: 'Bodo Lehmann',        track: '1', scale: 'Sc2', time: '22:48' },
      { name: 'Sven Hujo',           track: '1', scale: 'Rx',  time: '22:30' },
      { name: 'Chris Hiles',         track: '1', scale: 'Rx',  time: '20:28' },
    ],
  },
];

(async () => {
  console.log(`\n=== Week 27.3 Clean/Run — ${WRITE ? 'WRITE' : 'DRY RUN'} ===`);
  let wsr = 0, fail = 0;
  for (const s of SESSIONS) {
    console.log(`\n--- ${s.label} (wod ${s.wodId}) ---`);
    const { data: bk } = await sb.from('bookings').select('member_id, members(name)').eq('session_id', s.sessionId).eq('status', 'confirmed');
    const byName = new Map<string, string>();
    (bk || []).forEach((b: any) => { if (b.members?.name) byName.set(b.members.name, b.member_id); });
    for (const r of s.rows) {
      const memberId = byName.get(r.name);
      if (!memberId) { console.log(`  ❌ NOT confirmed-booked: ${r.name}`); fail++; continue; }
      console.log(`  ${WRITE ? '✍️ ' : '•'} ${r.name.padEnd(22)} Trk${r.track} ${r.scale.padEnd(3)} ${r.time ?? 'DNF'}`);
      if (!WRITE) { wsr++; continue; }
      await sb.from('wod_section_results').delete().eq('wod_id', s.wodId).eq('section_id', SEC).eq('workout_date', DATE).eq('user_id', memberId);
      const rec: any = { wod_id: s.wodId, section_id: SEC, workout_date: DATE, user_id: memberId, member_id: memberId, whiteboard_name: null, track: r.track, scaling_level: r.scale };
      if (r.time) rec.time_result = r.time;
      const e = (await sb.from('wod_section_results').insert(rec)).error;
      if (e) { console.log(`     ❌ WSR: ${e.message}`); fail++; } else wsr++;
    }
  }
  console.log(`\nDone. ${WRITE ? 'Written' : 'Dry run'} — WSR=${wsr} fail=${fail}.\n`);
})();
