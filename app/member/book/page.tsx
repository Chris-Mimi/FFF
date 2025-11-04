'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Calendar, Users, Clock, LogOut, ChevronLeft, ChevronRight, X, Check, TrendingUp, Edit2, Trash2 } from 'lucide-react';
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

interface FamilyMember {
  id: string;
  display_name: string;
  date_of_birth: string | null;
  relationship: 'self' | 'spouse' | 'child' | 'other';
  account_type: 'primary' | 'family_member';
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
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [familyFormData, setFamilyFormData] = useState({
    display_name: '',
    date_of_birth: '',
    relationship: 'child' as 'spouse' | 'child' | 'other'
  });
  const [bookingForMemberId, setBookingForMemberId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user && bookingForMemberId) {
      fetchSessions();
    }
  }, [weekStart, user, bookingForMemberId]);

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

    // Fetch family members
    await fetchFamilyMembers(authUser.id);
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
        // Only find active bookings (not cancelled) for the selected member
        const userBooking = bookings.find((b: any) => b.member_id === bookingForMemberId && b.status !== 'cancelled');

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

  const fetchFamilyMembers = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('id, display_name, date_of_birth, relationship, account_type')
        .or(`id.eq.${userId},primary_member_id.eq.${userId}`)
        .order('account_type', { ascending: false }); // Primary first

      if (error) throw error;
      setFamilyMembers(data || []);

      // Set default booking member to primary user (yourself)
      if (!bookingForMemberId) {
        setBookingForMemberId(userId);
      }
    } catch (error) {
      console.error('Error fetching family members:', error);
    }
  };

  const handleAddFamilyMember = async () => {
    if (!user || !familyFormData.display_name.trim()) {
      alert('Please enter a name');
      return;
    }

    setProcessing('family-add');
    try {
      const { error } = await supabase
        .from('members')
        .insert({
          account_type: 'family_member',
          primary_member_id: user.id,
          display_name: familyFormData.display_name.trim(),
          date_of_birth: familyFormData.date_of_birth || null,
          relationship: familyFormData.relationship,
          status: 'active'
        });

      if (error) throw error;

      await fetchFamilyMembers(user.id);
      setShowFamilyModal(false);
      setFamilyFormData({
        display_name: '',
        date_of_birth: '',
        relationship: 'child'
      });
    } catch (error) {
      console.error('Error adding family member:', error);
      alert('Failed to add family member. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const handleEditFamilyMember = async () => {
    if (!editingMember || !familyFormData.display_name.trim()) {
      alert('Please enter a name');
      return;
    }

    setProcessing('family-edit');
    try {
      const { error } = await supabase
        .from('members')
        .update({
          display_name: familyFormData.display_name.trim(),
          date_of_birth: familyFormData.date_of_birth || null,
          relationship: familyFormData.relationship
        })
        .eq('id', editingMember.id);

      if (error) throw error;

      await fetchFamilyMembers(user!.id);
      setShowFamilyModal(false);
      setEditingMember(null);
      setFamilyFormData({
        display_name: '',
        date_of_birth: '',
        relationship: 'child'
      });
    } catch (error) {
      console.error('Error updating family member:', error);
      alert('Failed to update family member. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const handleDeleteFamilyMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from your family members?`)) {
      return;
    }

    setProcessing(memberId);
    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', memberId)
        .eq('account_type', 'family_member'); // Safety check

      if (error) throw error;

      await fetchFamilyMembers(user!.id);
    } catch (error) {
      console.error('Error deleting family member:', error);
      alert('Failed to delete family member. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const openAddModal = () => {
    setEditingMember(null);
    setFamilyFormData({
      display_name: '',
      date_of_birth: '',
      relationship: 'child'
    });
    setShowFamilyModal(true);
  };

  const openEditModal = (member: FamilyMember) => {
    setEditingMember(member);
    setFamilyFormData({
      display_name: member.display_name,
      date_of_birth: member.date_of_birth || '',
      relationship: member.relationship as 'spouse' | 'child' | 'other'
    });
    setShowFamilyModal(true);
  };

  const handleBook = async (sessionId: string) => {
    if (!user || !bookingForMemberId) return;

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
        body: JSON.stringify({
          sessionId,
          memberId: bookingForMemberId
        }),
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

        {/* Booking For - Compact Selectable Cards */}
        {familyMembers.length > 0 && (
          <div className="mb-6">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold text-sm">Select who you're booking for:</h3>
                <button
                  onClick={openAddModal}
                  className="px-3 py-1 bg-teal-500 hover:bg-teal-600 text-white rounded text-xs font-medium transition-colors"
                >
                  + Add Member
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {familyMembers.map((member) => (
                  <div
                    key={member.id}
                    onClick={() => setBookingForMemberId(member.id)}
                    className={`relative cursor-pointer rounded-lg p-3 border-2 transition-all ${
                      bookingForMemberId === member.id
                        ? 'border-teal-500 bg-teal-500/10'
                        : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${bookingForMemberId === member.id ? 'text-teal-300' : 'text-white'}`}>
                            {member.display_name}
                          </span>
                          {member.account_type === 'primary' && (
                            <span className="text-xs bg-teal-500/20 text-teal-300 px-1.5 py-0.5 rounded">
                              You
                            </span>
                          )}
                        </div>
                        {member.relationship !== 'self' && (
                          <p className="text-gray-400 text-xs capitalize mt-0.5">
                            {member.relationship}
                          </p>
                        )}
                      </div>

                      {member.account_type === 'family_member' && (
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => openEditModal(member)}
                            className="p-1 text-gray-400 hover:text-white transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteFamilyMember(member.id, member.display_name)}
                            disabled={processing === member.id}
                            className="p-1 text-gray-400 hover:text-red-400 disabled:text-gray-600 transition-colors"
                            title="Delete"
                          >
                            {processing === member.id ? '...' : <Trash2 size={14} />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

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

      {/* Family Member Modal */}
      {showFamilyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">
                  {editingMember ? 'Edit Family Member' : 'Add Family Member'}
                </h3>
                <button
                  onClick={() => {
                    setShowFamilyModal(false);
                    setEditingMember(null);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={familyFormData.display_name}
                    onChange={(e) => setFamilyFormData({ ...familyFormData, display_name: e.target.value })}
                    placeholder="e.g., Emma, Liam"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Date of Birth (Optional)
                  </label>
                  <input
                    type="date"
                    value={familyFormData.date_of_birth}
                    onChange={(e) => setFamilyFormData({ ...familyFormData, date_of_birth: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Relationship
                  </label>
                  <select
                    value={familyFormData.relationship}
                    onChange={(e) => setFamilyFormData({ ...familyFormData, relationship: e.target.value as 'spouse' | 'child' | 'other' })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="spouse">Spouse</option>
                    <option value="child">Child</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowFamilyModal(false);
                    setEditingMember(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={editingMember ? handleEditFamilyMember : handleAddFamilyMember}
                  disabled={processing === 'family-add' || processing === 'family-edit'}
                  className="flex-1 px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {processing === 'family-add' || processing === 'family-edit'
                    ? 'Saving...'
                    : editingMember
                    ? 'Update'
                    : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
