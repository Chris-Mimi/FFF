/**
 * Cleanup stray wod_section_results — records under WODs where
 * the user has no confirmed booking (or the WOD has no session).
 *
 * These were created by the pre-Session-125 save bug.
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

const DRY_RUN = process.argv.includes('--delete') ? false : true;

async function cleanup() {
  // 1. Get all wod_section_results
  const { data: results, error } = await supabase
    .from('wod_section_results')
    .select('id, user_id, wod_id, section_id, workout_date, scaling_level, time_result, reps_result, weight_result, calories_result');

  if (error) {
    console.error('Error fetching results:', error.message);
    return;
  }

  console.log(`Total wod_section_results: ${results.length}\n`);

  const strayIds: string[] = [];

  for (const r of results) {
    // Check if WOD has a session
    const { data: session } = await supabase
      .from('weekly_sessions')
      .select('id')
      .eq('workout_id', r.wod_id)
      .maybeSingle();

    if (!session) {
      console.log(`STRAY (no session): result=${r.id.slice(0, 8)} wod=${r.wod_id.slice(0, 8)} date=${r.workout_date} scaling=${r.scaling_level} time=${r.time_result} reps=${r.reps_result} cal=${r.calories_result}`);
      strayIds.push(r.id);
      continue;
    }

    // Check if user has confirmed booking
    const { data: booking } = await supabase
      .from('bookings')
      .select('id')
      .eq('session_id', session.id)
      .eq('member_id', r.user_id)
      .eq('status', 'confirmed')
      .maybeSingle();

    if (!booking) {
      console.log(`STRAY (no booking): result=${r.id.slice(0, 8)} wod=${r.wod_id.slice(0, 8)} date=${r.workout_date} scaling=${r.scaling_level} time=${r.time_result} reps=${r.reps_result} cal=${r.calories_result}`);
      strayIds.push(r.id);
    }
  }

  console.log(`\nFound ${strayIds.length} stray records out of ${results.length} total.`);

  if (strayIds.length === 0) {
    console.log('Nothing to clean up.');
    return;
  }

  if (DRY_RUN) {
    console.log('\nDRY RUN — run with --delete to actually remove them.');
  } else {
    console.log('\nDeleting stray records...');
    const { error: delError } = await supabase
      .from('wod_section_results')
      .delete()
      .in('id', strayIds);

    if (delError) {
      console.error('Delete error:', delError.message);
    } else {
      console.log(`Deleted ${strayIds.length} stray records.`);
    }
  }
}

cleanup();
