/**
 * Week 43.1 (S423) — Front Squat 5RM day metcon, all 5 copies of the workout.
 * Chris forgot to switch the metcon's scoring fields on. Switches ON
 * load / scaling / scaling_2 / rounds_reps (safe direction only — never turns
 * a field off) and tags the Hamstring Curl lines "(Scaling 2)" like the
 * Decline Push-up line already carries "(Scaling 1)".
 *
 *   npx tsx scripts/week43-1-enable-metcon-fields.ts            # dry run
 *   npx tsx scripts/week43-1-enable-metcon-fields.ts --commit
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const COMMIT = process.argv.includes('--commit');
const SECTION_ID = 'section-1792326670462-4';
const FIELDS_ON = ['load', 'scaling', 'scaling_2', 'rounds_reps'];
const WOD_IDS = [
  '11535b61-647b-4f99-9a59-798c9e259503', // 19.10 17:15
  '75b2544b-d4e7-4660-97b5-fd03ea241327', // 19.10 18:30
  '1c562526-b8a6-4ada-9668-0f7061c8a7b6', // 20.10 17:15
  'bf3555e4-5a58-45d6-a842-d87ffd5a2011', // 20.10 18:30
  'ee051ce1-00a5-4278-8802-60fd16c4fede', // 21.10 09:30
];

/** Append "(Scaling 2)" to each Hamstring Curl line that doesn't have it yet. */
function tagHamCurl(content: string): string {
  return content
    .split('\n')
    .map(line =>
      /Hamstring Curl Single Leg [LR]\s*$/.test(line) && !line.includes('(Scaling 2)')
        ? `${line.trimEnd()} (Scaling 2)`
        : line
    )
    .join('\n');
}

async function main() {
  for (const id of WOD_IDS) {
    const { data: wod, error } = await db.from('wods').select('id, sections').eq('id', id).single();
    if (error || !wod) throw new Error(`wod ${id}: ${error?.message ?? 'not found'}`);

    const sections = (wod.sections as Record<string, unknown>[]) || [];
    const idx = sections.findIndex(s => s.id === SECTION_ID);
    if (idx < 0) throw new Error(`wod ${id}: section ${SECTION_ID} missing`);

    const section = sections[idx];
    const sf = { ...((section.scoring_fields as Record<string, boolean>) || {}) };
    for (const f of FIELDS_ON) sf[f] = true;
    const oldContent = String(section.content ?? '');
    const newContent = tagHamCurl(oldContent);

    console.log(`\nwod ${id}`);
    console.log(`  scoring_fields: ${JSON.stringify(section.scoring_fields ?? {})} → ${JSON.stringify(sf)}`);
    for (const line of newContent.split('\n')) if (line.includes('Hamstring Curl')) console.log(`  text: ${line}`);

    if (!COMMIT) continue;
    sections[idx] = { ...section, scoring_fields: sf, content: newContent };
    const { error: upErr } = await db.from('wods').update({ sections }).eq('id', id);
    if (upErr) throw new Error(`wod ${id} update: ${upErr.message}`);
    console.log('  ✅ updated');
  }
  if (!COMMIT) console.log('\nDry run — add --commit to write.');
}

main().catch(e => { console.error(e); process.exit(1); });
