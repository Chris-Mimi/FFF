/**
 * S356 — scan last 60 days for sessions that LIKELY lost WSRs to the
 * cascade-delete bug, so Chris can re-enter scores while the memory is recent.
 *
 * Two heuristics, surfaced separately:
 *  (A) HIGH-CONFIDENCE LOSS — session has confirmed bookings AND its WOD has
 *      scorable sections AND zero WSRs exist for that wod_id. A class that
 *      happened, athletes attended, no scores in DB — most likely lost.
 *  (B) PARTIAL LOSS — actual WSR row count is less than half of
 *      (confirmed bookings × scorable sections). Noisier signal but worth a
 *      look. Excluded from (A).
 *
 * Skips non-scorable session types (Kids, FitKids, Elternkind, Foundations
 * sessions with no scorable sections) since those legitimately have 0 WSRs.
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

interface Section {
  id: string;
  type?: string;
  scoring_fields?: Record<string, boolean>;
  lifts?: Array<{ rm_test?: string | null }>;
}

function isScorable(sec: Section): boolean {
  const hasScoringField =
    sec.scoring_fields &&
    Object.values(sec.scoring_fields).some(v => v === true);
  const hasRmTest = (sec.lifts || []).some(l => !!l.rm_test);
  return Boolean(hasScoringField || hasRmTest);
}

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const today = new Date();
  const sixtyDaysAgo = new Date(today);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const fromDate = sixtyDaysAgo.toISOString().slice(0, 10);
  const toDate = today.toISOString().slice(0, 10);
  console.log(`Audit window: ${fromDate} → ${toDate}\n`);

  // Pull all sessions in window
  const { data: sessions, error: sessErr } = await s
    .from('weekly_sessions')
    .select('id, date, time, workout_id, capacity, status')
    .gte('date', fromDate)
    .lte('date', toDate)
    .order('date', { ascending: true })
    .order('time', { ascending: true });
  if (sessErr) throw sessErr;
  if (!sessions?.length) {
    console.log('No sessions found.');
    return;
  }

  // Pull all WODs referenced
  const wodIds = [...new Set(sessions.map(s => s.workout_id).filter(Boolean))] as string[];
  const { data: wods } = wodIds.length
    ? await s.from('wods').select('id, session_type, workout_name, sections').in('id', wodIds)
    : { data: [] };
  const wodById = new Map((wods ?? []).map(w => [w.id, w]));

  // Pull all bookings for those sessions
  const sessionIds = sessions.map(s => s.id);
  const { data: bookings } = await s
    .from('bookings')
    .select('session_id, status, is_og, is_trial')
    .in('session_id', sessionIds);

  const confirmedBySession = new Map<string, number>();
  for (const b of bookings ?? []) {
    if (b.status === 'confirmed' && !b.is_og && !b.is_trial) {
      confirmedBySession.set(b.session_id, (confirmedBySession.get(b.session_id) ?? 0) + 1);
    }
  }

  // Pull WSR counts by wod_id (one query, paginated to dodge PostgREST 1000-row cap)
  const wsrCountByWodId = new Map<string, number>();
  // Use head-only count per wod_id — fewer rows shipped over the wire.
  for (const wodId of wodIds) {
    const { count } = await s
      .from('wod_section_results')
      .select('id', { count: 'exact', head: true })
      .eq('wod_id', wodId);
    wsrCountByWodId.set(wodId, count ?? 0);
  }

  const highConfidenceLoss: Array<{ sess: typeof sessions[number]; confirmed: number; scorable: number }> = [];
  const partialLoss: Array<{
    sess: typeof sessions[number];
    confirmed: number;
    scorable: number;
    expected: number;
    actual: number;
  }> = [];

  for (const sess of sessions) {
    if (!sess.workout_id) continue;
    const wod = wodById.get(sess.workout_id);
    if (!wod) continue;
    const sections = (wod.sections as Section[] | null) ?? [];
    const scorableCount = sections.filter(isScorable).length;
    if (scorableCount === 0) continue;

    const confirmed = confirmedBySession.get(sess.id) ?? 0;
    if (confirmed === 0) continue;

    const actual = wsrCountByWodId.get(sess.workout_id) ?? 0;
    const expected = confirmed * scorableCount;

    if (actual === 0) {
      highConfidenceLoss.push({ sess, confirmed, scorable: scorableCount });
    } else if (actual < expected / 2) {
      partialLoss.push({ sess, confirmed, scorable: scorableCount, expected, actual });
    }
  }

  console.log(`══════════════════════════════════════════════`);
  console.log(`(A) HIGH-CONFIDENCE LOSS — ${highConfidenceLoss.length} sessions`);
  console.log(`    (confirmed athletes, scorable WOD, zero scores in DB)`);
  console.log(`══════════════════════════════════════════════`);
  if (highConfidenceLoss.length === 0) {
    console.log('  (none)');
  } else {
    for (const { sess, confirmed, scorable } of highConfidenceLoss) {
      const wod = wodById.get(sess.workout_id!);
      console.log(
        `  ${sess.date} ${sess.time}  conf=${confirmed} × scorable=${scorable}  ` +
          `→ expected ${confirmed * scorable} WSRs, found 0  · ${wod?.session_type}/${wod?.workout_name ?? '-'}`
      );
    }
  }

  console.log(`\n══════════════════════════════════════════════`);
  console.log(`(B) PARTIAL LOSS — ${partialLoss.length} sessions`);
  console.log(`    (actual < expected/2; noisier signal)`);
  console.log(`══════════════════════════════════════════════`);
  if (partialLoss.length === 0) {
    console.log('  (none)');
  } else {
    for (const { sess, confirmed, scorable, expected, actual } of partialLoss) {
      const wod = wodById.get(sess.workout_id!);
      console.log(
        `  ${sess.date} ${sess.time}  conf=${confirmed} × scorable=${scorable}  ` +
          `→ expected ${expected}, found ${actual}  · ${wod?.session_type}/${wod?.workout_name ?? '-'}`
      );
    }
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
