/**
 * One-shot cleanup — for every WOD, walk every section and NULL any
 * wod_section_results columns whose corresponding scoring_field is `false`
 * on the current section config.
 *
 * Why: prior to the leaderboard fix, sections could be edited from
 * scoring=true → false after scores were already saved, leaving stale
 * scaling_level / weight_result values that the ranker still consumed.
 *
 * Read-only by default. Pass `--apply` to actually execute the updates.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APPLY = process.argv.includes('--apply');

type SectionScoringFields = {
  load?: boolean;
  load2?: boolean;
  load3?: boolean;
  scaling?: boolean;
  scaling_2?: boolean;
  scaling_3?: boolean;
};
type WodSection = { id?: string; scoring_fields?: SectionScoringFields };

const FIELD_TO_COLUMN: Array<{ field: keyof SectionScoringFields; column: string }> = [
  { field: 'load', column: 'weight_result' },
  { field: 'load2', column: 'weight_result_2' },
  { field: 'load3', column: 'weight_result_3' },
  { field: 'scaling', column: 'scaling_level' },
  { field: 'scaling_2', column: 'scaling_level_2' },
  { field: 'scaling_3', column: 'scaling_level_3' },
];

(async () => {
  const { data: wods, error } = await supabase
    .from('wods')
    .select('id, date, workout_name, sections');
  if (error) throw error;

  let totalUpdates = 0;
  let totalRowsAffected = 0;

  for (const wod of wods || []) {
    const sections = (wod.sections as WodSection[] | null) || [];
    for (const s of sections) {
      if (!s.id || !s.scoring_fields) continue;
      const sf = s.scoring_fields;
      const cleared: Record<string, null> = {};
      const offFields: string[] = [];
      for (const { field, column } of FIELD_TO_COLUMN) {
        if (sf[field] === false) {
          cleared[column] = null;
          offFields.push(field);
        }
      }
      if (Object.keys(cleared).length === 0) continue;

      const sectionKey = `${s.id}-content-0`;

      // Probe how many rows have any non-null value in the off columns
      const { data: probe } = await supabase
        .from('wod_section_results')
        .select('id, weight_result, weight_result_2, weight_result_3, scaling_level, scaling_level_2, scaling_level_3')
        .eq('wod_id', wod.id)
        .eq('section_id', sectionKey);

      const stale = (probe || []).filter((r) =>
        offFields.some((f) => {
          if (f === 'load') return r.weight_result !== null;
          if (f === 'load2') return r.weight_result_2 !== null;
          if (f === 'load3') return r.weight_result_3 !== null;
          if (f === 'scaling') return r.scaling_level !== null;
          if (f === 'scaling_2') return r.scaling_level_2 !== null;
          if (f === 'scaling_3') return r.scaling_level_3 !== null;
          return false;
        })
      );

      if (stale.length === 0) continue;

      console.log(`  ${wod.date} ${wod.workout_name || '(no name)'} — section ${s.id} → null [${offFields.join(', ')}] on ${stale.length} row(s)`);
      totalUpdates++;
      totalRowsAffected += stale.length;

      if (APPLY) {
        const { error: updErr } = await supabase
          .from('wod_section_results')
          .update(cleared)
          .eq('wod_id', wod.id)
          .eq('section_id', sectionKey);
        if (updErr) console.error(`    UPDATE failed:`, updErr.message);
      }
    }
  }

  console.log('');
  console.log(`Sections needing cleanup: ${totalUpdates}`);
  console.log(`Total rows affected: ${totalRowsAffected}`);
  console.log(APPLY ? 'APPLIED ✓' : '(dry run — re-run with --apply to execute)');
})();
