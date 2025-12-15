import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkWorkoutNaming() {
  console.log('📋 Checking recent workouts...\n');

  const { data, error } = await supabase
    .from('wods')
    .select('id, date, workout_name, workout_week, session_type, class_times')
    .order('date', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  No workouts found');
    return;
  }

  console.log(`✅ Found ${data.length} recent workout(s):\n`);
  data.forEach((workout, index) => {
    console.log(`${index + 1}. Date: ${workout.date}`);
    console.log(`   Name: ${workout.workout_name || '(no name)'}`);
    console.log(`   Week: ${workout.workout_week || '(no week)'}`);
    console.log(`   Type: ${workout.session_type || '(no type)'}`);
    console.log(`   Class Times: ${JSON.stringify(workout.class_times) || '(none)'}`);
    console.log('');
  });
}

checkWorkoutNaming();
