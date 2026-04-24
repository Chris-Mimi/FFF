import { NextResponse } from 'next/server';
import { getBookingRules } from '@/lib/bookingRules';

// Exposes only the next-week release config (non-sensitive, no auth required).
// Used by the athlete-facing booking page to time-gate next week's sessions.
export async function GET() {
  const rules = await getBookingRules();
  return NextResponse.json({
    next_week_release_day_of_week: rules.next_week_release_day_of_week,
    next_week_release_time: rules.next_week_release_time,
  });
}
