const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function debugOverheadSquat() {
  console.log('Fetching all workouts...\n');

  const { data: workouts, error } = await supabase
    .from('wods')
    .select('id, date, title, sections');

  if (error) {
    console.error('Error:', error);
    return;
  }

  // Find workouts with Overhead Squat in lifts
  const workoutsWithOHS = [];

  workouts.forEach(workout => {
    const sections = workout.sections || [];
    let hasOHS = false;

    sections.forEach(section => {
      // Check lifts array
      if (section.lifts) {
        section.lifts.forEach(lift => {
          if (lift.name && lift.name.toLowerCase().includes('overhead squat')) {
            hasOHS = true;
            console.log(`Found in workout ${workout.id} (${workout.date}): ${lift.name} in lifts`);
          }
        });
      }

      // Check content string
      if (section.content && section.content.toLowerCase().includes('overhead squat')) {
        hasOHS = true;
        console.log(`Found in workout ${workout.id} (${workout.date}): in content`);
      }
    });

    if (hasOHS) {
      workoutsWithOHS.push(workout.id);
    }
  });

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total workouts with Overhead Squat: ${workoutsWithOHS.length}`);
  console.log(`Unique workout IDs: ${new Set(workoutsWithOHS).size}`);
}

debugOverheadSquat();
