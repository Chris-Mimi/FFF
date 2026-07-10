/**
 * Whiteboard score entry — 2026 Week 28.2 (Swiss Ball / T2B 15-min AMRAP).
 * Board photo "2026 Week 28.2" (6.7.26). Ran Wed 6 + Thu 7 July, 17:15 & 18:30.
 *
 * Scoring section (all 4 wod copies share the id): section-1780904441343-content-0
 *   scaling   = Scaling 1 = Decline Swiss Ball Push-up column  -> scaling_level
 *   scaling_2 = Scaling 2 = Toes to Bar column                 -> scaling_level_2
 *   rounds_reps -> rounds_result / reps_result
 * The "SB OHS" board column has NO scoring field — Chris tracks those manually
 * as modified/adapted movements, so it is intentionally NOT written here.
 *
 * Also deletes 3 orphan rows on the 06 17:15 wod (member_id + whiteboard_name
 * both null — abandoned coach-modal entries), replacing them with attributed rows.
 *
 * INSERT-only, deduped (skips a member who already has a row on that wod).
 * DRY_RUN=1 to preview. Service-role required (RLS on wod_section_results).
 */
import * as dotenv from 'dotenv'; dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const DRY_RUN = process.env.DRY_RUN === '1';
const SECTION_ID = 'section-1780904441343-content-0';
const ORPHAN_IDS = [
  '88c11f01-49c2-4b99-9f72-d3148a0685c0',
  '316a161c-6f77-4e1a-8417-50ed3dbf54e3',
  'e5e8ec3c-c7b3-483c-a6f8-3be29a31c60c',
];

type Row = { name: string; member_id: string | null; whiteboard_name?: string; sc1: string; sc2: string; rounds: number; reps: number | null };

const sessions: { label: string; wod_id: string; date: string; rows: Row[] }[] = [
  {
    label: '06 Jul 17:15', wod_id: 'f512a464-62f5-44b4-a888-6db416d3b6ba', date: '2026-07-06',
    rows: [
      { name: 'Kathrin Mühlen',     member_id: 'ffa76a12-9ae8-414b-892f-b08cd0350d65', sc1: 'Sc1', sc2: 'Rx',  rounds: 7, reps: 11 },
      { name: 'Leah Mesche',        member_id: '1e2b8dfc-1031-4f70-8f92-b87639bb4333', sc1: 'Sc2', sc2: 'Sc2', rounds: 6, reps: 1 },
      { name: 'Nikolina Vlasalija', member_id: '93c00154-98eb-4237-a754-baf8ae7cbcd1', sc1: 'Sc2', sc2: 'Sc1', rounds: 5, reps: null },
      { name: 'Valerie Mesenburg',  member_id: 'b5d92ef5-251f-42be-b1e2-be9a8925f7f5', sc1: 'Sc2', sc2: 'Sc1', rounds: 7, reps: 6 },
      { name: 'Dimitar Peresyov',   member_id: '9a3b0faf-6b28-4fbe-981d-e6506f96ae2f', sc1: 'Rx',  sc2: 'Rx',  rounds: 8, reps: null },
      { name: 'Lukas Simnacher',    member_id: 'bde3c76b-24af-44b7-b23d-dc96fbce8b94', sc1: 'Rx',  sc2: 'Rx',  rounds: 8, reps: null },
      { name: 'Paul Bielenski',     member_id: '4beb1c91-d4cc-49b6-a34a-87029de73fe5', sc1: 'Rx',  sc2: 'Rx',  rounds: 6, reps: null },
      { name: 'Patrik Gruber',      member_id: '67421649-ca2a-4b19-9578-ba358b4c4a71', sc1: 'Sc2', sc2: 'Sc1', rounds: 6, reps: 9 },
      { name: 'Sergej Felsing',     member_id: 'a660c081-2fb6-4d37-bc00-8817b9214146', sc1: 'Sc1', sc2: 'Rx',  rounds: 8, reps: null },
      { name: 'Steven Zaft',        member_id: '6686aba2-b1d0-4846-99db-8d130510677a', sc1: 'Rx',  sc2: 'Rx',  rounds: 5, reps: null },
      { name: 'Senol Özdilek',      member_id: 'cf5fa375-896e-4042-84cc-21c0aa8d08e5', sc1: 'Sc2', sc2: 'Sc2', rounds: 6, reps: null },
      { name: 'Wayne Lucas',        member_id: '967a33f8-c7a0-4c55-8513-b5c08e5aa974', sc1: 'Rx',  sc2: 'Rx',  rounds: 7, reps: 12 },
    ],
  },
  {
    label: '06 Jul 18:30', wod_id: 'eab97af6-f7de-4f61-b312-190731e6f2d4', date: '2026-07-06',
    rows: [
      { name: 'Anneke Spegele', member_id: '6966241b-d6e3-415d-8df4-3171ce72f84d', sc1: 'Sc2', sc2: 'Sc1', rounds: 6, reps: 24 },
      { name: 'Anne Schaber',   member_id: '3a51ec31-399d-460c-89f4-064287ed3499', sc1: 'Sc1', sc2: 'Sc1', rounds: 7, reps: 1 },
      { name: 'Markus Fischer', member_id: '19c18ba5-1cd7-42a0-b7eb-cdf52bc8f803', sc1: 'Rx',  sc2: 'Rx',  rounds: 9, reps: null },
      { name: 'Thomas Spegele', member_id: '4996f0d3-c46e-4573-b44e-82e46213250e', sc1: 'Rx',  sc2: 'Rx',  rounds: 8, reps: 12 },
      { name: 'Tobias Götte',   member_id: '9924ac29-5601-4aee-a679-3bb0bd5b1aa2', sc1: 'Rx',  sc2: 'Rx',  rounds: 7, reps: 24 },
      { name: 'Chris Hiles',    member_id: '84280ec0-7cc6-40e2-818b-d8843c30ce29', sc1: 'Rx',  sc2: 'Rx',  rounds: 9, reps: 27 },
    ],
  },
  {
    label: '07 Jul 17:15', wod_id: '3f89d3e5-93bb-4ec6-aa92-69623322975f', date: '2026-07-07',
    rows: [
      { name: 'Annerose Streit',   member_id: '4727e9bb-e2dd-4b97-b379-44cfa0d35190', sc1: 'Sc1', sc2: 'Sc1', rounds: 6, reps: 8 },
      { name: 'Anja Biechele',     member_id: '5766e719-e782-4ebe-97a4-1e617e12b234', sc1: 'Sc2', sc2: 'Sc2', rounds: 6, reps: 12 },
      { name: 'Jolanda Greif',     member_id: '3a918ceb-a317-49b4-9ad3-552028122778', sc1: 'Sc2', sc2: 'Sc2', rounds: 6, reps: 6 },
      { name: 'Daniela Simm',      member_id: '69d5fab6-52d6-4de7-8b75-7067f8442645', sc1: 'Sc2', sc2: 'Sc1', rounds: 7, reps: null },
      { name: 'Christian Tanner',  member_id: '5f992b82-f3d0-4373-8817-d344857af7b8', sc1: 'Rx',  sc2: 'Sc1', rounds: 6, reps: null },
    ],
  },
  {
    label: '07 Jul 18:30', wod_id: '52ae91f6-e6ef-4c5a-ad6a-b90b716b1f4d', date: '2026-07-07',
    rows: [
      { name: 'Anfisa Bornemann',    member_id: '2108ddd1-0645-43f1-8044-5cd5d906227c', sc1: 'Sc2', sc2: 'Sc2', rounds: 6, reps: null },
      { name: 'Franziska Herndorf',  member_id: '9a6235bd-1dc7-4edd-bac6-06afe310ea95', sc1: 'Sc2', sc2: 'Sc1', rounds: 6, reps: null },
      { name: 'Susi Glocker',        member_id: 'f91173a4-9be5-4f84-8afc-b9d928e83a5d', sc1: 'Sc2', sc2: 'Sc1', rounds: 6, reps: 8 },
      { name: 'Christian Müller',    member_id: '4e276db4-d7ae-4eaa-9dfb-c788ea7db3e5', sc1: 'Rx',  sc2: 'Rx',  rounds: 9, reps: null },
      { name: 'Daniel Braatz',       member_id: '15751a18-0ac2-4ad3-9b71-2029c6bc7d86', sc1: 'Rx',  sc2: 'Rx',  rounds: 8, reps: 13 },
      { name: 'Thomas Graf',         member_id: 'b6b74da2-a978-4d5e-ba73-fd0833d91907', sc1: 'Sc2', sc2: 'Sc1', rounds: 7, reps: null },
      { name: 'Freddy',              member_id: null, whiteboard_name: 'Freddy',          sc1: 'Sc2', sc2: 'Sc1', rounds: 6, reps: null },
    ],
  },
];

(async () => {
  // 1. delete the 3 orphan rows (no member, no whiteboard name — abandoned entries)
  console.log(`\n--- Orphan cleanup on 06 17:15 (${ORPHAN_IDS.length} rows) ---`);
  if (!DRY_RUN) {
    const { error } = await s.from('wod_section_results').delete().in('id', ORPHAN_IDS);
    if (error) { console.error('orphan delete failed:', error); process.exit(1); }
    console.log('deleted');
  } else {
    console.log('[dry-run] would delete', ORPHAN_IDS.join(', '));
  }

  let inserted = 0, skipped = 0;
  for (const ses of sessions) {
    console.log(`\n=== ${ses.label} (wod ${ses.wod_id.slice(0, 8)}) ===`);
    // existing attributed rows on this wod+section to dedupe
    const { data: existing } = await s.from('wod_section_results')
      .select('member_id, whiteboard_name')
      .eq('wod_id', ses.wod_id).eq('section_id', SECTION_ID);
    const haveMember = new Set((existing ?? []).map((r: any) => r.member_id).filter(Boolean));
    const haveWb = new Set((existing ?? []).map((r: any) => r.whiteboard_name).filter(Boolean));

    for (const r of ses.rows) {
      const dup = r.member_id ? haveMember.has(r.member_id) : haveWb.has(r.whiteboard_name!);
      if (dup) { console.log(`  SKIP (exists) ${r.name}`); skipped++; continue; }
      const payload = {
        wod_id: ses.wod_id,
        section_id: SECTION_ID,
        workout_date: ses.date,
        member_id: r.member_id,
        user_id: r.member_id, // member.id == auth user id for this gym; null for drop-in
        whiteboard_name: r.whiteboard_name ?? null,
        scaling_level: r.sc1,
        scaling_level_2: r.sc2,
        rounds_result: r.rounds,
        reps_result: r.reps,
        dnf: false,
        modified: false,
      };
      console.log(`  ${DRY_RUN ? '[dry] ' : ''}${r.name}: Sc1=${r.sc1} T2B=${r.sc2} ${r.rounds}${r.reps != null ? '+' + r.reps : ''}`);
      if (!DRY_RUN) {
        const { error } = await s.from('wod_section_results').insert(payload);
        if (error) { console.error(`  INSERT FAILED ${r.name}:`, error); process.exit(1); }
      }
      inserted++;
    }
  }
  console.log(`\n${DRY_RUN ? '[dry-run] ' : ''}Done. inserted=${inserted} skipped=${skipped}`);
})();
