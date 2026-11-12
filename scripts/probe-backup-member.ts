/**
 * Probe: find a member in a backup and list every backed-up row that references
 * them, plus whether each row still exists live.
 *   npx tsx scripts/probe-backup-member.ts <YYYY-MM-DD> "<name>"
 */
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const [date, name] = process.argv.slice(2);
const dir = path.join(process.cwd(), 'backups');

type Row = Record<string, unknown>;
const load = (table: string): Row[] => {
  const f = path.join(dir, `${date}_${table}.json`);
  if (!fs.existsSync(f)) return [];
  const raw = JSON.parse(fs.readFileSync(f, 'utf8'));
  return Array.isArray(raw) ? raw : (raw.data ?? []);
};

async function main() {
  const members = load('members').filter(m => String(m.name ?? '').toLowerCase().includes(name.toLowerCase()));
  for (const m of members) {
    console.log(`\nMEMBER ${m.name} id=${m.id} email=${m.email} status=${m.status} created=${m.created_at}`);
    const live = await db.from('members').select('id').eq('id', m.id as string);
    console.log(`  live member row: ${live.error ? 'ERR ' + live.error.message : live.data.length}`);
    const ids = [m.id, m.email].filter(Boolean);
    const tables = fs.readdirSync(dir).filter(f => f.startsWith(`${date}_`) && !f.endsWith('manifest.json'))
      .map(f => f.slice(date.length + 1, -5));
    for (const t of tables) {
      if (t === 'members') continue;
      const rows = load(t).filter(r => Object.values(r).some(v => ids.includes(v as string)));
      if (!rows.length) continue;
      const liveRows = await db.from(t).select('id').in('id', rows.map(r => r.id as string));
      console.log(`  ${t}: ${rows.length} in backup, ${liveRows.error ? 'ERR ' + liveRows.error.message : liveRows.data.length} still live`);
      if (t === 'bookings') rows.forEach(r => console.log(`    booking ${r.id} session=${r.session_id} status=${r.status}`));
      if (t === 'wod_section_results') rows.forEach(r => console.log(`    wsr ${r.id} date=${r.workout_date} wod=${r.wod_id}`));
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
