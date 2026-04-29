import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const WOD_ID = 'e525ad95-1124-4d70-94b9-b9b25f74481e';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // 1. Pull the WOD's sections so we know the current section IDs.
  const { data: wod, error: wodErr } = await supabase
    .from('wods')
    .select('id, date, session_type, workout_name, sections')
    .eq('id', WOD_ID)
    .single();

  if (wodErr || !wod) {
    console.error('WOD not found:', wodErr);
    return;
  }

  console.log(`\n=== WOD ===`);
  console.log(`${wod.session_type} — ${wod.workout_name || '(no name)'} — ${wod.date}\n`);

  const sections = (wod.sections as Array<{ id: string; type: string; scoring_fields?: Record<string, boolean> }>) || [];
  console.log(`Sections (current schema, ${sections.length} total):`);
  sections.forEach((s, i) => {
    const sf = s.scoring_fields ? Object.keys(s.scoring_fields).filter(k => s.scoring_fields![k]).join(',') : '-';
    console.log(`  Pt.${i + 1}  id=${s.id}  type=${s.type}  scoring_fields={${sf}}`);
  });

  const currentSectionIds = sections.map(s => `${s.id}-content-0`);
  console.log(`\nCurrent section_id values used in wod_section_results: ${currentSectionIds.join(', ')}\n`);

  // 2. Pull ALL wod_section_results for this wod_id (no section filter — we want to see everything).
  const { data: results, error: resErr } = await supabase
    .from('wod_section_results')
    .select('id, member_id, user_id, whiteboard_name, section_id, reps_result, weight_result, scaling_level, workout_date, updated_at')
    .eq('wod_id', WOD_ID)
    .order('updated_at', { ascending: false });

  if (resErr || !results) {
    console.error('Results query failed:', resErr);
    return;
  }

  console.log(`=== Total wod_section_results rows for this WOD: ${results.length} ===\n`);

  // 3. Bucket rows by section_id and flag any that point at a NON-current section_id.
  const bySection = new Map<string, typeof results>();
  for (const r of results) {
    const arr = bySection.get(r.section_id || '(null)') || [];
    arr.push(r);
    bySection.set(r.section_id || '(null)', arr);
  }

  console.log(`Rows grouped by section_id:`);
  for (const [sectionId, rows] of bySection.entries()) {
    const isCurrent = currentSectionIds.includes(sectionId);
    const tag = isCurrent ? `CURRENT (Pt.${currentSectionIds.indexOf(sectionId) + 1})` : '*** ORPHAN — section no longer exists in WOD ***';
    console.log(`  ${sectionId}  (${rows.length} rows) — ${tag}`);
  }

  // 4. Dump the Push-up Strict section (first scorable section in leaderboard view).
  // Leaderboard's "Pt.1" = first section with non-empty scoring_fields, which is the WOD's
  // Pt.8 (section-1777385712974) per the schema dump above.
  const firstScorableSection = sections.find(
    s => s.scoring_fields && Object.values(s.scoring_fields).some(Boolean)
  );
  if (firstScorableSection) {
    const pushUpSectionId = `${firstScorableSection.id}-content-0`;
    const pushUpRows = bySection.get(pushUpSectionId) || [];
    console.log(`\n=== Push-up Strict / leaderboard Pt.1 (${pushUpSectionId}) — ${pushUpRows.length} rows ===`);
    console.table(
      pushUpRows.map(r => ({
        member_id: r.member_id?.slice(0, 8) || null,
        user_id: r.user_id?.slice(0, 8) || null,
        wb_name: r.whiteboard_name,
        reps: r.reps_result,
        weight: r.weight_result,
        metres: (r as { metres_result?: number | null }).metres_result ?? null,
        cals: (r as { calories_result?: number | null }).calories_result ?? null,
        scaling: r.scaling_level,
        date: r.workout_date,
        updated: r.updated_at?.slice(0, 19),
      }))
    );
  }

  // 4b. Also dump one ORPHAN section's rows so we can see what stale data lives there.
  const orphanSectionIds = [...bySection.keys()].filter(sid => !currentSectionIds.includes(sid));
  if (orphanSectionIds.length > 0) {
    const sampleOrphan = orphanSectionIds[0];
    const orphanRows = bySection.get(sampleOrphan) || [];
    console.log(`\n=== SAMPLE ORPHAN section (${sampleOrphan}) — ${orphanRows.length} rows ===`);
    console.table(
      orphanRows.map(r => ({
        member_id: r.member_id?.slice(0, 8) || null,
        user_id: r.user_id?.slice(0, 8) || null,
        reps: r.reps_result,
        weight: r.weight_result,
        metres: (r as { metres_result?: number | null }).metres_result ?? null,
        cals: (r as { calories_result?: number | null }).calories_result ?? null,
        scaling: r.scaling_level,
        updated: r.updated_at?.slice(0, 19),
      }))
    );
  }

  // 4c. Find sibling WODs (same session_type + workout_name) in the same week.
  // Leaderboard treats these as siblings and pulls rows from all of them.
  const wodDate = new Date(wod.date + 'T00:00:00');
  const monday = new Date(wodDate);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const { data: siblings } = await supabase
    .from('wods')
    .select('id, date, session_type, workout_name, sections')
    .eq('session_type', wod.session_type)
    .eq('workout_name', wod.workout_name)
    .gte('date', fmt(monday))
    .lte('date', fmt(sunday));

  const siblingIds = (siblings || []).map(s => s.id).filter(id => id !== WOD_ID);
  console.log(`\n=== Sibling WODs (same session_type + workout_name in week ${fmt(monday)} → ${fmt(sunday)}): ${siblingIds.length} ===`);
  (siblings || []).forEach(s => {
    const isThis = s.id === WOD_ID ? '  [THIS]' : '';
    console.log(`  ${s.id}  date=${s.date}${isThis}`);
  });

  if (siblingIds.length > 0) {
    // For each sibling, show the section at the SAME index where this WOD has Push-up Strict.
    // This is what the leaderboard's grouped-mode logic uses (sections[sectionIndex] across siblings).
    const pushUpIdx = sections.findIndex(s => s.id === firstScorableSection?.id);
    console.log(`\n=== Sibling WODs' section at index ${pushUpIdx} (where THIS WOD has Push-up Strict) ===`);
    (siblings || []).forEach(s => {
      const secs = (s.sections as Array<{ id: string; type: string; scoring_fields?: Record<string, boolean> }>) || [];
      const at = secs[pushUpIdx];
      const sf = at?.scoring_fields ? Object.keys(at.scoring_fields).filter(k => at.scoring_fields![k]).join(',') : '-';
      const tag = s.id === WOD_ID ? '[THIS]' : '';
      console.log(`  wod=${s.id.slice(0, 8)} ${tag}  sections[${pushUpIdx}].id = ${at?.id || '(undefined)'}  type=${at?.type || ''}  sf={${sf}}`);
    });

    // Pull all rows for the Push-up Strict section_id ACROSS siblings.
    const pushUpSectionId = firstScorableSection ? `${firstScorableSection.id}-content-0` : '';
    const { data: siblingRows } = await supabase
      .from('wod_section_results')
      .select('id, wod_id, member_id, section_id, reps_result, scaling_level, workout_date, updated_at')
      .in('wod_id', [WOD_ID, ...siblingIds])
      .eq('section_id', pushUpSectionId);

    console.log(`\n=== Rows across ALL siblings for Push-up Strict section_id (${pushUpSectionId}): ${(siblingRows || []).length} ===`);
    console.table(
      (siblingRows || []).map(r => ({
        wod_id: r.wod_id?.slice(0, 8),
        member_id: r.member_id?.slice(0, 8),
        reps: r.reps_result,
        scaling: r.scaling_level,
        date: r.workout_date,
        updated: r.updated_at?.slice(0, 19),
      }))
    );

    // Also: any sibling WOD have rows where reps_result=46 for ANY section?
    const { data: rows46 } = await supabase
      .from('wod_section_results')
      .select('id, wod_id, member_id, section_id, reps_result, workout_date, updated_at')
      .in('wod_id', [WOD_ID, ...siblingIds])
      .eq('reps_result', 46);
    console.log(`\n=== Rows with reps_result=46 across this WOD + siblings: ${(rows46 || []).length} ===`);
    if ((rows46 || []).length > 0) {
      console.table(
        (rows46 || []).map(r => ({
          wod_id: r.wod_id?.slice(0, 8),
          member_id: r.member_id?.slice(0, 8),
          section_id: r.section_id,
          date: r.workout_date,
          updated: r.updated_at?.slice(0, 19),
        }))
      );
    }
  }

  // 5. Also flag duplicate (member_id, section_id) pairs across the whole WOD.
  const pairCounts = new Map<string, number>();
  for (const r of results) {
    if (!r.member_id || !r.section_id) continue;
    const key = `${r.member_id}::${r.section_id}`;
    pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
  }
  const dupes = [...pairCounts.entries()].filter(([, n]) => n > 1);
  console.log(`\n=== Duplicate (member_id, section_id) pairs: ${dupes.length} ===`);
  dupes.forEach(([key, n]) => console.log(`  ${key} — ${n} rows`));
}

main();
