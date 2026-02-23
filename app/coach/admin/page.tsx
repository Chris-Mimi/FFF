'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { UserPlus, ArrowLeft, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface AttendanceStat {
  memberId: string;
  name: string;
  coachCancelled: number;
  lateCancel: number;
  noShow: number;
  total: number;
}

export default function AdminToolsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStat[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const role = user.user_metadata?.role;
      if (role !== 'coach') {
        router.push('/login');
        return;
      }

      setLoading(false);
      fetchAttendanceStats();
    };

    checkAuth();
  }, [router]);

  const fetchAttendanceStats = async () => {
    setStatsLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('member_id, status, members(name)')
        .in('status', ['coach_cancelled', 'late_cancel', 'no_show']);

      if (error) throw error;

      // Aggregate by member
      const statsMap = new Map<string, AttendanceStat>();

      for (const booking of data || []) {
        const memberId = booking.member_id;
        const memberName = (booking.members as { name: string } | null)?.name || 'Unknown';

        if (!statsMap.has(memberId)) {
          statsMap.set(memberId, {
            memberId,
            name: memberName,
            coachCancelled: 0,
            lateCancel: 0,
            noShow: 0,
            total: 0,
          });
        }

        const stat = statsMap.get(memberId)!;
        if (booking.status === 'coach_cancelled') stat.coachCancelled++;
        if (booking.status === 'late_cancel') stat.lateCancel++;
        if (booking.status === 'no_show') stat.noShow++;
        stat.total = stat.coachCancelled + stat.lateCancel + stat.noShow;
      }

      const sorted = Array.from(statsMap.values()).sort((a, b) => b.total - a.total);
      setAttendanceStats(sorted);
    } catch (err) {
      console.error('Error fetching attendance stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

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
          <Link
            href='/coach'
            className='inline-flex items-center gap-2 text-[#178da6] hover:text-[#14758c] mb-4'
          >
            <ArrowLeft size={20} />
            Back to Dashboard
          </Link>
          <h1 className='text-3xl font-bold text-gray-900'>Admin Tools</h1>
          <p className='text-gray-600 mt-2'>Manage coach accounts and system settings</p>
        </div>

        {/* Admin Actions */}
        <div className='grid gap-4 mb-8'>
          {/* Create Coach Account */}
          <Link
            href='/signup'
            className='bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition border-2 border-transparent hover:border-[#178da6]'
          >
            <div className='flex items-start gap-4'>
              <div className='bg-[#178da6] text-white p-3 rounded-lg'>
                <UserPlus size={24} />
              </div>
              <div>
                <h2 className='text-xl font-semibold text-gray-900 mb-2'>
                  Create New Coach Account
                </h2>
                <p className='text-gray-600'>
                  Register a new coach to give them access to the coaching dashboard and all admin
                  features.
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* Attendance Behaviour Report */}
        <div className='bg-white rounded-lg shadow-md p-6'>
          <div className='flex items-center gap-3 mb-4'>
            <div className='bg-orange-100 text-orange-600 p-2 rounded-lg'>
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 className='text-xl font-semibold text-gray-900'>Attendance Behaviour</h2>
              <p className='text-sm text-gray-500'>All-time — members with at least one incident</p>
            </div>
          </div>

          {statsLoading ? (
            <p className='text-gray-500 text-sm'>Loading...</p>
          ) : attendanceStats.length === 0 ? (
            <p className='text-gray-500 text-sm'>No incidents recorded yet.</p>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='border-b border-gray-200'>
                    <th className='text-left py-2 pr-4 font-semibold text-gray-700'>Member</th>
                    <th className='text-center py-2 px-3 font-semibold text-gray-500'>Removed by Coach</th>
                    <th className='text-center py-2 px-3 font-semibold text-purple-700'>Late Cancel</th>
                    <th className='text-center py-2 px-3 font-semibold text-orange-700'>No-Show</th>
                    <th className='text-center py-2 pl-3 font-semibold text-gray-900'>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceStats.map((stat) => (
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
        </div>
      </div>
    </div>
  );
}
