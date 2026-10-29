/**
 * S425 — 25.10 10:00 Hold/Move couplets: everyone did the bonus round → Track 1 (Chris).
 * Guarded to exactly the 30 rows written from board 43.4 (6 athletes × 5 sections).
 *
 *   npx tsx scripts/fix-2510-couplets-track1.ts [--commit]
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const COMMIT = process.argv.includes('--commit');
const WOD = '0f4432c4-ed70-44a2-8e2a-ce3e1572edf0';

async function main() {
  const { data, error } = await db.from('wod_section_results').select('id, track').eq('wod_id', WOD);
  if (error) throw error;
  console.log(`rows on 25.10 10:00: ${data?.length}, already track 1: ${data?.filter(r => r.track === 1).length}`);
  if (data?.length !== 30) throw new Error('expected exactly 30 rows — stopping');
  if (!COMMIT) { console.log('Dry run — add --commit.'); return; }
  const { error: uErr } = await db.from('wod_section_results')
    .update({ track: 1, updated_at: new Date().toISOString() }).eq('wod_id', WOD);
  if (uErr) throw uErr;
  console.log('✅ 30 rows → Track 1');
}
main().catch(e => { console.error(e); process.exit(1); });
