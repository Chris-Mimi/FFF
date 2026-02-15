import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

async function cleanup() {
  // Find phantom records: wod_section_results where workout_date doesn't match WOD date
  const { data: results, error } = await supabase
    .from('wod_section_results')
    .select('id, wod_id, workout_date');

  if (error) { console.error('Error:', error.message); return; }

  const wodIds = [...new Set(results.map(r => r.wod_id))];
  const { data: wods } = await supabase
    .from('wods')
    .select('id, date')
    .in('id', wodIds);

  const wodDateMap = new Map(wods?.map(w => [w.id, w.date]) || []);

  const phantomIds: string[] = [];
  for (const r of results) {
    const wodDate = wodDateMap.get(r.wod_id);
    if (wodDate && r.workout_date !== wodDate) {
      phantomIds.push(r.id);
    }
  }

  console.log(`Found ${phantomIds.length} phantom records to delete`);

  if (phantomIds.length === 0) {
    console.log('Nothing to clean up!');
    return;
  }

  // Delete phantoms
  const { error: deleteError, count } = await supabase
    .from('wod_section_results')
    .delete()
    .in('id', phantomIds);

  if (deleteError) {
    console.error('Delete error:', deleteError.message);
  } else {
    console.log(`Deleted ${count ?? phantomIds.length} phantom records`);
  }
}

cleanup();
