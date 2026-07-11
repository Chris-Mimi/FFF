/**
 * Whiteboard score entry — Weekend WOD #26.14, 29.05.26 FOUNDATIONS 18:30 class.
 * Board "2026 Week 22.3". Same workout as 22.1 but WITHOUT the Pendlay Row (this
 * wod copy has only the metcon section). Session a97f1a84, wod 936e9745.
 *
 * Metcon section-1779997866623 {rounds_reps, load, scaling, scaling_2, scaling_3}:
 *   rounds/reps  = Rounds column ("—" = not recorded -> null)
 *   load         = KB column (board "KB"); Aline "Rx" -> 16 (F)
 *   scaling_3    = HS column (only 3 athletes wrote one; blank -> null)
 *   scaling_2    = GHD (board "AbSit-up ✓"): Nikolina did full GHD -> Rx; everyone else -> Sc3
 *   scaling (Dips) = not on this board -> left null
 *
 * INSERT-only, deduped. DRY_RUN=1 to preview. Service-role (RLS).
 */
import * as dotenv from 'dotenv'; dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const DRY_RUN = process.env.DRY_RUN === '1';
const WOD = '936e9745-1200-4aa1-897f-62c8751c30e2';
const DATE = '2026-05-29';
const METCON = 'section-1779997866623-content-0';

type Row = { name: string; member_id: string; rounds: number | null; reps: number | null; ghd: string; hs: string | null; kb: number };
const rows: Row[] = [
  { name: 'Franziska Herndorf', member_id: '9a6235bd-1dc7-4edd-bac6-06afe310ea95', rounds: 4, reps: 21, ghd: 'Sc3', hs: 'Sc1', kb: 10 },
  { name: 'Carla Courtois',     member_id: 'bff7fcef-86a9-47bc-b95e-e4edd2e4e1a5', rounds: 4, reps: 1,  ghd: 'Sc3', hs: 'Rx',  kb: 12 },
  { name: 'Nikolina Vlasalija', member_id: '93c00154-98eb-4237-a754-baf8ae7cbcd1', rounds: 3, reps: 9,  ghd: 'Rx',  hs: 'Sc1', kb: 10 },
  { name: 'Anna Hartmann',      member_id: '64753880-2c2a-4dc3-b371-5442542dd1d7', rounds: 4, reps: 36, ghd: 'Sc3', hs: null,  kb: 10 },
  { name: 'Marion Weber',       member_id: '1ea717ce-015d-47ab-a3fe-8d3672ed1eb4', rounds: 4, reps: 36, ghd: 'Sc3', hs: null,  kb: 10 },
  { name: 'Aline von Rüden',    member_id: 'f5d467cb-7b6e-4231-a2f5-c09b83d03f71', rounds: 3, reps: 3,  ghd: 'Sc3', hs: null,  kb: 16 },
  { name: 'Annerose Streit',    member_id: '4727e9bb-e2dd-4b97-b379-44cfa0d35190', rounds: 4, reps: 21, ghd: 'Sc3', hs: null,  kb: 8 },
  { name: 'Daniela Simm',       member_id: '69d5fab6-52d6-4de7-8b75-7067f8442645', rounds: 4, reps: 9,  ghd: 'Sc3', hs: null,  kb: 12 },
  { name: 'Anfisa Bornemann',   member_id: '2108ddd1-0645-43f1-8044-5cd5d906227c', rounds: null, reps: null, ghd: 'Sc3', hs: null, kb: 8 },
  { name: 'Petra Dempfle',      member_id: '54cc1670-1456-42a3-8675-c2057d62ece8', rounds: null, reps: null, ghd: 'Sc3', hs: null, kb: 10 },
  { name: 'Bodo Lehmann',       member_id: '3041b1b3-9e33-43ee-81c7-56896fe50b80', rounds: 3, reps: 0,  ghd: 'Sc3', hs: null,  kb: 16 },
];

(async () => {
  const { data: existing } = await s.from('wod_section_results').select('member_id').eq('wod_id', WOD).eq('section_id', METCON);
  const have = new Set((existing ?? []).map((r: any) => r.member_id));
  let inserted = 0, skipped = 0;
  for (const r of rows) {
    if (have.has(r.member_id)) { console.log(`  SKIP (exists) ${r.name}`); skipped++; continue; }
    const payload: any = {
      wod_id: WOD, section_id: METCON, workout_date: DATE, member_id: r.member_id, user_id: r.member_id, whiteboard_name: null,
      rounds_result: r.rounds, reps_result: r.reps, scaling_level_2: r.ghd, scaling_level_3: r.hs, weight_result: r.kb, dnf: false,
    };
    console.log(`  ${DRY_RUN ? '[dry] ' : ''}${r.name}: ${r.rounds != null ? r.rounds + '+' + r.reps : '(no rounds)'} KB=${r.kb} GHD=${r.ghd}${r.hs ? ' HS=' + r.hs : ''}`);
    if (!DRY_RUN) {
      const { error } = await s.from('wod_section_results').insert(payload);
      if (error) { console.error(`  INSERT FAILED ${r.name}:`, error); process.exit(1); }
    }
    inserted++;
  }
  console.log(`\n${DRY_RUN ? '[dry-run] ' : ''}Done. inserted=${inserted} skipped=${skipped}`);
})();
