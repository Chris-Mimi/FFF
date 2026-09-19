/**
 * Restore two `publish_sections` entries wiped by a stale WOD-editor save.
 *
 * Saving scores auto-adds the scored section to wods.publish_sections
 * (app/api/score-entry/save/route.ts). But the WOD editor sends the whole wod
 * object back on every save — including the copy of publish_sections it loaded when
 * it opened. Save scores, then save the workout from an editor opened beforehand
 * (even just to rename it), and the auto-added entry is overwritten. The scores
 * survive; the section simply stops rendering in the coach modal and leaderboard.
 *
 * Found by sweeping all 3,726 WSR rows: exactly 2 occurrences.
 *
 * Run: npx tsx scripts/restore-wiped-publish-sections.ts          (dry run)
 *      npx tsx scripts/restore-wiped-publish-sections.ts --write
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const WRITE = process.argv.includes('--write');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const FIXES = [
  { wodId: 'c8ef5a18-1b36-4ab9-9c7c-ddad2000d16a', section: 'section-1769605317197',   note: '2026-01-30 Foundations — Barbell Sumo Deadlift, 12 scores' },
  { wodId: 'c2999101-1b0d-4b87-8f4c-72476871e92c', section: 'section-1776596966051-3', note: '2026-04-24 WOD — 5 scores' },
];

(async () => {
  console.log(WRITE ? '=== WRITING ===\n' : '=== DRY RUN (pass --write to commit) ===\n');
  for (const f of FIXES) {
    const { data: w, error } = await sb.from('wods').select('id, title, date, sections, publish_sections').eq('id', f.wodId).single();
    if (error) { console.log(`❌ ${f.wodId}: ${error.message}`); continue; }

    // the section must actually exist on the wod, and must actually have scores
    const exists = ((w.sections as any[]) ?? []).some(s => s.id === f.section);
    const { count } = await sb.from('wod_section_results')
      .select('id', { count: 'exact', head: true }).eq('wod_id', f.wodId).eq('section_id', `${f.section}-content-0`);
    const cur: string[] = (w.publish_sections as string[]) ?? [];

    console.log(`${w.date}  "${w.title}"  ${f.note}`);
    console.log(`   section on wod: ${exists}   scores: ${count}   already published: ${cur.includes(f.section)}`);
    if (!exists || !count) { console.log('   ⏭  skipped (section missing or no scores)\n'); continue; }
    if (cur.includes(f.section)) { console.log('   ⏭  already published\n'); continue; }

    const next = [...cur, f.section];
    console.log(`   ${JSON.stringify(cur)}\n   → ${JSON.stringify(next)}`);
    if (WRITE) {
      const { error: ue } = await sb.from('wods').update({ publish_sections: next }).eq('id', f.wodId);
      if (ue) { console.log(`   ❌ ${ue.message}\n`); continue; }
      console.log('   ✅ restored\n');
    } else {
      console.log('   (dry run)\n');
    }
  }
})();
