import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function listAllForgeBenchmarks() {
  console.log('📋 Listing all Forge Benchmarks currently in database...\n');

  const { data, error } = await supabase
    .from('forge_benchmarks')
    .select('*')
    .order('name');

  if (error) {
    console.error('❌ Error fetching forge benchmarks:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  No forge benchmarks found in database\n');
    return;
  }

  console.log(`Found ${data.length} forge benchmark(s):\n`);
  data.forEach((fb, idx) => {
    console.log(`${idx + 1}. ${fb.name}`);
    console.log(`   Type: ${fb.type}`);
    console.log(`   Description: ${fb.description || 'N/A'}`);
    console.log(`   Has Scaling: ${fb.has_scaling}`);
    console.log(`   ID: ${fb.id}`);
    console.log(`   Created: ${fb.created_at}`);
    console.log('');
  });
}

listAllForgeBenchmarks();
