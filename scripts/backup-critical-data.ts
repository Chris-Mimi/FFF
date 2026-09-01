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

// PostgREST caps a single .select() at 1000 rows (no error, silently truncated).
// Page through with .range() so tables >1000 rows are backed up in full.
const PAGE_SIZE = 1000;

async function backupTable(tableName: string, _description: string) {
  console.log(`📦 Backing up ${tableName}...`);

  try {
    const rows: unknown[] = [];
    let from = 0;

    for (;;) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        console.error(`   ❌ Error: ${error.message}`);
        return false;
      }

      const page = data ?? [];
      rows.push(...page);

      // Last page: fewer rows than a full page means we've reached the end.
      if (page.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    const filename = `${timestamp}_${tableName}.json`;
    const filepath = path.join(BACKUP_DIR, filename);

    fs.writeFileSync(filepath, JSON.stringify(rows, null, 2));
    console.log(`   ✅ Saved ${rows.length} records to ${filename}`);
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


/**
 * Retention: keep only the newest N backup runs on disk.
 *
 * Every run writes one file per table (~5.6 MB across ~50 tables) and nothing
 * ever removed them, so `backups/` had grown to 84 runs / 471 MB. It also lives
 * inside SynologyDrive, so each run syncs to the NAS and down to the other
 * machine — the cost is ongoing, not just local disk.
 *
 * Only files matching `YYYY-MM-DD_*.json` in BACKUP_DIR are considered, and the
 * current run's date is never a deletion candidate. Override with
 * `BACKUP_KEEP_RUNS=n npm run backup`, or set 0 to disable pruning entirely.
 *
 * Why 40 and not a tidier 20: backups run ~10x/month, so 40 is ~4 months. The
 * S385 lift-record loss went unnoticed for ~2 months — a 20-run (2-month)
 * window would expire the backups right around the point such a loss gets
 * noticed. 40 keeps roughly double the known detection lag.
 */
const KEEP_RUNS = Number(process.env.BACKUP_KEEP_RUNS ?? 40);

function pruneOldBackups() {
  if (!Number.isFinite(KEEP_RUNS) || KEEP_RUNS <= 0) {
    console.log('🗂️  Retention disabled (BACKUP_KEEP_RUNS <= 0) — keeping every run.');
    return;
  }

  const filePattern = /^(\d{4}-\d{2}-\d{2})_.+\.json$/;
  const byDate = new Map<string, string[]>();

  for (const name of fs.readdirSync(BACKUP_DIR)) {
    const m = filePattern.exec(name);
    if (!m) continue; // leave anything not matching the run pattern alone
    const list = byDate.get(m[1]) ?? [];
    list.push(name);
    byDate.set(m[1], list);
  }

  const dates = [...byDate.keys()].sort().reverse(); // newest first
  if (dates.length <= KEEP_RUNS) {
    console.log(`🗂️  ${dates.length} backup run(s) on disk — under the ${KEEP_RUNS}-run limit, nothing pruned.`);
    return;
  }

  const doomed = dates.slice(KEEP_RUNS).filter(d => d !== timestamp); // never today's
  let files = 0;
  let bytes = 0;

  for (const date of doomed) {
    for (const name of byDate.get(date) ?? []) {
      const full = path.join(BACKUP_DIR, name);
      try {
        bytes += fs.statSync(full).size;
        fs.unlinkSync(full);
        files++;
      } catch (err) {
        console.error(`   ⚠️  Could not remove ${name}:`, (err as Error).message);
      }
    }
  }

  console.log(
    `🗂️  Retention: kept the newest ${KEEP_RUNS} run(s), removed ${doomed.length} older run(s) ` +
    `(${files} files, ${(bytes / 1024 / 1024).toFixed(1)} MB).`
  );
}

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

  // Only prune once this run has written a complete snapshot — never trade a
  // good old backup for a failed new one.
  if (manifest.success) {
    pruneOldBackups();
  } else {
    console.log('🗂️  Retention skipped — this run had failures, keeping all existing backups.');
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
