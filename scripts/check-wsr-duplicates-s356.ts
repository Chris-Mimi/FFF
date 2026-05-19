/**
 * S356 — check whether Chris's re-entry on 2026-05-19 created duplicate
 * wod_section_results rows for 2026-05-06 17:15 and 2026-05-05 18:30.
 *
 * Groups by (wod_id, member_id, section_id-stripped-of-content-suffix) and
 * reports groups with > 1 row, showing created_at timestamps so we can see
 * which is original vs re-entry.
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const DATES = ['2026-05-06', '2026-05-05'];

function stripContentSuffix(sectionId: string): string {
  return sectionId.replace(/-content-\d+$/, '');
}

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  for (const d of DATES) {
    console.log(`\n══════════════════════════════════════════════`);
    console.log(`workout_date = ${d}`);
    console.log(`══════════════════════════════════════════════`);

    const { data: rows, error } = await s
      .from('wod_section_results')
      .select(
        'id, wod_id, member_id, whiteboard_name, section_id, time_result, weight_result, reps_result, rounds_result, calories_result, metres_result, created_at, updated_at'
      )
      .eq('workout_date', d);

    if (error) {
      console.error(`Query failed: ${error.message}`);
      continue;
    }
    if (!rows || rows.length === 0) {
      console.log('No WSR rows.');
      continue;
    }

    // Members lookup
    const memberIds = [...new Set(rows.map(r => r.member_id).filter(Boolean))] as string[];
    const { data: members } = memberIds.length
      ? await s.from('members').select('id, name').in('id', memberIds)
      : { data: [] };
    const nameById = new Map((members ?? []).map(m => [m.id, m.name]));

    // Group: key = wod_id|member_or_wb|stripped_section_id
    type Row = (typeof rows)[number];
    const groups = new Map<string, Row[]>();
    for (const r of rows) {
      const who = r.member_id ?? `wb:${r.whiteboard_name}`;
      // Group across wod_ids — re-publish creates a new wods row, so the
      // duplicate is the same athlete+section under a different wod_id.
      const key = `${who}||${stripContentSuffix(r.section_id)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }

    const dupes = [...groups.entries()].filter(([, rs]) => rs.length > 1);
    console.log(
      `${rows.length} total WSR rows · ${groups.size} unique (wod, athlete, stripped-section) groups · ${dupes.length} groups with duplicates`
    );

    if (dupes.length === 0) {
      console.log('✅ No duplicates — save was idempotent (UPSERT updated existing rows).');
      continue;
    }

    console.log(`\n🚨 Duplicate groups:`);
    for (const [key, rs] of dupes) {
      const [who, strippedSection] = key.split('||');
      const name = who.startsWith('wb:') ? who : (nameById.get(who) ?? '?');
      console.log(`\n  ${name}  section=${strippedSection}  (${rs.length} rows across wod_ids)`);
      for (const r of rs) {
        const vals = [
          r.time_result && `t=${r.time_result}`,
          r.weight_result != null && `wt=${r.weight_result}`,
          r.reps_result != null && `reps=${r.reps_result}`,
          r.rounds_result != null && `rd=${r.rounds_result}`,
          r.calories_result != null && `cal=${r.calories_result}`,
          r.metres_result != null && `m=${r.metres_result}`,
        ]
          .filter(Boolean)
          .join(' ');
        console.log(
          `    wod=${r.wod_id.slice(0, 8)}…  created=${(r.created_at as string).slice(0, 19)}  ${vals || '(empty)'}`
        );
      }
    }
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
