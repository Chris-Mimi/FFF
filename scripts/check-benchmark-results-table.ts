import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkBenchmarkResultsTable() {
  console.log('Checking benchmark_results table...\n');

  const { data, error } = await supabase
    .from('benchmark_results')
    .select('*')
    .limit(5);

  if (error) {
    console.error('❌ Error querying benchmark_results:', error);
  } else {
    console.log(`✅ benchmark_results table exists: ${data?.length || 0} records`);
    if (data && data.length > 0) {
      console.log('\n📋 Sample record structure:');
      console.log(JSON.stringify(data[0], null, 2));
    }
  }
}

checkBenchmarkResultsTable();
