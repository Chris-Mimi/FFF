/**
 * Whiteboard protocol — "2026 Week 27.1" (WK27, 12-min AMRAP over 5 sessions:
 * 29/06 17:15 & 18:30, 30/06 17:15 & 18:30, 01/07 09:30).
 * WOD: 1x Rope Climb (Scaling 1) / 10x Squat Box Jump (Scaling 2) /
 *      10x KB Clean+PP+H2H (16/24kg, Load 1). Score = Rounds+Reps.
 * No RM lift → wod_section_results ONLY (no lift_records), mirroring the coach modal.
 *
 * Scoring section (same in all 5 wods): section-1782739675469
 *   scoring_fields {load,scaling,scaling_2,rounds_reps}; WSR key "<id>-content-0".
 * Field map from board:
 *   RC  (Rope Climb, Scaling 1) -> scaling_level
 *   BJ  (Box Jump,   Scaling 2) -> scaling_level_2
 *   KB  (Load 1)                -> weight_result
 *   R+R                         -> rounds_result (+ reps_result)
 *
 * Each athlete resolved against THAT session's confirmed bookings (guards
 * wrong-session / duplicate-name). Ingo = a trial (trial_names) → whiteboard_name row.
 *
 * Usage:  npx tsx scripts/enter-week27-1-amrap.ts          (dry run)
 *         WRITE=1 npx tsx scripts/enter-week27-1-amrap.ts  (write)
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
const SECTION_ID = 'section-1782739675469-content-0';

type Row = {
  name: string;         // exact members.name (or whiteboard trial name)
  rc: string;           // scaling_level   (Rope Climb)
  bj: string;           // scaling_level_2 (Box Jump)
  kb: number;           // weight_result   (KB kg)
  rounds: number;
  reps: number;
  trial?: boolean;      // true => whiteboard_name row, no member
};

type Session = { label: string; sessionId: string; wodId: string; date: string; rows: Row[] };

const SESSIONS: Session[] = [
  {
    label: '29/06 17:15', sessionId: 'fb693a19-8e38-4c01-8a66-5592be9eb523',
    wodId: '7d8fe186-2be5-4aeb-a7d8-399340ac4966', date: '2026-06-29',
    rows: [
      { name: 'Valerie Mesenburg', rc: 'Sc1', bj: 'Rx',  kb: 12, rounds: 5, reps: 0 },
      { name: 'Leah Mesche',       rc: 'Sc1', bj: 'Sc2', kb: 8,  rounds: 5, reps: 0 },
      { name: 'Miriam Jacht',      rc: 'Rx',  bj: 'Sc2', kb: 12, rounds: 4, reps: 6 },
      { name: 'Wayne Lucas',       rc: 'Rx',  bj: 'Sc1', kb: 24, rounds: 5, reps: 1 },
      { name: 'Dimitar Peresyov',  rc: 'Rx',  bj: 'Rx',  kb: 24, rounds: 4, reps: 11 },
      { name: 'Lukas Simnacher',   rc: 'Rx',  bj: 'Rx',  kb: 24, rounds: 4, reps: 8 },
      { name: 'Paul Bielenski',    rc: 'Rx',  bj: 'Rx',  kb: 24, rounds: 4, reps: 3 },
      { name: 'Steven Zaft',       rc: 'Rx',  bj: 'Rx',  kb: 20, rounds: 2, reps: 0 },
    ],
  },
  {
    label: '29/06 18:30', sessionId: 'b2df42a6-3a8e-4335-b2a9-9e325f981c5b',
    wodId: '13783948-c8f7-4f84-9f7b-28cf6e5eea5c', date: '2026-06-29',
    rows: [
      { name: 'Christian Tanner', rc: 'Sc1', bj: 'Rx', kb: 16, rounds: 4, reps: 11 },
      { name: 'Patrik Gruber',    rc: 'Rx',  bj: 'Rx', kb: 16, rounds: 3, reps: 6 },
      { name: 'Tobias Götte',     rc: 'Rx',  bj: 'Rx', kb: 24, rounds: 4, reps: 0 },
      { name: 'Kathrin Mühlen',   rc: 'Rx',  bj: 'Rx', kb: 16, rounds: 5, reps: 1 },
    ],
  },
  {
    label: '30/06 17:15', sessionId: '18cc0698-bc79-4ff7-ad2c-1251f69a0057',
    wodId: '14465f3d-5a77-45a6-815a-d28b93fcaa1f', date: '2026-06-30',
    rows: [
      { name: 'Anja Biechele',      rc: 'Sc1', bj: 'Sc2', kb: 8,  rounds: 4, reps: 0 },
      { name: 'Nikolina Vlasalija', rc: 'Rx',  bj: 'Sc1', kb: 12, rounds: 3, reps: 1 },
      { name: 'Annerose Streit',    rc: 'Sc1', bj: 'Rx',  kb: 8,  rounds: 4, reps: 1 },
      { name: 'Daniela Simm',       rc: 'Sc1', bj: 'Rx',  kb: 8,  rounds: 4, reps: 17 },
      { name: 'Susi Glocker',       rc: 'Sc1', bj: 'Sc1', kb: 12, rounds: 4, reps: 6 },
      { name: 'Marion Weber',       rc: 'Sc1', bj: 'Sc2', kb: 8,  rounds: 5, reps: 16 },
      { name: 'Teemu Lian Geisler', rc: 'Rx',  bj: 'Rx',  kb: 12, rounds: 3, reps: 15 },
      { name: 'Stefan G',           rc: 'Rx',  bj: 'Rx',  kb: 12, rounds: 5, reps: 2 },
    ],
  },
  {
    label: '30/06 18:30', sessionId: '403744b7-cceb-4ce1-9b98-a2866ce3dd41',
    wodId: '9be5a595-37c7-445d-b488-dec64c28bb04', date: '2026-06-30',
    rows: [
      { name: 'Franziska Herndorf', rc: 'Sc1', bj: 'Rx', kb: 10, rounds: 4, reps: 15 },
      { name: 'Anfisa Bornemann',   rc: 'Sc1', bj: 'Rx', kb: 8,  rounds: 3, reps: 0 },
      { name: 'Christian Müller',   rc: 'Rx',  bj: 'Rx', kb: 20, rounds: 5, reps: 0 },
      { name: 'Carmine Carrozzo',   rc: 'Sc1', bj: 'Rx', kb: 20, rounds: 3, reps: 11 },
      { name: 'Daniel Braatz',      rc: 'Rx',  bj: 'Rx', kb: 20, rounds: 5, reps: 0 },
      { name: 'Chris Hiles',        rc: 'Rx',  bj: 'Rx', kb: 20, rounds: 4, reps: 2 },
    ],
  },
  {
    label: '01/07 09:30', sessionId: '54964224-39ba-42cc-a2fa-de448fdc0661',
    wodId: 'f537b620-2844-4139-87b2-f7e62bc834ef', date: '2026-07-01',
    rows: [
      { name: 'Michael Städele', rc: 'Rx',  bj: 'Rx',  kb: 24, rounds: 5, reps: 13 },
      { name: 'Senol Özdilek',   rc: 'Sc2', bj: 'Rx',  kb: 16, rounds: 3, reps: 11 },
      { name: 'Ingo',            rc: 'Sc1', bj: 'Rx',  kb: 12, rounds: 5, reps: 6, trial: true },
      { name: 'Irene Koffler',   rc: 'Sc1', bj: 'Rx',  kb: 12, rounds: 4, reps: 8 },
      { name: 'Aline von Rüden', rc: 'Sc1', bj: 'Sc1', kb: 12, rounds: 4, reps: 16 },
      { name: 'Anna Krautwald',  rc: 'Sc1', bj: 'Rx',  kb: 6,  rounds: 4, reps: 3 },
      { name: 'Mimi Hiles',      rc: 'Rx',  bj: 'Rx',  kb: 16, rounds: 4, reps: 12 },
    ],
  },
];

(async () => {
  const ONLY = process.env.ONLY; // e.g. ONLY="29/06 17:15" to write just one session
  console.log(`\n=== Week 27.1 WK27 AMRAP — ${WRITE ? 'WRITE' : 'DRY RUN'}${ONLY ? ` — ONLY ${ONLY}` : ''} ===`);
  let ok = 0, fail = 0;

  for (const s of SESSIONS) {
    if (ONLY && s.label !== ONLY) continue;
    console.log(`\n--- ${s.label}  (wod ${s.wodId}  date ${s.date}) ---`);

    // confirmed booking name -> member_id for this session
    const { data: bk } = await sb
      .from('bookings')
      .select('member_id, members(name)')
      .eq('session_id', s.sessionId)
      .eq('status', 'confirmed');
    const bookedByName = new Map<string, string>();
    (bk || []).forEach((b: any) => { if (b.members?.name) bookedByName.set(b.members.name, b.member_id); });

    for (const r of s.rows) {
      const base = {
        wod_id: s.wodId,
        section_id: SECTION_ID,
        workout_date: s.date,
        weight_result: r.kb,
        scaling_level: r.rc,
        scaling_level_2: r.bj,
        rounds_result: r.rounds,
        reps_result: r.reps,
      };

      if (r.trial) {
        const wsr = { ...base, user_id: null, member_id: null, whiteboard_name: r.name };
        console.log(`  ${WRITE ? '✍️ ' : '•'} [trial] ${r.name.padEnd(20)} | ${r.kb}kg | RC ${r.rc} | BJ ${r.bj} | ${r.rounds}+${r.reps}`);
        if (WRITE) {
          await sb.from('wod_section_results').delete().eq('section_id', SECTION_ID).eq('wod_id', s.wodId).eq('whiteboard_name', r.name);
          const { error } = await sb.from('wod_section_results').insert(wsr as any);
          if (error) { console.log(`     ❌ ${error.message}`); fail++; } else ok++;
        } else ok++;
        continue;
      }

      const memberId = bookedByName.get(r.name);
      if (!memberId) {
        console.log(`  ❌ NOT confirmed-booked in ${s.label}: ${r.name}`);
        fail++;
        continue;
      }
      const wsr = { ...base, user_id: memberId, member_id: memberId, whiteboard_name: null };
      console.log(`  ${WRITE ? '✍️ ' : '•'} ${r.name.padEnd(20)} | ${r.kb}kg | RC ${r.rc} | BJ ${r.bj} | ${r.rounds}+${r.reps}`);
      if (WRITE) {
        // dedup on the unique constraint (user_id, wod_id, section_id, workout_date)
        await sb.from('wod_section_results').delete()
          .eq('section_id', SECTION_ID).eq('wod_id', s.wodId).eq('workout_date', s.date).eq('user_id', memberId);
        const { error } = await sb.from('wod_section_results').insert(wsr as any);
        if (error) { console.log(`     ❌ ${error.message}`); fail++; } else ok++;
      } else ok++;
    }
  }

  console.log(`\nDone. ${WRITE ? 'Written' : 'Dry run'} — ok=${ok} fail=${fail}. ${WRITE ? '' : 'Set WRITE=1 to commit.'}\n`);
})();
