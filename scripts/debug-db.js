require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function debug() {
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set');
  console.log('Anon Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set (first 10 chars): ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 10) : 'Not set');

  // Try to query movements table
  const { data, error, count } = await supabase
    .from('movements')
    .select('*', { count: 'exact' });

  console.log('\n=== Query Result ===');
  console.log('Error:', error);
  console.log('Count:', count);
  console.log('Data rows:', data ? data.length : 0);

  if (data && data.length > 0) {
    console.log('\nFirst movement:');
    console.log(JSON.stringify(data[0], null, 2));
  }
}

debug();
