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
    return null;
  };

  const errors = [
    intField('ten_card_refund_hours'),
    intField('auto_lock_lead_minutes'),
    intField('max_bookings_per_day', 1, true),
    intField('max_bookings_per_week', 1, true),
    intField('advance_booking_days', 1, true),
    intField('wellpass_restricted_release_offset_minutes'),
    validateRelease(),
    validateMorningLock(),
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
