require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkLSitMovements() {
  // Check for L-Sit variations
  const { data: lsit, error: lsitError } = await supabase
    .from('movements')
    .select('name, category, movement_type, result_fields, description')
    .or('name.ilike.%l-sit%,name.ilike.%l sit%,name.ilike.%lsit%,name.ilike.%parallettes%')
    .order('category', { ascending: true });

  console.log('\n=== L-Sit / Parallettes Movements ===\n');
  if (lsitError) {
    console.error('Error:', lsitError);
  } else if (lsit.length === 0) {
    console.log('No L-Sit movements found');
  } else {
    lsit.forEach(m => {
      console.log(`Name: ${m.name}`);
      console.log(`Category: ${m.category}`);
      console.log(`Movement Type: ${m.movement_type}`);
      console.log(`Result Fields: ${JSON.stringify(m.result_fields)}`);
      console.log('---');
    });
  }

  // Check all holds
  const { data: holds, error: holdsError } = await supabase
    .from('movements')
    .select('name, category')
    .eq('category', 'hold')
    .order('name');

  console.log('\n=== All Holds ===\n');
  if (holdsError) {
    console.error('Error:', holdsError);
  } else if (holds.length === 0) {
    console.log('No holds found');
  } else {
    holds.forEach(m => console.log(`- ${m.name}`));
  }

  // Check forge benchmarks containing similar names
  const { data: forge, error: forgeError } = await supabase
    .from('movements')
    .select('name, category, movement_type')
    .eq('category', 'forge_benchmark')
    .or('name.ilike.%sit%,name.ilike.%hold%,name.ilike.%parallettes%')
    .order('name');

  console.log('\n=== Forge Benchmarks (with sit/hold/parallettes) ===\n');
  if (forgeError) {
    console.error('Error:', forgeError);
  } else if (forge.length === 0) {
    console.log('None found');
  } else {
    forge.forEach(m => console.log(`- ${m.name} (${m.movement_type})`));
  }
}

checkLSitMovements();
