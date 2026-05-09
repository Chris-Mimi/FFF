/**
 * Sweep orphans left behind by the booking-deletion paths that don't run
 * cleanup on associated wsr / lift_records / reactions:
 *
 *   - app/coach/admin/page.tsx handleDeleteIncident — deletes booking row
 *     from Admin Incidents view, no cleanup
 *   - hooks/coach/useWODOperations.ts handleDeleteSession — deletes session
 *     (cascades bookings), no wsr/lift_records cleanup
 *
 * Plus reactions, which NO cleanup path anywhere deletes when their target
 * wsr / lift_record / benchmark_result disappears.
 *
 * Predicate (conservative):
 *   - wsr / lift_records: row has a known user (user_id OR member_id is set)
 *     AND no booking exists on ANY session of the wod for that user
 *     (matched via user_id, member_id, or members.email→auth lookup, plus
 *     family-member primary_member_id). Whiteboard-only rows (no user, no
 *     member) are skipped — those are legitimate coach entries.
 *   - reactions: target row doesn't exist anymore.
 *
 * Read-only by default. Pass --apply to delete.
 *
 * Usage:
 *   npx tsx scripts/sweep-deletion-orphans.ts          # dry run
 *   npx tsx scripts/sweep-deletion-orphans.ts --apply  # delete
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APPLY = process.argv.includes('--apply');
const KEEP_STATUSES = new Set(['confirmed', 'no_show', 'cancelled', 'late_cancel', 'coach_cancelled', 'waitlist']);

interface Wsr { id: string; user_id: string | null; member_id: string | null; whiteboard_name: string | null; wod_id: string | null }
interface Lr { id: string; user_id: string | null; wod_id: string | null }
interface Reaction { id: string; target_type: string; target_id: string }
interface Member { id: string; email: string | null; primary_member_id: string | null }

async function fetchAll<T>(table: string, columns: string): Promise<T[]> {
  const out: T[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select(columns).order('id').range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    out.push(...(data as unknown as T[]));
    if (data.length < PAGE) break;
  }
  return out;
}

async function main() {
  console.log(APPLY ? '*** APPLY MODE — deletes will run ***\n' : 'Dry run.\n');

  const wsr = await fetchAll<Wsr>('wod_section_results', 'id, user_id, member_id, whiteboard_name, wod_id');
  const lr = await fetchAll<Lr>('lift_records', 'id, user_id, wod_id');
  const reactions = await fetchAll<Reaction>('reactions', 'id, target_type, target_id');
  const members = await fetchAll<Member>('members', 'id, email, primary_member_id');

  const memberByEmail = new Map<string, Member>();
  for (const m of members) if (m.email) memberByEmail.set(m.email.toLowerCase(), m);
  const familyByPrimary = new Map<string, string[]>();
  for (const m of members) if (m.primary_member_id) {
    if (!familyByPrimary.has(m.primary_member_id)) familyByPrimary.set(m.primary_member_id, []);
    familyByPrimary.get(m.primary_member_id)!.push(m.id);
  }

  // auth.users — for email→member lookup
  const authEmailById = new Map<string, string>();
  let page = 1;
  while (true) {
    const { data } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (!data?.users || data.users.length === 0) break;
    for (const u of data.users) if (u.email) authEmailById.set(u.id, u.email.toLowerCase());
    if (data.users.length < 1000) break;
    page++;
  }

  // Sessions by wod
  const wodIds = [...new Set([...wsr, ...lr].map(r => r.wod_id).filter((x): x is string => !!x))];
  const sessionsByWod = new Map<string, string[]>();
  for (let i = 0; i < wodIds.length; i += 200) {
    const chunk = wodIds.slice(i, i + 200);
    const { data } = await supabase.from('weekly_sessions').select('id, workout_id').in('workout_id', chunk);
    for (const s of data || []) {
      if (!sessionsByWod.has(s.workout_id)) sessionsByWod.set(s.workout_id, []);
      sessionsByWod.get(s.workout_id)!.push(s.id);
    }
  }

  // Bookings by (member_id, session_id)
  const allSessionIds = [...new Set([...sessionsByWod.values()].flat())];
  const bookingsByPair = new Map<string, string>();
  for (let i = 0; i < allSessionIds.length; i += 200) {
    const chunk = allSessionIds.slice(i, i + 200);
    const { data } = await supabase.from('bookings').select('member_id, session_id, status').in('session_id', chunk);
    for (const b of data || []) bookingsByPair.set(`${b.member_id}|${b.session_id}`, b.status);
  }

  function candidateMemberIds(userId: string | null, memberId: string | null): Set<string> {
    const set = new Set<string>();
    if (userId) set.add(userId);
    if (memberId) set.add(memberId);
    if (userId && authEmailById.has(userId)) {
      const email = authEmailById.get(userId)!;
      const m = memberByEmail.get(email);
      if (m) {
        set.add(m.id);
        for (const fid of familyByPrimary.get(m.id) ?? []) set.add(fid);
      }
    }
    return set;
  }

  function isOrphan(wodId: string | null, userId: string | null, memberId: string | null, whiteboardName?: string | null): boolean {
    if (!wodId) return false;
    if (!userId && !memberId) return false; // pure whiteboard — keep
    void whiteboardName;
    const sessIds = sessionsByWod.get(wodId) ?? [];
    if (sessIds.length === 0) return false; // no sessions for wod — out of our scope
    const candidates = candidateMemberIds(userId, memberId);
    for (const sid of sessIds) {
      for (const cid of candidates) {
        const status = bookingsByPair.get(`${cid}|${sid}`);
        if (status && KEEP_STATUSES.has(status)) return false;
      }
    }
    return true;
  }

  const wsrOrphans = wsr.filter(r => isOrphan(r.wod_id, r.user_id, r.member_id, r.whiteboard_name));
  const lrOrphans = lr.filter(r => isOrphan(r.wod_id, r.user_id, null));

  // Reactions: target row doesn't exist
  const wsrIds = new Set(wsr.map(r => r.id));
  const lrIds = new Set(lr.map(r => r.id));
  const benchmarkResults = await fetchAll<{ id: string }>('benchmark_results', 'id');
  const brIds = new Set(benchmarkResults.map(r => r.id));
  const reactionOrphans = reactions.filter(r => {
    if (r.target_type === 'wod_section_result') return !wsrIds.has(r.target_id);
    if (r.target_type === 'lift_record') return !lrIds.has(r.target_id);
    if (r.target_type === 'benchmark_result') return !brIds.has(r.target_id);
    return false;
  });

  // After deletion of wsrOrphans / lrOrphans, additional reactions on those rows would also become orphan.
  // Pre-compute and add to the cleanup list.
  const wsrOrphanIds = new Set(wsrOrphans.map(r => r.id));
  const lrOrphanIds = new Set(lrOrphans.map(r => r.id));
  const cascadeReactionOrphans = reactions.filter(r => {
    if (reactionOrphans.includes(r)) return false; // already counted
    if (r.target_type === 'wod_section_result' && wsrOrphanIds.has(r.target_id)) return true;
    if (r.target_type === 'lift_record' && lrOrphanIds.has(r.target_id)) return true;
    return false;
  });

  console.log(`Total wod_section_results: ${wsr.length}`);
  console.log(`Total lift_records       : ${lr.length}`);
  console.log(`Total reactions          : ${reactions.length}\n`);
  console.log(`wsr orphans (no booking) : ${wsrOrphans.length}`);
  console.log(`lift_records orphans     : ${lrOrphans.length}`);
  console.log(`reaction orphans         : ${reactionOrphans.length}  (target row already gone)`);
  console.log(`reaction cascade orphans : ${cascadeReactionOrphans.length}  (target row about to be deleted)\n`);

  if (wsrOrphans.length === 0 && lrOrphans.length === 0 && reactionOrphans.length === 0 && cascadeReactionOrphans.length === 0) {
    console.log('✅ Nothing to clean.');
    return;
  }

  console.log('Sample wsr orphans (first 8):');
  for (const r of wsrOrphans.slice(0, 8)) {
    console.log(`  wsr=${r.id.slice(0, 8)}  wod=${(r.wod_id ?? '').slice(0, 8)}  user=${(r.user_id ?? '').slice(0, 8)}  member=${(r.member_id ?? '').slice(0, 8)}`);
  }
  if (lrOrphans.length > 0) {
    console.log('\nSample lift_records orphans (first 8):');
    for (const r of lrOrphans.slice(0, 8)) {
      console.log(`  lr=${r.id.slice(0, 8)}  wod=${(r.wod_id ?? '').slice(0, 8)}  user=${(r.user_id ?? '').slice(0, 8)}`);
    }
  }
  console.log('\nReaction orphans (all):');
  for (const r of [...reactionOrphans, ...cascadeReactionOrphans]) {
    console.log(`  rx=${r.id.slice(0, 8)}  type=${r.target_type}  target=${r.target_id.slice(0, 8)}`);
  }

  if (!APPLY) {
    console.log('\nDry run. Re-run with --apply to delete.');
    return;
  }

  console.log('\nApplying deletes…');
  const allReactionOrphanIds = [...reactionOrphans, ...cascadeReactionOrphans].map(r => r.id);
  for (let i = 0; i < allReactionOrphanIds.length; i += 100) {
    const ids = allReactionOrphanIds.slice(i, i + 100);
    const { error } = await supabase.from('reactions').delete().in('id', ids);
    if (error) console.error(`reactions batch ${i} failed:`, error.message);
  }
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

  console.log(`\nDeleted ${allReactionOrphanIds.length} reactions + ${wsrOrphans.length} wsr + ${lrOrphans.length} lift_records.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
