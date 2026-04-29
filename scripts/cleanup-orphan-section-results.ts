/**
 * Sweeps every WOD for `wod_section_results` rows whose `section_id` no longer
 * matches a section in the WOD's current `sections` JSONB. These orphans are
 * left behind when a coach edits a WOD and removes a section — the rows aren't
 * cascade-deleted today.
 *
 * Default: DRY-RUN. Pass `--apply` to actually delete.
 * Pass `--wod=<uuid>` to limit to a single WOD.
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY (RLS would hide rows otherwise).
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const APPLY = process.argv.includes('--apply');
const WOD_FILTER = process.argv.find(a => a.startsWith('--wod='))?.slice(6) ?? null;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface WodSection {
  id: string;
  type?: string;
}

async function main() {
  console.log(`\n=== Orphan wod_section_results cleanup — ${APPLY ? 'APPLY MODE' : 'DRY-RUN'} ===`);
  if (WOD_FILTER) console.log(`Limited to wod_id=${WOD_FILTER}`);
  console.log('');

  // 1. Pull every WOD (or one) with its sections JSONB.
  let wodQuery = supabase.from('wods').select('id, date, session_type, workout_name, sections');
  if (WOD_FILTER) wodQuery = wodQuery.eq('id', WOD_FILTER);
  const { data: wods, error: wodErr } = await wodQuery;
  if (wodErr || !wods) {
    console.error('Failed to fetch wods:', wodErr);
    return;
  }
  console.log(`Scanning ${wods.length} WOD(s)...\n`);

  let totalOrphanRows = 0;
  let totalOrphanSections = 0;
  let totalWodsAffected = 0;
  const perWodSummary: { wodId: string; date: string; name: string; orphanSections: number; orphanRows: number }[] = [];

  for (const wod of wods) {
    const sections = (wod.sections as WodSection[] | null) || [];
    const currentSectionIds = new Set(sections.map(s => `${s.id}-content-0`));

    // 2. Find every distinct section_id stored in wod_section_results for this WOD.
    const { data: rowSections } = await supabase
      .from('wod_section_results')
      .select('section_id')
      .eq('wod_id', wod.id);

    const storedSectionIds = new Set((rowSections || []).map(r => r.section_id).filter(Boolean) as string[]);
    const orphanSectionIds = [...storedSectionIds].filter(sid => !currentSectionIds.has(sid));

    if (orphanSectionIds.length === 0) continue;

    // 3. Count rows per orphan section.
    let wodOrphanRows = 0;
    for (const orphanSid of orphanSectionIds) {
      const { count } = await supabase
        .from('wod_section_results')
        .select('id', { count: 'exact', head: true })
        .eq('wod_id', wod.id)
        .eq('section_id', orphanSid);
      wodOrphanRows += count || 0;
    }

    totalOrphanSections += orphanSectionIds.length;
    totalOrphanRows += wodOrphanRows;
    totalWodsAffected += 1;
    perWodSummary.push({
      wodId: wod.id,
      date: wod.date,
      name: `${wod.session_type || ''}${wod.workout_name ? ' — ' + wod.workout_name : ''}`,
      orphanSections: orphanSectionIds.length,
      orphanRows: wodOrphanRows,
    });

    // 4. If --apply, delete.
    if (APPLY) {
      const { error: delErr } = await supabase
        .from('wod_section_results')
        .delete()
        .eq('wod_id', wod.id)
        .in('section_id', orphanSectionIds);
      if (delErr) {
        console.error(`  [WOD ${wod.id.slice(0, 8)}] DELETE failed:`, delErr.message);
      }
    }
  }

  // 5. Print summary table.
  console.log('Per-WOD summary (only WODs with orphans):');
  console.table(
    perWodSummary
      .sort((a, b) => b.orphanRows - a.orphanRows)
      .map(s => ({
        wod_id: s.wodId.slice(0, 8),
        date: s.date,
        name: s.name.slice(0, 60),
        orphan_sections: s.orphanSections,
        orphan_rows: s.orphanRows,
      }))
  );

  console.log(`\n=== TOTALS ===`);
  console.log(`  WODs with orphans: ${totalWodsAffected}`);
  console.log(`  Orphan sections (across all WODs): ${totalOrphanSections}`);
  console.log(`  Orphan rows (across all WODs): ${totalOrphanRows}`);
  console.log(APPLY
    ? `\nDONE. Deleted ${totalOrphanRows} rows.`
    : `\nDRY-RUN ONLY. Re-run with --apply to delete.`);
}

main();
