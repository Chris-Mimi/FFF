'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { UserPlus, ArrowLeft, BarChart2, Bell, KeyRound, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { NotificationPrompt } from '@/components/ui/NotificationPrompt';


interface IncidentStat {
  memberId: string;
  name: string;
  coachCancelled: number;
  lateCancel: number;
  noShow: number;
  total: number;
}

interface AttendedStat {
  memberId: string;
  name: string;
  count: number;
}

type AttendedFilter = '30d' | '90d' | '6m' | '12m' | 'all';
type ActiveTab = 'attended' | 'incidents';

const FILTER_OPTIONS: { label: string; value: AttendedFilter }[] = [
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
  { label: '6m', value: '6m' },
  { label: '12m', value: '12m' },
  { label: 'All-time', value: 'all' },
];

function getFilterDate(filter: AttendedFilter): string | null {
  if (filter === 'all') return null;
  const now = new Date();
  if (filter === '30d') now.setDate(now.getDate() - 30);
  else if (filter === '90d') now.setDate(now.getDate() - 90);
  else if (filter === '6m') now.setMonth(now.getMonth() - 6);
  else if (filter === '12m') now.setFullYear(now.getFullYear() - 1);
  return now.toISOString().split('T')[0];
}

// Days-back values for the attendance RPC (matches the same lookback windows as getFilterDate).
function getFilterDaysBack(filter: AttendedFilter): number {
  if (filter === '30d') return 30;
  if (filter === '90d') return 90;
  if (filter === '6m') return 183;
  if (filter === '12m') return 365;
  return 36500; // 'all'
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// First and last calendar day of a given (year, monthIndex 0-11) as ISO date strings.
function getMonthRange(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0); // day 0 of next month = last day of this month
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { start: fmt(start), end: fmt(end) };
}

export default function AdminToolsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('attended');

  // Incidents tab
  const [allIncidents, setAllIncidents] = useState<{ memberId: string; name: string; status: string; date: string }[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(false);
  const [incidentFilter, setIncidentFilter] = useState<AttendedFilter>('all');
  const [incidentSort, setIncidentSort] = useState<{ col: keyof IncidentStat; dir: 'asc' | 'desc' }>({ col: 'total', dir: 'desc' });

  // Attended tab — derived from the same RPC the Workouts page uses (bookings + linked scores + whiteboard text mentions, deduped per session)
  const [attendedRanking, setAttendedRanking] = useState<AttendedStat[]>([]);
  const [attendedLoading, setAttendedLoading] = useState(false);
  const [attendedFilter, setAttendedFilter] = useState<AttendedFilter>('all');
  // Calendar-month override: when set, replaces the rolling-window pill choice
  const [selectedMonth, setSelectedMonth] = useState<{ year: number; month: number } | null>(null);
  const [monthYear, setMonthYear] = useState<number>(new Date().getFullYear());
  // Name search — filters the displayed ranking (does not refetch)
  const [nameQuery, setNameQuery] = useState<string>('');

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser();
      if (!user) { router.push('/login'); return; }
      if (user.user_metadata?.role !== 'coach') { router.push('/login'); return; }
      setLoading(false);
      fetchIncidentStats();
    };
    checkAuth();
  }, [router]);

  // Refetch attended stats whenever the filter or selected month changes
  useEffect(() => {
    if (loading) return;
    fetchAttendedStats(attendedFilter, selectedMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, attendedFilter, selectedMonth]);

  const fetchIncidentStats = async () => {
    setIncidentsLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('member_id, status, members(name), weekly_sessions!inner(date)')
        .in('status', ['coach_cancelled', 'late_cancel', 'no_show']);
      if (error) throw error;

      const rows = (data || []).map((b) => ({
        memberId: b.member_id,
        name: (b.members as unknown as { name: string } | null)?.name || 'Unknown',
        status: b.status,
        date: (b.weekly_sessions as unknown as { date: string } | null)?.date || '',
      }));
      setAllIncidents(rows);
    } catch (err) {
      console.error('Error fetching incident stats:', err);
    } finally {
      setIncidentsLoading(false);
    }
  };

  const fetchAttendedStats = async (filter: AttendedFilter, month: { year: number; month: number } | null) => {
    setAttendedLoading(true);
    try {
      // Pull every member id (any status — we want ex-members in the list too)
      const { data: members, error: membersError } = await supabase
        .from('members')
        .select('id, name, display_name');
      if (membersError) throw membersError;

      const memberIds = (members || []).map(m => m.id);
      const nameById = new Map<string, string>(
        (members || []).map(m => [m.id, m.name || m.display_name || 'Unknown'])
      );

      // Calendar-month override → pass start/end. Otherwise use rolling window via days_back.
      const rpcArgs: Record<string, unknown> = { p_member_ids: memberIds };
      if (month) {
        const range = getMonthRange(month.year, month.month);
        rpcArgs.p_start_date = range.start;
        rpcArgs.p_end_date = range.end;
      } else {
        rpcArgs.p_days_back = getFilterDaysBack(filter);
      }

      // Use the same RPC the Workouts page uses: bookings + linked scores + whiteboard text mentions, deduped per session
      const { data: attendance, error: rpcError } = await supabase.rpc(
        'get_all_members_attendance',
        rpcArgs
      );
      if (rpcError) throw rpcError;

      const ranking: AttendedStat[] = (attendance || [])
        .map((row: { member_id: string; attendance_count: number }) => ({
          memberId: row.member_id,
          name: nameById.get(row.member_id) || 'Unknown',
          count: Number(row.attendance_count),
        }))
        .filter((s: AttendedStat) => s.count > 0)
        .sort((a: AttendedStat, b: AttendedStat) => b.count - a.count);

      setAttendedRanking(ranking);
    } catch (err) {
      console.error('Error fetching attended stats:', err);
    } finally {
      setAttendedLoading(false);
    }
  };

  // Derive incident stats from raw data + current filter
  const incidentStats: IncidentStat[] = (() => {
    const cutoff = getFilterDate(incidentFilter);
    const filtered = cutoff ? allIncidents.filter((r) => r.date >= cutoff) : allIncidents;
    const map = new Map<string, IncidentStat>();
    for (const row of filtered) {
      if (!map.has(row.memberId)) {
        map.set(row.memberId, { memberId: row.memberId, name: row.name, coachCancelled: 0, lateCancel: 0, noShow: 0, total: 0 });
      }
      const stat = map.get(row.memberId)!;
      if (row.status === 'coach_cancelled') stat.coachCancelled++;
      if (row.status === 'late_cancel') stat.lateCancel++;
      if (row.status === 'no_show') stat.noShow++;
      stat.total = stat.coachCancelled + stat.lateCancel + stat.noShow;
    }
    const arr = Array.from(map.values());
    const { col, dir } = incidentSort;
    arr.sort((a, b) => {
      const av = a[col];
      const bv = b[col];
      if (typeof av === 'string') return dir === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return dir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return arr;
  })();

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-gray-600'>Loading...</div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-4xl mx-auto p-6'>
        {/* Header */}
        <div className='mb-6'>
          <Link href='/coach' className='inline-flex items-center gap-2 text-[#178da6] hover:text-[#14758c] mb-4'>
            <ArrowLeft size={20} />
            Back to Dashboard
          </Link>
          <h1 className='text-3xl font-bold text-gray-900'>Admin Tools</h1>
          <p className='text-gray-600 mt-2'>Manage coach accounts and system settings</p>
        </div>

        {/* Admin Actions */}
        <div className='grid gap-4 mb-8'>
          <Link
            href='/signup'
            className='bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition border-2 border-transparent hover:border-[#178da6]'
          >
            <div className='flex items-start gap-4'>
              <div className='bg-[#178da6] text-white p-3 rounded-lg'>
                <UserPlus size={24} />
              </div>
              <div>
                <h2 className='text-xl font-semibold text-gray-900 mb-2'>Create New Coach Account</h2>
                <p className='text-gray-600'>
                  Register a new coach to give them access to the coaching dashboard and all admin features.
                </p>
              </div>
            </div>
          </Link>

          <Link
            href='/coach/admin/booking-rules'
            className='bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition border-2 border-transparent hover:border-[#178da6]'
          >
            <div className='flex items-start gap-4'>
              <div className='bg-[#178da6] text-white p-3 rounded-lg'>
                <Settings size={24} />
              </div>
              <div>
                <h2 className='text-xl font-semibold text-gray-900 mb-2'>Booking Rules</h2>
                <p className='text-gray-600'>
                  Configure 10-card refund windows, auto-lock lead time, per-day/week booking caps, and advance-booking horizon.
                </p>
              </div>
            </div>
          </Link>

          <Link
            href='/coach/profile'
            className='bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition border-2 border-transparent hover:border-[#178da6]'
          >
            <div className='flex items-start gap-4'>
              <div className='bg-[#178da6] text-white p-3 rounded-lg'>
                <KeyRound size={24} />
              </div>
              <div>
                <h2 className='text-xl font-semibold text-gray-900 mb-2'>Coach Profile</h2>
                <p className='text-gray-600'>
                  Change your password without using the email reset flow.
                </p>
              </div>
            </div>
          </Link>

          {/* Push Notifications */}
          <div className='bg-white rounded-lg shadow-md p-6 border-2 border-transparent'>
            <div className='flex items-start gap-4'>
              <div className='bg-[#178da6] text-white p-3 rounded-lg'>
                <Bell size={24} />
              </div>
              <div>
                <h2 className='text-xl font-semibold text-gray-900 mb-2'>Push Notifications</h2>
                <p className='text-gray-600 mb-3'>
                  Enable push notifications on this device to receive score queries and other alerts.
                </p>
                <NotificationPrompt hidePreferences />
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Reports */}
        <div className='bg-white rounded-lg shadow-md p-6'>
          {/* Panel header */}
          <div className='flex items-center gap-3 mb-4'>
            <div className='bg-[#178da6]/10 text-[#178da6] p-2 rounded-lg'>
              <BarChart2 size={20} />
            </div>
            <h2 className='text-xl font-semibold text-gray-900'>Attendance Reports</h2>
          </div>

          {/* Tabs */}
          <div className='flex gap-2 mb-5'>
            <button
              onClick={() => setActiveTab('attended')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                activeTab === 'attended'
                  ? 'bg-[#178da6] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Attended
            </button>
            <button
              onClick={() => setActiveTab('incidents')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                activeTab === 'incidents'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Incidents
            </button>
          </div>

          {/* Attended tab */}
          {activeTab === 'attended' && (
            <>
              {/* Rolling-window filter pills (mutually exclusive with calendar-month grid below) */}
              <div className='flex gap-2 mb-3'>
                {FILTER_OPTIONS.map((opt) => {
                  const isActive = !selectedMonth && attendedFilter === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => { setSelectedMonth(null); setAttendedFilter(opt.value); }}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                        isActive
                          ? 'bg-[#178da6] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* Calendar-month grid (clicking a month overrides the rolling pill above; click again to clear) */}
              <div className='mb-4 border border-gray-200 rounded-lg p-3 bg-gray-50'>
                <div className='flex items-center justify-between mb-2'>
                  <button
                    onClick={() => setMonthYear(y => y - 1)}
                    className='p-1 rounded hover:bg-gray-200 text-gray-600'
                    title='Previous year'
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className='text-sm font-semibold text-gray-700'>{monthYear}</span>
                  <button
                    onClick={() => setMonthYear(y => y + 1)}
                    className='p-1 rounded hover:bg-gray-200 text-gray-600'
                    title='Next year'
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
                <div className='grid grid-cols-6 sm:grid-cols-12 gap-1'>
                  {MONTH_LABELS.map((label, idx) => {
                    const isSelected = selectedMonth?.year === monthYear && selectedMonth?.month === idx;
                    return (
                      <button
                        key={label}
                        onClick={() => setSelectedMonth(isSelected ? null : { year: monthYear, month: idx })}
                        className={`px-2 py-1 rounded text-xs font-medium transition ${
                          isSelected
                            ? 'bg-[#178da6] text-white'
                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                {selectedMonth && (
                  <p className='text-xs text-gray-500 mt-2'>
                    Showing {MONTH_LABELS[selectedMonth.month]} {selectedMonth.year}.{' '}
                    <button onClick={() => setSelectedMonth(null)} className='text-[#178da6] hover:underline'>Clear</button>
                  </p>
                )}
              </div>

              {/* Name search — narrows displayed list, persists across pill/month changes */}
              <div className='mb-3 flex items-center gap-2'>
                <input
                  type='text'
                  value={nameQuery}
                  onChange={(e) => setNameQuery(e.target.value)}
                  placeholder='Search by name…'
                  className='flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#178da6]/40'
                />
                {nameQuery && (
                  <button
                    onClick={() => setNameQuery('')}
                    className='px-2 py-1 text-xs text-gray-600 hover:text-gray-800'
                    title='Clear search'
                  >
                    Clear
                  </button>
                )}
              </div>

              {(() => {
                const q = nameQuery.trim().toLowerCase();
                const filtered = q ? attendedRanking.filter(s => s.name.toLowerCase().includes(q)) : attendedRanking;

                if (attendedLoading) return <p className='text-gray-500 text-sm'>Loading...</p>;
                if (attendedRanking.length === 0) return <p className='text-gray-500 text-sm'>No sessions recorded yet.</p>;
                if (filtered.length === 0) return <p className='text-gray-500 text-sm'>No matches for &ldquo;{nameQuery}&rdquo;.</p>;

                return (
                  <div className='overflow-x-auto'>
                    <table className='w-full text-sm'>
                      <thead>
                        <tr className='border-b border-gray-200'>
                          <th className='text-left py-2 pr-4 font-semibold text-gray-400 w-8'>#</th>
                          <th className='text-left py-2 pr-4 font-semibold text-gray-700'>Member</th>
                          <th className='text-right py-2 pl-3 font-semibold text-[#178da6]'>Sessions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((stat) => {
                          // Preserve overall ranking (1-based) even when filtered
                          const overallRank = attendedRanking.findIndex(r => r.memberId === stat.memberId) + 1;
                          return (
                            <tr key={stat.memberId} className='border-b border-gray-100 last:border-0'>
                              <td className='py-2 pr-4 text-gray-400 font-medium'>{overallRank}</td>
                              <td className='py-2 pr-4 font-medium text-gray-800'>{stat.name}</td>
                              <td className='text-right py-2 pl-3'>
                                <span className='inline-block bg-[#178da6]/10 text-[#178da6] font-semibold px-2 py-0.5 rounded text-xs'>
                                  {stat.count}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </>
          )}

          {/* Incidents tab */}
          {activeTab === 'incidents' && (
            <>
              {/* Filter pills */}
              <div className='flex gap-2 mb-4'>
                {FILTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setIncidentFilter(opt.value)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                      incidentFilter === opt.value
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {incidentsLoading ? (
                <p className='text-gray-500 text-sm'>Loading...</p>
              ) : incidentStats.length === 0 ? (
                <p className='text-gray-500 text-sm'>No incidents recorded yet.</p>
              ) : (
                <div className='overflow-x-auto'>
                  <table className='w-full text-sm'>
                    <thead>
                      <tr className='border-b border-gray-200'>
                        {([
                          { col: 'name' as keyof IncidentStat, label: 'Member', align: 'left', color: 'text-gray-700' },
                          { col: 'coachCancelled' as keyof IncidentStat, label: 'Removed by Coach', align: 'center', color: 'text-gray-500' },
                          { col: 'lateCancel' as keyof IncidentStat, label: 'Late Cancel', align: 'center', color: 'text-purple-700' },
                          { col: 'noShow' as keyof IncidentStat, label: 'No-Show', align: 'center', color: 'text-orange-700' },
                          { col: 'total' as keyof IncidentStat, label: 'Total', align: 'center', color: 'text-gray-900' },
                        ] as const).map(({ col, label, align, color }) => (
                          <th
                            key={col}
                            onClick={() => setIncidentSort((prev) => ({ col, dir: prev.col === col && prev.dir === 'desc' ? 'asc' : 'desc' }))}
                            className={`py-2 px-3 font-semibold ${color} cursor-pointer select-none hover:opacity-70 transition text-${align}`}
                          >
                            <span className='inline-flex items-center gap-1 justify-center'>
                              {label}
                              {incidentSort.col === col ? (incidentSort.dir === 'desc' ? ' ↓' : ' ↑') : <span className='text-gray-300'> ↕</span>}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {incidentStats.map((stat) => (
                        <tr key={stat.memberId} className='border-b border-gray-100 last:border-0'>
                          <td className='py-2 pr-4 font-medium text-gray-800'>{stat.name}</td>
                          <td className='text-center py-2 px-3 text-gray-500'>
                            {stat.coachCancelled > 0 ? stat.coachCancelled : '—'}
                          </td>
                          <td className='text-center py-2 px-3'>
                            {stat.lateCancel > 0 ? (
                              <span className='inline-block bg-purple-100 text-purple-800 font-medium px-2 py-0.5 rounded text-xs'>
                                {stat.lateCancel}
                              </span>
                            ) : '—'}
                          </td>
                          <td className='text-center py-2 px-3'>
                            {stat.noShow > 0 ? (
                              <span className='inline-block bg-orange-100 text-orange-800 font-medium px-2 py-0.5 rounded text-xs'>
                                {stat.noShow}
                              </span>
                            ) : '—'}
                          </td>
                          <td className='text-center py-2 pl-3 font-bold text-gray-900'>{stat.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
