import { createClient } from '@supabase/supabase-js';

export interface BookingRules {
  ten_card_refund_hours: number;
  auto_lock_lead_minutes: number;
  max_bookings_per_day: number | null;
  max_bookings_per_week: number | null;
  advance_booking_days: number | null;
  next_week_release_day_of_week: number; // 0=Sun, 1=Mon, ..., 6=Sat (JS getDay)
  next_week_release_time: string;        // 'HH:MM:SS'
}

export const DEFAULT_BOOKING_RULES: BookingRules = {
  ten_card_refund_hours: 12,
  auto_lock_lead_minutes: 0,
  max_bookings_per_day: null,
  max_bookings_per_week: null,
  advance_booking_days: null,
  next_week_release_day_of_week: 0,
  next_week_release_time: '14:00:00',
};

const RULES_COLUMNS = 'ten_card_refund_hours, auto_lock_lead_minutes, max_bookings_per_day, max_bookings_per_week, advance_booking_days, next_week_release_day_of_week, next_week_release_time';

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

// Latest session date athletes are allowed to see/book at the given moment.
// Default config (Sunday 14:00) means: Mon-Sat athletes see only this week (Mon-Sun),
// Sunday before 14:00 still only this week, Sunday at/after 14:00 unlocks next week.
export function getMaxVisibleSessionDate(rules: BookingRules, now: Date = new Date()): Date {
  const dow = now.getDay();              // 0=Sun, 1=Mon, ..., 6=Sat
  const isoDay = dow === 0 ? 6 : dow - 1; // Mon=0, ..., Sun=6
  const thisMonday = new Date(now);
  thisMonday.setHours(0, 0, 0, 0);
  thisMonday.setDate(now.getDate() - isoDay);

  const thisSunday = new Date(thisMonday);
  thisSunday.setDate(thisMonday.getDate() + 6);
  thisSunday.setHours(23, 59, 59, 999);

  const releaseDow = rules.next_week_release_day_of_week;
  const releaseIsoDay = releaseDow === 0 ? 6 : releaseDow - 1;
  const releaseDate = new Date(thisMonday);
  releaseDate.setDate(thisMonday.getDate() + releaseIsoDay);
  const [hh, mm, ss = 0] = rules.next_week_release_time.split(':').map(Number);
  releaseDate.setHours(hh, mm, ss, 0);

  if (now >= releaseDate) {
    const endOfNextWeek = new Date(thisSunday);
    endOfNextWeek.setDate(thisSunday.getDate() + 7);
    return endOfNextWeek;
  }
  return thisSunday;
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
