import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

async function find() {
  // The section_id from the debug logs
  const sectionId = 'section-1765486851260-content-0';

  const { data: results, error } = await supabase
    .from('wod_section_results')
    .select('id, user_id, wod_id, section_id, workout_date, scaling_level, reps_result, time_result, weight_result, rounds_result, calories_result, metres_result, task_completed')
    .eq('section_id', sectionId);

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  // Get WOD details for each result
  const wodIds = [...new Set(results.map(r => r.wod_id))];
  const { data: wods } = await supabase
    .from('wods')
    .select('id, date, workout_name, session_type')
    .in('id', wodIds);

  const wodMap = new Map(wods?.map(w => [w.id, w]) || []);

  console.log(`\n=== Results for section_id: ${sectionId} ===\n`);
  console.log(`Found ${results.length} result(s):\n`);

  for (const r of results) {
    const wod = wodMap.get(r.wod_id);
    console.log(`  Record ID: ${r.id}`);
    console.log(`  User ID:   ${r.user_id}`);
    console.log(`  WOD ID:    ${r.wod_id}`);
    console.log(`  WOD name:  ${wod?.workout_name || '(none)'} | type: ${wod?.session_type}`);
    console.log(`  WOD date:  ${wod?.date}`);
    console.log(`  Result date: ${r.workout_date}`);
    console.log(`  Scaling:   ${r.scaling_level}`);
    console.log(`  Reps: ${r.reps_result} | Time: ${r.time_result} | Weight: ${r.weight_result} | Rounds: ${r.rounds_result} | Cal: ${r.calories_result} | Metres: ${r.metres_result}`);
    console.log('');
  }
}

find();
