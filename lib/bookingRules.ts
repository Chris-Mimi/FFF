import { createClient } from '@supabase/supabase-js';

export interface BookingRules {
  ten_card_refund_hours: number;
  auto_lock_lead_minutes: number;
  max_bookings_per_day: number | null;
  max_bookings_per_week: number | null;
  advance_booking_days: number | null;
}

export const DEFAULT_BOOKING_RULES: BookingRules = {
  ten_card_refund_hours: 12,
  auto_lock_lead_minutes: 0,
  max_bookings_per_day: null,
  max_bookings_per_week: null,
  advance_booking_days: null,
};

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
    .select('ten_card_refund_hours, auto_lock_lead_minutes, max_bookings_per_day, max_bookings_per_week, advance_booking_days')
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
    .select('ten_card_refund_hours, auto_lock_lead_minutes, max_bookings_per_day, max_bookings_per_week, advance_booking_days')
    .single();

  if (error || !data) throw error ?? new Error('Failed to update booking rules');
  return data as BookingRules;
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
