import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type Section = {
  benchmarks?: Array<{ id?: string; name?: string; exercises?: string[] }>;
  forge_benchmarks?: Array<{ id?: string; name?: string; exercises?: string[] }>;
};

(async () => {
  const { data: wods, error } = await supabase
    .from('wods')
    .select('id, date, session_type, workout_name, sections')
    .order('date', { ascending: false });

  if (error) {
    console.error('Query failed:', error);
    process.exit(1);
  }

  let totalWods = 0;
  let wodsWithAny = 0;
  let wodsNeedingBackfill = 0;
  let benchmarkSlots = 0;
  let forgeSlots = 0;
  let slotsWithExercises = 0;
  let slotsMissingExercises = 0;

  const samples: string[] = [];

  for (const wod of wods || []) {
    totalWods++;
    const sections = (wod.sections || []) as Section[];
    let hasAny = false;
    let needsBackfill = false;

    for (const s of sections) {
      for (const b of s.benchmarks || []) {
        hasAny = true;
        benchmarkSlots++;
        if (Array.isArray(b.exercises) && b.exercises.length > 0) slotsWithExercises++;
        else { slotsMissingExercises++; needsBackfill = true; }
      }
      for (const f of s.forge_benchmarks || []) {
        hasAny = true;
        forgeSlots++;
        if (Array.isArray(f.exercises) && f.exercises.length > 0) slotsWithExercises++;
        else { slotsMissingExercises++; needsBackfill = true; }
      }
    }

    if (hasAny) wodsWithAny++;
    if (needsBackfill) {
      wodsNeedingBackfill++;
      if (samples.length < 10) {
        samples.push(`  ${wod.date}  ${wod.session_type}${wod.workout_name ? ' · ' + wod.workout_name : ''}`);
      }
    }
  }

  console.log('=== WOD benchmark/forge backfill scope ===');
  console.log(`Total WODs:                       ${totalWods}`);
  console.log(`WODs with any benchmark/forge:    ${wodsWithAny}`);
  console.log(`WODs needing backfill (≥1 empty): ${wodsNeedingBackfill}`);
  console.log('');
  console.log(`Benchmark slots:                  ${benchmarkSlots}`);
  console.log(`Forge slots:                      ${forgeSlots}`);
  console.log(`Slots with exercises[] populated: ${slotsWithExercises}`);
  console.log(`Slots missing exercises[]:        ${slotsMissingExercises}`);
  console.log('');
  console.log('Sample (most recent) WODs needing backfill:');
  for (const s of samples) console.log(s);
})();
