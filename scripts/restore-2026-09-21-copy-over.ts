/**
 * S416 — restore 21.09.26 17:15 + 18:30 scores lost when a workout was copied over
 * them on 06.10 (handleCopyWOD deletes the orphaned old wod + its results).
 * Source: backups/2026-10-04 (newest score change 27.09, so complete).
 * INSERT-only onto the new wods (identical section ids). Dry run unless --commit.
 *
 * Usage: npx tsx scripts/restore-2026-09-21-copy-over.ts [--commit]
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const commit = process.argv.includes('--commit');

// old (deleted) wod → new wod now on the session
const MAP: Record<string, string> = {
  'bc6f228b-851e-49ff-89a2-7c8ed3f7577a': '2557aa9c-8930-4cb1-8014-a15fc6ddca9f', // 17:15
  '0b3d3e81-2a48-484f-9aa5-30b4db70cdb8': '47350769-2134-4b8e-b83d-16d878eb81a3', // 18:30
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const load = (f: string): any[] => {
  const d = JSON.parse(fs.readFileSync(`backups/${f}`, 'utf8'));
  return Array.isArray(d) ? d : (Object.values(d).find(Array.isArray) as unknown[]);
};

async function main() {
  const wsr = load('2026-10-04_wod_section_results.json')
    .filter(r => MAP[r.wod_id])
    .map(r => ({ ...r, wod_id: MAP[r.wod_id] }));
  const lifts = load('2026-10-04_lift_records.json')
    .filter(r => MAP[r.wod_id])
    .map(r => ({ ...r, wod_id: MAP[r.wod_id] }));

  // Never overwrite: bail if any id already exists or the new wods already hold scores.
  const newIds = Object.values(MAP);
  const [{ count: liveWsr, error: e1 }, { data: wsrClash, error: e2 }, { data: liftClash, error: e3 }] = await Promise.all([
    db.from('wod_section_results').select('id', { count: 'exact', head: true }).in('wod_id', newIds),
    db.from('wod_section_results').select('id').in('id', wsr.map(r => r.id)),
    db.from('lift_records').select('id').in('id', lifts.map(r => r.id)),
  ]);
  if (e1 || e2 || e3) throw e1 || e2 || e3;
  console.log(`Backup: ${wsr.length} scores, ${lifts.length} lift records. Live scores on new wods: ${liveWsr}. Id clashes: ${wsrClash!.length} / ${liftClash!.length}`);
  if (liveWsr || wsrClash!.length || liftClash!.length) throw new Error('Target not empty — aborting');

  if (!commit) { console.log('Dry run — re-run with --commit'); return; }
  const r1 = await db.from('wod_section_results').insert(wsr);
  if (r1.error) throw r1.error;
  const r2 = await db.from('lift_records').insert(lifts);
  if (r2.error) throw r2.error;
  console.log(`Inserted ${wsr.length} scores + ${lifts.length} lift records.`);
}

main().catch(err => { console.error(err); process.exit(1); });
