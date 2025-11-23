/**
 * Import Merged Exercises to Supabase
 * 1. Creates a backup of current exercises table
 * 2. Deletes existing exercises
 * 3. Imports the merged exercises
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

interface Exercise {
  name: string;
  display_name: string;
  category: string;
  subcategory?: string;
  equipment?: string[];
  body_parts?: string[];
  tags?: string[];
  difficulty?: string;
  is_warmup?: boolean;
  is_stretch?: boolean;
  search_terms?: string;
  description?: string;
  video_url?: string;
}

async function createBackup() {
  console.log('💾 Creating backup of current exercises...\n');

  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('❌ Error fetching exercises:', error);
    throw error;
  }

  const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
  const backupPath = `database/testing-area/exercises-backup-${today}.json`;
  fs.writeFileSync(backupPath, JSON.stringify(exercises, null, 2), 'utf-8');

  console.log(`✓ Backup created: ${backupPath}`);
  console.log(`✓ Backed up ${exercises?.length || 0} exercises\n`);

  return exercises?.length || 0;
}

async function deleteExistingExercises() {
  console.log('🗑️  Deleting existing exercises...\n');

  const { error } = await supabase
    .from('exercises')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (UUID that doesn't exist)

  if (error) {
    console.error('❌ Error deleting exercises:', error);
    throw error;
  }

  console.log('✓ All existing exercises deleted\n');
}

async function importExercises(exercises: Exercise[]) {
  console.log('📥 Importing merged exercises...\n');

  const batchSize = 100;
  let imported = 0;

  for (let i = 0; i < exercises.length; i += batchSize) {
    const batch = exercises.slice(i, i + batchSize);

    const { error } = await supabase
      .from('exercises')
      .insert(batch);

    if (error) {
      console.error(`❌ Error importing batch ${i / batchSize + 1}:`, error);
      throw error;
    }

    imported += batch.length;
    console.log(`✓ Imported ${imported}/${exercises.length} exercises...`);
  }

  console.log('\n✓ All exercises imported successfully!\n');
}

async function verifyImport(expectedCount: number) {
  console.log('🔍 Verifying import...\n');

  const { count, error } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('❌ Error verifying import:', error);
    throw error;
  }

  console.log(`✓ Database now contains: ${count} exercises`);
  console.log(`✓ Expected: ${expectedCount} exercises`);

  if (count === expectedCount) {
    console.log('✅ Import verification successful!\n');
  } else {
    console.warn(`⚠️  Warning: Count mismatch! Expected ${expectedCount}, got ${count}\n`);
  }

  return count;
}

async function getCategoryBreakdown() {
  console.log('📊 Category breakdown in database:\n');

  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('category');

  if (error) {
    console.error('❌ Error fetching categories:', error);
    return;
  }

  const categoryCounts: Record<string, number> = {};
  for (const ex of exercises || []) {
    categoryCounts[ex.category] = (categoryCounts[ex.category] || 0) + 1;
  }

  for (const [cat, count] of Object.entries(categoryCounts).sort()) {
    console.log(`  ${cat}: ${count}`);
  }
  console.log('');
}

async function importMergedExercises() {
  console.log('🚀 Import Merged Exercises to Supabase\n');
  console.log('=' .repeat(80));
  console.log('\n');

  try {
    // Step 1: Create backup
    const originalCount = await createBackup();

    // Step 2: Load merged exercises
    console.log('📂 Loading merged exercises file...\n');
    const mergedPath = 'database/testing-area/exercises-merged-final.json';
    const exercises: Exercise[] = JSON.parse(fs.readFileSync(mergedPath, 'utf-8'));
    console.log(`✓ Loaded ${exercises.length} exercises to import\n`);

    // Step 3: Delete existing
    await deleteExistingExercises();

    // Step 4: Import new
    await importExercises(exercises);

    // Step 5: Verify
    await verifyImport(exercises.length);

    // Step 6: Category breakdown
    await getCategoryBreakdown();

    console.log('=' .repeat(80));
    console.log('\n✅ Import complete!\n');
    console.log(`📊 Summary:`);
    console.log(`  Original exercises: ${originalCount}`);
    console.log(`  New exercises: ${exercises.length}`);
    console.log(`  Net change: ${exercises.length - originalCount > 0 ? '+' : ''}${exercises.length - originalCount}\n`);

  } catch (error) {
    console.error('\n❌ Import failed!');
    console.error('Error:', error);
    console.error('\n💡 Your backup is safe in database/testing-area/');
    console.error('You can restore it manually if needed.\n');
    process.exit(1);
  }
}

importMergedExercises();
