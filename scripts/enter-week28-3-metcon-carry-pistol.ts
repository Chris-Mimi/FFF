/**
 * Whiteboard score entry — 2026 Week 28.3 "MetCon, Carry, Pistol Squat" (24-min AMRAP).
 * Board photo "2026 Week 28.3" (8.7.26). Ran Wed 8 July 17:15 & 18:30, Fri 10 July 09:00.
 *
 * Scoring section (same id on all 3 wod copies): section-1783255037050-4
 *   scoring_fields = { calories, reps, scaling, load }
 *   calories_result = SkiErg cals + Rower cals (SUMMED)   <- computed here from ski+row
 *   reps_result     = Pistol Squat (P.S.) rep count
 *   scaling_level   = Pistol Squat scaling (Rx/Sc1/Sc2/Sc3)
 *   modified/modified_note = the text after the P.S. scaling (adapted-movement detail)
 *   load: not recorded (plate carry is a fixed 20/25kg prescription, no per-athlete value)
 * The circled numbers on the board are ignored; names mapped to sessions via bookings.
 *
 * INSERT-only, deduped. DRY_RUN=1 to preview. Service-role (RLS on wod_section_results).
 */
import * as dotenv from 'dotenv'; dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const DRY_RUN = process.env.DRY_RUN === '1';
const SECTION_ID = 'section-1783255037050-4-content-0';

type Row = { name: string; member_id: string | null; whiteboard_name?: string; ski: number; row: number; reps: number; sc: string; note?: string };
const sessions: { label: string; wod_id: string; date: string; rows: Row[] }[] = [
  {
    label: '08 Jul 17:15', wod_id: '3703e984-7405-48f9-a69a-5a109a0bf50c', date: '2026-07-08',
    rows: [
      { name: 'Claudia Herrmann', member_id: '470fe8de-dffa-4ea0-a25d-e80912f3e1d3', ski: 52, row: 54, reps: 20, sc: 'Rx' },
      { name: 'Kathrin Mühlen',   member_id: 'ffa76a12-9ae8-414b-892f-b08cd0350d65', ski: 59, row: 67, reps: 45, sc: 'Rx' },
      { name: 'Sabrina Lucas',    member_id: '85a0a5cf-4ee0-4d27-a019-e15b053fe872', ski: 45, row: 50, reps: 22, sc: 'Sc3', note: 'Box' },
      { name: 'Valerie Mesenburg',member_id: 'b5d92ef5-251f-42be-b1e2-be9a8925f7f5', ski: 47, row: 61, reps: 32, sc: 'Sc1', note: 'Sks' },
      { name: 'Lukas Simnacher',  member_id: 'bde3c76b-24af-44b7-b23d-dc96fbce8b94', ski: 68, row: 101, reps: 16, sc: 'Sc1', note: 'Sks' },
      { name: 'Michael Weber',    member_id: '32fbf2ca-751a-482e-bd29-9ecda6c19df6', ski: 66, row: 85, reps: 45, sc: 'Sc2', note: 'on plate' },
      { name: 'Patrik Gruber',    member_id: '67421649-ca2a-4b19-9578-ba358b4c4a71', ski: 62, row: 58, reps: 36, sc: 'Sc3', note: 'rig spider climb' },
      { name: 'Paul Bielenski',   member_id: '4beb1c91-d4cc-49b6-a34a-87029de73fe5', ski: 75, row: 81, reps: 20, sc: 'Sc2', note: 'on plate, Sks' },
      { name: 'Steven Zaft',      member_id: '6686aba2-b1d0-4846-99db-8d130510677a', ski: 43, row: 55, reps: 26, sc: 'Rx' },
      { name: 'Wayne Lucas',      member_id: '967a33f8-c7a0-4c55-8513-b5c08e5aa974', ski: 73, row: 89, reps: 40, sc: 'Sc1', note: 'injury-Rx' },
    ],
  },
  {
    label: '08 Jul 18:30', wod_id: '765b48b8-0fa3-47b5-b993-f60300186523', date: '2026-07-08',
    rows: [
      { name: 'Anneke Spegele',     member_id: '6966241b-d6e3-415d-8df4-3171ce72f84d', ski: 52, row: 75, reps: 13, sc: 'Sc1', note: 'on plates' },
      { name: 'Anja Götte',         member_id: 'ea7d861a-7388-466f-b0fb-eec7f265b1b9', ski: 46, row: 50, reps: 60, sc: 'Rx' },
      { name: 'Julia Weihe',        member_id: '32a3f06b-d3be-42a7-90a5-96badfd2a5cf', ski: 42, row: 42, reps: 33, sc: 'Sc3', note: 'on box' },
      { name: 'Christian Tanner',   member_id: '5f992b82-f3d0-4373-8817-d344857af7b8', ski: 51, row: 76, reps: 28, sc: 'Sc2', note: 'on plates+Sks' },
      { name: 'Christian Müller',   member_id: '4e276db4-d7ae-4eaa-9dfb-c788ea7db3e5', ski: 76, row: 89, reps: 22, sc: 'Sc3', note: "on platform +10's" },
      { name: 'Senol Özdilek',      member_id: 'cf5fa375-896e-4042-84cc-21c0aa8d08e5', ski: 62, row: 71, reps: 28, sc: 'Sc3', note: 'on box' },
      { name: 'Thomas Spegele',     member_id: '4996f0d3-c46e-4573-b44e-82e46213250e', ski: 56, row: 86, reps: 16, sc: 'Sc2', note: 'on plates+Sks' },
      { name: 'Tobias Götte',       member_id: '9924ac29-5601-4aee-a679-3bb0bd5b1aa2', ski: 63, row: 66, reps: 62, sc: 'Rx' },
      { name: 'Bodo Lehmann',       member_id: '3041b1b3-9e33-43ee-81c7-56896fe50b80', ski: 57, row: 58, reps: 35, sc: 'Sc3', note: 'on platform +Sks, !' },
      { name: 'Teemu Lian Geisler', member_id: '87693e75-e253-40e4-817d-ac6d7bed3fc1', ski: 45, row: 50, reps: 49, sc: 'Sc1', note: 'on plate' },
    ],
  },
  {
    label: '10 Jul 09:00', wod_id: 'b64139be-0b13-4ff3-a33a-56602bd2c7bf', date: '2026-07-10',
    rows: [
      { name: 'Michael Städele', member_id: 'b7323658-398a-46e2-8f0a-27e1a81cb2c7', ski: 65, row: 71, reps: 72, sc: 'Rx' },
      { name: 'Irene Koffler',   member_id: 'c77cad44-076a-49d0-a4dd-4fea78b7d176', ski: 43, row: 54, reps: 39, sc: 'Sc3', note: 'purple' },
      { name: 'Soledad',         member_id: '704c66aa-d439-41c9-8f82-131d1d3da621', ski: 33, row: 36, reps: 66, sc: 'Sc3', note: 'blue' },
      { name: 'Emily Reichle',   member_id: '054bc594-2460-4fd3-bc41-eb9cae098f4f', ski: 43, row: 49, reps: 26, sc: 'Sc2' },
      { name: 'Sabrina Reichle (trial)', member_id: null, whiteboard_name: "Sabrina Reichle (Emily's mum)", ski: 34, row: 41, reps: 42, sc: 'Sc3', note: 'blue' },
      { name: 'Mimi Hiles',      member_id: 'fc5b34d5-e3f2-42ea-b029-c5994b2cf610', ski: 57, row: 62, reps: 35, sc: 'Rx' },
    ],
  },
];

(async () => {
  let inserted = 0, skipped = 0;
  for (const ses of sessions) {
    console.log(`\n=== ${ses.label} (wod ${ses.wod_id.slice(0, 8)}) ===`);
    const { data: existing } = await s.from('wod_section_results')
      .select('member_id, whiteboard_name').eq('wod_id', ses.wod_id).eq('section_id', SECTION_ID);
    const haveMember = new Set((existing ?? []).map((r: any) => r.member_id).filter(Boolean));
    const haveWb = new Set((existing ?? []).map((r: any) => r.whiteboard_name).filter(Boolean));
    for (const r of ses.rows) {
      const dup = r.member_id ? haveMember.has(r.member_id) : haveWb.has(r.whiteboard_name!);
      if (dup) { console.log(`  SKIP (exists) ${r.name}`); skipped++; continue; }
      const cals = r.ski + r.row;
      const payload = {
        wod_id: ses.wod_id, section_id: SECTION_ID, workout_date: ses.date,
        member_id: r.member_id, user_id: r.member_id, whiteboard_name: r.whiteboard_name ?? null,
        calories_result: cals, reps_result: r.reps, scaling_level: r.sc,
        modified: r.note != null, modified_note: r.note ?? null, dnf: false,
      };
      console.log(`  ${DRY_RUN ? '[dry] ' : ''}${r.name}: cals=${r.ski}+${r.row}=${cals} reps=${r.reps} ${r.sc}${r.note ? ' ('+r.note+')' : ''}`);
      if (!DRY_RUN) {
        const { error } = await s.from('wod_section_results').insert(payload);
        if (error) { console.error(`  INSERT FAILED ${r.name}:`, error); process.exit(1); }
      }
      inserted++;
    }
  }
  console.log(`\n${DRY_RUN ? '[dry-run] ' : ''}Done. inserted=${inserted} skipped=${skipped}`);
})();
