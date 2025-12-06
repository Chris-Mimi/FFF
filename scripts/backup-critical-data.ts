/**
 * CRITICAL DATA BACKUP SCRIPT
 * Run this BEFORE any major changes, migrations, or branch switches
 *
 * Usage: npm run backup (add to package.json)
 * Or: npx tsx scripts/backup-critical-data.ts
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
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function backupTable(tableName: string, description: string) {
  console.log(`📦 Backing up ${tableName}...`);

  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*');

    if (error) {
      console.error(`   ❌ Error: ${error.message}`);
      return false;
    }

    const filename = `${timestamp}_${tableName}.json`;
    const filepath = path.join(BACKUP_DIR, filename);

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`   ✅ Saved ${data?.length || 0} records to ${filename}`);
    return true;
  } catch (error) {
    console.error(`   ❌ Failed to backup ${tableName}:`, error);
    return false;
  }
}

async function createBackupManifest(results: Record<string, boolean>) {
  const manifest = {
    timestamp: new Date().toISOString(),
    date: timestamp,
    tables: results,
    success: Object.values(results).every(v => v),
    location: BACKUP_DIR
  };

  const manifestPath = path.join(BACKUP_DIR, `${timestamp}_manifest.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n📋 Manifest saved: ${manifestPath}`);

  return manifest;
}

async function main() {
  console.log('═'.repeat(60));
  console.log('🛡️  CRITICAL DATA BACKUP');
  console.log(`📅 Date: ${new Date().toLocaleString()}`);
  console.log(`📁 Location: ${BACKUP_DIR}`);
  console.log('═'.repeat(60));
  console.log('');

  const criticalTables = [
    { name: 'barbell_lifts', desc: 'Lift definitions' },
    { name: 'benchmark_workouts', desc: 'CrossFit benchmarks' },
    { name: 'forge_benchmarks', desc: 'Custom gym benchmarks' },
    { name: 'lift_records', desc: 'Athlete lift results (CRITICAL USER DATA)' },
    { name: 'benchmark_results', desc: 'Athlete benchmark results (CRITICAL USER DATA)' },
    { name: 'wod_section_results', desc: 'WOD results (CRITICAL USER DATA)' },
    { name: 'wods', desc: 'Programmed workouts' },
    { name: 'exercises', desc: 'Exercise library' },
  ];

  const results: Record<string, boolean> = {};

  for (const table of criticalTables) {
    results[table.name] = await backupTable(table.name, table.desc);
  }

  console.log('');
  console.log('─'.repeat(60));

  const manifest = await createBackupManifest(results);

  if (manifest.success) {
    console.log('✅ ALL BACKUPS COMPLETED SUCCESSFULLY');
  } else {
    console.log('⚠️  SOME BACKUPS FAILED - Check errors above');
  }

  console.log('═'.repeat(60));
  console.log('');
  console.log('💡 Next steps:');
  console.log('   1. Backups saved to: ' + BACKUP_DIR);
  console.log('   2. Keep these files safe before making changes');
  console.log('   3. To restore: use scripts/restore-from-backup.ts');
  console.log('');
}

main();
