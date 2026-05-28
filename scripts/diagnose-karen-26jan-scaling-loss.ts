/**
 * Diagnose missing scores on Karen 17:17 2026-01-26 after Chris added a scaling
 * option to the section.
 *
 * Question: did the scores get DELETED, or are they orphaned at an old section_id
 * that the results modal no longer queries?
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Find the session
  const { data: sessions } = await s
    .from('weekly_sessions')
    .select('id, date, time, workout_id, workout_type')
    .eq('date', '2026-01-26')
    .eq('time', '17:15:00');

  console.log('\n── weekly_sessions ──');
  console.log(sessions);

  if (!sessions || sessions.length === 0) {
    console.log('No session found for 2026-01-26 17:17 — try other times.');
    const { data: alt } = await s
      .from('weekly_sessions')
      .select('id, date, time, workout_id, workout_type')
      .eq('date', '2026-01-26');
    console.log('All sessions for 2026-01-26:');
    console.log(alt);
    return;
  }

  const wodIds = sessions.map(x => x.workout_id).filter(Boolean) as string[];

  // 2. Show the wod's current sections JSONB (canonical section IDs)
  const { data: wods } = await s
    .from('wods')
    .select('id, workout_name, session_type, title, sections, updated_at')
    .in('id', wodIds);

  console.log('\n── wods (current sections) ──');
  for (const w of (wods || [])) {
    console.log(`wod_id=${w.id} title=${w.title} type=${w.session_type} updated_at=${w.updated_at}`);
    const sections = (w.sections || []) as Array<{ id: string; type: string; scoring_fields?: Record<string, unknown> }>;
    for (const sec of sections) {
      console.log(`  section.id=${sec.id} type=${sec.type} scoring_fields=${JSON.stringify(sec.scoring_fields || {})}`);
    }
  }

  // 3. Show ALL wod_section_results for this wod_id, grouped by section_id
  const { data: rows } = await s
    .from('wod_section_results')
    .select('id, user_id, member_id, whiteboard_name, section_id, time_result, reps_result, rounds_result, weight_result, scaling_level, workout_date, updated_at')
    .in('wod_id', wodIds);

  console.log(`\n── wod_section_results (${rows?.length || 0} rows) ──`);
  const bySection = new Map<string, typeof rows>();
  for (const r of (rows || [])) {
    if (!bySection.has(r.section_id)) bySection.set(r.section_id, []);
    bySection.get(r.section_id)!.push(r);
  }
  for (const [sid, rs] of bySection) {
    console.log(`\nsection_id=${sid} → ${rs!.length} rows`);
    for (const r of rs!) {
      const who = r.whiteboard_name || r.member_id || r.user_id;
      console.log(`  ${who} time=${r.time_result} reps=${r.reps_result} rounds=${r.rounds_result} weight=${r.weight_result} scaling=${r.scaling_level} updated=${r.updated_at}`);
    }
  }

  // 4. Cross-check: which section_ids in the WSRs are NOT in the current wods.sections?
  const currentSectionKeys = new Set<string>();
  for (const w of (wods || [])) {
    for (const sec of ((w.sections || []) as Array<{ id: string }>)) {
      currentSectionKeys.add(`${sec.id}-content-0`);
    }
  }
  const orphanSectionIds = [...bySection.keys()].filter(k => !currentSectionKeys.has(k));
  console.log(`\n── Orphan section_ids (WSRs point here but wod.sections does not contain them) ──`);
  for (const k of orphanSectionIds) {
    console.log(`  ${k} → ${bySection.get(k)!.length} rows`);
  }
  if (orphanSectionIds.length === 0) {
    console.log('  (none — all WSRs map to a current section)');
  }

  // 5. Who was BOOKED into the 17:15 session?
  const sessionId = sessions[0].id;
  const { data: bks } = await s
    .from('bookings')
    .select('id, member_id, status, members:member_id(name, display_name)')
    .eq('session_id', sessionId);
  console.log(`\n── bookings on session ${sessionId} (${bks?.length || 0}) ──`);
  for (const b of (bks || [])) {
    const m = (b.members as unknown as { name?: string; display_name?: string } | null);
    console.log(`  ${m?.display_name || m?.name || b.member_id} status=${b.status}`);
  }

  // 6. Any WSRs across ALL wods for these members with workout_date around 26/01?
  // Helps spot if scores ended up attached to a different wod_id by mistake.
  if (bks && bks.length > 0) {
    const memberIds = bks.map(b => b.member_id).filter(Boolean);
    const { data: nearby } = await s
      .from('wod_section_results')
      .select('id, member_id, wod_id, section_id, time_result, weight_result, workout_date, updated_at')
      .in('member_id', memberIds as string[])
      .gte('workout_date', '2026-01-25')
      .lte('workout_date', '2026-01-27');
    console.log(`\n── WSRs for these athletes on 2026-01-25..27 (${nearby?.length || 0}) ──`);
    for (const r of (nearby || [])) {
      console.log(`  member=${r.member_id} wod=${r.wod_id} section=${r.section_id} time=${r.time_result} weight=${r.weight_result} date=${r.workout_date} updated=${r.updated_at}`);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
