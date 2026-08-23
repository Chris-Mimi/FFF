import { NextResponse } from 'next/server';
import { getBookingRules, getSessionTypeLockRules } from '@/lib/bookingRules';

// Exposes only the next-week release config + lock-lead minutes (non-sensitive, no auth required).
// Used by the athlete-facing booking page to time-gate next week's sessions
// and to show a "booking closes in …" countdown per card.
export async function GET() {
  const [rules, perType] = await Promise.all([
    getBookingRules(),
    getSessionTypeLockRules(),
  ]);
  return NextResponse.json({
    next_week_release_day_of_week: rules.next_week_release_day_of_week,
    next_week_release_time: rules.next_week_release_time,
    wellpass_restricted_release_offset_minutes: rules.wellpass_restricted_release_offset_minutes,
    auto_lock_lead_minutes: rules.auto_lock_lead_minutes,
    session_type_lock_minutes: perType,
    morning_lock_enabled: rules.morning_lock_enabled,
    morning_cutoff_time: rules.morning_cutoff_time,
    morning_lock_time: rules.morning_lock_time,
  });
}
