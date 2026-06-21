/**
 * Restore the nulled/deleted lift weights for the RM-test weight-loss incident.
 *
 *   Back Squat Testing 3 & 1RM  → source backup 2026-04-17 (74 intact rows)
 *   Front Squat Testing 5RM     → source backup 2026-05-05 (21 intact rows)
 *
 * Per backup row (matched by primary-key id):
 *   - live row exists  → UPDATE weight_result (+_2/_3) ONLY (leaves scaling etc. untouched)
 *   - live row missing → INSERT the full backup row (restores deleted rows)
 * Also flips scoring_fields.load → true on the 14 affected wod sections so the
 * leaderboard safeguard stops hiding the restored weights.
 *
 * DRY RUN by default. Pass --apply to write. Service-role required.
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const APPLY = process.argv.includes('--apply');
const DIR = path.join(__dirname, '..', 'backups');

const BACK_SQUAT_WODS = [
  'efd2abea-941c-4441-9184-a30a14036f9d',
  'e5ad0c30-df00-489a-9178-cc73b0bdba0d',
  'e954edad-e1d6-4304-a2b4-36e7ef991c96',
  'a1f2d37c-31bd-4605-a3e8-7f77f40f366e',
  '5c3fe17b-b7b8-4dbe-901e-cd9f0c073449',
];
const BACK_SQUAT_SECTIONS = ['section-1774269586230-content-0', 'section-1774191503053-4-content-0'];

const FRONT_SQUAT_WODS = [
  '43a3c11d-f65d-48cd-897f-7c1a3640d0fe',
  '7d98ed20-087a-463d-ac3f-e5e078999cbb',
  'e988eb5d-6a06-459a-915c-67586f97799e',
  '0c2ff079-f7c4-418b-8c48-805a00633eae',
];
const FRONT_SQUAT_SECTIONS = ['section-1776596966051-3-content-0'];

// section base-ids (without -content-0) to flip load:true on the wod JSON
const SECTION_LOAD_FIX: Record<string, string[]> = {
  ...Object.fromEntries(BACK_SQUAT_WODS.map((w) => [w, ['section-1774269586230', 'section-1774191503053-4']])),
  ...Object.fromEntries(FRONT_SQUAT_WODS.map((w) => [w, ['section-1776596966051-3']])),
};

interface Group {
  label: string;
  backupFile: string;
  wods: string[];
  sections: string[];
}
const GROUPS: Group[] = [
  { label: 'Back Squat', backupFile: '2026-04-17_wod_section_results.json', wods: BACK_SQUAT_WODS, sections: BACK_SQUAT_SECTIONS },
  { label: 'Front Squat 5RM', backupFile: '2026-05-05_wod_section_results.json', wods: FRONT_SQUAT_WODS, sections: FRONT_SQUAT_SECTIONS },
];

async function main() {
  console.log(APPLY ? '🔴 APPLY MODE — writing to production\n' : '🟢 DRY RUN — no writes\n');
  let totalUpdates = 0;
  let totalInserts = 0;

  for (const g of GROUPS) {
    const backup = JSON.parse(fs.readFileSync(path.join(DIR, g.backupFile), 'utf8')) as any[];
    const srcRows = backup.filter(
      (r) => g.wods.includes(r.wod_id) && g.sections.includes(r.section_id) && (r.weight_result ?? 0) > 0
    );

    // Live rows for the same targets, keyed by id
    const liveById = new Map<string, any>();
    for (const wodId of g.wods) {
      const { data } = await supabase
        .from('wod_section_results')
        .select('id, weight_result, weight_result_2, weight_result_3, member_id, whiteboard_name, section_id, wod_id')
        .eq('wod_id', wodId)
        .in('section_id', g.sections);
      for (const r of data || []) liveById.set(r.id, r);
    }

    const updates: any[] = [];
    const inserts: any[] = [];
    for (const src of srcRows) {
      const live = liveById.get(src.id);
      if (live) {
        if ((live.weight_result ?? 0) <= 0) {
          updates.push(src);
        }
      } else {
        inserts.push(src);
      }
    }

    console.log(`── ${g.label} (source ${g.backupFile}) ──`);
    console.log(`   backup weighted rows: ${srcRows.length} | live target rows: ${liveById.size}`);
    console.log(`   → UPDATE weight on ${updates.length} existing rows`);
    console.log(`   → INSERT ${inserts.length} deleted rows`);
    const who = (r: any) => r.whiteboard_name || `m:${(r.member_id || '').slice(0, 8)}`;
    console.log(`   sample updates: ${updates.slice(0, 4).map((r) => `${who(r)}=${r.weight_result}`).join(', ')}`);
    console.log(`   sample inserts: ${inserts.slice(0, 4).map((r) => `${who(r)}=${r.weight_result}`).join(', ')}`);

    if (APPLY) {
      for (const r of updates) {
        await supabase
          .from('wod_section_results')
          .update({ weight_result: r.weight_result, weight_result_2: r.weight_result_2, weight_result_3: r.weight_result_3 })
          .eq('id', r.id);
      }
      if (inserts.length > 0) {
        const { error } = await supabase.from('wod_section_results').insert(inserts);
        if (error) console.error('   ❌ insert error:', error.message);
      }
      console.log('   ✅ applied');
    }
    totalUpdates += updates.length;
    totalInserts += inserts.length;
    console.log('');
  }

  // Flip scoring_fields.load = true on the 14 affected sections
  console.log('── scoring_fields.load → true on affected sections ──');
  let wodsFixed = 0;
  for (const [wodId, baseSecs] of Object.entries(SECTION_LOAD_FIX)) {
    const { data } = await supabase.from('wods').select('sections').eq('id', wodId).single();
    if (!data) continue;
    const sections = data.sections as any[];
    let changed = false;
    for (const sec of sections) {
      if (baseSecs.includes(sec.id) && sec.scoring_fields?.load !== true) {
        sec.scoring_fields = { ...sec.scoring_fields, load: true };
        changed = true;
      }
    }
    if (changed) {
      wodsFixed++;
      if (APPLY) await supabase.from('wods').update({ sections }).eq('id', wodId);
    }
  }
  console.log(`   ${APPLY ? 'fixed' : 'would fix'} ${wodsFixed} wods\n`);

  console.log(`TOTAL: ${totalUpdates} updates, ${totalInserts} inserts, ${wodsFixed} wod load-flips`);
  console.log(APPLY ? '🔴 DONE (applied)' : '🟢 DRY RUN complete — re-run with --apply to write');
}
main().then(() => process.exit(0));
