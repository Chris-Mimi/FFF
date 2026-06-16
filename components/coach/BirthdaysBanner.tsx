'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface BirthdayRow {
  memberId: string;
  name: string;
  daysUntil: number;   // 0 = today, 1 = tomorrow, ...
  turning: number | null;
  dateLabel: string;   // e.g. "21 Jun"
}

// How far ahead to surface upcoming birthdays. Tunable.
const LOOK_AHEAD_DAYS = 7;
const COLLAPSED_KEY = 'birthdaysBanner:collapsed';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function BirthdaysBanner() {
  const [rows, setRows] = useState<BirthdayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(COLLAPSED_KEY) === '1';
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try { window.localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0'); } catch {}
      return next;
    });
  };

  useEffect(() => {
    fetchBirthdays();
  }, []);

  const fetchBirthdays = async () => {
    setLoading(true);
    try {
      // Active athletes + family members (kids' birthdays matter most). Narrowed by
      // a non-null DOB so the query stays small.
      const { data: members } = await supabase
        .from('members')
        .select('id, name, display_name, date_of_birth, status, account_type')
        .not('date_of_birth', 'is', null);

      const now = new Date();
      // Local midnight today — birthday math is date-only, so we avoid parsing the
      // 'YYYY-MM-DD' string through new Date() (UTC-shift bug class). We pull the
      // month/day from the string and rebuild dates with the local constructor.
      const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const DAY_MS = 24 * 60 * 60 * 1000;

      const result: BirthdayRow[] = [];
      for (const m of members ?? []) {
        const active = m.status === 'active' || m.account_type === 'family_member';
        if (!active) continue;
        const dob = m.date_of_birth as string | null;
        if (!dob) continue;
        const parts = dob.split('-').map(Number); // [year, month, day]
        if (parts.length < 3 || parts.some(isNaN)) continue;
        const [birthYear, month, day] = parts;

        let bday = new Date(now.getFullYear(), month - 1, day);
        if (bday.getTime() < today0.getTime()) {
          bday = new Date(now.getFullYear() + 1, month - 1, day);
        }
        const daysUntil = Math.round((bday.getTime() - today0.getTime()) / DAY_MS);
        if (daysUntil > LOOK_AHEAD_DAYS) continue;

        result.push({
          memberId: m.id,
          name: m.display_name || m.name || 'Unknown',
          daysUntil,
          turning: birthYear ? bday.getFullYear() - birthYear : null,
          dateLabel: `${day} ${MONTHS[month - 1]}`,
        });
      }

      // Soonest first; today's birthdays lead.
      result.sort((a, b) => a.daysUntil - b.daysUntil || a.name.localeCompare(b.name));
      setRows(result);
    } catch (err) {
      console.error('BirthdaysBanner fetch failed', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || rows.length === 0) return null;

  const isToday = (r: BirthdayRow) => r.daysUntil === 0;

  const rowClass = (r: BirthdayRow) => {
    if (isToday(r)) return 'bg-pink-50 border-pink-300';
    if (r.daysUntil <= 3) return 'bg-amber-50 border-amber-300';
    return 'bg-gray-50 border-gray-300';
  };

  const dotClass = (r: BirthdayRow) => {
    if (isToday(r)) return 'bg-pink-500';
    if (r.daysUntil <= 3) return 'bg-amber-500';
    return 'bg-gray-400';
  };

  const timeLabel = (r: BirthdayRow) => {
    if (r.daysUntil === 0) return 'today 🎂';
    if (r.daysUntil === 1) return 'tomorrow';
    return `in ${r.daysUntil} days`;
  };

  const todayCount = rows.filter(isToday).length;
  const headerLabel = todayCount > 0
    ? `Birthdays (${rows.length}, ${todayCount} today)`
    : `Birthdays (${rows.length})`;

  return (
    <div className='bg-white border-b border-gray-200 px-3 md:px-4 py-2 md:py-3'>
      <div className='max-w-7xl mx-auto'>
        <button
          onClick={toggleCollapsed}
          className='flex items-center gap-1.5 text-xs md:text-sm font-semibold text-gray-700 mb-2 hover:text-gray-900 transition'
          aria-expanded={!collapsed}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          {headerLabel}
        </button>
        {!collapsed && (
          <div className='space-y-1.5'>
            {rows.map(r => (
              <div
                key={r.memberId}
                className={`flex items-center gap-2 md:gap-3 px-2.5 py-1.5 rounded border ${rowClass(r)}`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass(r)}`} />
                <span className='font-medium text-sm text-gray-900 flex-1 truncate'>{r.name}</span>
                {r.turning != null && (
                  <span className='text-xs text-gray-500 whitespace-nowrap'>turning {r.turning}</span>
                )}
                <span className='text-xs text-gray-600 whitespace-nowrap'>{r.dateLabel}</span>
                <span className={`text-xs whitespace-nowrap ${isToday(r) ? 'text-pink-700 font-semibold' : 'text-gray-700'}`}>
                  {timeLabel(r)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
