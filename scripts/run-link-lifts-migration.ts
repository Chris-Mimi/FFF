import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const PAIRS: Array<{ liftName: string; exerciseDisplayName: string }> = [
  { liftName: 'Back Squat',                       exerciseDisplayName: 'Barbell Back Squat' },
  { liftName: 'Barbell Dead Row',                 exerciseDisplayName: 'Barbell Dead Row' },
  { liftName: 'Barbell Row',                      exerciseDisplayName: 'Barbell Bent Over Row' },
  { liftName: 'Bench Press',                      exerciseDisplayName: 'Barbell Bench Press' },
  { liftName: 'Clean',                            exerciseDisplayName: 'Barbell Clean' },
  { liftName: 'Clean & Jerk',                     exerciseDisplayName: 'Barbell Clean & Jerk' },
  { liftName: 'Deadlift',                         exerciseDisplayName: 'Barbell Deadlift' },
  { liftName: 'Front Squat',                      exerciseDisplayName: 'Barbell Front Squat' },
  { liftName: 'Overhead Squat',                   exerciseDisplayName: 'Barbell Overhead Squat' },
  { liftName: 'Pendlay Row',                      exerciseDisplayName: 'Pendlay Row' },
  { liftName: 'Power Clean',                      exerciseDisplayName: 'Barbell Power Clean' },
  { liftName: 'Power Snatch',                     exerciseDisplayName: 'Barbell Power Snatch' },
  { liftName: 'Push Jerk',                        exerciseDisplayName: 'Barbell Push Jerk' },
  { liftName: 'Push Press',                       exerciseDisplayName: 'Barbell Push Press' },
  { liftName: 'Romanian Deadlift',                exerciseDisplayName: 'Romanian Deadlift' },
  { liftName: 'Snatch',                           exerciseDisplayName: 'Barbell Snatch' },
  { liftName: 'Strict Overhead Shoulder Press',   exerciseDisplayName: 'Barbell Strict OH Press' },
  { liftName: 'Sumo Deadlift',                    exerciseDisplayName: 'Barbell Sumo Deadlift' },
];

(async () => {
  // Step 1: schema (column + index). Supabase JS client can't run DDL directly;
  // print the DDL and let user run it in the Dashboard SQL editor first.
  // (Same pattern as S332/S333 migrations — Chris runs DDL in Dashboard.)
  const sqlPath = path.join(__dirname, '..', 'database', '20260505_session335_link_lifts_to_exercises.sql');
  console.log('=== STEP 1: run this SQL in Supabase Dashboard SQL editor ===');
  console.log(fs.readFileSync(sqlPath, 'utf8'));
  console.log('=== END SQL ===\n');

  console.log('Press Ctrl+C if not yet run; this script verifies the result + does any orphans.\n');
  await new Promise(r => setTimeout(r, 1500));

  // Step 2: verify the backfill landed.
  const { data: lifts, error } = await supabase
    .from('barbell_lifts')
    .select('id, name, acronym, exercise_id, exercises!barbell_lifts_exercise_id_fkey(display_name, acronym)')
    .order('name');

  if (error) {
    console.error('Verify failed (column may not exist yet — run DDL above first):', error.message);
    process.exit(1);
  }

  type LinkedExercise = { display_name: string | null; acronym: string | null };
  type LiftRow = {
    name: string;
    acronym: string | null;
    exercise_id: string | null;
    exercises: LinkedExercise | LinkedExercise[] | null;
  };

  console.log('=== Result ===');
  for (const row of ((lifts || []) as unknown as LiftRow[])) {
    const linkedRow = Array.isArray(row.exercises) ? row.exercises[0] : row.exercises;
    const linked = linkedRow ? `→ "${linkedRow.display_name}" (${linkedRow.acronym ?? 'no acronym'})` : '(unlinked)';
    console.log(`  ${row.name.padEnd(35)} ${linked}`);
  }

  const expected = PAIRS.length;
  const linkedCount = ((lifts || []) as unknown as LiftRow[]).filter(r => r.exercise_id !== null).length;
  console.log(`\nLinked: ${linkedCount} / ${expected} expected. Unlinked (will be paired manually by Chris): ${(lifts?.length ?? 0) - linkedCount}.`);
  if (linkedCount !== expected) {
    console.log('Mismatch — check Dashboard SQL output for any UPDATE-0 rows (typically a name change since the script was written).');
  }
})();
