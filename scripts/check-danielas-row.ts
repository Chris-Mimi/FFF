import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const { data: rows } = await supabase
    .from('wod_section_results')
    .select('id, whiteboard_name, workout_date, wod_id, time_result, reps_result, weight_result, rounds_result, calories_result')
    .eq('whiteboard_name', 'DanielaS (PT)');

  if (!rows?.length) { console.log('No row found'); return; }

  for (const r of rows) {
    const { data: wod } = await supabase
      .from('wods').select('date, session_type, workout_name').eq('id', r.wod_id).single();
    console.log(`Row ${r.id}`);
    console.log(`  whiteboard_name: "${r.whiteboard_name}"`);
    console.log(`  workout_date: ${r.workout_date}`);
    console.log(`  WOD: ${wod?.date} ${wod?.session_type} ${wod?.workout_name ?? ''}`);
    console.log(`  score: time=${r.time_result ?? '-'} reps=${r.reps_result ?? '-'} weight=${r.weight_result ?? '-'} rounds=${r.rounds_result ?? '-'} calories=${r.calories_result ?? '-'}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
