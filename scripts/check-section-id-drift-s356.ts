/**
 * S356 — for 06/05 and 05/05 wod_section_results, compare each row's section_id
 * (stripped of -content-N) against the current wods.sections[].id JSONB.
 *
 * If stripped IDs all match current section IDs → re-publish did NOT regenerate
 * IDs; the original bug hypothesis is wrong and we need a different root cause.
 *
 * If they don't match → IDs did regenerate; the prefill fallback fix is correct.
 *
 * Also shows created_at vs updated_at to see if Chris's save updated existing
 * rows in place or wrote fresh rows.
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const DATES = ['2026-05-06', '2026-05-05'];

function stripContentSuffix(sectionId: string): string {
  return sectionId.replace(/-content-\d+$/, '');
}

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  for (const d of DATES) {
    console.log(`\n══════════════════════════════════════════════`);
    console.log(`workout_date = ${d}`);
    console.log(`══════════════════════════════════════════════`);

    const { data: rows } = await s
      .from('wod_section_results')
      .select('id, wod_id, section_id, created_at, updated_at')
      .eq('workout_date', d);
    if (!rows || rows.length === 0) continue;

    const wodIds = [...new Set(rows.map(r => r.wod_id))];
    for (const wodId of wodIds) {
      const { data: wod } = await s
        .from('wods')
        .select('id, session_type, workout_name, sections')
        .eq('id', wodId)
        .single();
      if (!wod) {
        console.log(`\n  wod ${wodId.slice(0, 8)}… → ROW MISSING`);
        continue;
      }
      const currentSectionIds = new Set(
        (wod.sections as Array<{ id: string }>).map(sec => sec.id)
      );
      const wodRows = rows.filter(r => r.wod_id === wodId);
      const strippedIds = [...new Set(wodRows.map(r => stripContentSuffix(r.section_id)))];
      const matching = strippedIds.filter(id => currentSectionIds.has(id));
      const orphaned = strippedIds.filter(id => !currentSectionIds.has(id));

      console.log(
        `\n  ${wod.session_type}/${wod.workout_name ?? '-'}  wod=${wodId.slice(0, 8)}…`
      );
      console.log(
        `    Current sections: ${[...currentSectionIds].length}  ·  WSR stripped section IDs: ${strippedIds.length}`
      );
      console.log(
        `    ✅ matching current: ${matching.length}  ·  ❌ orphaned: ${orphaned.length}`
      );

      if (orphaned.length > 0) {
        console.log(`    Orphaned WSR section IDs (no longer in WOD JSONB):`);
        orphaned.forEach(id => console.log(`      - ${id}`));
        console.log(`    Current WOD section IDs:`);
        [...currentSectionIds].forEach(id => console.log(`      + ${id}`));
      }

      // Created vs updated timestamps
      const createdToday = wodRows.filter(r => (r.created_at as string).startsWith('2026-05-19')).length;
      const updatedToday = wodRows.filter(r => (r.updated_at as string).startsWith('2026-05-19')).length;
      console.log(
        `    Of ${wodRows.length} rows: created_at on 2026-05-19 = ${createdToday}  ·  updated_at on 2026-05-19 = ${updatedToday}`
      );
    }
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
