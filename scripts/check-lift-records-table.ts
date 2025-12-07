import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkLiftRecordsTable() {
  console.log('Checking lift_records table...\n');

  const { data, error } = await supabase
    .from('lift_records')
    .select('*')
    .limit(5);

  if (error) {
    console.error('❌ Error querying lift_records:', error);
  } else {
    console.log(`✅ lift_records table exists: ${data?.length || 0} records`);
    if (data && data.length > 0) {
      console.log('\n📋 Sample record structure:');
      console.log(JSON.stringify(data[0], null, 2));
    }
  }
}

checkLiftRecordsTable();
