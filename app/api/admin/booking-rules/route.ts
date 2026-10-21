import { NextRequest, NextResponse } from 'next/server';
import { requireCoach, isAuthError } from '@/lib/auth-api';
import { getBookingRules, updateBookingRules, BookingRules } from '@/lib/bookingRules';

export async function GET(request: NextRequest) {
  const auth = await requireCoach(request);
  if (isAuthError(auth)) return auth;

  const rules = await getBookingRules();
  return NextResponse.json(rules);
}

export async function PUT(request: NextRequest) {
  const auth = await requireCoach(request);
  if (isAuthError(auth)) return auth;

  const body = await request.json();
  const patch: Partial<BookingRules> = {};

  const intField = (key: keyof BookingRules, min = 0, nullable = false) => {
    if (!(key in body)) return null;
    const v = body[key];
    if (v === null || v === '') {
      if (!nullable) return `${key} cannot be null`;
      patch[key] = null as never;
      return null;
    }
    if (typeof v !== 'number' || !Number.isInteger(v) || v < min) {
      return `${key} must be an integer >= ${min}`;
    }
    patch[key] = v as never;
    return null;
  };

  // Validate next_week_release_day_of_week (0-6) and next_week_release_time ('HH:MM' or 'HH:MM:SS')
  const validateRelease = (): string | null => {
    if ('next_week_release_day_of_week' in body) {
      const v = body.next_week_release_day_of_week;
      if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 6) {
        return 'next_week_release_day_of_week must be an integer 0-6 (0=Sunday)';
      }
      patch.next_week_release_day_of_week = v;
    }
    if ('next_week_release_time' in body) {
      const v = body.next_week_release_time;
      if (typeof v !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(v)) {
        return 'next_week_release_time must be HH:MM or HH:MM:SS';
      }
      patch.next_week_release_time = v.length === 5 ? `${v}:00` : v;
    }
    return null;
  };

  // Validate the morning-lock fields: a boolean toggle + two time-of-day strings.
  const validateMorningLock = (): string | null => {
    if ('morning_lock_enabled' in body) {
      const v = body.morning_lock_enabled;
      if (typeof v !== 'boolean') return 'morning_lock_enabled must be a boolean';
      patch.morning_lock_enabled = v;
    }
    for (const key of ['morning_cutoff_time', 'morning_lock_time'] as const) {
      if (key in body) {
        const v = body[key];
        if (typeof v !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(v)) {
          return `${key} must be HH:MM or HH:MM:SS`;
        }
        patch[key] = v.length === 5 ? `${v}:00` : v;
      }
    }
    // Per-evening exceptions: { '0'..'6': 'HH:MM' }. A day left out = use the default lock time.
    if ('morning_lock_time_by_day' in body) {
      const v = body.morning_lock_time_by_day;
      if (typeof v !== 'object' || v === null || Array.isArray(v)) {
        return 'morning_lock_time_by_day must be an object';
      }
      const clean: Record<string, string> = {};
      for (const [day, time] of Object.entries(v)) {
        if (!/^[0-6]$/.test(day)) return 'morning_lock_time_by_day keys must be 0-6';
        if (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(time)) {
          return 'morning_lock_time_by_day times must be HH:MM or HH:MM:SS';
        }
        clean[day] = time.length === 5 ? `${time}:00` : time;
      }
      patch.morning_lock_time_by_day = clean;
    }
    return null;
  };

  // Per-day workout-reveal exceptions: { '0'..'6': minutes }. A day left out = use workout_reveal_minutes.
  const validateRevealByDay = (): string | null => {
    if (!('workout_reveal_minutes_by_day' in body)) return null;
    const v = body.workout_reveal_minutes_by_day;
    if (typeof v !== 'object' || v === null || Array.isArray(v)) {
      return 'workout_reveal_minutes_by_day must be an object';
    }
    const clean: Record<string, number> = {};
    for (const [day, mins] of Object.entries(v)) {
      if (!/^[0-6]$/.test(day)) return 'workout_reveal_minutes_by_day keys must be 0-6';
      if (typeof mins !== 'number' || !Number.isInteger(mins) || mins < 0) {
        return 'workout_reveal_minutes_by_day values must be integers >= 0';
      }
      clean[day] = mins;
    }
    patch.workout_reveal_minutes_by_day = clean;
    return null;
  };

  const errors = [
    intField('ten_card_refund_hours'),
    intField('auto_lock_lead_minutes'),
    intField('max_bookings_per_day', 1, true),
    intField('max_bookings_per_week', 1, true),
    intField('advance_booking_days', 1, true),
    intField('wellpass_restricted_release_offset_minutes'),
    intField('workout_reveal_minutes'),
    validateRelease(),
    validateMorningLock(),
    validateRevealByDay(),
  ].filter(Boolean);

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join('; ') }, { status: 400 });
  }

  try {
    const updated = await updateBookingRules(patch);
    return NextResponse.json(updated);
  } catch (err) {
    console.error('Failed to update booking rules:', err);
    return NextResponse.json({ error: 'Failed to update booking rules' }, { status: 500 });
  }
}
