import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkWorkoutPublishState(workoutId: string) {
  console.log(`\nChecking workout: ${workoutId}\n`);

  const { data, error } = await supabase
    .from('wods')
    .select('id, workout_name, date, is_published, publish_sections, publish_time, publish_duration, google_event_id')
    .eq('id', workoutId)
    .single();

  if (error) {
    console.error('❌ Error:', error.message);
  } else {
    console.log('✅ Workout Publish State:');
    console.log('─────────────────────────────────────');
    console.log(`Name: ${data.workout_name || 'Unnamed'}`);
    console.log(`Date: ${data.date}`);
    console.log(`Published: ${data.is_published}`);
    console.log(`Google Event ID: ${data.google_event_id || 'None'}`);
    console.log(`\nPublish Details:`);
    console.log(`  Time: ${data.publish_time || 'Not set'}`);
    console.log(`  Duration: ${data.publish_duration || 'Not set'} minutes`);
    console.log(`  Sections: ${data.publish_sections ? JSON.stringify(data.publish_sections) : 'Not set (legacy)'}`);
    console.log('─────────────────────────────────────\n');
  }
}

// Get workout ID from command line argument
const workoutId = process.argv[2];

if (!workoutId) {
  console.error('Usage: npx tsx scripts/check-republish.ts <workout-id>');
  process.exit(1);
}

checkWorkoutPublishState(workoutId);
