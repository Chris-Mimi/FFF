/**
 * RESTORE SINGLE TABLE FROM BACKUP
 * Usage: npx tsx scripts/restore-single-table.ts YYYY-MM-DD tableName
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const BACKUP_DIR = path.join(process.cwd(), 'backups');

async function main() {
  const backupDate = process.argv[2];
  const tableName = process.argv[3];

  if (!backupDate || !tableName) {
    console.error('Usage: npx tsx scripts/restore-single-table.ts YYYY-MM-DD tableName');
    process.exit(1);
  }

  const filename = `${backupDate}_${tableName}.json`;
  const filepath = path.join(BACKUP_DIR, filename);

  if (!fs.existsSync(filepath)) {
    console.error(`❌ No backup file found: ${filename}`);
    process.exit(1);
  }

  const backupData = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  console.log(`📥 Restoring ${tableName} from ${backupDate} (${backupData.length} records)...`);

  const { error } = await supabase
    .from(tableName)
    .upsert(backupData, { onConflict: 'id' });

  if (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }

  console.log(`✅ Restored ${backupData.length} records to ${tableName}`);
}

main();
