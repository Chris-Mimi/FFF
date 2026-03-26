import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);

async function check() {
  const { data, error } = await supabase
    .from('wods')
    .select('id, session_type, workout_name, sections')
    .eq('date', '2025-12-01');

  if (error) { console.error(error); return; }

  for (const wod of data || []) {
    console.log('\n' + '='.repeat(60));
    console.log(`${wod.session_type} - ${wod.workout_name || '(no name)'}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sections = wod.sections as any[];
    for (const s of sections) {
      console.log(`  Section: "${s.type}" | workout_type_id: ${s.workout_type_id || 'NONE'}`);
    }
  }
}

check();
