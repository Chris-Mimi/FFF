require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkAllMovements() {
  // Count by category
  const { data: counts, error: countsError } = await supabase
    .from('movements')
    .select('category');

  if (countsError) {
    console.error('Error:', countsError);
    return;
  }

  const grouped = counts.reduce((acc, m) => {
    acc[m.category] = (acc[m.category] || 0) + 1;
    return acc;
  }, {});

  console.log('\n=== Movement Counts by Category ===\n');
  Object.entries(grouped).forEach(([category, count]) => {
    console.log(`${category}: ${count}`);
  });

  // Show sample from each category
  for (const category of Object.keys(grouped)) {
    const { data: sample } = await supabase
      .from('movements')
      .select('name')
      .eq('category', category)
      .order('name')
      .limit(5);

    console.log(`\n=== ${category.toUpperCase()} (first 5) ===`);
    sample.forEach(m => console.log(`- ${m.name}`));
  }
}

checkAllMovements();
