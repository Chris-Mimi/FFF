import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listAllExercises() {
  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('name, category')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Total exercises: ${exercises.length}\n`);
  exercises.forEach((ex, i) => {
    console.log(`${i + 1}. ${ex.name} [${ex.category}]`);
  });
}

listAllExercises();
