/**
 * Whiteboard score entry — Weekend WOD #26.14, 29.05.26 (board "2026 Week 22.1", 29.5.26 block).
 * Ran across the 09:00 and 17:15 classes that day (same workout copied per session).
 *   09:00 wod a67483a5 : Lukas, Valerie, Anne, Gloria, Lisa, Mimi
 *   17:15 wod 108f035a : Miriam, Regina, Madi, Christian T, Dini, Zoran, Chris (Sandra Lederle SKIPPED — blocked)
 *
 * TWO scored sections per athlete:
 *   Pendlay Row  "WOD Pt.1"  section-1779628374676-3  {load}
 *       -> weight_result = total weight of the last 3 sets (the kg number on the board)
 *   Metcon       "WOD"       section-1779997866623     {rounds_reps, load, scaling, scaling_2, scaling_3}
 *       -> rounds_result/reps_result = Rounds column
 *       -> scaling_level   = Dips  (Ring Dips, Scaling 1)
 *       -> scaling_level_2 = GHD   (GHD Sit-Up, Scaling 2)
 *       -> scaling_level_3 = HS    (Handstand Shoulder Taps, Scaling 3)
 *       -> weight_result   = KB Hand-to-Hand Swing load (board "LB"); Rx filled 16/24 by gender
 *
 * Dips rule (Chris): Gloria/Lisa/Miriam/Regina/Madi = Sc2; any other band/scale = Sc1; Rx = Rx.
 * Bare "Sc" in GHD/HS recorded as Sc1. Not an RM test -> no lift_records.
 *
 * INSERT-only, deduped. DRY_RUN=1 to preview. Service-role (RLS).
 */
import * as dotenv from 'dotenv'; dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const DRY_RUN = process.env.DRY_RUN === '1';
const DATE = '2026-05-29';
const PENDLAY = 'section-1779628374676-3-content-0';
const METCON = 'section-1779997866623-content-0';

type Row = { name: string; member_id: string; pendlay: number; rounds: number; reps: number; dips: string; ghd: string; hs: string; kb: number };
const sessions: { label: string; wod_id: string; rows: Row[] }[] = [
  {
    label: '09:00', wod_id: 'a67483a5-88cd-4d8f-a2e3-1a5129657444',
    rows: [
      { name: 'Lukas Simnacher',   member_id: 'bde3c76b-24af-44b7-b23d-dc96fbce8b94', pendlay: 240,   rounds: 3, reps: 7,  dips: 'Rx',  ghd: 'Rx',  hs: 'Sc1', kb: 24 },
      { name: 'Valerie Mesenburg', member_id: 'b5d92ef5-251f-42be-b1e2-be9a8925f7f5', pendlay: 97.5,  rounds: 4, reps: 16, dips: 'Sc1', ghd: 'Sc2', hs: 'Sc2', kb: 16 },
      { name: 'Anne Schaber',      member_id: '3a51ec31-399d-460c-89f4-064287ed3499', pendlay: 102.5, rounds: 4, reps: 3,  dips: 'Sc1', ghd: 'Sc1', hs: 'Sc2', kb: 16 },
      { name: 'Gloria Stoffer',    member_id: '551e4612-a2a8-431f-8862-936f13205631', pendlay: 57.5,  rounds: 3, reps: 24, dips: 'Sc2', ghd: 'Sc3', hs: 'Sc3', kb: 8 },
      { name: 'Lisa Vrbanic',      member_id: 'b81545b0-f4c1-4b77-aed2-37131f8c5c36', pendlay: 67.5,  rounds: 3, reps: 30, dips: 'Sc2', ghd: 'Sc3', hs: 'Sc2', kb: 10 },
      { name: 'Mimi Hiles',        member_id: 'fc5b34d5-e3f2-42ea-b029-c5994b2cf610', pendlay: 120,   rounds: 4, reps: 1,  dips: 'Sc1', ghd: 'Rx',  hs: 'Rx',  kb: 16 },
    ],
  },
  {
    label: '17:15', wod_id: '108f035a-9ee1-4752-963b-0f6afbf21fc2',
    rows: [
      { name: 'Miriam Jacht',      member_id: '36dafe80-fefe-4be5-bc4c-3304107dd94a', pendlay: 117.5, rounds: 4, reps: 7,  dips: 'Sc2', ghd: 'Rx',  hs: 'Sc1', kb: 16 },
      { name: 'Regina Peresyova',  member_id: '44b2eb9d-5371-422f-b350-8e9c5483a229', pendlay: 89.5,  rounds: 4, reps: 0,  dips: 'Sc2', ghd: 'Sc1', hs: 'Sc1', kb: 10 },
      { name: 'Madeleine Gehring', member_id: '54c4e8f0-9125-497b-9bda-7d0974a4d1da', pendlay: 115,   rounds: 3, reps: 30, dips: 'Sc2', ghd: 'Sc1', hs: 'Sc1', kb: 12 },
      { name: 'Christian Tanner',  member_id: '5f992b82-f3d0-4373-8817-d344857af7b8', pendlay: 150,   rounds: 5, reps: 3,  dips: 'Sc1', ghd: 'Rx',  hs: 'Sc1', kb: 16 },
      { name: 'Dimitar Peresyov',  member_id: '9a3b0faf-6b28-4fbe-981d-e6506f96ae2f', pendlay: 270,   rounds: 3, reps: 2,  dips: 'Rx',  ghd: 'Rx',  hs: 'Sc1', kb: 20 },
      { name: 'Zoran Vrbanic',     member_id: '04285a62-01b0-4fb4-ae0f-18825203e24f', pendlay: 210,   rounds: 4, reps: 0,  dips: 'Rx',  ghd: 'Rx',  hs: 'Rx',  kb: 20 },
      { name: 'Chris Hiles',       member_id: '84280ec0-7cc6-40e2-818b-d8843c30ce29', pendlay: 220,   rounds: 2, reps: 0,  dips: 'Rx',  ghd: 'Rx',  hs: 'Sc1', kb: 20 },
    ],
  },
];

(async () => {
  let inserted = 0, skipped = 0;
  for (const ses of sessions) {
    console.log(`\n=== ${ses.label} (wod ${ses.wod_id.slice(0, 8)}) ===`);
    const { data: existing } = await s.from('wod_section_results')
      .select('member_id, section_id').eq('wod_id', ses.wod_id).in('section_id', [PENDLAY, METCON]);
    const have = new Set((existing ?? []).map((r: any) => `${r.member_id}|${r.section_id}`));
    for (const r of ses.rows) {
      const rows = [
        { section_id: PENDLAY, weight_result: r.pendlay, label: `Pendlay ${r.pendlay}kg` },
        { section_id: METCON, rounds_result: r.rounds, reps_result: r.reps, scaling_level: r.dips, scaling_level_2: r.ghd, scaling_level_3: r.hs, weight_result: r.kb,
          label: `metcon ${r.rounds}+${r.reps} Dips=${r.dips} GHD=${r.ghd} HS=${r.hs} KB=${r.kb}` },
      ];
      for (const part of rows) {
        const { label, ...fields } = part as any;
        if (have.has(`${r.member_id}|${part.section_id}`)) { console.log(`  SKIP (exists) ${r.name} ${label}`); skipped++; continue; }
        const payload = { wod_id: ses.wod_id, workout_date: DATE, member_id: r.member_id, user_id: r.member_id, whiteboard_name: null, dnf: false, ...fields };
        console.log(`  ${DRY_RUN ? '[dry] ' : ''}${r.name}: ${label}`);
        if (!DRY_RUN) {
          const { error } = await s.from('wod_section_results').insert(payload);
          if (error) { console.error(`  INSERT FAILED ${r.name} ${label}:`, error); process.exit(1); }
        }
        inserted++;
      }
    }
  }
  console.log(`\n${DRY_RUN ? '[dry-run] ' : ''}Done. inserted=${inserted} skipped=${skipped}`);
})();
