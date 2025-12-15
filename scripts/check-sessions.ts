import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkSessions() {
  const { data, error } = await supabase
    .from('weekly_sessions')
    .select('id, date, time, workout_id')
    .eq('date', '2025-12-03');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Sessions for Dec 3: ${data?.length || 0}`);
  console.table(data);
}

checkSessions();
