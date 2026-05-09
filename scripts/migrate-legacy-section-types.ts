/**
 * One-shot migration: rename legacy section.type strings in wods.sections JSONB
 * to their current canonical names from section_types.
 *
 * Maps (from probe-legacy-section-types.ts):
 *   "WOD Final Prep & Info" → "Final prep/Info"
 *   "WOD movement practice" → "WOD movements"
 *
 * Dry-run by default. Pass --apply to commit. Read-modify-write per WOD,
 * touches only the section.type field, preserves everything else in the JSONB.
 *
 * Usage:
 *   npx tsx scripts/migrate-legacy-section-types.ts          # dry run
 *   npx tsx scripts/migrate-legacy-section-types.ts --apply  # commit
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const RENAMES: Record<string, string> = {
  'WOD Final Prep & Info': 'Final prep/Info',
  'WOD movement practice': 'WOD movements',
};

const APPLY = process.argv.includes('--apply');

interface Section {
  type?: string;
  [k: string]: unknown;
}

async function main() {
  const { data: wods, error } = await supabase
    .from('wods')
    .select('id, date, workout_name, session_type, sections');

  if (error) throw error;

  let touched = 0;
  let totalRenamed = 0;
  const failures: { wodId: string; err: string }[] = [];

  for (const wod of wods || []) {
    const sections = (wod.sections ?? []) as Section[];
    let wodChanged = false;
    let renamedHere = 0;
    const updated = sections.map(sec => {
      const t = (sec.type ?? '').trim();
      if (t in RENAMES) {
        wodChanged = true;
        renamedHere++;
        return { ...sec, type: RENAMES[t] };
      }
      return sec;
    });

    if (!wodChanged) continue;
    touched++;
    totalRenamed += renamedHere;

    const label = `${wod.session_type ?? '?'}${wod.workout_name ? ` — ${wod.workout_name}` : ''}`;
    console.log(`${APPLY ? 'UPDATE' : 'WOULD UPDATE'}  ${wod.date}  ${label}  [wod=${wod.id}]  (${renamedHere} section${renamedHere === 1 ? '' : 's'})`);

    if (APPLY) {
      const { error: upErr } = await supabase
        .from('wods')
        .update({ sections: updated })
        .eq('id', wod.id);
      if (upErr) {
        console.error(`  FAILED: ${upErr.message}`);
        failures.push({ wodId: wod.id, err: upErr.message });
      }
    }
  }

  console.log('');
  console.log(`${APPLY ? 'Updated' : 'Would update'} ${touched} WODs / ${totalRenamed} sections`);
  if (failures.length > 0) {
    console.log(`\n${failures.length} failures:`);
    for (const f of failures) console.log(`  ${f.wodId}  ${f.err}`);
    process.exit(1);
  }
  if (!APPLY) {
    console.log('\nDry run. Re-run with --apply to commit.');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
