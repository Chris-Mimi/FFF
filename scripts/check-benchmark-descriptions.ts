import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkBenchmarkDescriptions() {
  console.log('Checking how benchmark descriptions are stored...\n');

  const { data, error } = await supabase
    .from('benchmark_workouts')
    .select('name, description')
    .limit(3);

  if (error) {
    console.error('Error:', error);
    return;
  }

  data?.forEach(b => {
    console.log(`📋 ${b.name}`);
    console.log(`Raw string: ${JSON.stringify(b.description)}`);
    console.log(`Rendered:`);
    console.log(b.description);
    console.log('\n' + '─'.repeat(60) + '\n');
  });
}

checkBenchmarkDescriptions();
