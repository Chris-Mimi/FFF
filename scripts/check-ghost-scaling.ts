import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);

async function check() {
  // 1. Find "The Ghost" WOD
  const { data: wods } = await supabase
    .from('wods')
    .select('id, date, workout_name, sections')
    .eq('date', '2025-12-01');

  if (!wods?.length) { console.log('No WODs found for 2025-12-01'); return; }

  for (const wod of wods) {
    console.log(`\nWOD: ${wod.workout_name || '(no name)'} | id: ${wod.id}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sections = wod.sections as any[];
    for (const s of sections) {
      console.log(`  Section: "${s.type}" id=${s.id}`);
      console.log(`    scoring_fields:`, JSON.stringify(s.scoring_fields));
      console.log(`    content: ${(s.content || '').substring(0, 100)}`);
    }

    // 2. Fetch ALL wod_section_results for this WOD
    const { data: results } = await supabase
      .from('wod_section_results')
      .select('id, user_id, section_id, scaling_level, reps_result, time_result, weight_result, task_completed')
      .eq('wod_id', wod.id);

    console.log(`\n  Section Results (${results?.length || 0}):`);
    for (const r of results || []) {
      console.log(`    section_id=${r.section_id} | scaling_level=${JSON.stringify(r.scaling_level)} | reps=${r.reps_result} | time=${r.time_result} | weight=${r.weight_result}`);
    }
  }
}

check();
