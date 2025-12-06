import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function verifyAllTables() {
  console.log('🔍 Verifying all movement-related tables...\n');

  const tables = [
    { name: 'barbell_lifts', description: 'Lift definitions' },
    { name: 'benchmark_workouts', description: 'CrossFit benchmarks' },
    { name: 'forge_benchmarks', description: 'Gym-specific benchmarks' },
    { name: 'lift_records', description: 'Athlete lift results' },
    { name: 'benchmark_results', description: 'Athlete benchmark results' },
    { name: 'wod_section_results', description: 'WOD section results (with new scoring fields)' }
  ];

  let allSuccess = true;

  for (const table of tables) {
    const { data, error } = await supabase
      .from(table.name)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`❌ ${table.name}: MISSING`);
      console.log(`   ${table.description}`);
      console.log(`   Error: ${error.message}\n`);
      allSuccess = false;
    } else {
      console.log(`✅ ${table.name}: EXISTS`);
      console.log(`   ${table.description}\n`);
    }
  }

  console.log('─'.repeat(50));
  if (allSuccess) {
    console.log('✅ ALL TABLES VERIFIED - System ready for testing!');
  } else {
    console.log('⚠️  Some tables missing - check errors above');
  }
}

verifyAllTables();
