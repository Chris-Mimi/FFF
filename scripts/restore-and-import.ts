/**
 * Restore Backup and Import Clean Merged File
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
  [key: string]: any;
}

async function restoreBackup() {
  console.log('♻️  Restoring from backup...\n');

  // Find latest backup
  const backupFiles = fs.readdirSync('database/testing-area')
    .filter(f => f.startsWith('exercises-backup-'))
    .sort()
    .reverse();

  if (backupFiles.length === 0) {
    console.error('❌ No backup found!');
    return false;
  }

  const latestBackup = backupFiles[0];
  const backupPath = `database/testing-area/${latestBackup}`;

  console.log(`Using backup: ${latestBackup}\n`);

  const exercises: Exercise[] = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

  // Delete current
  await supabase
    .from('exercises')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  // Restore
  const batchSize = 100;
  for (let i = 0; i < exercises.length; i += batchSize) {
    const batch = exercises.slice(i, i + batchSize);
    await supabase.from('exercises').insert(batch);
  }

  console.log(`✓ Restored ${exercises.length} exercises from backup\n`);
  return true;
}

async function importCleanMerged() {
  console.log('📥 Importing clean merged file...\n');

  const mergedPath = 'database/testing-area/exercises-merged-final.json';
  const exercises: Exercise[] = JSON.parse(fs.readFileSync(mergedPath, 'utf-8'));

  console.log(`Loaded ${exercises.length} exercises\n`);

  // Delete all
  await supabase
    .from('exercises')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('✓ Cleared existing exercises\n');

  // Import in batches
  const batchSize = 100;
  let imported = 0;

  for (let i = 0; i < exercises.length; i += batchSize) {
    const batch = exercises.slice(i, i + batchSize);

    const { error } = await supabase
      .from('exercises')
      .insert(batch);

    if (error) {
      console.error(`❌ Error importing batch ${i / batchSize + 1}:`, error);
      console.log('\n⚠️  Restoring from backup...\n');
      await restoreBackup();
      throw error;
    }

    imported += batch.length;
    console.log(`✓ Imported ${imported}/${exercises.length} exercises...`);
  }

  console.log('\n✅ Import successful!\n');

  // Verify
  const { count } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Database now contains: ${count} exercises\n`);

  // Category breakdown
  const { data: categoryData } = await supabase
    .from('exercises')
    .select('category');

  const categoryCounts: Record<string, number> = {};
  for (const ex of categoryData || []) {
    categoryCounts[ex.category] = (categoryCounts[ex.category] || 0) + 1;
  }

  console.log('Category breakdown:');
  for (const [cat, count] of Object.entries(categoryCounts).sort()) {
    console.log(`  ${cat}: ${count}`);
  }
  console.log('');
}

async function main() {
  console.log('🚀 Restore and Import\n');
  console.log('=' .repeat(80));
  console.log('\n');

  try {
    await importCleanMerged();
    console.log('=' .repeat(80));
    console.log('\n✅ All done!\n');
  } catch (error) {
    console.error('\n❌ Failed!');
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
