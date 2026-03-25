'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { UserPlus, ArrowLeft, BarChart2, Bell } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { NotificationPrompt } from '@/components/ui/NotificationPrompt';
import LinkWhiteboardScores from '@/components/coach/admin/LinkWhiteboardScores';

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

export default function AdminToolsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('attended');

  // Incidents tab
  const [allIncidents, setAllIncidents] = useState<{ memberId: string; name: string; status: string; date: string }[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(false);
  const [incidentFilter, setIncidentFilter] = useState<AttendedFilter>('all');
  const [incidentSort, setIncidentSort] = useState<{ col: keyof IncidentStat; dir: 'asc' | 'desc' }>({ col: 'total', dir: 'desc' });

  // Attended tab
  const [allAttended, setAllAttended] = useState<{ memberId: string; name: string; date: string }[]>([]);
  const [attendedLoading, setAttendedLoading] = useState(false);
  const [attendedFilter, setAttendedFilter] = useState<AttendedFilter>('all');

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser();
      if (!user) { router.push('/login'); return; }
      if (user.user_metadata?.role !== 'coach') { router.push('/login'); return; }
      setLoading(false);
      fetchIncidentStats();
      fetchAttendedStats();
    };
    checkAuth();
  }, [router]);

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

  const fetchAttendedStats = async () => {
    setAttendedLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('bookings')
        .select('member_id, members(name), weekly_sessions!inner(date)')
        .eq('status', 'confirmed')
        .lte('weekly_sessions.date', today);
      if (error) throw error;

      const rows = (data || []).map((b) => ({
        memberId: b.member_id,
        name: (b.members as unknown as { name: string } | null)?.name || 'Unknown',
        date: (b.weekly_sessions as unknown as { date: string } | null)?.date || '',
      }));
      setAllAttended(rows);
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

  // Derive attended ranking from raw data + current filter
  const attendedRanking: AttendedStat[] = (() => {
    const cutoff = getFilterDate(attendedFilter);
    const filtered = cutoff ? allAttended.filter((r) => r.date >= cutoff) : allAttended;
    const map = new Map<string, AttendedStat>();
    for (const row of filtered) {
      if (!map.has(row.memberId)) map.set(row.memberId, { memberId: row.memberId, name: row.name, count: 0 });
      map.get(row.memberId)!.count++;
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
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

        {/* Link Whiteboard Scores */}
        <LinkWhiteboardScores />

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
              {/* Filter pills */}
              <div className='flex gap-2 mb-4'>
                {FILTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setAttendedFilter(opt.value)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                      attendedFilter === opt.value
                        ? 'bg-[#178da6] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {attendedLoading ? (
                <p className='text-gray-500 text-sm'>Loading...</p>
              ) : attendedRanking.length === 0 ? (
                <p className='text-gray-500 text-sm'>No sessions recorded yet.</p>
              ) : (
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
                      {attendedRanking.map((stat, idx) => (
                        <tr key={stat.memberId} className='border-b border-gray-100 last:border-0'>
                          <td className='py-2 pr-4 text-gray-400 font-medium'>{idx + 1}</td>
                          <td className='py-2 pr-4 font-medium text-gray-800'>{stat.name}</td>
                          <td className='text-right py-2 pl-3'>
                            <span className='inline-block bg-[#178da6]/10 text-[#178da6] font-semibold px-2 py-0.5 rounded text-xs'>
                              {stat.count}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
