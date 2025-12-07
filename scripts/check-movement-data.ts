import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkMovementData() {
  console.log('Checking movement library data...\n');

  // Check barbell_lifts
  const { data: lifts, error: liftsError } = await supabase
    .from('barbell_lifts')
    .select('id, name, category')
    .order('display_order');

  if (liftsError) {
    console.error('❌ Error fetching barbell_lifts:', liftsError);
  } else {
    console.log(`✅ Barbell Lifts: ${lifts?.length || 0} records`);
    if (lifts && lifts.length > 0) {
      console.log('   Sample:', lifts.slice(0, 3).map(l => l.name).join(', '));
    }
  }

  // Check benchmark_workouts
  const { data: benchmarks, error: benchmarksError } = await supabase
    .from('benchmark_workouts')
    .select('id, name, type')
    .order('display_order');

  if (benchmarksError) {
    console.error('❌ Error fetching benchmark_workouts:', benchmarksError);
  } else {
    console.log(`✅ Benchmarks: ${benchmarks?.length || 0} records`);
    if (benchmarks && benchmarks.length > 0) {
      console.log('   Sample:', benchmarks.slice(0, 3).map(b => b.name).join(', '));
    }
  }

  // Check forge_benchmarks
  const { data: forge, error: forgeError } = await supabase
    .from('forge_benchmarks')
    .select('id, name, type')
    .order('name');

  if (forgeError) {
    console.error('❌ Error fetching forge_benchmarks:', forgeError);
  } else {
    console.log(`✅ Forge Benchmarks: ${forge?.length || 0} records`);
    if (forge && forge.length > 0) {
      console.log('   Sample:', forge.slice(0, 3).map(f => f.name).join(', '));
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Total Lifts: ${lifts?.length || 0}`);
  console.log(`Total Benchmarks: ${benchmarks?.length || 0}`);
  console.log(`Total Forge Benchmarks: ${forge?.length || 0}`);
}

checkMovementData();
