/**
 * Diagnostic: dump the exact shape of the Strict OHP lift + linked exercise +
 * a recent WOD that programmed it. Lets us confirm whether the extractor's
 * `knownExerciseNames` set contains the value my liftExerciseMap is emitting.
 *
 * Usage: npx tsx scripts/probe-strict-ohp.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // 1) Find the barbell_lifts row for Strict Overhead Shoulder Press
  const { data: lifts } = await supabase
    .from('barbell_lifts')
    .select('id, name, acronym, exercise_id')
    .ilike('name', '%strict%')
    .order('name');

  console.log('\n=== barbell_lifts (matching %strict%) ===');
  console.log(JSON.stringify(lifts, null, 2));

  if (!lifts || lifts.length === 0) {
    console.error('No matching lifts found');
    return;
  }

  // 2) For each, fetch the linked exercise
  for (const lift of lifts) {
    if (!lift.exercise_id) {
      console.log(`\n--- ${lift.name}: NO LINKED EXERCISE`);
      continue;
    }
    const { data: ex } = await supabase
      .from('exercises')
      .select('id, name, display_name, acronym, category')
      .eq('id', lift.exercise_id)
      .single();
    console.log(`\n--- ${lift.name} → linked exercise:`);
    console.log(JSON.stringify(ex, null, 2));
  }

  // 3) Find recent WODs whose sections contain "Strict OH Press" or "Strict OHP" or
  //    "Strict Overhead Shoulder Press" in their lifts[] array
  const { data: recentWods } = await supabase
    .from('wods')
    .select('id, date, workout_name, workout_week, sections')
    .gte('date', '2026-04-15')
    .order('date', { ascending: false })
    .limit(100);

  console.log('\n=== Recent WODs with a Strict-OHP-shaped lift in section.lifts[] ===');
  let found = 0;
  for (const wod of recentWods ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sections = (wod.sections ?? []) as any[];
    for (const section of sections) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lifts = (section?.lifts ?? []) as any[];
      for (const lift of lifts) {
        const n = (lift?.name ?? '').toLowerCase();
        if (n.includes('strict') && (n.includes('ohp') || n.includes('overhead') || n.includes('oh press'))) {
          console.log(`\n  WOD ${wod.date} (${wod.workout_name ?? '—'}, ${wod.workout_week ?? '—'}) section "${section?.type}" lift:`);
          console.log(`  ${JSON.stringify(lift, null, 2)}`);
          found++;
        }
      }
    }
  }
  if (found === 0) {
    console.log('  None found in last 100 WODs.');
  }

  // 4) Check the tracked exercise rows for Chris (the coach_tracked_exercises table)
  const { data: tracked } = await supabase
    .from('coach_tracked_exercises')
    .select('id, exercise_id, display_name, active, exercises:exercise_id(name, display_name)')
    .ilike('display_name', '%strict%');
  console.log('\n=== coach_tracked_exercises matching %strict% ===');
  console.log(JSON.stringify(tracked, null, 2));
}

main().catch(err => {
  console.error('Probe failed:', err);
  process.exit(1);
});
