import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkMovementsTable() {
  console.log('Checking unified movements table...\n');

  // Check movements table
  const { data: movements, error: movementsError } = await supabase
    .from('movements')
    .select('id, name, category')
    .order('name')
    .limit(100);

  if (movementsError) {
    console.error('❌ Error fetching movements:', movementsError);
  } else {
    console.log(`✅ Movements table exists: ${movements?.length || 0} records`);

    if (movements && movements.length > 0) {
      // Group by category
      const byCategory = movements.reduce((acc, m) => {
        acc[m.category] = (acc[m.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('\n📊 Breakdown by category:');
      Object.entries(byCategory).forEach(([cat, count]) => {
        console.log(`   ${cat}: ${count}`);
      });

      console.log('\n📋 Sample records:');
      movements.slice(0, 10).forEach(m => {
        console.log(`   - ${m.name} (${m.category})`);
      });
    }
  }

  // Get total count
  const { count, error: countError } = await supabase
    .from('movements')
    .select('*', { count: 'exact', head: true });

  if (!countError) {
    console.log(`\n✅ Total movements in database: ${count}`);
  }
}

checkMovementsTable();
