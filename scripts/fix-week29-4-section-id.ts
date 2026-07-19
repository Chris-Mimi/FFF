/**
 * Fix 2026 Week 29.4 WSR section_id format (S399 self-correction).
 * enter-week29-4-whiteboard.ts wrote BARE section ids; the app/leaderboard require
 * `<sectionId>-content-0` (see app/api/score-entry/save/route.ts:215). Result: 10:00
 * scores were invisible on the leaderboard, and my 11:00 rows became duplicates of
 * Chris's app re-save.
 *
 *   10:00 wod 2ee9f0a2  → UPDATE 33 bare rows: append '-content-0' (no app rows here)
 *   11:00 wod 8530b257  → DELETE 14 bare rows (Chris's app '-content-0' rows are authoritative)
 *
 * Dry-run default.  npx tsx scripts/fix-week29-4-section-id.ts [--apply]
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const APPLY = process.argv.includes('--apply');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

const DATE = '2026-07-19';
const WOD_1000 = '2ee9f0a2-1540-4bc3-b3d1-c1f5c7ae20ca';
const WOD_1100 = '8530b257-0896-4923-93d7-d23c9c9cb834';

(async () => {
  // --- 10:00: convert bare -> -content-0 ---
  const { data: r10, error: e10 } = await sb.from('wod_section_results')
    .select('id,section_id').eq('wod_id', WOD_1000).eq('workout_date', DATE);
  if (e10) { console.error('10:00 fetch err:', e10.message); return; }
  const toConvert = (r10 || []).filter(r => !/-content-0$/.test(r.section_id));
  console.log(`10:00: ${r10?.length} rows, ${toConvert.length} bare → will append -content-0`);

  // --- 11:00: delete bare duplicates ---
  const { data: r11, error: e11 } = await sb.from('wod_section_results')
    .select('id,section_id').eq('wod_id', WOD_1100).eq('workout_date', DATE);
  if (e11) { console.error('11:00 fetch err:', e11.message); return; }
  const toDelete = (r11 || []).filter(r => !/-content-0$/.test(r.section_id));
  const keep11 = (r11 || []).length - toDelete.length;
  console.log(`11:00: ${r11?.length} rows, ${toDelete.length} bare → DELETE, ${keep11} content-0 kept`);

  if (!APPLY) { console.log('\nDRY RUN — pass --apply to write.'); return; }

  for (const r of toConvert) {
    const res = await sb.from('wod_section_results').update({ section_id: `${r.section_id}-content-0` }).eq('id', r.id);
    if (res.error) { console.error('❌ update', r.id, res.error.message); return; }
  }
  console.log(`✅ 10:00 converted ${toConvert.length} rows.`);

  const delIds = toDelete.map(r => r.id);
  if (delIds.length) {
    const res = await sb.from('wod_section_results').delete().in('id', delIds);
    if (res.error) { console.error('❌ delete', res.error.message); return; }
  }
  console.log(`✅ 11:00 deleted ${delIds.length} bare duplicates.`);
})();
