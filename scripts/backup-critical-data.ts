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

// Use service role key to bypass RLS and access all tables
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
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

async function discoverTables(): Promise<string[]> {
  console.log('🔍 Discovering tables in public schema...\n');

  const { data, error } = await supabase.rpc('get_public_tables');

  if (error) {
    // Fallback: use known tables if RPC not available
    console.log('   ⚠️  RPC not available, using fallback table list');
    return KNOWN_TABLES;
  }

  const tables = (data as { tablename: string }[]).map(r => r.tablename).sort();
  console.log(`   Found ${tables.length} tables\n`);
  return tables;
}

// Fallback list in case RPC function doesn't exist yet
const KNOWN_TABLES = [
  'athlete_profiles', 'barbell_lifts', 'benchmark_results', 'benchmark_workouts',
  'bookings', 'exercises', 'forge_benchmarks', 'lift_records', 'members',
  'movement_results', 'naming_conventions', 'note_folders', 'programming_notes',
  'resources', 'section_types', 'session_templates', 'subscriptions', 'tracks',
  'reactions', 'user_exercise_favorites', 'weekly_sessions', 'whiteboard_photos',
  'wod_section_results', 'wods', 'workout_logs', 'workout_titles', 'workout_types',
];

async function main() {
  console.log('═'.repeat(60));
  console.log('🛡️  CRITICAL DATA BACKUP');
  console.log(`📅 Date: ${new Date().toLocaleString()}`);
  console.log(`📁 Location: ${BACKUP_DIR}`);
  console.log('═'.repeat(60));
  console.log('');

  const tables = await discoverTables();

  // Check for new tables not in known list
  const newTables = tables.filter(t => !KNOWN_TABLES.includes(t));
  if (newTables.length > 0) {
    console.log(`🆕 New tables found: ${newTables.join(', ')}\n`);
  }

  const results: Record<string, boolean> = {};

  for (const tableName of tables) {
    results[tableName] = await backupTable(tableName, tableName);
  }

  console.log('');
  console.log('─'.repeat(60));

  const manifest = await createBackupManifest(results);

  if (manifest.success) {
    console.log('✅ ALL BACKUPS COMPLETED SUCCESSFULLY');
  } else {
    console.log('⚠️  SOME BACKUPS FAILED - Check errors above');
  }

  console.log(`📊 Total tables backed up: ${Object.values(results).filter(v => v).length}/${tables.length}`);
  console.log('═'.repeat(60));
  console.log('');
  console.log('💡 Next steps:');
  console.log('   1. Backups saved to: ' + BACKUP_DIR);
  console.log('   2. Keep these files safe before making changes');
  console.log('   3. To restore: use scripts/restore-from-backup.ts');
  console.log('');
}

main();
