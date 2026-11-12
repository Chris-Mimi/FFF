/**
 * Restore a member deleted by Reject (S432: Lena Rothe) from a backup — the
 * member row (as BLOCKED, no login), their bookings and wod_section_results —
 * so their attendance shows again in Session Management. INSERT-only: fails
 * rather than overwrite if a row already exists. No login / athlete profile.
 *
 *   npx tsx scripts/restore-rejected-member-history.ts <backup-date> <member-id>            # dry run
 *   npx tsx scripts/restore-rejected-member-history.ts <backup-date> <member-id> --commit
 */
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const [date, memberId, flag] = process.argv.slice(2);
const commit = flag === '--commit';

type Row = Record<string, unknown>;
const load = (table: string): Row[] => {
  const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'backups', `${date}_${table}.json`), 'utf8'));
  return Array.isArray(raw) ? raw : (raw.data ?? []);
};

async function insert(table: string, rows: Row[]) {
  console.log(`${table}: ${rows.length} row(s)`);
  rows.forEach(r => console.log(`   ${r.id}  ${table === 'members' ? `${r.name} status=${r.status}` : table === 'bookings' ? `session=${r.session_id} status=${r.status}` : `date=${r.workout_date} wod=${r.wod_id}`}`));
  if (!commit || !rows.length) return;
  const { error } = await db.from(table).insert(rows);
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`   ✅ inserted`);
}

async function main() {
  const member = load('members').find(m => m.id === memberId);
  if (!member) throw new Error('member not in backup');
  await insert('members', [{ ...member, status: 'blocked', updated_at: new Date().toISOString() }]);
  await insert('bookings', load('bookings').filter(b => b.member_id === memberId));
  await insert('wod_section_results', load('wod_section_results').filter(r => r.member_id === memberId));
  console.log(commit ? '\n✅ Restored.' : '\nDRY RUN — add --commit to write.');
}

main().catch(e => { console.error(e); process.exit(1); });
