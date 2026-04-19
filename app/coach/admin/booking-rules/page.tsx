'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Settings, Save } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { authFetch } from '@/lib/auth-fetch';
import type { BookingRules } from '@/lib/bookingRules';

type FormState = {
  ten_card_refund_hours: string;
  auto_lock_lead_minutes: string;
  max_bookings_per_day: string;
  max_bookings_per_week: string;
  advance_booking_days: string;
};

const toForm = (r: BookingRules): FormState => ({
  ten_card_refund_hours: String(r.ten_card_refund_hours),
  auto_lock_lead_minutes: String(r.auto_lock_lead_minutes),
  max_bookings_per_day: r.max_bookings_per_day == null ? '' : String(r.max_bookings_per_day),
  max_bookings_per_week: r.max_bookings_per_week == null ? '' : String(r.max_bookings_per_week),
  advance_booking_days: r.advance_booking_days == null ? '' : String(r.advance_booking_days),
});

const parseInput = (s: string, nullable: boolean): number | null | 'invalid' => {
  if (s.trim() === '') return nullable ? null : 'invalid';
  const n = Number(s);
  if (!Number.isInteger(n) || n < 0) return 'invalid';
  if (nullable && n < 1) return 'invalid';
  return n;
};

export default function BookingRulesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      const user = await getCurrentUser();
      if (!user || user.user_metadata?.role !== 'coach') {
        router.push('/login');
        return;
      }
      try {
        const res = await authFetch('/api/admin/booking-rules');
        if (!res.ok) throw new Error('Failed to load');
        const rules: BookingRules = await res.json();
        setForm(toForm(rules));
      } catch (err) {
        console.error(err);
        setMessage({ kind: 'err', text: 'Failed to load booking rules.' });
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const handleSave = async () => {
    if (!form) return;
    setMessage(null);

    const parsed = {
      ten_card_refund_hours: parseInput(form.ten_card_refund_hours, false),
      auto_lock_lead_minutes: parseInput(form.auto_lock_lead_minutes, false),
      max_bookings_per_day: parseInput(form.max_bookings_per_day, true),
      max_bookings_per_week: parseInput(form.max_bookings_per_week, true),
      advance_booking_days: parseInput(form.advance_booking_days, true),
    };

    const invalid = Object.entries(parsed).filter(([, v]) => v === 'invalid').map(([k]) => k);
    if (invalid.length > 0) {
      setMessage({ kind: 'err', text: `Invalid values: ${invalid.join(', ')}` });
      return;
    }

    setSaving(true);
    try {
      const res = await authFetch('/api/admin/booking-rules', {
        method: 'PUT',
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to save');
      setForm(toForm(data));
      setMessage({ kind: 'ok', text: 'Booking rules saved.' });
    } catch (err) {
      setMessage({ kind: 'err', text: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-gray-600'>Loading...</div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-red-600'>Failed to load booking rules.</div>
      </div>
    );
  }

  const field = (
    key: keyof FormState,
    label: string,
    suffix: string,
    helper: string,
    allowBlank = false
  ) => (
    <div className='mb-5'>
      <label className='block text-sm font-medium text-gray-700 mb-1'>{label}</label>
      <div className='flex items-center gap-2'>
        <input
          type='number'
          min={allowBlank ? 1 : 0}
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          placeholder={allowBlank ? 'blank = unlimited' : ''}
          className='w-40 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#178da6]'
        />
        <span className='text-sm text-gray-500'>{suffix}</span>
      </div>
      <p className='text-xs text-gray-500 mt-1'>{helper}</p>
    </div>
  );

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-2xl mx-auto p-6'>
        <div className='mb-6'>
          <Link
            href='/coach/admin'
            className='inline-flex items-center gap-2 text-[#178da6] hover:text-[#14758c] mb-4'
          >
            <ArrowLeft size={20} />
            Back to Admin
          </Link>
          <h1 className='text-3xl font-bold text-gray-900 flex items-center gap-3'>
            <Settings size={28} />
            Booking Rules
          </h1>
          <p className='text-gray-600 mt-2'>
            Configure limits for athlete bookings. Leave fields blank (where allowed) to remove the limit.
          </p>
        </div>

        <div className='bg-white rounded-lg shadow-md p-6'>
          {field(
            'ten_card_refund_hours',
            '10-card refund window',
            'hours before class',
            'Cancellations earlier than this refund a 10-card session. Later cancellations forfeit the session.'
          )}
          {field(
            'auto_lock_lead_minutes',
            'Auto-lock lead time',
            'minutes before class start',
            'Classes automatically lock this many minutes before start time. 0 = locks at start.'
          )}
          {field(
            'max_bookings_per_day',
            'Max bookings per athlete per day',
            'bookings/day',
            'Blank = unlimited. Counts confirmed + waitlisted bookings on a given date.',
            true
          )}
          {field(
            'max_bookings_per_week',
            'Max bookings per athlete per week',
            'bookings/week',
            'Blank = unlimited. Week runs Monday–Sunday based on the session date.',
            true
          )}
          {field(
            'advance_booking_days',
            'Advance booking horizon',
            'days ahead',
            'Blank = unlimited. Athletes can only book sessions up to this many days in the future.',
            true
          )}

          {message && (
            <div
              className={`mb-4 px-4 py-2 rounded text-sm ${
                message.kind === 'ok'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className='inline-flex items-center gap-2 bg-[#178da6] text-white px-4 py-2 rounded-md hover:bg-[#14758c] disabled:opacity-50'
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Rules'}
          </button>
        </div>
      </div>
    </div>
  );
}
