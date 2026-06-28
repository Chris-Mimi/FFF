'use client';

import { useEffect, useRef, useState } from 'react';
import { authFetch } from '@/lib/auth-fetch';
import { supabase } from '@/lib/supabase';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Lock,
  LockOpen,
  Upload,
  X,
} from 'lucide-react';
import type {
  WellpassIdentityRow,
  WellpassImportResult,
  WellpassExemptionMode,
} from '@/types/wellpass';

const EXEMPTION_LABEL: Record<WellpassExemptionMode, string> = {
  auto: 'Auto (paying app → exempt)',
  always_exempt: 'Always exempt',
  always_enforce: 'Always enforce',
};

type SortMode = 'urgency' | 'app_payers' | 'alphabetical';

const SORT_LABEL: Record<SortMode, string> = {
  urgency: 'By current week (worst first)',
  app_payers: 'By app payers',
  alphabetical: 'A–Z',
};

const formatWeekHeader = (wk: { week_number: number; week_start: string }) =>
  `W${wk.week_number} (${wk.week_start.slice(5).replace('-', '/')})`;

export default function WellpassTab() {
  const [rows, setRows] = useState<WellpassIdentityRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<WellpassImportResult | null>(null);
  const [unblocking, setUnblocking] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [attendanceByMember, setAttendanceByMember] = useState<Map<string, number>>(new Map());
  const [showUntracked, setShowUntracked] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('urgency');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchRows = async () => {
    try {
      setError(null);
      const res = await authFetch('/api/coach/wellpass');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setRows(data.rows);
    } catch (e) {
      console.error(e);
      setError('Failed to load Wellpass data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  // All-time gym attendance per linked member — same RPC + 'all' window (36500
  // days back) the Admin "Attended" chip uses, so the numbers match exactly.
  useEffect(() => {
    if (!rows) return;
    const memberIds = Array.from(
      new Set(rows.flatMap((r) => r.linked_members.map((m) => m.member_id)))
    );
    if (memberIds.length === 0) return;
    (async () => {
      const { data, error: rpcErr } = await supabase.rpc('get_all_members_attendance', {
        p_member_ids: memberIds,
        p_days_back: 36500,
      });
      if (rpcErr) {
        console.error('Wellpass attendance fetch failed', rpcErr);
        return;
      }
      const map = new Map<string, number>();
      (data ?? []).forEach((r: { member_id: string; attendance_count: number }) => {
        map.set(r.member_id, Number(r.attendance_count));
      });
      setAttendanceByMember(map);
    })();
  }, [rows]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await authFetch('/api/coach/wellpass/import', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Import failed');
      } else {
        setImportResult(data);
        await fetchRows();
      }
    } catch (err) {
      console.error(err);
      setError('Import failed');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const patchIdentity = async (id: string, body: Record<string, unknown>) => {
    try {
      const res = await authFetch(`/api/coach/wellpass/identity/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed');
      await fetchRows();
    } catch (e) {
      console.error(e);
      setError('Update failed');
    }
  };

  const handleUnblockAll = async () => {
    const count = (rows ?? []).reduce(
      (n, r) => n + r.linked_members.filter((m) => m.wellpass_booking_restricted).length,
      0
    );
    if (count === 0) return;
    if (
      !confirm(
        `Unblock all ${count} currently blocked member${count === 1 ? '' : 's'}?\n\n` +
          `They will be able to book classes normally. ` +
          `Note: any household still below their weekly minimum will be re-blocked at the next Excel sync.`
      )
    )
      return;
    setUnblocking(true);
    setError(null);
    try {
      const res = await authFetch('/api/coach/wellpass/unblock-all', { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      await fetchRows();
    } catch (e) {
      console.error(e);
      setError('Unblock all failed');
    } finally {
      setUnblocking(false);
    }
  };

  const toggleMemberRestriction = async (memberId: string, restricted: boolean) => {
    try {
      const res = await authFetch(`/api/coach/wellpass/member/${memberId}/restriction`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restricted }),
      });
      if (!res.ok) throw new Error('Failed');
      await fetchRows();
    } catch (e) {
      console.error(e);
      setError('Failed to update restriction');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-r-transparent" />
      </div>
    );
  }

  const compareByUrgency = (a: WellpassIdentityRow, b: WellpassIdentityRow): number => {
    const aCount = a.latest_week?.checkin_count;
    const bCount = b.latest_week?.checkin_count;
    if (aCount === undefined && bCount === undefined) return a.wellpass_name.localeCompare(b.wellpass_name);
    if (aCount === undefined) return 1;
    if (bCount === undefined) return -1;
    if (aCount !== bCount) return aCount - bCount;
    if (a.min_checkins_required !== b.min_checkins_required) return b.min_checkins_required - a.min_checkins_required;
    return a.wellpass_name.localeCompare(b.wellpass_name);
  };

  const isPayerHousehold = (r: WellpassIdentityRow): boolean =>
    r.linked_members.some((m) => m.athlete_subscription_status === 'active');

  const blockedCount = (rows ?? []).reduce(
    (n, r) => n + r.linked_members.filter((m) => m.wellpass_booking_restricted).length,
    0
  );

  const tracked = (rows ?? [])
    .filter((r) => r.tracked)
    .sort((a, b) => {
      if (sortMode === 'alphabetical') return a.wellpass_name.localeCompare(b.wellpass_name);
      if (sortMode === 'app_payers') {
        const aPay = isPayerHousehold(a);
        const bPay = isPayerHousehold(b);
        if (aPay !== bPay) return aPay ? -1 : 1;
        return compareByUrgency(a, b);
      }
      return compareByUrgency(a, b);
    });
  const untracked = (rows ?? []).filter((r) => !r.tracked);

  const allWeeks = new Map<string, { week_number: number; week_start: string; week_end: string }>();
  for (const r of rows ?? []) {
    for (const w of r.weekly_history) {
      const key = `${w.year}-${String(w.week_number).padStart(2, '0')}`;
      if (!allWeeks.has(key)) {
        allWeeks.set(key, { week_number: w.week_number, week_start: w.week_start, week_end: w.week_end });
      }
    }
  }
  const sortedWeeks = Array.from(allWeeks.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 6)
    .map(([, v]) => v);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-white">Wellpass</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {tracked.length} tracked households · {untracked.length} untracked names
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Each week shows <span className="font-mono text-gray-300">sign-ins / bookings</span> ·
            sign-ins <span className="text-red-400">red</span> when below Min · bookings{' '}
            <span className="text-green-400">green</span> when ≤ sign-ins,{' '}
            <span className="text-red-400">red</span> when &gt; sign-ins ·{' '}
            <span className="font-mono text-gray-300">YTD/All-time</span> = logins as % of target
            (<span className="text-green-400">≥100</span> /{' '}
            <span className="text-amber-400">80–99</span> /{' '}
            <span className="text-red-400">&lt;80</span>) · shared households also show a
            <span className="font-mono text-gray-300"> 1.x× </span>login:attendance ratio
            (<span className="text-green-400">≥1.5</span> ok)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {blockedCount > 0 && (
            <button
              onClick={handleUnblockAll}
              disabled={unblocking}
              title="Clear the booking-restricted flag on every currently blocked member"
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-100 rounded-lg text-sm font-medium"
            >
              <LockOpen size={16} />
              {unblocking ? 'Unblocking…' : `Unblock all (${blockedCount})`}
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xlsm"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
          >
            <Upload size={16} />
            {importing ? 'Importing…' : 'Sync from Excel'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400 font-medium">Sort:</span>
        {(Object.keys(SORT_LABEL) as SortMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setSortMode(mode)}
            className={`px-3 py-1 rounded text-xs font-medium transition ${
              sortMode === mode
                ? 'bg-teal-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {SORT_LABEL[mode]}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg p-3 text-red-200 text-sm flex items-start gap-2">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto"><X size={16} /></button>
        </div>
      )}

      {importResult && (
        <div className="bg-teal-900/30 border border-teal-700 rounded-lg p-3 text-sm">
          <div className="text-teal-200 font-medium mb-1">
            Imported {importResult.weeks_imported} weeks · {importResult.rows_inserted} weekly counts saved
            {importResult.identities_created > 0 && ` · ${importResult.identities_created} new names added`}
          </div>
          {importResult.suggested_block.length > 0 ? (
            <div className="text-orange-300 mt-1">
              ⚠️ Under threshold — consider blocking manually ({importResult.suggested_block.length}): {importResult.suggested_block.map((b) => `${b.wellpass_name} (${b.member_names.join(', ')})`).join('; ')}
              <span className="block text-gray-400 text-xs mt-0.5">Sync never changes blocks — your manual blocks/unblocks stay as you set them.</span>
            </div>
          ) : (
            <div className="text-gray-400 mt-1 text-xs">
              No new under-threshold athletes to review. (Sync never changes blocks — blocking is manual.)
            </div>
          )}
          {importResult.identities_unmatched.length > 0 && (
            <div className="text-gray-400 mt-1 text-xs">
              {importResult.identities_unmatched.length} unmatched names imported as untracked (see below)
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto bg-gray-800 border border-gray-700 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 text-gray-400 text-xs uppercase">
            <tr>
              <th className="px-3 py-2 text-left">Wellpass name</th>
              <th className="px-3 py-2 text-center">Min</th>
              <th className="px-3 py-2 text-center">App?</th>
              <th
                className="px-3 py-2 text-center"
                title="Year-to-date logins as % of YTD target (min × weeks elapsed). Green ≥100, amber 80–99, red <80."
              >
                YTD %
              </th>
              <th
                className="px-3 py-2 text-center"
                title="All-time logins as % of all-time target (min × weeks tracked). Same color scale."
              >
                All-time %
              </th>
              {sortedWeeks.map((w) => (
                <th key={`${w.week_number}-${w.week_start}`} className="px-2 py-2 text-center font-mono">
                  {formatWeekHeader(w)}
                </th>
              ))}
              <th className="px-3 py-2 text-center">Status</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tracked.length === 0 && (
              <tr>
                <td colSpan={8 + sortedWeeks.length} className="px-3 py-6 text-center text-gray-400">
                  No tracked households yet. Run the seed migration and import an Excel workbook.
                </td>
              </tr>
            )}
            {tracked.map((row) => (
              <IdentityRow
                key={row.id}
                row={row}
                weekColumns={sortedWeeks}
                attendanceByMember={attendanceByMember}
                expanded={expandedId === row.id}
                onToggleExpand={() => setExpandedId(expandedId === row.id ? null : row.id)}
                onPatch={(body) => patchIdentity(row.id, body)}
                onToggleMemberBlock={toggleMemberRestriction}
              />
            ))}
          </tbody>
        </table>
      </div>

      {untracked.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg">
          <button
            onClick={() => setShowUntracked(!showUntracked)}
            className="w-full flex items-center gap-2 px-4 py-3 text-left text-gray-300 hover:bg-gray-700/50"
          >
            {showUntracked ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <span className="font-medium">Untracked names ({untracked.length})</span>
            <span className="text-xs text-gray-500 ml-auto">Imported from Excel but not marked as tracked</span>
          </button>
          {showUntracked && (
            <div className="px-4 pb-4 space-y-1">
              {untracked.map((row) => (
                <div key={row.id} className="flex items-center justify-between py-1.5 px-2 hover:bg-gray-700/30 rounded">
                  <span className="text-gray-300">{row.wellpass_name}</span>
                  <span className="text-xs text-gray-500">
                    {row.latest_week ? `latest: W${row.latest_week.week_number} = ${row.latest_week.checkin_count}` : 'no data'}
                  </span>
                  <button
                    onClick={() => patchIdentity(row.id, { tracked: true })}
                    className="text-xs px-2 py-0.5 bg-teal-700 hover:bg-teal-600 text-white rounded"
                  >
                    Track
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface IdentityRowProps {
  row: WellpassIdentityRow;
  weekColumns: { week_number: number; week_start: string; week_end: string }[];
  attendanceByMember: Map<string, number>;
  expanded: boolean;
  onToggleExpand: () => void;
  onPatch: (body: Record<string, unknown>) => Promise<void>;
  onToggleMemberBlock: (memberId: string, restricted: boolean) => Promise<void>;
}

function IdentityRow({ row, weekColumns, attendanceByMember, expanded, onToggleExpand, onPatch, onToggleMemberBlock }: IdentityRowProps) {
  const appPaid = row.linked_members.some((m) => m.athlete_subscription_status === 'active');
  const hasAnyMember = row.linked_members.length > 0;
  const isPaused = row.status === 'paused';

  // Human-readable description of WHY we'd block — drives the tooltip on the
  // status badge. Stays in sync with the rules in lib/coach/wellpassScoring.ts.
  const blockReasonLabel = (() => {
    switch (row.block_reason) {
      case 'recent_dormancy':
        return 'Last 4 weeks below minimum (recent dormancy)';
      case 'annual_pace':
        return 'Last 12 weeks under-pacing the annual target';
      case 'ratio_sustained':
        return 'Login:attendance ratio below 1.5× for 13+ weeks (under-padding the spouse-share deal)';
      default:
        return null;
    }
  })();

  // Actual enforcement state — true when any linked member is really
  // booking-restricted. Distinct from row.status === 'below_threshold', which is
  // only the scoring SUGGESTION (S377: sync suggests, Chris blocks manually).
  const anyMemberBlocked = row.linked_members.some((m) => m.wellpass_booking_restricted);

  const statusBadge = (() => {
    if (isPaused) return <span className="text-amber-400 font-medium">paused</span>;
    // Red "blocked" = actually enforced. Reserve it for real restrictions so the
    // badge matches the per-member Lock state inside the row.
    if (anyMemberBlocked)
      return (
        <span
          className="text-red-400 font-medium cursor-help"
          title={blockReasonLabel ?? 'Booking-restricted'}
        >
          blocked
        </span>
      );
    // Amber "review" = the rules flag this household but you haven't blocked them
    // yet — a to-do signal, not an enforcement state.
    if (row.status === 'below_threshold')
      return (
        <span
          className="text-amber-400 font-medium cursor-help"
          title={blockReasonLabel ? `${blockReasonLabel} — not yet blocked` : 'Flagged — not yet blocked'}
        >
          review
        </span>
      );
    if (row.status === 'ok') return <span className="text-green-400">ok</span>;
    if (row.status === 'no_data') return <span className="text-gray-500">no data</span>;
    return <span className="text-gray-500">—</span>;
  })();

  const checkinByWeek = new Map<string, number>();
  for (const w of row.weekly_history) {
    checkinByWeek.set(`${w.year}-${String(w.week_number).padStart(2, '0')}`, w.checkin_count);
  }
  const bookingByWeek = new Map<string, number>();
  for (const b of row.weekly_bookings) {
    bookingByWeek.set(`${b.year}-${String(b.week_number).padStart(2, '0')}`, b.booking_count);
  }

  const pctClass = (pct: number): string => {
    if (pct >= 100) return 'text-green-400 font-bold';
    if (pct >= 80) return 'text-amber-400 font-medium';
    return 'text-red-400 font-bold';
  };

  // Household lifetime Wellpass logins = sum of every tracked week's check-ins.
  const totalLogins = row.weekly_history.reduce((acc, w) => acc + w.checkin_count, 0);

  return (
    <>
      <tr className={`border-t border-gray-700 ${isPaused ? 'opacity-60' : ''} ${anyMemberBlocked ? 'bg-red-900/10' : row.status === 'below_threshold' ? 'bg-amber-900/10' : ''}`}>
        <td className="px-3 py-2">
          <button onClick={onToggleExpand} className="flex items-center gap-1 text-left text-white hover:text-teal-400">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span className="font-medium">{row.wellpass_name}</span>
            {row.is_shared && row.ytd_ratio !== null && (
              <span
                className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  row.ytd_ratio >= 1.5
                    ? 'bg-green-900/40 text-green-300'
                    : row.ratio_flag && !isPaused
                      ? 'bg-amber-900/40 text-amber-300'
                      : 'bg-gray-700/50 text-gray-400'
                }`}
                title={`YTD login:attendance ratio = ${row.ytd_logins} / ${row.ytd_attendances}. Shared households should be ≥ 1.5× — covers rest-day logins for the partner.`}
              >
                {row.ytd_ratio.toFixed(2)}×
              </span>
            )}
          </button>
          {(() => {
            // Hide linked members whose name equals the WP identity name —
            // those rows are just the self-link and add no info. Only show
            // the "and also" people (spouse, kids, etc.) under the WP name.
            const otherNames = row.linked_members
              .map((m) => m.name)
              .filter((n) => n.toLowerCase() !== row.wellpass_name.toLowerCase());
            if (otherNames.length === 0) return null;
            return (
              <div className="text-xs text-gray-400 mt-0.5 pl-5">
                + {otherNames.join(', ')}
              </div>
            );
          })()}
        </td>
        <td className="px-3 py-2 text-center">
          <input
            type="number"
            min={1}
            value={row.min_checkins_required}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (Number.isFinite(v) && v >= 1) onPatch({ min_checkins_required: v });
            }}
            className="w-12 bg-gray-700 border border-gray-600 rounded px-2 py-0.5 text-center text-white text-sm"
          />
        </td>
        <td className="px-3 py-2 text-center">
          {!hasAnyMember && <span className="text-xs text-gray-600">—</span>}
          {hasAnyMember && appPaid && <span className="text-xs text-teal-400 font-medium" title="At least one linked member is paying for the app">💎 paying</span>}
          {hasAnyMember && !appPaid && <span className="text-xs text-gray-500">free</span>}
        </td>
        <td
          className={`px-3 py-2 text-center font-mono ${
            isPaused ? 'text-gray-600' : row.ytd_target === 0 ? 'text-gray-500' : pctClass(row.ytd_pct)
          }`}
          title={
            row.ytd_target === 0
              ? 'No YTD target yet (week 1 of the year)'
              : `${row.ytd_logins} YTD logins ÷ ${row.ytd_target} target (min × weeks elapsed)`
          }
        >
          {isPaused ? '—' : row.ytd_target === 0 ? '—' : `${row.ytd_pct}%`}
        </td>
        <td
          className={`px-3 py-2 text-center font-mono ${
            isPaused ? 'text-gray-600' : row.alltime_target === 0 ? 'text-gray-500' : pctClass(row.alltime_pct)
          }`}
          title={
            row.alltime_target === 0
              ? 'No tracked weeks yet'
              : `${row.alltime_logins} lifetime logins ÷ ${row.alltime_target} target`
          }
        >
          {isPaused ? '—' : row.alltime_target === 0 ? '—' : `${row.alltime_pct}%`}
        </td>
        {weekColumns.map((w) => {
          const key = `${new Date(w.week_start).getFullYear()}-${String(w.week_number).padStart(2, '0')}`;
          const count = checkinByWeek.get(key);
          const bookings = bookingByWeek.get(key) ?? 0;
          const isLow = count !== undefined && count < row.min_checkins_required;
          const bookingsOver = count !== undefined && bookings > count;
          const bookingsClass =
            count === undefined
              ? 'text-gray-500'
              : bookingsOver
              ? 'text-red-400 font-bold'
              : 'text-green-400';
          return (
            <td key={key} className="px-2 py-2 text-center font-mono whitespace-nowrap">
              <span
                className={
                  count === undefined
                    ? 'text-gray-600'
                    : isLow
                    ? 'text-red-400 font-bold'
                    : 'text-gray-200'
                }
              >
                {count === undefined ? '—' : count}
              </span>
              <span className="text-gray-600 mx-1">/</span>
              <span className={bookingsClass}>{bookings}</span>
            </td>
          );
        })}
        <td className="px-3 py-2 text-center text-xs">
          {statusBadge}
          {row.is_exempt && row.status === 'below_threshold' && (
            <div className="text-teal-400 text-[10px] mt-0.5">(exempt)</div>
          )}
        </td>
        <td className="px-3 py-2 text-right">
          <select
            value={row.exemption_mode}
            onChange={(e) => onPatch({ exemption_mode: e.target.value })}
            className="text-xs bg-gray-700 border border-gray-600 rounded px-1.5 py-0.5 text-white"
          >
            {(Object.keys(EXEMPTION_LABEL) as WellpassExemptionMode[]).map((m) => (
              <option key={m} value={m}>{EXEMPTION_LABEL[m]}</option>
            ))}
          </select>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-gray-800/50">
          <td colSpan={8 + weekColumns.length} className="px-4 py-3 border-t border-gray-700">
            <div className="grid md:grid-cols-2 gap-4 text-xs">
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-gray-400 font-medium">Linked members</span>
                  <span className="text-xs text-gray-400">
                    <span className="text-teal-300 font-semibold font-mono">{totalLogins}</span> Wellpass logins to date
                  </span>
                </div>
                {row.linked_members.length === 0 ? (
                  <div className="text-gray-500 italic">No linked members. Block enforcement is a no-op until linked.</div>
                ) : (
                  <ul className="space-y-1">
                    {row.linked_members.map((m) => (
                      <li key={m.member_id} className="flex items-center gap-2">
                        <span className="text-gray-200">{m.name}</span>
                        <span className="text-gray-500">·</span>
                        <span className="text-gray-300 font-mono" title="All-time gym attendances (same as Admin Attended chip)">
                          {attendanceByMember.get(m.member_id) ?? 0} attended
                        </span>
                        {m.athlete_subscription_status === 'active' && (
                          <>
                            <span className="text-gray-500">·</span>
                            <span className="text-teal-400">active</span>
                          </>
                        )}
                        {m.wellpass_booking_restricted && (
                          <span className="ml-auto inline-flex items-center gap-1 text-red-400">
                            <Lock size={12} /> blocked
                            <button
                              onClick={() => onToggleMemberBlock(m.member_id, false)}
                              className="ml-1 px-1.5 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-200"
                            >
                              Unblock
                            </button>
                          </span>
                        )}
                        {!m.wellpass_booking_restricted && (
                          <button
                            onClick={() => onToggleMemberBlock(m.member_id, true)}
                            className="ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-200"
                          >
                            <LockOpen size={12} /> Block
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <div className="text-gray-400 font-medium mb-1">Notes</div>
                <textarea
                  defaultValue={row.notes ?? ''}
                  onBlur={(e) => {
                    if (e.target.value !== (row.notes ?? '')) {
                      onPatch({ notes: e.target.value || null });
                    }
                  }}
                  rows={2}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs"
                  placeholder="e.g. wife also attends, needs 6 check-ins"
                />
                <div className="mt-3 pt-2 border-t border-gray-700 space-y-2">
                  {isPaused ? (
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-amber-300 text-xs">
                        <span className="font-medium">Paused</span>
                        {row.pause_reason && <span className="text-gray-400"> · {row.pause_reason}</span>}
                        {row.paused_at && (
                          <span className="text-gray-500"> · since {row.paused_at.slice(0, 10)}</span>
                        )}
                      </div>
                      <button
                        onClick={() => onPatch({ paused: false })}
                        className="text-xs px-2 py-1 bg-teal-700 hover:bg-teal-600 text-white rounded"
                      >
                        Resume tracking
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        const reason = prompt(
                          `Pause Wellpass tracking for ${row.wellpass_name}?\n\nReason (optional, e.g. "injured shoulder", "summer vacation"):`,
                          ''
                        );
                        if (reason === null) return; // cancelled
                        onPatch({ paused: true, pause_reason: reason.trim() || null });
                      }}
                      className="text-xs px-2 py-1 bg-amber-700/40 hover:bg-amber-700/60 text-amber-200 rounded"
                    >
                      Pause tracking (injury / away)
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm(`Stop tracking ${row.wellpass_name}? Their weekly data stays, but the household won't be enforced or shown in the main list.`)) {
                        onPatch({ tracked: false });
                      }
                    }}
                    className="block text-xs text-gray-500 hover:text-red-400"
                  >
                    Untrack this household
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
