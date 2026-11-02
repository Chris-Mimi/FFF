/**
 * Rename workouts (wods.workout_name) from a JSON list — S429 workout-name audit.
 *
 *   npx tsx scripts/rename-workouts.ts renames/<file>.json            # dry run
 *   npx tsx scripts/rename-workouts.ts renames/<file>.json --commit
 *
 * File shape: [{ "from": "Old name", "to": "New name", "dates": ["2026-01-18"] }]
 * `from` matches the trimmed name exactly; `dates` (optional) limits it to those
 * workout dates — for generic names like "Deadlift". Skips Mimi's / kids
 * session types. Changes the app only: Google Calendar events keep the title
 * they were published with until the workout is published again.
 */
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const SKIP_TYPES = /turnen|diapers|kids/i;
const [file, flag] = process.argv.slice(2);
const commit = flag === '--commit';
type Rename = { from: string; to: string; dates?: string[] };

async function main() {
  const list: Rename[] = JSON.parse(fs.readFileSync(file, 'utf8'));
  const wods: { id: string; date: string; session_type: string | null; workout_name: string | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('wods').select('id, date, session_type, workout_name').range(from, from + 999);
    if (error) throw new Error(`wods: ${error.message}`);
    wods.push(...data);
    if (data.length < 1000) break;
  }

  let total = 0;
  for (const r of list) {
    const hits = wods.filter(w =>
      (w.workout_name ?? '').trim() === r.from.trim()
      && !SKIP_TYPES.test(w.session_type ?? '')
      && (!r.dates || r.dates.includes(w.date)));
    if (hits.length === 0) { console.log(`⚠️  0 workouts: "${r.from}"`); continue; }
    console.log(`${hits.length}x  "${r.from}"\n     → "${r.to}"   (${hits.map(h => h.date.slice(5)).join(', ')})`);
    total += hits.length;
    if (!commit) continue;
    const { error } = await db.from('wods').update({ workout_name: r.to }).in('id', hits.map(h => h.id));
    if (error) throw new Error(`update "${r.from}": ${error.message}`);
  }
  console.log(`\n${commit ? '✅ Renamed' : 'DRY RUN —'} ${total} workouts across ${list.length} names.`);
}

main().catch(e => { console.error(e); process.exit(1); });
