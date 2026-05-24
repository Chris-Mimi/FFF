import { createClient } from '@supabase/supabase-js';

export interface BookingRules {
  ten_card_refund_hours: number;
  auto_lock_lead_minutes: number;
  max_bookings_per_day: number | null;
  max_bookings_per_week: number | null;
  advance_booking_days: number | null;
  next_week_release_day_of_week: number; // 0=Sun, 1=Mon, ..., 6=Sat (JS getDay)
  next_week_release_time: string;        // 'HH:MM:SS' — priority tier opening (Berlin wall clock)
  wellpass_restricted_release_offset_minutes: number; // added to base release for Wellpass-restricted members; 0 = same time as priority tier
}

export const DEFAULT_BOOKING_RULES: BookingRules = {
  ten_card_refund_hours: 12,
  auto_lock_lead_minutes: 0,
  max_bookings_per_day: null,
  max_bookings_per_week: null,
  advance_booking_days: null,
  next_week_release_day_of_week: 0,
  next_week_release_time: '14:00:00',
  wellpass_restricted_release_offset_minutes: 0,
};

const RULES_COLUMNS = 'ten_card_refund_hours, auto_lock_lead_minutes, max_bookings_per_day, max_bookings_per_week, advance_booking_days, next_week_release_day_of_week, next_week_release_time, wellpass_restricted_release_offset_minutes';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function getBookingRules(): Promise<BookingRules> {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from('booking_rules')
    .select(RULES_COLUMNS)
    .eq('id', 1)
    .single();

  if (error || !data) return DEFAULT_BOOKING_RULES;
  return data as BookingRules;
}

export async function updateBookingRules(patch: Partial<BookingRules>): Promise<BookingRules> {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from('booking_rules')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .select(RULES_COLUMNS)
    .single();

  if (error || !data) throw error ?? new Error('Failed to update booking rules');
  return data as BookingRules;
}

// Parse a weekly_sessions row's date ('YYYY-MM-DD') + time ('HH:MM' or 'HH:MM:SS')
// as Berlin wall-clock, return the corresponding UTC instant. Use this anywhere
// you'd otherwise write `new Date(`${session.date}T${session.time}`)` — that form
// is interpreted as runtime-local (UTC on Vercel) and produces a 2h-offset bug.
export function sessionStartInstant(dateStr: string, timeStr: string): Date {
  const tz = 'Europe/Berlin';
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [hh, mm, ss = 0] = timeStr.split(':').map(Number);
  const guess = new Date(Date.UTC(y, mo - 1, d, hh, mm, ss));
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(guess);
  const get = (t: string) => parseInt(parts.find(p => p.type === t)!.value);
  const berlinAsUTC = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  const offsetMs = berlinAsUTC - guess.getTime();
  return new Date(guess.getTime() - offsetMs);
}

const BERLIN_TZ = 'Europe/Berlin';

function berlinWallClock(instant: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BERLIN_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false, weekday: 'short',
  }).formatToParts(instant);
  const get = (t: string) => parts.find(p => p.type === t)!.value;
  const dowMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: parseInt(get('year')),
    month: parseInt(get('month')),
    day: parseInt(get('day')),
    hour: parseInt(get('hour')),
    dow: dowMap[get('weekday')],
  };
}

function berlinWallTimeToUTC(year: number, month: number, day: number, hour: number, minute: number, second: number): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BERLIN_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(guess);
  const get = (t: string) => parseInt(parts.find(p => p.type === t)!.value);
  const berlinAsUTC = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  const offsetMs = berlinAsUTC - guess.getTime();
  return new Date(guess.getTime() - offsetMs);
}

// Returns the release instant for the user's tier in the current Berlin week,
// plus the Monday/Sunday bounds. Restricted-tier members get the base release
// shifted later by `wellpass_restricted_release_offset_minutes`. Note: this is
// the release for the upcoming "next week" relative to the calendar week the
// `now` argument falls in — used by both the visibility gate and the UI countdown.
function computeReleaseAndWeekEnd(rules: BookingRules, now: Date, restricted: boolean) {
  const berlin = berlinWallClock(now);
  const isoDay = berlin.dow === 0 ? 6 : berlin.dow - 1; // Mon=0, ..., Sun=6

  const monday = new Date(Date.UTC(berlin.year, berlin.month - 1, berlin.day - isoDay));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const releaseDow = rules.next_week_release_day_of_week;
  const releaseIsoDay = releaseDow === 0 ? 6 : releaseDow - 1;
  const releaseDay = new Date(monday);
  releaseDay.setUTCDate(monday.getUTCDate() + releaseIsoDay);
  const [hh, mm, ss = 0] = rules.next_week_release_time.split(':').map(Number);
  let releaseInstant = berlinWallTimeToUTC(
    releaseDay.getUTCFullYear(),
    releaseDay.getUTCMonth() + 1,
    releaseDay.getUTCDate(),
    hh, mm, ss
  );
  if (restricted && rules.wellpass_restricted_release_offset_minutes > 0) {
    releaseInstant = new Date(releaseInstant.getTime() + rules.wellpass_restricted_release_offset_minutes * 60_000);
  }
  return { releaseInstant, monday, sunday };
}

// Latest session date athletes are allowed to see/book at the given moment.
// Default config (Sunday 14:00) means: Mon-Sat athletes see only this week (Mon-Sun),
// Sunday before 14:00 still only this week, Sunday at/after 14:00 unlocks next week.
//
// Wellpass-restricted members (members.wellpass_booking_restricted=true) see the
// release shifted later by `wellpass_restricted_release_offset_minutes`.
//
// All timestamps are evaluated in Europe/Berlin so the release time stored in
// next_week_release_time is interpreted as Berlin wall-clock, regardless of the
// runtime timezone (Vercel runs UTC).
export function getMaxVisibleSessionDate(rules: BookingRules, now: Date = new Date(), restricted: boolean = false): Date {
  const { releaseInstant, sunday } = computeReleaseAndWeekEnd(rules, now, restricted);

  if (now >= releaseInstant) {
    const endOfNextWeek = new Date(sunday);
    endOfNextWeek.setUTCDate(sunday.getUTCDate() + 7);
    // 12:00 UTC = 13:00/14:00 Berlin — well inside the Berlin calendar Sunday,
    // so callers that re-format via browser-local `getDate()` (e.g. /member/book's
    // formatLocalDate) emit the correct "YYYY-MM-DD" for Sunday rather than
    // rolling over to Monday under CET/CEST. Server-side `>` comparisons against
    // session-date midnight UTC still work correctly.
    endOfNextWeek.setUTCHours(12, 0, 0, 0);
    return endOfNextWeek;
  }
  const endOfThisWeek = new Date(sunday);
  endOfThisWeek.setUTCHours(12, 0, 0, 0);
  return endOfThisWeek;
}

// Returns the next upcoming release instant for the given tier, or null if the
// release has already happened OR we're outside the visibility window for the
// /member/book countdown banner. The banner only renders from 12:00 Berlin on
// the release day until release fires — avoids athletes seeing a multi-day
// countdown all week long. The 12:00 cutoff is hardcoded (no UI exposure yet).
export function getNextReleaseInstant(rules: BookingRules, now: Date = new Date(), restricted: boolean = false): Date | null {
  const { releaseInstant } = computeReleaseAndWeekEnd(rules, now, restricted);
  if (now >= releaseInstant) return null;

  const berlin = berlinWallClock(now);
  const inVisibilityWindow = berlin.dow === rules.next_week_release_day_of_week && berlin.hour >= 12;
  if (!inVisibilityWindow) return null;

  return releaseInstant;
}

export interface SessionTypeLockRule {
  session_type: string;
  auto_lock_lead_minutes: number;
}

export async function getSessionTypeLockRules(): Promise<SessionTypeLockRule[]> {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from('booking_rules_by_session_type')
    .select('session_type, auto_lock_lead_minutes');
  if (error || !data) return [];
  return data as SessionTypeLockRule[];
}

// Resolves the auto-lock lead minutes for a given session type,
// falling back to the global booking_rules value if no per-type row exists.
export async function getLockLeadMinutesForSessionType(sessionType: string | null | undefined): Promise<number> {
  const rules = await getBookingRules();
  if (!sessionType) return rules.auto_lock_lead_minutes;

  const supabase = adminClient();
  const { data } = await supabase
    .from('booking_rules_by_session_type')
    .select('auto_lock_lead_minutes')
    .eq('session_type', sessionType)
    .maybeSingle();

  if (data && typeof data.auto_lock_lead_minutes === 'number') {
    return data.auto_lock_lead_minutes;
  }
  return rules.auto_lock_lead_minutes;
}

// Upserts a per-session-type rule. Pass null to remove the override (fall back to global).
export async function setSessionTypeLockRule(sessionType: string, minutes: number | null): Promise<void> {
  const supabase = adminClient();
  if (minutes === null) {
    const { error } = await supabase
      .from('booking_rules_by_session_type')
      .delete()
      .eq('session_type', sessionType);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from('booking_rules_by_session_type')
    .upsert(
      { session_type: sessionType, auto_lock_lead_minutes: minutes, updated_at: new Date().toISOString() },
      { onConflict: 'session_type' }
    );
  if (error) throw error;
}
