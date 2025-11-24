/**
 * Clean and Import Script
 * Deletes all exercises and imports fresh data
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanAndImport(jsonFilePath: string) {
  console.log('🧹 Clean and Import Script\n');

  // Step 1: Count existing exercises
  console.log('📊 Checking current database...');
  const { count: beforeCount } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true });

  console.log(`   Current exercises: ${beforeCount}\n`);

  // Step 2: Delete all exercises
  console.log('🗑️  Deleting all existing exercises...');
  const { error: deleteError } = await supabase
    .from('exercises')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (dummy condition)

  if (deleteError) {
    console.error('❌ Error deleting exercises:', deleteError);
    process.exit(1);
  }
  console.log('✓ All exercises deleted\n');

  // Step 3: Load new exercises
  console.log('📁 Reading file:', jsonFilePath);
  const exercises = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));
  console.log(`✓ Loaded ${exercises.length} exercises from JSON\n`);

  // Step 4: Import exercises
  console.log('⬆️  Uploading to Supabase...');
  const { data, error: importError } = await supabase
    .from('exercises')
    .insert(exercises)
    .select();

  if (importError) {
    console.error('❌ Error importing exercises:', importError);
    process.exit(1);
  }

  console.log('✅ Import successful!');
  console.log(`   Inserted: ${data?.length || 0} exercises\n`);

  // Step 5: Verify final count
  const { count: afterCount } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true });

  console.log('📊 Final database state:');
  console.log(`   Total exercises: ${afterCount}`);

  // Get count by category
  const { data: allExercises } = await supabase
    .from('exercises')
    .select('category');

  const byCategory: Record<string, number> = {};
  allExercises?.forEach((ex: any) => {
    byCategory[ex.category] = (byCategory[ex.category] || 0) + 1;
  });

  console.log('\n   By category:');
  Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`     ${count.toString().padStart(3)}: ${cat}`);
    });

  console.log('\n🎉 Database cleaned and re-imported successfully!');
}

const jsonPath = process.argv[2] || 'database/testing-area/exercises-import-2025-11-24.json';

if (!fs.existsSync(jsonPath)) {
  console.error('❌ Error: File not found:', jsonPath);
  process.exit(1);
}

cleanAndImport(jsonPath).catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
