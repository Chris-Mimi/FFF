import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function createSession() {
  console.log('Creating weekly_sessions entry for Dec 3...\n');

  const { data, error } = await supabase
    .from('weekly_sessions')
    .insert([{
      date: '2025-12-03',
      time: '17:15:00',
      workout_id: '7bf1765d-179b-4ec2-9d37-13c90598d3f2', // Dec 3 workout ID
      capacity: 12,
      status: 'active'
    }])
    .select();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('✅ Session created successfully!');
  console.table(data);
}

createSession();
