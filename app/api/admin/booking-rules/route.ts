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

  const errors = [
    intField('ten_card_refund_hours'),
    intField('auto_lock_lead_minutes'),
    intField('max_bookings_per_day', 1, true),
    intField('max_bookings_per_week', 1, true),
    intField('advance_booking_days', 1, true),
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
