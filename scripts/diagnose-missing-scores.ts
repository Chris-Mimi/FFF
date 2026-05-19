/**
 * Diagnose missing scores on 2026-05-06 17:15 and 2026-05-05 18:30:
 * leaderboard shows them but Score Entry modal renders empty.
 *
 * Shows for each session:
 *   - session row + linked wod_id
 *   - all bookings on that session
 *   - all wod_section_results for that wod_id (regardless of member)
 *   - which sections the WOD has and what scoring_fields they expect
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const TARGETS = [
  { date: '2026-05-06', time: '17:15' },
  { date: '2026-05-05', time: '18:30' },
];

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  for (const t of TARGETS) {
    console.log(`\n══════════════════════════════════════════════`);
    console.log(`SESSION ${t.date}  ${t.time}`);
    console.log(`══════════════════════════════════════════════`);

    const { data: sessions } = await s
      .from('weekly_sessions')
      .select('id, date, time, workout_id, status, capacity')
      .eq('date', t.date)
      .eq('time', t.time);

    if (!sessions?.length) { console.log('  ⚠️  no session row'); continue; }
    for (const sess of sessions) {
      console.log(`  session_id=${sess.id}  workout_id=${sess.workout_id}  status=${sess.status}`);

      if (!sess.workout_id) { console.log('  (no WOD linked)'); continue; }

      const { data: wod } = await s
        .from('wods')
        .select('id, session_type, workout_name, date, sections, workout_publish_status')
        .eq('id', sess.workout_id)
        .single();
      console.log(`  WOD: ${wod?.session_type} / ${wod?.workout_name ?? '(no name)'} / publish=${wod?.workout_publish_status}`);
      const sections = (wod?.sections as Array<{id:string;name?:string;type?:string;scoring_fields?:Record<string,boolean>}>) ?? [];
      console.log(`  WOD has ${sections.length} sections:`);
      for (const sec of sections) {
        const sf = sec.scoring_fields ? Object.entries(sec.scoring_fields).filter(([,v])=>v).map(([k])=>k).join(',') : '(none)';
        console.log(`    section_id=${sec.id}  type=${sec.type}  name=${sec.name ?? '-'}  scoring_fields=[${sf}]`);
      }

      const { data: bookings } = await s
        .from('bookings')
        .select('id, member_id, status, is_og, is_trial, members(name)')
        .eq('session_id', sess.id);
      console.log(`  ${bookings?.length ?? 0} bookings on session:`);
      bookings?.forEach((b: any) => {
        console.log(`    booking_id=${b.id}  member=${b.members?.name ?? b.member_id}  status=${b.status}  og=${b.is_og}  trial=${b.is_trial}`);
      });

      const { data: wsr } = await s
        .from('wod_section_results')
        .select('id, user_id, member_id, wod_id, section_id, workout_date, time_result, reps_result, weight_result, rounds_result, calories_result, metres_result, scaling_level, whiteboard_name, task_completed')
        .eq('wod_id', sess.workout_id);
      console.log(`  ${wsr?.length ?? 0} wod_section_results for wod_id=${sess.workout_id}:`);

      // Resolve member names for the unique member_ids
      const memberIds = [...new Set((wsr ?? []).map(r => r.member_id).filter(Boolean))];
      const { data: members } = memberIds.length
        ? await s.from('members').select('id, name').in('id', memberIds)
        : { data: [] };
      const memNameById = new Map((members ?? []).map(m => [m.id, m.name]));

      wsr?.forEach(r => {
        const vals = [
          r.time_result && `time=${r.time_result}`,
          r.reps_result != null && `reps=${r.reps_result}`,
          r.weight_result != null && `wt=${r.weight_result}`,
          r.rounds_result != null && `rounds=${r.rounds_result}`,
          r.calories_result != null && `cal=${r.calories_result}`,
          r.metres_result != null && `m=${r.metres_result}`,
          r.scaling_level && `scale=${r.scaling_level}`,
          r.task_completed != null && `done=${r.task_completed}`,
          r.whiteboard_name && `wb=${r.whiteboard_name}`,
        ].filter(Boolean).join(' ');
        const who = memNameById.get(r.member_id) ?? `member_id=${r.member_id?.slice(0,8) ?? '-'} user_id=${r.user_id?.slice(0,8) ?? '-'}`;
        const wodSectionIds = new Set(sections.map(sec => sec.id));
        const orphan = wodSectionIds.has(r.section_id) ? '' : ' 🚨ORPHAN';
        console.log(`    section=${r.section_id}  ${who}  ${vals || '(empty)'}${orphan}`);
      });
    }
  }
}
main();
