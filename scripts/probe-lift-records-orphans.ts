/**
 * Probe lift_records to find orphans created by the athlete-side
 * useLiftManagement.saveLiftRecord bug (no wod_id set).
 *
 * Reports two categories:
 *   A. wod_id IS NULL — backfill candidates (try to infer wod_id from a WOD
 *      on the same date whose sections include this lift).
 *   B. wod_id IS NOT NULL — orphan candidates (user has no confirmed booking
 *      for that WOD's session; usually a cancelled booking that pre-S344 cleanup
 *      missed because the lift_record had no wod_id at the time).
 *
 * Read-only — no writes. Use migrate-fix-lift-record-orphans.ts to fix.
 *
 * Usage:  npx tsx scripts/probe-lift-records-orphans.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface LiftRecord {
  id: string;
  user_id: string;
  lift_name: string;
  weight_kg: number;
  reps: number;
  rep_max_type: string | null;
  rep_scheme: string | null;
  lift_date: string;
  wod_id: string | null;
}

interface WodLite {
  id: string;
  date: string;
  workout_name: string | null;
  session_type: string | null;
  sections: { lifts?: { name?: string; rm_test?: string; rep_type?: string; sets?: number; reps?: number; variable_sets?: { reps?: number }[] }[] }[] | null;
}

function liftMatchesSection(lr: LiftRecord, wod: WodLite): boolean {
  for (const sec of wod.sections ?? []) {
    for (const lift of sec.lifts ?? []) {
      if (!lift.name || lift.name !== lr.lift_name) continue;
      if (lr.rep_max_type) {
        if (lift.rm_test === lr.rep_max_type) return true;
      } else if (lr.rep_scheme) {
        const repScheme = lift.rep_type === 'constant'
          ? `${lift.sets || 1}x${lift.reps || 1}`
          : lift.variable_sets?.map(s => s.reps).join('-') || '1';
        if (repScheme === lr.rep_scheme) return true;
      } else {
        // No rep_max_type and no rep_scheme — match on name only.
        return true;
      }
    }
  }
  return false;
}

async function main() {
  // Paginate — Supabase default cap is 1000.
  const lifts: LiftRecord[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('lift_records')
      .select('id, user_id, lift_name, weight_kg, reps, rep_max_type, rep_scheme, lift_date, wod_id')
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    lifts.push(...(data as LiftRecord[]));
    if (data.length < PAGE) break;
  }

  const nullWodLifts = lifts.filter(l => !l.wod_id);
  const setWodLifts = lifts.filter(l => l.wod_id);
  console.log(`\nTotal lift_records: ${lifts.length}`);
  console.log(`  with wod_id NULL : ${nullWodLifts.length}  (backfill candidates)`);
  console.log(`  with wod_id set  : ${setWodLifts.length}  (orphan-sweep candidates)\n`);

  // ─── Phase A: backfill candidates ──────────────────────────────────────
  if (nullWodLifts.length > 0) {
    const dates = [...new Set(nullWodLifts.map(l => l.lift_date))];
    const { data: wodsData, error: wodsErr } = await supabase
      .from('wods')
      .select('id, date, workout_name, session_type, sections')
      .in('date', dates);
    if (wodsErr) throw wodsErr;
    const wods = (wodsData || []) as WodLite[];
    const wodsByDate = new Map<string, WodLite[]>();
    for (const w of wods) {
      if (!wodsByDate.has(w.date)) wodsByDate.set(w.date, []);
      wodsByDate.get(w.date)!.push(w);
    }

    let unique = 0, ambiguous = 0, noMatch = 0;
    const examples = { unique: [] as string[], ambiguous: [] as string[], noMatch: [] as string[] };
    for (const lr of nullWodLifts) {
      const candidates = (wodsByDate.get(lr.lift_date) ?? []).filter(w => liftMatchesSection(lr, w));
      const line = `  ${lr.lift_date}  ${lr.lift_name}  ${lr.weight_kg}kg ×${lr.reps}  rm=${lr.rep_max_type ?? '-'}  rs=${lr.rep_scheme ?? '-'}  user=${lr.user_id.slice(0, 8)}…`;
      if (candidates.length === 1) { unique++; if (examples.unique.length < 8) examples.unique.push(`${line}  →  wod=${candidates[0].id.slice(0, 8)}…  ${candidates[0].session_type ?? '?'}${candidates[0].workout_name ? ` — ${candidates[0].workout_name}` : ''}`); }
      else if (candidates.length > 1) { ambiguous++; if (examples.ambiguous.length < 8) examples.ambiguous.push(`${line}  →  ${candidates.length} candidates`); }
      else { noMatch++; if (examples.noMatch.length < 8) examples.noMatch.push(line); }
    }

    console.log('─── Phase A: backfill candidates ───');
    console.log(`  Unique match (safe to backfill): ${unique}`);
    console.log(`  Ambiguous (>1 candidate)       : ${ambiguous}`);
    console.log(`  No match                       : ${noMatch}\n`);
    if (examples.unique.length) { console.log('  Sample unique:');    examples.unique.forEach(s => console.log(s)); console.log(''); }
    if (examples.ambiguous.length) { console.log('  Sample ambiguous:'); examples.ambiguous.forEach(s => console.log(s)); console.log(''); }
    if (examples.noMatch.length) { console.log('  Sample no-match:'); examples.noMatch.forEach(s => console.log(s)); console.log(''); }
  }

  // ─── Phase B: orphan-sweep candidates ──────────────────────────────────
  // For each lift_record with wod_id set, check if user has a confirmed booking
  // for any session attached to that wod. If not → orphan candidate.
  if (setWodLifts.length > 0) {
    const wodIds = [...new Set(setWodLifts.map(l => l.wod_id!))];
    const { data: sessionsData } = await supabase
      .from('weekly_sessions')
      .select('id, workout_id')
      .in('workout_id', wodIds);
    const sessionsByWod = new Map<string, string[]>();
    for (const s of sessionsData || []) {
      if (!sessionsByWod.has(s.workout_id)) sessionsByWod.set(s.workout_id, []);
      sessionsByWod.get(s.workout_id)!.push(s.id);
    }

    const allSessionIds = [...new Set([...sessionsByWod.values()].flat())];
    const userIds = [...new Set(setWodLifts.map(l => l.user_id))];
    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('member_id, session_id, status')
      .in('session_id', allSessionIds)
      .in('member_id', userIds);

    // Index: (member_id|session_id) → status
    const bookingIndex = new Map<string, string>();
    for (const b of bookingsData || []) {
      bookingIndex.set(`${b.member_id}|${b.session_id}`, b.status);
    }

    let orphans = 0, hasConfirmed = 0, hasCancelled = 0, noBooking = 0;
    const examples: string[] = [];
    for (const lr of setWodLifts) {
      const sessIds = sessionsByWod.get(lr.wod_id!) ?? [];
      let confirmed = false;
      let cancelled = false;
      let any = false;
      for (const sid of sessIds) {
        const status = bookingIndex.get(`${lr.user_id}|${sid}`);
        if (status) any = true;
        if (status === 'confirmed') confirmed = true;
        if (status === 'cancelled' || status === 'late_cancel') cancelled = true;
      }
      if (confirmed) hasConfirmed++;
      else {
        orphans++;
        if (cancelled) hasCancelled++; else if (!any) noBooking++;
        if (examples.length < 12) {
          const why = cancelled ? 'cancelled booking' : any ? 'no-show/other' : 'no booking';
          examples.push(`  ${lr.lift_date}  ${lr.lift_name}  ${lr.weight_kg}kg ×${lr.reps}  user=${lr.user_id.slice(0, 8)}…  wod=${lr.wod_id!.slice(0, 8)}…  (${why})`);
        }
      }
    }

    console.log('─── Phase B: orphan-sweep candidates ───');
    console.log(`  Has confirmed booking (keep)        : ${hasConfirmed}`);
    console.log(`  Orphan candidates                   : ${orphans}`);
    console.log(`    – with cancelled/late_cancel      : ${hasCancelled}`);
    console.log(`    – with no booking at all          : ${noBooking}`);
    console.log(`    – other (no-show etc.)            : ${orphans - hasCancelled - noBooking}\n`);
    if (examples.length) { console.log('  Sample orphans:'); examples.forEach(s => console.log(s)); console.log(''); }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
