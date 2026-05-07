/**
 * Backfill `exercises[]` into wods.sections[].benchmarks / forge_benchmarks
 * by looking up each entry's master row in benchmark_workouts / forge_benchmarks
 * and copying its exercises[] into the section JSONB snapshot.
 *
 * Dry-run by default. Pass `--apply` to write.
 * Pass `--force` to overwrite existing non-empty exercises[] on the JSONB slot
 * (default: fill empties only, leave populated slots alone).
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const APPLY = process.argv.includes('--apply');
const FORCE = process.argv.includes('--force');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type BenchmarkSlot = {
  id?: string;
  name?: string;
  exercises?: string[];
  [k: string]: unknown;
};

type Section = {
  benchmarks?: BenchmarkSlot[];
  forge_benchmarks?: BenchmarkSlot[];
  [k: string]: unknown;
};

(async () => {
  const [{ data: bench }, { data: forge }, { data: wods }] = await Promise.all([
    supabase.from('benchmark_workouts').select('id, name, exercises'),
    supabase.from('forge_benchmarks').select('id, name, exercises'),
    supabase.from('wods').select('id, date, session_type, workout_name, sections').order('date', { ascending: false }),
  ]);

  if (!bench || !forge || !wods) {
    console.error('Query failed.');
    process.exit(1);
  }

  const benchMap = new Map<string, { name: string; exercises: string[] | null }>();
  for (const b of bench) benchMap.set(b.id, { name: b.name, exercises: b.exercises });
  const forgeMap = new Map<string, { name: string; exercises: string[] | null }>();
  for (const f of forge) forgeMap.set(f.id, { name: f.name, exercises: f.exercises });

  let wodsScanned = 0;
  let wodsToUpdate = 0;
  let slotsFilled = 0;
  let slotsSkippedAlreadyPopulated = 0;
  let slotsSkippedMasterEmpty = 0;
  let slotsSkippedMasterMissing = 0;
  const updates: Array<{ id: string; sections: Section[]; label: string }> = [];

  for (const wod of wods) {
    wodsScanned++;
    const sections = (wod.sections || []) as Section[];
    let mutated = false;
    const wodLabel = `${wod.date}  ${wod.session_type}${wod.workout_name ? ' · ' + wod.workout_name : ''}`;

    for (const section of sections) {
      for (const slot of section.benchmarks || []) {
        const result = applySlot(slot, benchMap, 'benchmark', wodLabel);
        if (result === 'filled') { slotsFilled++; mutated = true; }
        else if (result === 'already') slotsSkippedAlreadyPopulated++;
        else if (result === 'master_empty') slotsSkippedMasterEmpty++;
        else if (result === 'master_missing') slotsSkippedMasterMissing++;
      }
      for (const slot of section.forge_benchmarks || []) {
        const result = applySlot(slot, forgeMap, 'forge', wodLabel);
        if (result === 'filled') { slotsFilled++; mutated = true; }
        else if (result === 'already') slotsSkippedAlreadyPopulated++;
        else if (result === 'master_empty') slotsSkippedMasterEmpty++;
        else if (result === 'master_missing') slotsSkippedMasterMissing++;
      }
    }

    if (mutated) {
      wodsToUpdate++;
      updates.push({ id: wod.id, sections, label: wodLabel });
    }
  }

  console.log('=== Backfill summary ===');
  console.log(`Mode:                              ${APPLY ? 'APPLY (writes will happen)' : 'DRY RUN (no writes)'}`);
  console.log(`Force overwrite:                   ${FORCE}`);
  console.log(`WODs scanned:                      ${wodsScanned}`);
  console.log(`WODs to update:                    ${wodsToUpdate}`);
  console.log(`Slots filled:                      ${slotsFilled}`);
  console.log(`Slots already populated (skipped): ${slotsSkippedAlreadyPopulated}`);
  console.log(`Slots master empty (skipped):      ${slotsSkippedMasterEmpty}`);
  console.log(`Slots master id missing (skipped): ${slotsSkippedMasterMissing}`);
  console.log('');

  if (updates.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  console.log('WODs that will be updated:');
  for (const u of updates) console.log(`  ${u.label}`);
  console.log('');

  if (!APPLY) {
    console.log('Dry run complete. Re-run with --apply to write.');
    return;
  }

  let written = 0;
  let failed = 0;
  for (const u of updates) {
    const { error } = await supabase.from('wods').update({ sections: u.sections }).eq('id', u.id);
    if (error) { failed++; console.error(`FAILED ${u.label}: ${error.message}`); }
    else written++;
  }
  console.log('');
  console.log(`Wrote ${written} WODs (${failed} failures).`);
})();

function applySlot(
  slot: BenchmarkSlot,
  master: Map<string, { name: string; exercises: string[] | null }>,
  kind: 'benchmark' | 'forge',
  wodLabel: string,
): 'filled' | 'already' | 'master_empty' | 'master_missing' | 'no_id' {
  if (!slot.id) {
    console.warn(`  [${kind}] slot without id in ${wodLabel} (name=${slot.name ?? '?'}) — skipped`);
    return 'no_id';
  }
  const existing = Array.isArray(slot.exercises) ? slot.exercises : [];
  if (existing.length > 0 && !FORCE) return 'already';

  const m = master.get(slot.id);
  if (!m) {
    console.warn(`  [${kind}] master id ${slot.id} not found (name=${slot.name ?? '?'}, wod=${wodLabel}) — skipped`);
    return 'master_missing';
  }
  if (!m.exercises || m.exercises.length === 0) {
    console.warn(`  [${kind}] master "${m.name}" has empty exercises[] (wod=${wodLabel}) — skipped`);
    return 'master_empty';
  }

  slot.exercises = [...m.exercises];
  return 'filled';
}
