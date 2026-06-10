// Wellpass scoring + block decision. Shared between:
//   - /api/coach/wellpass (GET) — to display YTD/all-time % and ratio chips on the tab
//   - /api/coach/wellpass/import — to recompute wellpass_booking_restricted at sync time
//
// The three block rules (all must pass to be unblocked):
//   A. 4-week rolling sum >= 3 × min  (catches recent dormancy)
//   B. 12-week rolling sum >= 9 × min (catches quarterly under-pacing)
//   C. 13-week login:attendance ratio >= 1.5  (shared identities only; sustained
//      under-padding for the spouse-share deal)
//
// Each rule has a grace period — it doesn't fire until the identity has at least
// `window` weeks of data. New identities are unblockable until they accumulate
// enough history.

import type { SupabaseClient } from '@supabase/supabase-js';

// ---------- Tunable constants (Session 377 design) ----------

export const WINDOW_4WK = 4;
export const WINDOW_12WK = 12;
export const WINDOW_RATIO = 13;
export const DEFICIT_MULTIPLIER_4WK = 3; // sum >= 3 × min over 4 weeks (1 wk deficit allowed)
export const DEFICIT_MULTIPLIER_12WK = 9; // sum >= 9 × min over 12 weeks (3 wk deficit allowed)
export const RATIO_THRESHOLD = 1.5; // shared identities should log 1.5x their attendances

// ---------- Types ----------

export type BlockReason = 'recent_dormancy' | 'annual_pace' | 'ratio_sustained';

export interface WeeklyLogin {
  year: number;
  week_number: number;
  checkin_count: number;
}

export interface WeeklyAttendance {
  year: number;
  week_number: number;
  booking_count: number;
}

export interface ScoringIdentityInput {
  id: string;
  min_checkins_required: number;
  paused_at: string | null;
}

export interface ScoringMetrics {
  // Short-term (4-week) rule
  sum_4wk: number;
  threshold_4wk: number;
  weeks_data_4wk: number;
  pass_4wk: boolean; // true when insufficient data (grace) OR sum >= threshold

  // Medium-term (12-week) rule
  sum_12wk: number;
  threshold_12wk: number;
  weeks_data_12wk: number;
  pass_12wk: boolean;

  // Ratio rule (shared identities only)
  logins_13wk: number;
  attendances_13wk: number;
  ratio_13wk: number | null; // null when attendances_13wk = 0
  pass_ratio: boolean; // true when not shared, insufficient data, or ratio >= threshold

  // YTD display
  ytd_logins: number;
  ytd_attendances: number;
  ytd_weeks_elapsed: number;
  ytd_target: number;
  ytd_pct: number; // 0 when target=0
  ytd_ratio: number | null;

  // All-time display
  alltime_logins: number;
  alltime_attendances: number;
  alltime_weeks_tracked: number;
  alltime_target: number;
  alltime_pct: number;
  alltime_ratio: number | null;
}

export interface ScoringVerdict {
  shouldBlock: boolean;
  reason: BlockReason | null;
  // True when shared AND YTD ratio < 1.5 but the 13-week ratio rule didn't (yet)
  // fire a block. UI uses this for a yellow chip — Chris's "flag, then block if
  // sustained" semantics.
  ratioFlag: boolean;
}

// ---------- Date helpers (ISO weeks, Mon-start) ----------

// Returns the ISO week year and week number for a date. ISO weeks start Monday;
// the year of a week is the year of its Thursday. We use the same convention the
// import route uses for week_number assignment, so YTD math lines up with the
// stored weekly_history rows.
export function getIsoYearWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // shift to Thursday of this ISO week
  const isoYear = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: isoYear, week };
}

// Number of ISO weeks elapsed in the calendar year through `now`. Used as the
// denominator for YTD targets so a check on Jan 5 doesn't blow up at week 1.
export function getWeeksElapsedInYear(now: Date): number {
  const { week } = getIsoYearWeek(now);
  return week;
}

// ---------- Window helpers ----------

// Build a sorted-desc array of the last `windowSize` ISO weeks ending at `now`.
// Used to look up sparse weekly arrays without assuming weeks are contiguous.
function buildRecentWeekKeys(now: Date, windowSize: number): string[] {
  const keys: string[] = [];
  const d = new Date(now);
  for (let i = 0; i < windowSize; i++) {
    const { year, week } = getIsoYearWeek(d);
    keys.push(`${year}-${String(week).padStart(2, '0')}`);
    d.setUTCDate(d.getUTCDate() - 7); // step back a week
  }
  return keys;
}

function sumOverWindow(
  weekly: { year: number; week_number: number; count: number }[],
  now: Date,
  windowSize: number
): { sum: number; weeksData: number } {
  const keys = new Set(buildRecentWeekKeys(now, windowSize));
  const byKey = new Map<string, number>();
  for (const w of weekly) {
    byKey.set(`${w.year}-${String(w.week_number).padStart(2, '0')}`, w.count);
  }
  let sum = 0;
  let weeksData = 0;
  for (const k of keys) {
    const v = byKey.get(k);
    if (v !== undefined) {
      sum += v;
      weeksData += 1;
    }
  }
  return { sum, weeksData };
}

// ---------- Core math ----------

export function computeMetrics(
  weeklyLogins: WeeklyLogin[],
  weeklyAttendances: WeeklyAttendance[],
  identity: Pick<ScoringIdentityInput, 'min_checkins_required'>,
  isShared: boolean,
  now: Date
): ScoringMetrics {
  const min = identity.min_checkins_required;

  const loginsMapped = weeklyLogins.map((w) => ({
    year: w.year,
    week_number: w.week_number,
    count: w.checkin_count,
  }));
  const attendancesMapped = weeklyAttendances.map((w) => ({
    year: w.year,
    week_number: w.week_number,
    count: w.booking_count,
  }));

  // 4-week window
  const { sum: sum_4wk, weeksData: weeks_data_4wk } = sumOverWindow(loginsMapped, now, WINDOW_4WK);
  const threshold_4wk = DEFICIT_MULTIPLIER_4WK * min;
  const pass_4wk = weeks_data_4wk < WINDOW_4WK ? true : sum_4wk >= threshold_4wk;

  // 12-week window
  const { sum: sum_12wk, weeksData: weeks_data_12wk } = sumOverWindow(loginsMapped, now, WINDOW_12WK);
  const threshold_12wk = DEFICIT_MULTIPLIER_12WK * min;
  const pass_12wk = weeks_data_12wk < WINDOW_12WK ? true : sum_12wk >= threshold_12wk;

  // 13-week ratio (shared only — solo identities have no spouse to pad for)
  const { sum: logins_13wk } = sumOverWindow(loginsMapped, now, WINDOW_RATIO);
  const { sum: attendances_13wk, weeksData: ratioWeeksData } = sumOverWindow(
    attendancesMapped,
    now,
    WINDOW_RATIO
  );
  const ratio_13wk = attendances_13wk > 0 ? logins_13wk / attendances_13wk : null;
  const pass_ratio = !isShared
    ? true
    : ratioWeeksData < WINDOW_RATIO
      ? true
      : ratio_13wk === null
        ? true // no attendances at all — can't judge under-padding
        : ratio_13wk >= RATIO_THRESHOLD;

  // YTD totals (calendar year of `now`)
  const { year: nowIsoYear } = getIsoYearWeek(now);
  const ytd_weeks_elapsed = getWeeksElapsedInYear(now);
  const ytd_logins = loginsMapped
    .filter((w) => w.year === nowIsoYear)
    .reduce((s, w) => s + w.count, 0);
  const ytd_attendances = attendancesMapped
    .filter((w) => w.year === nowIsoYear)
    .reduce((s, w) => s + w.count, 0);
  const ytd_target = min * ytd_weeks_elapsed;
  const ytd_pct = ytd_target > 0 ? Math.round((ytd_logins / ytd_target) * 100) : 0;
  const ytd_ratio = ytd_attendances > 0 ? ytd_logins / ytd_attendances : null;

  // All-time totals
  const alltime_logins = loginsMapped.reduce((s, w) => s + w.count, 0);
  const alltime_attendances = attendancesMapped.reduce((s, w) => s + w.count, 0);
  const alltime_weeks_tracked = new Set(
    loginsMapped.map((w) => `${w.year}-${w.week_number}`)
  ).size;
  const alltime_target = min * alltime_weeks_tracked;
  const alltime_pct = alltime_target > 0 ? Math.round((alltime_logins / alltime_target) * 100) : 0;
  const alltime_ratio = alltime_attendances > 0 ? alltime_logins / alltime_attendances : null;

  return {
    sum_4wk,
    threshold_4wk,
    weeks_data_4wk,
    pass_4wk,
    sum_12wk,
    threshold_12wk,
    weeks_data_12wk,
    pass_12wk,
    logins_13wk,
    attendances_13wk,
    ratio_13wk,
    pass_ratio,
    ytd_logins,
    ytd_attendances,
    ytd_weeks_elapsed,
    ytd_target,
    ytd_pct,
    ytd_ratio,
    alltime_logins,
    alltime_attendances,
    alltime_weeks_tracked,
    alltime_target,
    alltime_pct,
    alltime_ratio,
  };
}

// First-failing rule wins as the displayed reason (priority: 4wk > 12wk > ratio).
// Paused or exempt identities never block.
export function decideBlock(
  metrics: ScoringMetrics,
  identity: Pick<ScoringIdentityInput, 'paused_at'>,
  isExempt: boolean,
  isShared: boolean
): ScoringVerdict {
  if (identity.paused_at || isExempt) {
    return { shouldBlock: false, reason: null, ratioFlag: false };
  }

  let shouldBlock = false;
  let reason: BlockReason | null = null;

  if (!metrics.pass_4wk) {
    shouldBlock = true;
    reason = 'recent_dormancy';
  } else if (!metrics.pass_12wk) {
    shouldBlock = true;
    reason = 'annual_pace';
  } else if (!metrics.pass_ratio) {
    shouldBlock = true;
    reason = 'ratio_sustained';
  }

  // Soft ratio flag: shared identity, ratio info available, ratio below threshold,
  // but the rule didn't (yet) fire a block. Two cases trigger this:
  //   - Insufficient 13-week history (still in grace)
  //   - YTD ratio sub-threshold but 13-week ratio still OK (early warning)
  // Hide it entirely for blocked identities — the block badge says enough.
  const ratioFlag =
    isShared &&
    !shouldBlock &&
    ((metrics.ratio_13wk !== null && metrics.ratio_13wk < RATIO_THRESHOLD) ||
      (metrics.ytd_ratio !== null && metrics.ytd_ratio < RATIO_THRESHOLD));

  return { shouldBlock, reason, ratioFlag };
}

// ---------- Bulk data loader ----------

// Loads weekly logins (full history, paginated) and weekly attendances (full
// history, paginated, bucketed by ISO week) for the given identities. Used by
// both the GET route and the import recompute so the math is identical.
//
// Returns:
//   loginsByIdentity:      identityId → WeeklyLogin[]   (sorted desc)
//   attendancesByIdentity: identityId → WeeklyAttendance[] (sorted desc)

// Loose Supabase client type — matches the shape returned by `createClient()`
// without explicit generic args at the call sites (route.ts + import/route.ts).
// We only need generic `.from().select()` chains here, so schema typing offers
// no real safety in this lib — keep the parameter pragmatic.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, 'public', 'public', any, any>;

export async function loadScoringData(
  supabaseAdmin: AnySupabaseClient,
  identityIds: string[],
  memberIdToIdentityIds: Map<string, string[]>
): Promise<{
  loginsByIdentity: Map<string, WeeklyLogin[]>;
  attendancesByIdentity: Map<string, WeeklyAttendance[]>;
}> {
  const loginsByIdentity = new Map<string, WeeklyLogin[]>();
  const attendancesByIdentity = new Map<string, WeeklyAttendance[]>();

  if (identityIds.length === 0) {
    return { loginsByIdentity, attendancesByIdentity };
  }

  // --- 1. Full weekly_checkins history (paginated; growing table). ---
  const PAGE = 1000;
  {
    let from = 0;
    for (;;) {
      const { data: page, error } = await supabaseAdmin
        .from('wellpass_weekly_checkins')
        .select('wellpass_identity_id, year, week_number, checkin_count')
        .in('wellpass_identity_id', identityIds)
        .order('year', { ascending: false })
        .order('week_number', { ascending: false })
        .range(from, from + PAGE - 1);
      if (error) {
        console.error('[wellpass-scoring] checkins page error:', error);
        break;
      }
      const rows = (page ?? []) as {
        wellpass_identity_id: string;
        year: number;
        week_number: number;
        checkin_count: number;
      }[];
      for (const r of rows) {
        const arr = loginsByIdentity.get(r.wellpass_identity_id) ?? [];
        arr.push({ year: r.year, week_number: r.week_number, checkin_count: r.checkin_count });
        loginsByIdentity.set(r.wellpass_identity_id, arr);
      }
      if (rows.length < PAGE) break;
      from += PAGE;
    }
  }

  // --- 2. All-time confirmed bookings for any linked member (paginated). ---
  const allMemberIds = Array.from(memberIdToIdentityIds.keys());
  if (allMemberIds.length === 0) {
    return { loginsByIdentity, attendancesByIdentity };
  }

  // identityId → key("YYYY-WW") → count
  const attendanceMap = new Map<string, Map<string, number>>();

  {
    let from = 0;
    for (;;) {
      const { data: page, error } = await supabaseAdmin
        .from('bookings')
        .select('member_id, weekly_sessions!inner(date)')
        .in('member_id', allMemberIds)
        .eq('status', 'confirmed')
        .range(from, from + PAGE - 1);
      if (error) {
        console.error('[wellpass-scoring] bookings page error:', error);
        break;
      }
      const rows = (page ?? []) as {
        member_id: string;
        weekly_sessions: { date: string } | { date: string }[] | null;
      }[];
      for (const r of rows) {
        const ws = Array.isArray(r.weekly_sessions) ? r.weekly_sessions[0] : r.weekly_sessions;
        if (!ws) continue;
        const { year, week } = getIsoYearWeek(new Date(`${ws.date}T12:00:00Z`));
        const weekKey = `${year}-${String(week).padStart(2, '0')}`;
        const idIds = memberIdToIdentityIds.get(r.member_id) ?? [];
        for (const idId of idIds) {
          let inner = attendanceMap.get(idId);
          if (!inner) {
            inner = new Map<string, number>();
            attendanceMap.set(idId, inner);
          }
          inner.set(weekKey, (inner.get(weekKey) ?? 0) + 1);
        }
      }
      if (rows.length < PAGE) break;
      from += PAGE;
    }
  }

  for (const [identityId, weekMap] of attendanceMap.entries()) {
    const arr: WeeklyAttendance[] = [];
    for (const [key, count] of weekMap.entries()) {
      const [yStr, wStr] = key.split('-');
      arr.push({ year: parseInt(yStr, 10), week_number: parseInt(wStr, 10), booking_count: count });
    }
    arr.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.week_number - a.week_number;
    });
    attendancesByIdentity.set(identityId, arr);
  }

  return { loginsByIdentity, attendancesByIdentity };
}
