import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Correct ISO week calculation
const calculateWorkoutWeek = (date: Date): string => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayOfWeek = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek);
  const isoYear = d.getUTCFullYear();
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4DayOfWeek = jan4.getUTCDay() || 7;
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4 + (4 - jan4DayOfWeek)));
  const weekNo = Math.floor((d.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  return `${isoYear}-W${String(weekNo).padStart(2, '0')}`;
};

async function fixAllWorkoutWeeks() {
  console.log('Fetching all workouts...\n');

  const { data: workouts, error } = await supabase
    .from('wods')
    .select('id, date, workout_week')
    .order('date', { ascending: true });

  if (error) {
    console.error('❌ Error fetching workouts:', error);
    return;
  }

  console.log(`Found ${workouts.length} workouts\n`);

  let fixed = 0;
  let correct = 0;

  for (const workout of workouts) {
    const date = new Date(workout.date + 'T12:00:00');
    const correctWeek = calculateWorkoutWeek(date);

    if (workout.workout_week !== correctWeek) {
      console.log(`Fixing ${workout.date}: ${workout.workout_week} → ${correctWeek}`);

      const { error: updateError } = await supabase
        .from('wods')
        .update({ workout_week: correctWeek })
        .eq('id', workout.id);

      if (updateError) {
        console.error(`  ❌ Failed: ${updateError.message}`);
      } else {
        fixed++;
      }
    } else {
      correct++;
    }
  }

  console.log(`\n✅ Complete:`);
  console.log(`   Already correct: ${correct}`);
  console.log(`   Fixed: ${fixed}`);
}

fixAllWorkoutWeeks();
