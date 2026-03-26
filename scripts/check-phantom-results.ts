import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

async function check() {
  // Find wod_section_results where workout_date doesn't match the WOD's actual date
  const { data: results, error } = await supabase
    .from('wod_section_results')
    .select('id, user_id, wod_id, section_id, workout_date, scaling_level, reps_result, time_result, weight_result, rounds_result, calories_result, metres_result');

  if (error) {
    console.error('Error fetching results:', error.message);
    console.log('(If RLS error, need SUPABASE_SERVICE_ROLE_KEY in .env.local)');
    return;
  }

  // Get all WODs to check dates
  const wodIds = [...new Set(results.map(r => r.wod_id))];
  const { data: wods } = await supabase
    .from('wods')
    .select('id, date, workout_name')
    .in('id', wodIds);

  const wodDateMap = new Map(wods?.map(w => [w.id, { date: w.date, name: w.workout_name }]) || []);

  let phantomCount = 0;
  let duplicateUserSections = 0;

  // Check for date mismatches
  console.log('=== PHANTOM RECORDS (workout_date != WOD date) ===\n');
  for (const r of results) {
    const wod = wodDateMap.get(r.wod_id);
    if (!wod) {
      console.log(`  ORPHAN: result ${r.id} references non-existent wod_id ${r.wod_id}`);
      phantomCount++;
      continue;
    }
    if (r.workout_date !== wod.date) {
      console.log(`  PHANTOM: result=${r.id} wod="${wod.name}" wod_date=${wod.date} result_date=${r.workout_date} scaling=${r.scaling_level} reps=${r.reps_result}`);
      phantomCount++;
    }
  }
  console.log(`\nTotal phantom records: ${phantomCount}`);

  // Check for duplicates (same user + wod_id + section_id, different workout_date)
  console.log('\n=== DUPLICATE USER+SECTION COMBOS ===\n');
  const combos = new Map<string, typeof results>();
  for (const r of results) {
    const key = `${r.user_id}:::${r.wod_id}:::${r.section_id}`;
    if (!combos.has(key)) combos.set(key, []);
    combos.get(key)!.push(r);
  }
  for (const [_key, group] of combos) {
    if (group.length > 1) {
      duplicateUserSections++;
      const wod = wodDateMap.get(group[0].wod_id);
      console.log(`  DUPE: wod="${wod?.name}" section=${group[0].section_id.slice(0, 30)}...`);
      for (const r of group) {
        console.log(`    date=${r.workout_date} scaling=${r.scaling_level} reps=${r.reps_result} cals=${r.calories_result} id=${r.id}`);
      }
    }
  }
  console.log(`\nTotal duplicate combos: ${duplicateUserSections}`);
  console.log(`Total results scanned: ${results.length}`);
}

check();
