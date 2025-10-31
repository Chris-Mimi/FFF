'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Calendar, Users, Clock, LogOut, ChevronLeft, ChevronRight, X, Check, TrendingUp } from 'lucide-react';
import { signOut } from '@/lib/auth';
import Link from 'next/link';

interface WeeklySession {
  id: string;
  date: string;
  time: string;
  capacity: number;
  status: 'draft' | 'published' | 'completed' | 'cancelled';
  workout_type: string;
  confirmed_count: number;
  waitlist_count: number;
  user_booking_status: 'none' | 'confirmed' | 'waitlist';
  user_booking_id: string | null;
}

export default function MemberBookingPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()));
  const [sessions, setSessions] = useState<WeeklySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [athleteStatus, setAthleteStatus] = useState<{
    hasAccess: boolean;
    status: 'trial' | 'active' | 'expired';
    trialEnd: string | null;
  } | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [weekStart, user]);

  const checkAuth = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      router.push('/login');
      return;
    }

    // Check if user is a member and get athlete access info
    const { data: member } = await supabase
      .from('members')
      .select('id, email, status, athlete_subscription_status, athlete_subscription_end')
      .eq('id', authUser.id)
      .single();

    if (!member) {
      alert('You must be a registered member to book sessions.');
      router.push('/');
      return;
    }

    if (member.status !== 'active') {
      alert('Your account is pending approval. Please wait for coach approval.');
      router.push('/');
      return;
    }

    // Check athlete access
    const now = new Date();
    const trialEnd = member.athlete_subscription_end ? new Date(member.athlete_subscription_end) : null;
    const hasAccess =
      member.athlete_subscription_status === 'active' ||
      (member.athlete_subscription_status === 'trial' && trialEnd && trialEnd > now);

    setAthleteStatus({
      hasAccess,
      status: member.athlete_subscription_status,
      trialEnd: member.athlete_subscription_end
    });

    setUser({ id: authUser.id, email: authUser.email || '' });
  };

  const fetchSessions = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      // Format dates in local timezone (YYYY-MM-DD) to avoid timezone shift
      const formatLocalDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // Fetch weekly sessions with booking counts
      const { data: sessionsData, error } = await supabase
        .from('weekly_sessions')
        .select(`
          id,
          date,
          time,
          capacity,
          status,
          wods (
            title
          ),
          bookings (
            id,
            member_id,
            status
          )
        `)
        .eq('status', 'published')
        .gte('date', formatLocalDate(weekStart))
        .lt('date', formatLocalDate(weekEnd))
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) throw error;

      // Process sessions to add booking counts and user status
      const processedSessions: WeeklySession[] = (sessionsData || []).map((session: any) => {
        const bookings = session.bookings || [];
        const confirmedBookings = bookings.filter((b: any) => b.status === 'confirmed');
        const waitlistBookings = bookings.filter((b: any) => b.status === 'waitlist');
        // Only find active bookings (not cancelled)
        const userBooking = bookings.find((b: any) => b.member_id === user.id && b.status !== 'cancelled');

        // Extract workout type from title (format: "WOD - Auto-generated")
        const workoutTitle = session.wods?.title || '';
        const workoutType = workoutTitle.split(' - ')[0] || 'Class';

        return {
          id: session.id,
          date: session.date,
          time: session.time,
          capacity: session.capacity,
          status: session.status,
          workout_type: workoutType,
          confirmed_count: confirmedBookings.length,
          waitlist_count: waitlistBookings.length,
          user_booking_status: userBooking ? userBooking.status : 'none',
          user_booking_id: userBooking?.id || null
        };
      });

      setSessions(processedSessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async (sessionId: string) => {
    if (!user) return;

    setProcessing(sessionId);
    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      // Use API route to create booking (handles 10-card auto-increment)
      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to book session');
      }

      await fetchSessions();
    } catch (error) {
      console.error('Error booking session:', error);
      alert(error instanceof Error ? error.message : 'Failed to book session. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const handleCancel = async (sessionId: string, bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    setProcessing(sessionId);
    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      // Use API route to cancel booking (handles 10-card auto-decrement)
      const response = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ bookingId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel booking');
      }

      await fetchSessions();
    } catch (error) {
      console.error('Error canceling booking:', error);
      alert(error instanceof Error ? error.message : 'Failed to cancel booking. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const handlePreviousWeek = () => {
    const newDate = new Date(weekStart);
    newDate.setDate(newDate.getDate() - 7);
    setWeekStart(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(weekStart);
    newDate.setDate(newDate.getDate() + 7);
    setWeekStart(newDate);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5); // HH:MM
  };

  const getCapacityColor = (confirmed: number, capacity: number) => {
    const percentage = (confirmed / capacity) * 100;
    if (percentage >= 100) return 'text-red-400';
    if (percentage >= 80) return 'text-yellow-400';
    return 'text-teal-400';
  };

  const getCapacityBadge = (session: WeeklySession) => {
    const spotsLeft = session.capacity - session.confirmed_count;

    if (spotsLeft > 0) {
      return (
        <span className="text-teal-400 text-sm">
          {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left
        </span>
      );
    } else if (session.waitlist_count > 0) {
      return (
        <span className="text-purple-400 text-sm">
          Full ({session.waitlist_count} waitlist)
        </span>
      );
    } else {
      return <span className="text-red-400 text-sm">Full</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Book a Class</h1>
              <p className="text-gray-400 text-sm mt-1">Reserve your spot in upcoming sessions</p>
            </div>
            <div className="flex items-center gap-3">
              {athleteStatus && (
                <Link href="/athlete">
                  <button
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200 ${
                      athleteStatus.hasAccess
                        ? 'bg-teal-500 hover:bg-teal-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                  >
                    <TrendingUp size={18} />
                    {athleteStatus.hasAccess
                      ? athleteStatus.status === 'trial'
                        ? 'Athlete Page (Trial)'
                        : 'Athlete Page'
                      : 'Unlock Athlete Page'}
                  </button>
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 pb-12">
        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handlePreviousWeek}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200"
          >
            <ChevronLeft size={18} />
            Previous Week
          </button>

          <div className="text-center">
            <h2 className="text-xl font-bold text-white">
              {weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} -{' '}
              {new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </h2>
          </div>

          <button
            onClick={handleNextWeek}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200"
          >
            Next Week
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Sessions List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-teal-500 border-r-transparent"></div>
            <p className="text-gray-400 mt-4">Loading sessions...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
            <Calendar size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400 text-lg mb-2">No sessions available this week</p>
            <p className="text-gray-500 text-sm">Check back later or try a different week</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`bg-gray-800 rounded-lg p-6 border ${
                  session.user_booking_status !== 'none'
                    ? 'border-teal-500'
                    : 'border-gray-700'
                } hover:border-gray-600 transition-colors duration-200`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-white">
                        {formatDate(session.date)} at {formatTime(session.time)}
                      </h3>
                      {session.user_booking_status === 'confirmed' && (
                        <span className="px-3 py-1 bg-teal-500/20 text-teal-300 text-sm rounded-full flex items-center gap-1">
                          <Check size={14} />
                          Booked
                        </span>
                      )}
                      {session.user_booking_status === 'waitlist' && (
                        <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-sm rounded-full flex items-center gap-1">
                          <Clock size={14} />
                          Waitlist
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-6 text-sm mb-3">
                      <div>
                        <span className="text-gray-400">Type:</span>{' '}
                        <span className="text-white font-medium">{session.workout_type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users size={16} className={getCapacityColor(session.confirmed_count, session.capacity)} />
                        <span className="text-gray-400">
                          {session.confirmed_count}/{session.capacity}
                        </span>
                        {getCapacityBadge(session)}
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="ml-4">
                    {session.user_booking_status === 'none' ? (
                      <button
                        onClick={() => handleBook(session.id)}
                        disabled={processing === session.id}
                        className="px-6 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200"
                      >
                        {processing === session.id ? 'Booking...' : 'Book'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCancel(session.id, session.user_booking_id!)}
                        disabled={processing === session.id}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200"
                      >
                        <X size={18} />
                        {processing === session.id ? 'Canceling...' : 'Cancel'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to get Monday of current week
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}
