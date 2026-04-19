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

type PerTypeRow = { session_type: string; value: string };

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
  const [perType, setPerType] = useState<PerTypeRow[]>([]);
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
        const [rulesRes, typesRes] = await Promise.all([
          authFetch('/api/admin/booking-rules'),
          authFetch('/api/admin/booking-rules/session-types'),
        ]);
        if (!rulesRes.ok) throw new Error('Failed to load rules');
        if (!typesRes.ok) throw new Error('Failed to load session types');
        const rules: BookingRules = await rulesRes.json();
        const typesJson: { types: { session_type: string; auto_lock_lead_minutes: number | null }[] } =
          await typesRes.json();
        setForm(toForm(rules));
        setPerType(
          typesJson.types.map((t) => ({
            session_type: t.session_type,
            value: t.auto_lock_lead_minutes == null ? '' : String(t.auto_lock_lead_minutes),
          }))
        );
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

    // Per-session-type: blank = null (fall back to global); otherwise non-negative integer.
    const perTypeUpdates: { session_type: string; auto_lock_lead_minutes: number | null }[] = [];
    const perTypeInvalid: string[] = [];
    for (const row of perType) {
      const v = row.value.trim();
      if (v === '') {
        perTypeUpdates.push({ session_type: row.session_type, auto_lock_lead_minutes: null });
        continue;
      }
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0) {
        perTypeInvalid.push(row.session_type);
        continue;
      }
      perTypeUpdates.push({ session_type: row.session_type, auto_lock_lead_minutes: n });
    }
    if (perTypeInvalid.length > 0) {
      setMessage({ kind: 'err', text: `Invalid per-type values: ${perTypeInvalid.join(', ')}` });
      return;
    }

    setSaving(true);
    try {
      const [globalRes, typesRes] = await Promise.all([
        authFetch('/api/admin/booking-rules', {
          method: 'PUT',
          body: JSON.stringify(parsed),
        }),
        authFetch('/api/admin/booking-rules/session-types', {
          method: 'PUT',
          body: JSON.stringify({ updates: perTypeUpdates }),
        }),
      ]);
      const globalData = await globalRes.json();
      if (!globalRes.ok) throw new Error(globalData?.error || 'Failed to save global rules');
      if (!typesRes.ok) {
        const errData = await typesRes.json().catch(() => ({}));
        throw new Error(errData?.error || 'Failed to save per-type rules');
      }
      setForm(toForm(globalData));
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
            'Auto-lock lead time (default)',
            'minutes before class start',
            'Used when no per-workout-type override is set below. 0 = locks at class start.'
          )}

          <div className='mb-5 border-t pt-5'>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Auto-lock lead time by session type
            </label>
            <p className='text-xs text-gray-500 mb-3'>
              Override the default for specific session types (WOD, Foundations, Kids & Teens, etc.). Leave blank to use the default above.
            </p>
            {perType.length === 0 ? (
              <p className='text-sm text-gray-500'>No session types defined.</p>
            ) : (
              <div className='space-y-2'>
                {perType.map((row, idx) => (
                  <div key={row.session_type} className='flex items-center gap-2'>
                    <span className='w-56 text-sm text-gray-700'>{row.session_type}</span>
                    <input
                      type='number'
                      min={0}
                      value={row.value}
                      onChange={(e) => {
                        const next = [...perType];
                        next[idx] = { ...row, value: e.target.value };
                        setPerType(next);
                      }}
                      placeholder='uses default'
                      className='w-40 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#178da6]'
                    />
                    <span className='text-sm text-gray-500'>minutes before start</span>
                  </div>
                ))}
              </div>
            )}
          </div>

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
