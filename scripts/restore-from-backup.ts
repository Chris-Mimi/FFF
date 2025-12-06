/**
 * RESTORE DATA FROM BACKUP
 * Restores data from JSON backup files
 *
 * Usage: npx tsx scripts/restore-from-backup.ts YYYY-MM-DD
 * Example: npx tsx scripts/restore-from-backup.ts 2025-12-06
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BACKUP_DIR = path.join(process.cwd(), 'backups');

async function restoreTable(tableName: string, backupDate: string) {
  const filename = `${backupDate}_${tableName}.json`;
  const filepath = path.join(BACKUP_DIR, filename);

  if (!fs.existsSync(filepath)) {
    console.log(`⚠️  ${tableName}: No backup file found (${filename})`);
    return false;
  }

  console.log(`📥 Restoring ${tableName}...`);

  try {
    const backupData = JSON.parse(fs.readFileSync(filepath, 'utf-8'));

    if (!backupData || backupData.length === 0) {
      console.log(`   ⚠️  Backup file is empty`);
      return true;
    }

    // Insert data (ON CONFLICT DO NOTHING to avoid duplicates)
    const { error } = await supabase
      .from(tableName)
      .upsert(backupData, { onConflict: 'id' });

    if (error) {
      console.error(`   ❌ Error: ${error.message}`);
      return false;
    }

    console.log(`   ✅ Restored ${backupData.length} records`);
    return true;
  } catch (error) {
    console.error(`   ❌ Failed to restore ${tableName}:`, error);
    return false;
  }
}

async function main() {
  const backupDate = process.argv[2];

  if (!backupDate) {
    console.error('❌ Error: Please provide backup date');
    console.log('Usage: npx tsx scripts/restore-from-backup.ts YYYY-MM-DD');
    console.log('');
    console.log('Available backups:');
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('_manifest.json'));
    files.forEach(f => console.log(`  - ${f.replace('_manifest.json', '')}`));
    process.exit(1);
  }

  const manifestPath = path.join(BACKUP_DIR, `${backupDate}_manifest.json`);
  if (!fs.existsSync(manifestPath)) {
    console.error(`❌ No backup found for date: ${backupDate}`);
    console.log('Run: npx tsx scripts/restore-from-backup.ts (with no args) to see available backups');
    process.exit(1);
  }

  console.log('═'.repeat(60));
  console.log('🔄 RESTORE FROM BACKUP');
  console.log(`📅 Backup Date: ${backupDate}`);
  console.log('═'.repeat(60));
  console.log('');

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const tables = Object.keys(manifest.tables);

  console.log(`📋 Restoring ${tables.length} tables...`);
  console.log('');

  const results: Record<string, boolean> = {};

  for (const tableName of tables) {
    results[tableName] = await restoreTable(tableName, backupDate);
  }

  console.log('');
  console.log('─'.repeat(60));

  const allSuccess = Object.values(results).every(v => v);

  if (allSuccess) {
    console.log('✅ ALL DATA RESTORED SUCCESSFULLY');
  } else {
    console.log('⚠️  SOME RESTORES FAILED - Check errors above');
  }

  console.log('═'.repeat(60));
}

main();
