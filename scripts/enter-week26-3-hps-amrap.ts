/**
 * Whiteboard protocol — "2026 Week 26.3" (26.06.26 17:15 WOD:
 * "KB RDL, HPS, SMC, Roll-out, Push-up"). 16-min AMRAP, ascending ladder
 * (1 rep added per movement each round) → score = Rounds+Reps. No RM lift, so
 * wod_section_results ONLY (no lift_records), mirroring the coach results modal.
 *
 * Scoring section: section-1782044000428-4  (scoring_fields load/scaling/scaling_2/rounds_reps)
 *   stored as "<id>-content-0".
 * Field map from board:
 *   Snatch (Load 1)   -> weight_result   (Rx = W20 / M30; Emily 17.5)
 *   Push-up (Scaling1)-> scaling_level
 *   Roll-out (Scaling2)-> scaling_level_2
 *   R+R               -> rounds_result (+ reps_result)
 *
 * Carmine Carrozzo attended (did the WOD) but his booking was cancelled in the
 * app — Chris re-books him confirmed separately; this script just writes his WSR.
 *
 * Usage:  npx tsx scripts/enter-week26-3-hps-amrap.ts        (dry run)
 *         WRITE=1 npx tsx scripts/enter-week26-3-hps-amrap.ts (write)
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
const WORKOUT_DATE = '2026-06-26';
const WOD_ID = '259bdb14-ba24-4fac-8872-4a13aae7a77d';
const SECTION_ID = 'section-1782044000428-4-content-0';

type Row = {
  name: string;
  load: number;       // weight_result (Hang Power Snatch kg)
  push: string;       // scaling_level   (Push-Up)
  roll: string;       // scaling_level_2 (Roll-out)
  rounds: number;
  reps: number;
};

const ROWS: Row[] = [
  { name: 'Anja Götte',       load: 20,   push: 'Rx',  roll: 'Sc1', rounds: 8, reps: 0 },
  { name: 'Emily Reichle',    load: 17.5, push: 'Sc2', roll: 'Sc2', rounds: 8, reps: 0 },
  { name: 'Carla Courtois',   load: 20,   push: 'Sc2', roll: 'Sc2', rounds: 7, reps: 17 },
  { name: 'Wayne Lucas',      load: 30,   push: 'Rx',  roll: 'Sc1', rounds: 7, reps: 18 },
  { name: 'Paul Bielenski',   load: 30,   push: 'Rx',  roll: 'Sc1', rounds: 8, reps: 1 },
  { name: 'Daniel Braatz',    load: 30,   push: 'Rx',  roll: 'Sc1', rounds: 8, reps: 9 },
  { name: 'Carmine Carrozzo', load: 30,   push: 'Rx',  roll: 'Sc2', rounds: 8, reps: 0 },
  { name: 'Dimitar Peresyov', load: 30,   push: 'Rx',  roll: 'Sc1', rounds: 9, reps: 0 },
  { name: 'Tobias Götte',     load: 30,   push: 'Rx',  roll: 'Sc2', rounds: 7, reps: 4 },
  { name: 'Chris Hiles',      load: 30,   push: 'Rx',  roll: 'Sc1', rounds: 9, reps: 6 },
];

(async () => {
  console.log(`\n=== Week 26.3 HPS AMRAP — ${WRITE ? 'WRITE' : 'DRY RUN'} ===\n`);

  for (const r of ROWS) {
    const { data: members } = await sb.from('members').select('id, name, gender').eq('name', r.name);
    if (!members || members.length === 0) { console.log(`❌ NOT FOUND: ${r.name}`); continue; }
    if (members.length > 1) { console.log(`⚠️  MULTIPLE for ${r.name} — skipping`); continue; }
    const m = members[0];

    const wsr = {
      user_id: m.id,
      member_id: m.id,
      wod_id: WOD_ID,
      section_id: SECTION_ID,
      workout_date: WORKOUT_DATE,
      weight_result: r.load,
      scaling_level: r.push,
      scaling_level_2: r.roll,
      rounds_result: r.rounds,
      reps_result: r.reps,
      whiteboard_name: null as string | null,
    };

    console.log(`${WRITE ? '✍️ ' : '•'} ${r.name.padEnd(20)} ${m.gender ?? '∅'} | ${r.load}kg | push ${r.push} | roll ${r.roll} | ${r.rounds}+${r.reps}`);

    if (WRITE) {
      // dedupe: remove any prior row for this member on this section
      await sb.from('wod_section_results').delete().eq('section_id', SECTION_ID).eq('member_id', m.id);
      const { error } = await sb.from('wod_section_results').insert(wsr);
      if (error) console.log(`   ❌ insert error: ${error.message}`);
    }
  }
  console.log(`\nDone. ${WRITE ? 'Written.' : 'Dry run — set WRITE=1 to commit.'}\n`);
})();
