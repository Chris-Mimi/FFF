// Public weekly timetable for the gym website (S425) — embedded in Squarespace
// (www.the-forge-functional-fitness.de/training-kurs-buchen) via an iframe.
// No login. Shows only day, time and session type — never names, counts or
// workouts. A badge appears only when it is TRUE: ≥70% booked → "Nur noch wenige
// Plätze", full → "Ausgebucht – Warteliste". Private events are never shown.
// Side-by-side classes at offset times (17:15 + 17:20) show as one entry.
// Week = the current Berlin week; switches to next week at the Sunday release
// (Admin → Booking Rules), as long as next week has published sessions.
import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getBookingRules, getMaxVisibleSessionDate, berlinWallClock, sessionStartInstant } from '@/lib/bookingRules';

export const revalidate = 300; // re-read the schedule at most every 5 minutes

export const metadata: Metadata = {
  title: 'Stundenplan – The Forge',
  robots: { index: false },
};

type Badge = 'few' | 'full' | null;
interface PublicSession { date: string; time: string; type: string; badge: Badge }

const FEW_SPOTS_RATIO = 0.7;
const DAY_NAMES = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

// YYYY-MM-DD of a UTC-midnight Date (safe: the Date is built in UTC, not local time).
const ymd = (d: Date) => d.toISOString().slice(0, 10);

async function loadSessions(from: string, to: string): Promise<PublicSession[]> {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await db
    .from('weekly_sessions')
    .select('date, time, capacity, workout_type, trial_names, bookings(status, is_og, is_trial)')
    .eq('status', 'published')
    .neq('is_private', true)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true })
    .order('time', { ascending: true });
  if (error) {
    console.error('stundenplan: weekly_sessions error', error.message);
    return [];
  }
  const rows = (data || []).map(s => {
    // Same capacity count as the booking page: confirmed, excluding OG and trial-linked
    // bookings, plus trial_names slots.
    const bookings = (s.bookings as { status: string; is_og: boolean | null; is_trial: boolean | null }[]) || [];
    const used = bookings.filter(b => b.status === 'confirmed' && !b.is_og && !b.is_trial).length
      + (Array.isArray(s.trial_names) ? s.trial_names.length : 0);
    const time = String(s.time).slice(0, 5);
    return { date: s.date, time, minutes: toMinutes(time), type: s.workout_type || 'Training', capacity: s.capacity as number, used };
  });

  // Side-by-side classes (Chris runs a second workout at an offset time, e.g. 17:20
  // next to 17:15, for athletes who haven't done it yet) are one class to an outsider.
  // Group sessions on the same day starting ≤ PARALLEL_MINUTES apart; show the one on
  // a quarter hour (else the earliest); the badge uses the group's combined numbers.
  const out: PublicSession[] = [];
  for (let i = 0; i < rows.length; ) {
    let j = i + 1;
    while (j < rows.length && rows[j].date === rows[i].date && rows[j].minutes - rows[j - 1].minutes <= PARALLEL_MINUTES) j++;
    const group = rows.slice(i, j);
    const shown = group.find(r => r.minutes % 15 === 0) ?? group[0];
    const capacity = group.some(r => r.capacity === 0) ? 0 : group.reduce((n, r) => n + r.capacity, 0);
    const used = group.reduce((n, r) => n + r.used, 0);
    let badge: Badge = null;
    if (capacity > 0) {
      if (used >= capacity) badge = 'full';
      else if (used / capacity >= FEW_SPOTS_RATIO) badge = 'few';
    }
    out.push({ date: shown.date, time: shown.time, type: shown.type, badge });
    i = j;
  }
  return out;
}

const PARALLEL_MINUTES = 10;
const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export default async function StundenplanPage() {
  const now = new Date();
  const b = berlinWallClock(now);
  const isoDay = b.dow === 0 ? 6 : b.dow - 1;
  const monday = new Date(Date.UTC(b.year, b.month - 1, b.day - isoDay));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  // After the Sunday release the booking page shows next week — follow it.
  const rules = await getBookingRules();
  const released = getMaxVisibleSessionDate(rules, now) > new Date(Date.UTC(b.year, b.month - 1, b.day - isoDay + 6, 23, 59));
  let weekStart = monday;
  let sessions: PublicSession[] = [];
  if (released) {
    const nextMon = new Date(monday); nextMon.setUTCDate(monday.getUTCDate() + 7);
    const nextSun = new Date(sunday); nextSun.setUTCDate(sunday.getUTCDate() + 7);
    sessions = await loadSessions(ymd(nextMon), ymd(nextSun));
    if (sessions.length) weekStart = nextMon;
  }
  if (weekStart === monday) sessions = await loadSessions(ymd(monday), ymd(sunday));

  const days = DAY_NAMES.map((name, i) => {
    const d = new Date(weekStart); d.setUTCDate(weekStart.getUTCDate() + i);
    const date = ymd(d);
    return { name, date, label: `${d.getUTCDate()}.${d.getUTCMonth() + 1}.`, sessions: sessions.filter(s => s.date === date) };
  });
  const weekEnd = days[6];

  return (
    <main className='min-h-screen bg-white text-gray-900 p-3 sm:p-4'>
      <h1 className='text-base sm:text-lg font-bold mb-3'>
        Stundenplan {days[0].label} – {weekEnd.label}
      </h1>
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2'>
        {days.map(day => (
          <section key={day.date} className='rounded-lg border border-gray-200 bg-gray-50 p-2'>
            <h2 className='text-sm font-semibold mb-1.5'>
              {day.name} <span className='font-normal text-gray-500'>{day.label}</span>
            </h2>
            {day.sessions.length === 0 ? (
              <p className='text-xs text-gray-400'>Kein Kurs</p>
            ) : (
              <ul className='space-y-1.5'>
                {day.sessions.map(s => {
                  const past = sessionStartInstant(s.date, s.time) < now;
                  return (
                    <li key={`${s.date}-${s.time}-${s.type}`}
                      className={`rounded-md bg-white border border-gray-200 px-2 py-1.5 ${past ? 'opacity-50' : ''}`}>
                      <div className='flex items-baseline gap-2'>
                        <span className='text-sm font-bold tabular-nums text-[#178da6]'>{s.time}</span>
                        <span className='text-sm'>{s.type}</span>
                      </div>
                      {!past && s.badge === 'few' && (
                        <span className='inline-block mt-1 text-[11px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-800'>
                          Nur noch wenige Plätze
                        </span>
                      )}
                      {!past && s.badge === 'full' && (
                        <span className='inline-block mt-1 text-[11px] font-medium px-1.5 py-0.5 rounded bg-red-100 text-red-800'>
                          Ausgebucht – Warteliste
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
