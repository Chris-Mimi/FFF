'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { authFetch } from '@/lib/auth-fetch';
import { CONTRACT_TYPE_LABELS, type GymContractType } from '@/types/membership';

interface DueRow {
  id: string;
  memberId: string;
  name: string;
  contractType: GymContractType;
  endDate: string;
  daysLeft: number;
}

const COLLAPSED_KEY = 'membershipsDueBanner:collapsed';

interface MembershipApiRow {
  id: string;
  member_id: string;
  contract_type: GymContractType;
  end_date: string;
  status: string;
  members: { id: string; name: string | null; display_name: string | null } | null;
}

export default function MembershipsDueBanner() {
  const [rows, setRows] = useState<DueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(COLLAPSED_KEY) === '1';
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch('/api/coach/memberships?status=active');
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'fetch failed');

        const now = Date.now();
        const horizonMs = now + 30 * 24 * 60 * 60 * 1000;

        const due: DueRow[] = ((json.memberships || []) as MembershipApiRow[])
          .filter((m) => new Date(m.end_date).getTime() <= horizonMs)
          .map((m) => {
            const endMs = new Date(m.end_date).getTime();
            return {
              id: m.id,
              memberId: m.member_id,
              name: m.members?.display_name || m.members?.name || '?',
              contractType: m.contract_type,
              endDate: m.end_date,
              daysLeft: Math.max(0, Math.ceil((endMs - now) / (1000 * 60 * 60 * 24))),
            };
          })
          .sort((a, b) => a.daysLeft - b.daysLeft);

        setRows(due);
      } catch (err) {
        console.error('MembershipsDueBanner fetch failed', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try { window.localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0'); } catch {}
      return next;
    });
  };

  if (loading || rows.length === 0) return null;

  const rowClass = (daysLeft: number) =>
    daysLeft <= 14
      ? 'bg-red-50 border-red-300'
      : 'bg-amber-50 border-amber-300';

  const dotClass = (daysLeft: number) =>
    daysLeft <= 14 ? 'bg-red-500' : 'bg-amber-500';

  return (
    <div className='bg-white border-b border-gray-200 px-3 md:px-4 py-2 md:py-3'>
      <div className='max-w-7xl mx-auto'>
        <button
          onClick={toggleCollapsed}
          className='flex items-center gap-1.5 text-xs md:text-sm font-semibold text-gray-700 mb-2 hover:text-gray-900 transition'
          aria-expanded={!collapsed}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          Memberships Due ({rows.length})
        </button>
        {!collapsed && (
          <div className='space-y-1.5'>
            {rows.map((r) => (
              <div
                key={r.id}
                className={`flex items-center gap-2 md:gap-3 px-2.5 py-1.5 rounded border ${rowClass(r.daysLeft)}`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass(r.daysLeft)}`} />
                <span className='font-medium text-sm text-gray-900 flex-1 truncate'>{r.name}</span>
                <span className='text-xs text-gray-700 whitespace-nowrap hidden sm:inline'>
                  {CONTRACT_TYPE_LABELS[r.contractType]}
                </span>
                <span className='text-xs text-gray-700 whitespace-nowrap'>
                  {r.daysLeft === 0 ? 'today' : r.daysLeft === 1 ? '1 day left' : `${r.daysLeft} days left`}
                </span>
                <Link
                  href='/coach/admin'
                  className='px-2 py-1 text-xs font-medium bg-white hover:bg-gray-50 border border-gray-300 rounded transition flex-shrink-0'
                >
                  View
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
