/**
 * Find ALL wod_section_results for given workout_date(s) — no wod_id filter.
 * Reveals whether scores exist under a different wod_id (e.g. WOD was
 * duplicated or replaced after entry).
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const DATES = ['2026-05-06', '2026-05-05'];

async function main() {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  for (const d of DATES) {
    console.log(`\n══════════════════════════════════════════════`);
    console.log(`workout_date = ${d}`);
    console.log(`══════════════════════════════════════════════`);

    const { data: rows } = await s
      .from('wod_section_results')
      .select('id, wod_id, member_id, section_id, time_result, weight_result, reps_result, rounds_result, calories_result, metres_result, created_at, workout_date')
      .eq('workout_date', d)
      .order('wod_id', { ascending: true });

    // Group by wod_id
    const byWodId = new Map<string, NonNullable<typeof rows>>();
    rows?.forEach(r => {
      if (!byWodId.has(r.wod_id)) byWodId.set(r.wod_id, []);
      byWodId.get(r.wod_id)!.push(r);
    });

    console.log(`Total ${rows?.length ?? 0} rows across ${byWodId.size} distinct wod_id(s):`);
    for (const [wodId, wodRows] of byWodId) {
      // Look up the wod
      const { data: wod } = await s
        .from('wods')
        .select('id, session_type, workout_name, date, workout_publish_status')
        .eq('id', wodId)
        .maybeSingle();
      const wodInfo = wod
        ? `${wod.session_type}/${wod.workout_name ?? '-'} (date=${wod.date}, publish=${wod.workout_publish_status})`
        : '⚠️  WOD ROW MISSING (deleted?)';
      console.log(`\n  wod_id=${wodId} → ${wodInfo}`);
      console.log(`    ${wodRows.length} WSR rows, created_at: ${[...new Set(wodRows.map(r => (r.created_at as string).slice(0,10)))].join(', ')}`);

      // Names lookup
      const memberIds = [...new Set(wodRows.map(r => r.member_id).filter(Boolean))];
      const { data: members } = memberIds.length
        ? await s.from('members').select('id, name').in('id', memberIds as string[])
        : { data: [] };
      const nameById = new Map((members ?? []).map(m => [m.id, m.name]));

      // Show first 5 rows as sample
      wodRows.slice(0, 5).forEach(r => {
        const v = [
          r.time_result && `t=${r.time_result}`,
          r.weight_result != null && `wt=${r.weight_result}`,
          r.reps_result != null && `reps=${r.reps_result}`,
          r.rounds_result != null && `rd=${r.rounds_result}`,
          r.calories_result != null && `cal=${r.calories_result}`,
          r.metres_result != null && `m=${r.metres_result}`,
        ].filter(Boolean).join(' ');
        console.log(`      ${nameById.get(r.member_id) ?? '?'}  section=${r.section_id}  ${v || '(empty)'}  created=${(r.created_at as string).slice(0,10)}`);
      });
      if (wodRows.length > 5) console.log(`      ... (${wodRows.length - 5} more)`);
    }
  }
}
main();
