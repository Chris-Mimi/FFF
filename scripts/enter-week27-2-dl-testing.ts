/**
 * Whiteboard protocol — "2026 Week 27.2" (WK27, 01/07/26 17:15 & 18:30).
 * WOD: "DL Testing 5RM, Plank Hold, Strict Pull-up, Handstand Hold".
 * 5 scored sections (both sessions share identical section IDs):
 *   Deadlift 5RM        section-1782901773992      [load]           -> weight_result (+ lift_records, members only)
 *   80% DL AMRAP (3min) section-1782903061126      [load,reps]      -> weight_result + reps_result
 *   Plank Hold (3min)   section-1782650643558-4    [track,checkbox,max_time]
 *                         "ok" = Track 1 unbroken -> track '1', task_completed true
 *                         a time = Track 2 broken/summed -> track '2', time_result "m:ss"
 *   Strict Pull-up      section-1782903385173      [reps,scaling]   -> reps_result + scaling_level
 *   Handstand Hold      section-1782903461923      [scaling,max_time] -> scaling_level + time_result
 * WSR section key = "<section.id>-content-0".
 *
 * Pull-up band -> scaling (strongest band wins):
 *   B(Blue)=Sc3, G(Green)=Sc2, P/Bk/R=Sc1, Rx=strict.  B+G/B+P=Sc3, G+P=Sc2.
 * HS "Sc" = Sc1. Lukas HS = "—" (skipped, no HS row).
 * Sergej Felsing = a trial (whiteboard_name row, no lift_records).
 *
 * Usage:  npx tsx scripts/enter-week27-2-dl-testing.ts          (dry run)
 *         WRITE=1 npx tsx scripts/enter-week27-2-dl-testing.ts  (write)
 *         ONLY="01/07 17:15" ...                                (one session)
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
const ONLY = process.env.ONLY;

const SEC = {
  dl:    'section-1782901773992-content-0',
  amrap: 'section-1782903061126-content-0',
  plank: 'section-1782650643558-4-content-0',
  pull:  'section-1782903385173-content-0',
  hs:    'section-1782903461923-content-0',
};

type Scale = 'Rx' | 'Sc1' | 'Sc2' | 'Sc3';
type Row = {
  name: string; trial?: boolean;
  dl: number;                         // Deadlift 5RM kg
  amrapReps: number; amrapWt: number; // 80% AMRAP
  plankOk?: boolean; plankTime?: string; // Track1 unbroken OR Track2 summed time
  pullReps: number; pullScale: Scale;
  hsTime?: string | null; hsScale?: Scale; // null => skip HS
};

type Session = { label: string; sessionId: string; wodId: string; date: string; rows: Row[] };

const SESSIONS: Session[] = [
  {
    label: '01/07 17:15', sessionId: '9f5cc236-ab9d-4a87-9d25-d3e8b2a043e1',
    wodId: '6625865d-e563-4857-9a4e-9dc063846608', date: '2026-07-01',
    rows: [
      { name: 'Valerie Mesenburg', dl: 60,  amrapReps: 23, amrapWt: 47.5, plankOk: true,          pullReps: 30, pullScale: 'Sc2', hsTime: '2:05', hsScale: 'Sc1' },
      { name: 'Carla Courtois',    dl: 60,  amrapReps: 29, amrapWt: 47.5, plankTime: '2:36',       pullReps: 19, pullScale: 'Sc3', hsTime: '2:30', hsScale: 'Rx'  },
      { name: 'Leah Mesche',       dl: 55,  amrapReps: 22, amrapWt: 42.5, plankTime: '2:20',       pullReps: 17, pullScale: 'Sc3', hsTime: '1:30', hsScale: 'Sc1' },
      { name: 'Soledad',           dl: 50,  amrapReps: 27, amrapWt: 40,   plankTime: '2:00',       pullReps: 15, pullScale: 'Sc2', hsTime: '0:15', hsScale: 'Rx'  },
      { name: 'Sergej Felsing', trial: true, dl: 100, amrapReps: 33, amrapWt: 80, plankTime: '2:30', pullReps: 20, pullScale: 'Sc1', hsTime: '2:40', hsScale: 'Rx' },
      { name: 'Lukas Simnacher',   dl: 140, amrapReps: 24, amrapWt: 110,  plankOk: true,          pullReps: 20, pullScale: 'Rx',  hsTime: null },
      { name: 'Paul Bielenski',    dl: 180, amrapReps: 7,  amrapWt: 144,  plankTime: '2:40',       pullReps: 23, pullScale: 'Sc2', hsTime: '2:20', hsScale: 'Rx'  },
      { name: 'Patrik Gruber',     dl: 90,  amrapReps: 43, amrapWt: 70,   plankOk: true,          pullReps: 14, pullScale: 'Sc3', hsTime: '1:30', hsScale: 'Rx'  },
      { name: 'Steven Zaft',       dl: 130, amrapReps: 16, amrapWt: 100,  plankTime: '1:50',       pullReps: 16, pullScale: 'Rx',  hsTime: '0:50', hsScale: 'Rx'  },
    ],
  },
  {
    label: '01/07 18:30', sessionId: '07c52045-c562-4867-a1f3-8d449ab74590',
    wodId: 'c60ac369-5a1f-4891-b3c6-3be8490785a8', date: '2026-07-01',
    rows: [
      { name: 'Kathrin Mühlen',     dl: 75,  amrapReps: 30, amrapWt: 60,  plankOk: true,     pullReps: 17, pullScale: 'Sc1', hsTime: '2:25', hsScale: 'Rx'  },
      { name: 'Nikolina Vlasalija', dl: 55,  amrapReps: 24, amrapWt: 45,  plankOk: true,     pullReps: 22, pullScale: 'Sc2', hsTime: '1:37', hsScale: 'Sc1' },
      { name: 'Christian Müller',   dl: 130, amrapReps: 25, amrapWt: 106, plankOk: true,     pullReps: 23, pullScale: 'Rx',  hsTime: '1:40', hsScale: 'Rx'  },
      { name: 'Christian Tanner',   dl: 65,  amrapReps: 55, amrapWt: 50,  plankOk: true,     pullReps: 43, pullScale: 'Sc3', hsTime: '1:55', hsScale: 'Sc1' },
      { name: 'Tobias Götte',       dl: 110, amrapReps: 11, amrapWt: 85,  plankOk: true,     pullReps: 12, pullScale: 'Rx',  hsTime: '1:40', hsScale: 'Rx'  },
      { name: 'Thomas Graf',        dl: 100, amrapReps: 30, amrapWt: 80,  plankTime: '2:00', pullReps: 30, pullScale: 'Sc3', hsTime: '2:00', hsScale: 'Sc1' },
      { name: 'Markus Fischer',     dl: 130, amrapReps: 31, amrapWt: 110, plankOk: true,     pullReps: 25, pullScale: 'Rx',  hsTime: '1:40', hsScale: 'Rx'  },
      { name: 'Carmine Carrozzo',   dl: 130, amrapReps: 15, amrapWt: 110, plankOk: true,     pullReps: 24, pullScale: 'Sc3', hsTime: '1:53', hsScale: 'Rx'  },
      { name: 'Peter Kroll',        dl: 160, amrapReps: 22, amrapWt: 123, plankTime: '2:30', pullReps: 19, pullScale: 'Sc2', hsTime: '1:50', hsScale: 'Sc1' },
      { name: 'Michael Weber',      dl: 110, amrapReps: 34, amrapWt: 90,  plankOk: true,     pullReps: 17, pullScale: 'Sc1', hsTime: '2:40', hsScale: 'Sc1' },
    ],
  },
];

const epley = (w: number, reps: number) => Math.round(w * (1 + reps / 30));

(async () => {
  console.log(`\n=== Week 27.2 DL Testing — ${WRITE ? 'WRITE' : 'DRY RUN'}${ONLY ? ` — ONLY ${ONLY}` : ''} ===`);
  let wsrOk = 0, lrOk = 0, fail = 0;

  for (const s of SESSIONS) {
    if (ONLY && s.label !== ONLY) continue;
    console.log(`\n--- ${s.label}  (wod ${s.wodId}  date ${s.date}) ---`);

    const { data: bk } = await sb.from('bookings').select('member_id, members(name)').eq('session_id', s.sessionId).eq('status', 'confirmed');
    const bookedByName = new Map<string, string>();
    (bk || []).forEach((b: any) => { if (b.members?.name) bookedByName.set(b.members.name, b.member_id); });

    for (const r of r_rows(s)) {
      let memberId: string | null = null;
      if (!r.trial) {
        memberId = bookedByName.get(r.name) ?? null;
        if (!memberId) { console.log(`  ❌ NOT confirmed-booked: ${r.name}`); fail++; continue; }
      }
      const idPart = r.trial ? { user_id: null, member_id: null, whiteboard_name: r.name } : { user_id: memberId, member_id: memberId, whiteboard_name: null };

      // Build the 5 section rows
      const rows: any[] = [
        { section_id: SEC.dl,    weight_result: r.dl },
        { section_id: SEC.amrap, weight_result: r.amrapWt, reps_result: r.amrapReps },
        r.plankOk
          ? { section_id: SEC.plank, track: '1', time_result: '3:00' } // "ok" = held full 3 min (no Task chip)
          : { section_id: SEC.plank, track: '2', time_result: r.plankTime },
        { section_id: SEC.pull, reps_result: r.pullReps, scaling_level: r.pullScale },
      ];
      if (r.hsTime) rows.push({ section_id: SEC.hs, scaling_level: r.hsScale, time_result: r.hsTime });

      const plankStr = r.plankOk ? 'T1 3:00' : `T2 ${r.plankTime}`;
      const hsStr = r.hsTime ? `${r.hsTime}/${r.hsScale}` : '—';
      console.log(`  ${WRITE ? '✍️ ' : '•'} ${(r.trial ? '[trial] ' + r.name : r.name).padEnd(24)} DL${r.dl} | ${r.amrapReps}×${r.amrapWt} | ${plankStr} | ${r.pullReps} ${r.pullScale} | HS ${hsStr}`);

      if (WRITE) {
        for (const base of rows) {
          const rec = { wod_id: s.wodId, workout_date: s.date, ...idPart, ...base };
          if (r.trial) {
            await sb.from('wod_section_results').delete().eq('section_id', base.section_id).eq('wod_id', s.wodId).eq('whiteboard_name', r.name);
          } else {
            await sb.from('wod_section_results').delete().eq('section_id', base.section_id).eq('wod_id', s.wodId).eq('workout_date', s.date).eq('user_id', memberId);
          }
          const { error } = await sb.from('wod_section_results').insert(rec as any);
          if (error) { console.log(`     ❌ WSR ${base.section_id}: ${error.message}`); fail++; } else wsrOk++;
        }
        // Deadlift lift_record (members only)
        if (!r.trial && memberId) {
          await sb.from('lift_records').delete().eq('user_id', memberId).eq('lift_name', 'Deadlift').eq('lift_date', s.date).eq('rep_max_type', '5RM');
          const { error } = await sb.from('lift_records').insert({
            user_id: memberId, lift_name: 'Deadlift', weight_kg: r.dl, reps: 5,
            rep_max_type: '5RM', calculated_1rm: epley(r.dl, 5), lift_date: s.date, wod_id: s.wodId,
          } as any);
          if (error) { console.log(`     ❌ lift_record: ${error.message}`); fail++; } else lrOk++;
        }
      } else {
        wsrOk += rows.length;
        if (!r.trial) lrOk++;
      }
    }
  }
  console.log(`\nDone. ${WRITE ? 'Written' : 'Dry run'} — WSR=${wsrOk} lift_records=${lrOk} fail=${fail}. ${WRITE ? '' : 'Set WRITE=1 to commit.'}\n`);
})();

function r_rows(s: Session): Row[] { return s.rows; }
