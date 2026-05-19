/**
 * S356 — for each wod_id active on 2026-05-06 / 2026-05-05, show which
 * weekly_sessions point at it, and the member overlap between the wods.
 * Determines whether the two 44-row wods on 05/06 are duplicates of the same
 * class or two genuinely different classes.
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const DATES = ['2026-05-06', '2026-05-05'];

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  for (const d of DATES) {
    console.log(`\n══════════════════════════════════════════════`);
    console.log(`Date ${d}`);
    console.log(`══════════════════════════════════════════════`);

    // Distinct wod_ids touched by WSRs on this date
    const { data: wsrs } = await s
      .from('wod_section_results')
      .select('wod_id, member_id')
      .eq('workout_date', d);
    const memberByWod = new Map<string, Set<string>>();
    for (const r of wsrs ?? []) {
      if (!memberByWod.has(r.wod_id)) memberByWod.set(r.wod_id, new Set());
      if (r.member_id) memberByWod.get(r.wod_id)!.add(r.member_id);
    }

    // For each wod, show details + sessions pointing at it
    for (const [wodId, memberSet] of memberByWod) {
      const { data: wod } = await s
        .from('wods')
        .select('id, session_type, workout_name, date, created_at, updated_at')
        .eq('id', wodId)
        .single();
      const { data: sessions } = await s
        .from('weekly_sessions')
        .select('id, date, time, capacity, status')
        .eq('workout_id', wodId);

      console.log(`\n  wod=${wodId.slice(0, 8)}… "${wod?.workout_name ?? '-'}"`);
      console.log(`    created=${(wod?.created_at as string)?.slice(0,19)}  updated=${(wod?.updated_at as string)?.slice(0,19)}`);
      console.log(`    distinct members in WSRs: ${memberSet.size}`);
      console.log(`    weekly_sessions pointing here: ${sessions?.length ?? 0}`);
      for (const sess of sessions ?? []) {
        console.log(`      → session ${sess.id.slice(0, 8)}… date=${sess.date} time=${sess.time} status=${sess.status}`);
      }
    }

    // Overlap matrix
    const wodIds = [...memberByWod.keys()];
    if (wodIds.length >= 2) {
      console.log(`\n  Member overlap between wods:`);
      for (let i = 0; i < wodIds.length; i++) {
        for (let j = i + 1; j < wodIds.length; j++) {
          const a = memberByWod.get(wodIds[i])!;
          const b = memberByWod.get(wodIds[j])!;
          const intersection = [...a].filter(x => b.has(x));
          console.log(`    ${wodIds[i].slice(0, 8)}… ∩ ${wodIds[j].slice(0, 8)}… = ${intersection.length} shared members`);
        }
      }
    }
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
