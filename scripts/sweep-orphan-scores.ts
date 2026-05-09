/**
 * Sweep orphaned wod_section_results + lift_records left behind by the
 * pre-S344 coach-side cancel cleanup that ran with the coach's auth token
 * (RLS hid the athlete's rows → cleanup silently skipped).
 *
 * Definition of orphan (conservative):
 *   wod_id is set AND the score's user has a CANCELLED-type booking
 *   (cancelled / late_cancel / coach_cancelled) on a session attached to the
 *   wod, AND has NO keep-status booking (confirmed / no_show) on any other
 *   session of that wod. The cancelled-status booking is the evidence that
 *   cleanup should have run; "no booking" rows are left alone (could be
 *   whiteboard entries, coach pre-entries, etc.).
 *
 *   Whiteboard rows (user_id IS NULL AND member_id IS NULL) are skipped — they
 *   have no booking association by design.
 *
 * Read-only by default. Pass --apply to delete.
 *
 * Usage:
 *   npx tsx scripts/sweep-orphan-scores.ts          # dry run
 *   npx tsx scripts/sweep-orphan-scores.ts --apply  # delete
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APPLY = process.argv.includes('--apply');

const KEEP_STATUSES = new Set(['confirmed', 'no_show']);
const CANCELLED_STATUSES = new Set(['cancelled', 'late_cancel', 'coach_cancelled']);

interface PaginatedRow {
  id: string;
  user_id: string | null;
  member_id?: string | null;
  wod_id: string | null;
}

async function fetchAll<T extends PaginatedRow>(table: string, columns: string): Promise<T[]> {
  const out: T[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    out.push(...(data as unknown as T[]));
    if (data.length < PAGE) break;
  }
  return out;
}

async function main() {
  console.log(APPLY ? '*** APPLY MODE — deletes will run ***\n' : 'Dry run.\n');

  const wsrAll = await fetchAll<PaginatedRow>('wod_section_results', 'id, user_id, member_id, wod_id');
  const lrAll = await fetchAll<PaginatedRow>('lift_records', 'id, user_id, wod_id');
  console.log(`Total wod_section_results: ${wsrAll.length}`);
  console.log(`Total lift_records       : ${lrAll.length}\n`);

  // Both tables, only rows with wod_id set are sweepable. NULL wod_id rows
  // are usually pre-app imports — never had a booking association.
  const wsr = wsrAll.filter(r => r.wod_id);
  const lr = lrAll.filter(r => r.wod_id);

  // Index sessions by wod_id
  const wodIds = [...new Set([...wsr, ...lr].map(r => r.wod_id!))];
  const sessionsByWod = new Map<string, string[]>();
  for (let i = 0; i < wodIds.length; i += 200) {
    const chunk = wodIds.slice(i, i + 200);
    const { data } = await supabase
      .from('weekly_sessions')
      .select('id, workout_id')
      .in('workout_id', chunk);
    for (const s of data || []) {
      if (!sessionsByWod.has(s.workout_id)) sessionsByWod.set(s.workout_id, []);
      sessionsByWod.get(s.workout_id)!.push(s.id);
    }
  }

  // Index bookings by (member_id, session_id)
  const allSessionIds = [...new Set([...sessionsByWod.values()].flat())];
  const bookingsByPair = new Map<string, string>(); // "memberId|sessionId" → status
  for (let i = 0; i < allSessionIds.length; i += 200) {
    const chunk = allSessionIds.slice(i, i + 200);
    const { data } = await supabase
      .from('bookings')
      .select('member_id, session_id, status')
      .in('session_id', chunk);
    for (const b of data || []) {
      bookingsByPair.set(`${b.member_id}|${b.session_id}`, b.status);
    }
  }

  // For every score row's user_id, build a member-id candidate set.
  // wod_section_results carries member_id directly; lift_records has only user_id
  // which == auth.users.id == members.id for self-registered athletes (the only
  // ones who can self-enter). For coach-entered scores (whiteboard athletes,
  // family-members) wod_section_results has member_id; lift_records is rare and
  // also keyed by user_id when the athlete has an auth account.
  function isOrphan(row: PaginatedRow): { orphan: boolean; reason: string } {
    const candidateMemberIds = [row.user_id, row.member_id].filter(Boolean) as string[];
    if (candidateMemberIds.length === 0) return { orphan: false, reason: 'whiteboard (no user/member)' };

    const sessIds = sessionsByWod.get(row.wod_id!) ?? [];
    if (sessIds.length === 0) return { orphan: false, reason: 'no sessions for wod (skip)' };

    let hasKeep = false;
    let cancelledStatus: string | null = null;
    for (const sid of sessIds) {
      for (const mid of candidateMemberIds) {
        const status = bookingsByPair.get(`${mid}|${sid}`);
        if (!status) continue;
        if (KEEP_STATUSES.has(status)) hasKeep = true;
        else if (CANCELLED_STATUSES.has(status)) cancelledStatus = status;
      }
    }
    if (hasKeep) return { orphan: false, reason: 'keep' };
    if (cancelledStatus) return { orphan: true, reason: `cancelled (${cancelledStatus})` };
    return { orphan: false, reason: 'no booking (skip)' };
  }

  const wsrOrphans: PaginatedRow[] = [];
  const lrOrphans: PaginatedRow[] = [];
  const wsrReasons = new Map<string, number>();
  const lrReasons = new Map<string, number>();
  for (const r of wsr) {
    const { orphan, reason } = isOrphan(r);
    if (orphan) {
      wsrOrphans.push(r);
      const key = reason.split(' ')[0] === 'cancelled' ? `cancelled (${reason.split('(')[1]?.replace(')', '') ?? '?'})` : reason;
      wsrReasons.set(key, (wsrReasons.get(key) ?? 0) + 1);
    }
  }
  for (const r of lr) {
    const { orphan, reason } = isOrphan(r);
    if (orphan) {
      lrOrphans.push(r);
      const key = reason.split(' ')[0] === 'cancelled' ? `cancelled (${reason.split('(')[1]?.replace(')', '') ?? '?'})` : reason;
      lrReasons.set(key, (lrReasons.get(key) ?? 0) + 1);
    }
  }

  console.log(`wod_section_results orphans: ${wsrOrphans.length}`);
  for (const [k, n] of wsrReasons) console.log(`  ${n}  ${k}`);
  console.log(`\nlift_records orphans: ${lrOrphans.length}`);
  for (const [k, n] of lrReasons) console.log(`  ${n}  ${k}`);

  if (wsrOrphans.length === 0 && lrOrphans.length === 0) {
    console.log('\n✅ Nothing to clean.');
    return;
  }

  console.log('\nSample wsr orphans:');
  for (const r of wsrOrphans.slice(0, 8)) {
    console.log(`  wsr=${r.id.slice(0, 8)}  user=${(r.user_id ?? '').slice(0, 8)}  member=${(r.member_id ?? '').slice(0, 8)}  wod=${(r.wod_id ?? '').slice(0, 8)}`);
  }
  console.log('\nSample lift_records orphans:');
  for (const r of lrOrphans.slice(0, 8)) {
    console.log(`  lr=${r.id.slice(0, 8)}  user=${(r.user_id ?? '').slice(0, 8)}  wod=${(r.wod_id ?? '').slice(0, 8)}`);
  }

  if (!APPLY) {
    console.log('\nDry run. Re-run with --apply to delete.');
    return;
  }

  console.log('\nApplying deletes…');
  for (let i = 0; i < wsrOrphans.length; i += 100) {
    const ids = wsrOrphans.slice(i, i + 100).map(r => r.id);
    const { error } = await supabase.from('wod_section_results').delete().in('id', ids);
    if (error) console.error(`wsr batch ${i} failed:`, error.message);
  }
  for (let i = 0; i < lrOrphans.length; i += 100) {
    const ids = lrOrphans.slice(i, i + 100).map(r => r.id);
    const { error } = await supabase.from('lift_records').delete().in('id', ids);
    if (error) console.error(`lr batch ${i} failed:`, error.message);
  }

  console.log(`\nDeleted ${wsrOrphans.length} wsr + ${lrOrphans.length} lift_records.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
