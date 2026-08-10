/**
 * Whiteboard entry — 2026 Week 32.1 "The Ghost" (2026-08-07, 09:00 + 17:15).
 * Metcon: 6 rounds of 1min C2 Rower / 1min Burpee / 1min DUs / 1min REST.
 * Score section `section-1765486851260` has scoring_fields {reps, scaling} only.
 * Board tracks Row cals / Burpees / DUs separately; the app score is their SUM
 * (content: "Scoring: Cals+Burpees+DUs"). Scaling tier from the DUs column.
 * WSR only (no rm_test → no lift_records). INSERT-only, deduped on user_id.
 *
 * Run: npx tsx scripts/enter-week32-1-ghost.ts        (dry-run)
 *      npx tsx scripts/enter-week32-1-ghost.ts --live  (write)
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const LIVE = process.argv.includes('--live');
const SECTION_ID = 'section-1765486851260-content-0';
const DATE = '2026-08-07';

type Row = { name: string; user_id: string; reps?: number; scaling?: string; dnf?: boolean };

const S0900_WOD = '4b123df2-aa9d-4b69-a918-153a737bbf61';
const S1715_WOD = 'f3196533-ffe0-4471-b367-caec7b143fa4';

const rows0900: Row[] = [
  { name: 'Michael Städele',  user_id: 'b7323658-398a-46e2-8f0a-27e1a81cb2c7', reps: 456, scaling: 'Rx' },
  { name: 'Mimi Hiles',       user_id: 'fc5b34d5-e3f2-42ea-b029-c5994b2cf610', reps: 372, scaling: 'Rx' },
  { name: 'Irene Koffler',    user_id: 'c77cad44-076a-49d0-a4dd-4fea78b7d176', reps: 183, scaling: 'Rx' },
  { name: 'Aline von Rüden',  user_id: 'f5d467cb-7b6e-4231-a2f5-c09b83d03f71', reps: 531, scaling: 'Sc2' },
];

const rows1715: Row[] = [
  { name: 'Carla Courtois',    user_id: 'bff7fcef-86a9-47bc-b95e-e4edd2e4e1a5', reps: 506, scaling: 'Sc2' },
  { name: 'Daniela Simm',      user_id: '69d5fab6-52d6-4de7-8b75-7067f8442645', reps: 228, scaling: 'Rx' },
  { name: 'Justine Baumstark', user_id: 'cf930b89-681f-4f0f-9424-9d898778dc7b', dnf: true },
  { name: 'Lena Jähn',         user_id: '07e62ecc-e3bb-494a-abae-5d414f3b5892', reps: 270, scaling: 'Sc1' },
  { name: 'Miriam Jacht',      user_id: '36dafe80-fefe-4be5-bc4c-3304107dd94a', reps: 141, scaling: 'Rx' },
  { name: 'Nikolina Vlasalija',user_id: '93c00154-98eb-4237-a754-baf8ae7cbcd1', reps: 312, scaling: 'Sc2' },
  { name: 'Christian Tanner',  user_id: '5f992b82-f3d0-4373-8817-d344857af7b8', reps: 550, scaling: 'Sc2' },
  { name: 'Chris Hiles',       user_id: '84280ec0-7cc6-40e2-818b-d8843c30ce29', reps: 294, scaling: 'Rx' },
  { name: 'Senol Özdilek',     user_id: 'cf5fa375-896e-4042-84cc-21c0aa8d08e5', reps: 140, scaling: 'Rx' },
  { name: 'Wayne Lucas',       user_id: '967a33f8-c7a0-4c55-8513-b5c08e5aa974', reps: 623, scaling: 'Rx' },
  // Julia Weihe — DUs illegible ("!"), Chris: leave it → not entered.
];

async function writeSession(wodId: string, label: string, rows: Row[]) {
  const { data: existing } = await sb.from('wod_section_results')
    .select('user_id').eq('section_id', SECTION_ID).eq('wod_id', wodId);
  const seen = new Set((existing || []).map((r: any) => r.user_id));
  console.log(`\n=== ${label} (wod ${wodId}) — ${rows.length} rows, ${seen.size} already present ===`);
  const payload = [];
  for (const r of rows) {
    if (seen.has(r.user_id)) { console.log(`  SKIP dup ${r.name}`); continue; }
    const row: any = {
      user_id: r.user_id, member_id: r.user_id, wod_id: wodId, section_id: SECTION_ID,
      workout_date: DATE, whiteboard_name: null,
      reps_result: r.reps ?? null, scaling_level: r.scaling ?? null, dnf: r.dnf ?? false,
    };
    payload.push(row);
    console.log(`  ${r.dnf ? 'DNF ' : ''}${r.name}: reps=${r.reps ?? '-'} scaling=${r.scaling ?? '-'}`);
  }
  if (!LIVE) { console.log(`  [dry-run] would insert ${payload.length}`); return; }
  if (payload.length) {
    const { error } = await sb.from('wod_section_results').insert(payload);
    console.log(error ? `  ERROR: ${error.message}` : `  ✅ inserted ${payload.length}`);
  }
}

async function ensurePublished(wodId: string) {
  const { data: wod } = await sb.from('wods').select('publish_sections').eq('id', wodId).single();
  const ps: string[] = wod?.publish_sections || [];
  if (ps.includes('section-1765486851260')) { console.log(`  publish_sections OK for ${wodId}`); return; }
  console.log(`  publish_sections MISSING base id for ${wodId}`);
  if (LIVE) {
    const { error } = await sb.from('wods').update({ publish_sections: [...ps, 'section-1765486851260'] }).eq('id', wodId);
    console.log(error ? `  ERROR: ${error.message}` : `  ✅ published`);
  }
}

(async () => {
  console.log(LIVE ? '*** LIVE ***' : '--- DRY RUN ---');
  await writeSession(S0900_WOD, '09:00', rows0900);
  await writeSession(S1715_WOD, '17:15', rows1715);
  await ensurePublished(S0900_WOD);
  await ensurePublished(S1715_WOD);
})();
