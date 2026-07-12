/**
 * Whiteboard score entry — 2026 Week 28.6 "MetCon, Carry, Pistol Squat" (24-min AMRAP).
 * Board "2026 Week 28.6". Session Sun 12 July 10:00, wod 707fb723.
 * Same scoring as 28.3 PLUS an AB (AirBike) cardio column:
 *   section-1783255037050-4  scoring_fields = { reps, scaling, calories }
 *   calories_result = SkiErg + Rower + AirBike (all cardio cals, SUMMED)
 *   reps_result     = Pistol Squat (PS) rep count  (blank on board -> null)
 *   scaling_level   = Pistol Squat scaling (Rx/Sc2/Sc3)
 *   modified/modified_note = text after the PS scaling (Box+5kg, Spider climb, ...)
 *
 * INSERT-only, deduped. DRY_RUN=1 to preview. Service-role (RLS).
 */
import * as dotenv from 'dotenv'; dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const DRY_RUN = process.env.DRY_RUN === '1';
const WOD = '707fb723-88ec-47c8-b035-0448b8e1890b';
const DATE = '2026-07-12';
const SECTION = 'section-1783255037050-4-content-0';

type Row = { name: string; member_id: string | null; whiteboard_name?: string; ski: number; row: number; ab: number; reps: number | null; sc: string; note?: string };
const rows: Row[] = [
  { name: 'Franziska Herndorf', member_id: '9a6235bd-1dc7-4edd-bac6-06afe310ea95', ski: 47, row: 47, ab: 0,  reps: 22,   sc: 'Sc3' },
  { name: 'Sonja Hujo',         member_id: 'f0e9ab38-994e-4147-8c4c-97806c99623a', ski: 0,  row: 0,  ab: 91, reps: 23,   sc: 'Sc3', note: 'Box+5kg' },
  { name: 'Justine Baumstark',  member_id: 'cf930b89-681f-4f0f-9424-9d898778dc7b', ski: 45, row: 35, ab: 32, reps: null, sc: 'Sc3', note: 'Box+5kg' },
  { name: 'Susi Glocker',       member_id: 'f91173a4-9be5-4f84-8afc-b9d928e83a5d', ski: 40, row: 48, ab: 0,  reps: 22,   sc: 'Sc3' },
  { name: 'Miriam Jacht',       member_id: '36dafe80-fefe-4be5-bc4c-3304107dd94a', ski: 25, row: 33, ab: 50, reps: 27,   sc: 'Sc3', note: 'Box+5kg' },
  { name: 'Helen Schüler',      member_id: 'ca2ab7f8-a3c1-4a00-8675-fda943269caa', ski: 40, row: 52, ab: 0,  reps: 25,   sc: 'Sc3', note: 'Box+5kg' },
  { name: 'Sergej Felsing',     member_id: 'a660c081-2fb6-4d37-bc00-8817b9214146', ski: 0,  row: 78, ab: 60, reps: 66,   sc: 'Rx' },
  { name: 'Stefan G',           member_id: '9b555ce9-2ef1-4164-b5ba-079869a9ad6e', ski: 56, row: 63, ab: 0,  reps: 17,   sc: 'Sc2', note: '2x Plates+5kg' },
  { name: 'Thomas Graf',        member_id: 'b6b74da2-a978-4d5e-ba73-fd0833d91907', ski: 49, row: 26, ab: 22, reps: 21,   sc: 'Sc3', note: 'Box+10kg' },
  { name: 'Freddy',             member_id: null, whiteboard_name: 'Freddy',         ski: 63, row: 66, ab: 0,  reps: 14,   sc: 'Sc3', note: 'Box+5kg' },
  { name: 'Teemu Lian Geisler', member_id: '87693e75-e253-40e4-817d-ac6d7bed3fc1', ski: 44, row: 53, ab: 0,  reps: 53,   sc: 'Rx' },
  { name: 'Carmine Carrozzo',   member_id: '76964560-3a13-4e82-9024-188b03485cc2', ski: 54, row: 51, ab: 0,  reps: 17,   sc: 'Sc3', note: 'Spider climb' },
];

(async () => {
  const { data: existing } = await s.from('wod_section_results').select('member_id, whiteboard_name').eq('wod_id', WOD).eq('section_id', SECTION);
  const haveM = new Set((existing ?? []).map((r: any) => r.member_id).filter(Boolean));
  const haveW = new Set((existing ?? []).map((r: any) => r.whiteboard_name).filter(Boolean));
  let inserted = 0, skipped = 0;
  for (const r of rows) {
    const dup = r.member_id ? haveM.has(r.member_id) : haveW.has(r.whiteboard_name!);
    if (dup) { console.log(`  SKIP (exists) ${r.name}`); skipped++; continue; }
    const cals = r.ski + r.row + r.ab;
    const payload = {
      wod_id: WOD, section_id: SECTION, workout_date: DATE,
      member_id: r.member_id, user_id: r.member_id, whiteboard_name: r.whiteboard_name ?? null,
      calories_result: cals, reps_result: r.reps, scaling_level: r.sc,
      modified: r.note != null, modified_note: r.note ?? null, dnf: false,
    };
    console.log(`  ${DRY_RUN ? '[dry] ' : ''}${r.name}: cals=${r.ski}+${r.row}+${r.ab}=${cals} reps=${r.reps ?? '-'} ${r.sc}${r.note ? ' ('+r.note+')' : ''}`);
    if (!DRY_RUN) {
      const { error } = await s.from('wod_section_results').insert(payload);
      if (error) { console.error(`  INSERT FAILED ${r.name}:`, error); process.exit(1); }
    }
    inserted++;
  }
  console.log(`\n${DRY_RUN ? '[dry-run] ' : ''}Done. inserted=${inserted} skipped=${skipped}`);
})();
