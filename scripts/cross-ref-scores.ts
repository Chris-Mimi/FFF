/**
 * For each date, list each session's confirmed members,
 * then for each WOD on that date, list which athletes have WSRs
 * and which session those athletes are booked into.
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const DATES = ['2026-05-06', '2026-05-05'];

async function main() {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  for (const d of DATES) {
    console.log(`\n══════════════════════════════════════════════`);
    console.log(`DATE ${d}`);
    console.log(`══════════════════════════════════════════════`);

    const { data: sessions } = await s
      .from('weekly_sessions')
      .select('id, time, workout_id, workout_type')
      .eq('date', d)
      .order('time');

    // Build memberId → time map: who attends which class
    const memberTimeMap = new Map<string, string>();
    for (const sess of sessions ?? []) {
      const { data: bookings } = await s
        .from('bookings')
        .select('member_id, status, members(name)')
        .eq('session_id', sess.id)
        .eq('status', 'confirmed');
      console.log(`\n  ${sess.time} (${sess.workout_type})  workout_id=${sess.workout_id}`);
      console.log(`    confirmed (${bookings?.length ?? 0}): ${(bookings ?? []).map((b: any) => b.members?.name).join(', ')}`);
      bookings?.forEach(b => {
        if (b.member_id) memberTimeMap.set(b.member_id, sess.time);
      });
    }

    // Now WSRs grouped by wod
    const { data: allRows } = await s
      .from('wod_section_results')
      .select('id, wod_id, member_id, created_at')
      .eq('workout_date', d);
    const memberIds = [...new Set((allRows ?? []).map(r => r.member_id).filter(Boolean))];
    const { data: members } = memberIds.length
      ? await s.from('members').select('id, name').in('id', memberIds as string[])
      : { data: [] };
    const nameById = new Map((members ?? []).map(m => [m.id, m.name]));

    const byWod = new Map<string, typeof allRows>();
    allRows?.forEach(r => {
      if (!byWod.has(r.wod_id)) byWod.set(r.wod_id, []);
      byWod.get(r.wod_id)!.push(r);
    });

    console.log(`\n  WSR ROWS BY WOD:`);
    for (const [wodId, rows] of byWod) {
      const created = [...new Set(rows.map(r => (r.created_at as string).slice(0,10)))].join(', ');
      // Athletes on this wod, with which class they're booked into
      const athletesByTime: Record<string, Set<string>> = {};
      const uniqueAthletes = new Set<string>();
      rows.forEach(r => {
        if (!r.member_id) return;
        uniqueAthletes.add(r.member_id);
        const t = memberTimeMap.get(r.member_id) ?? 'NOT-BOOKED';
        if (!athletesByTime[t]) athletesByTime[t] = new Set();
        athletesByTime[t].add(nameById.get(r.member_id) ?? r.member_id);
      });
      console.log(`\n    wod_id=${wodId}  (${rows.length} WSRs, ${uniqueAthletes.size} unique athletes, created ${created})`);
      for (const [time, namesSet] of Object.entries(athletesByTime)) {
        console.log(`      booked into ${time} (${namesSet.size}): ${[...namesSet].join(', ')}`);
      }
    }
  }
}
main();
