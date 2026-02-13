'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Calendar, Users, Clock, LogOut, ChevronLeft, ChevronRight, X, Check, Edit2, Trash2, User } from 'lucide-react';
import { signOut } from '@/lib/auth';
import Image from 'next/image';
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
  other_family_bookings: Array<{ name: string; id: string }>;
}

interface FamilyMember {
  id: string;
  display_name: string | null;
  name: string | null;
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
    tenCardRemaining: number;
    tenCardExpired: boolean;
    using10Card: boolean;
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
  const [filter, setFilter] = useState<'all' | 'booked'>('all');

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

    // Check if user is a member and get athlete access info (including 10-card)
    const { data: member } = await supabase
      .from('members')
      .select('id, email, status, athlete_subscription_status, athlete_subscription_end, ten_card_sessions_used, ten_card_total, ten_card_expiry_date')
      .eq('id', authUser.id)
      .single();

    if (!member) {
      toast.warning('You must be a registered member to book sessions.');
      router.push('/');
      return;
    }

    if (member.status !== 'active') {
      toast.warning('Your account is pending approval. Please wait for coach approval.');
      router.push('/');
      return;
    }

    // Check athlete access (subscription or 10-card)
    const now = new Date();
    const trialEnd = member.athlete_subscription_end ? new Date(member.athlete_subscription_end) : null;
    const hasSubscription = !!(
      member.athlete_subscription_status === 'active' ||
      (member.athlete_subscription_status === 'trial' && trialEnd && trialEnd > now)
    );

    // Calculate 10-card status
    const tenCardTotal = member.ten_card_total || 10;
    const tenCardUsed = member.ten_card_sessions_used || 0;
    const tenCardRemaining = tenCardTotal - tenCardUsed;
    const tenCardExpiryDate = member.ten_card_expiry_date ? new Date(member.ten_card_expiry_date) : null;
    const tenCardExpired = !!(tenCardExpiryDate && tenCardExpiryDate < now);
    const hasTenCardSessions = tenCardRemaining > 0 && !tenCardExpired;

    // User has access if they have subscription OR 10-card sessions
    const hasAccess = hasSubscription || hasTenCardSessions;

    setAthleteStatus({
      hasAccess,
      status: member.athlete_subscription_status,
      trialEnd: member.athlete_subscription_end,
      tenCardRemaining,
      tenCardExpired,
      using10Card: !hasSubscription && hasTenCardSessions
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
          workout_type,
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const processedSessions: WeeklySession[] = (sessionsData || []).map((session: any) => {
        const bookings = session.bookings || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const confirmedBookings = bookings.filter((b: any) => b.status === 'confirmed');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const waitlistBookings = bookings.filter((b: any) => b.status === 'waitlist');

        // Find booking for CURRENTLY SELECTED member (for booking status/cancel button)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const selectedMemberBooking = bookings.find((b: any) =>
          b.member_id === bookingForMemberId && b.status !== 'cancelled'
        );

        // Find bookings for ALL OTHER family members (for badge display)
        const familyMemberIds = familyMembers.map(fm => fm.id);
        const otherFamilyBookings = bookings
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((b: any) =>
            familyMemberIds.includes(b.member_id) &&
            b.member_id !== bookingForMemberId &&
            b.status !== 'cancelled'
          )
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((b: any) => {
            // Get name from local familyMembers data instead of nested join
            const member = familyMembers.find(fm => fm.id === b.member_id);
            // Use display_name if set, otherwise extract first name from name field
            let displayName = 'Unknown';
            if (member?.display_name) {
              displayName = member.display_name;
            } else if (member?.name) {
              // Extract first name (everything before first space)
              displayName = member.name.split(' ')[0];
            }
            return {
              name: displayName,
              id: b.member_id
            };
          });

        const workoutType = session.workout_type || 'Class';

        return {
          id: session.id,
          date: session.date,
          time: session.time,
          capacity: session.capacity,
          status: session.status,
          workout_type: workoutType,
          confirmed_count: confirmedBookings.length,
          waitlist_count: waitlistBookings.length,
          user_booking_status: selectedMemberBooking ? selectedMemberBooking.status : 'none',
          user_booking_id: selectedMemberBooking?.id || null,
          other_family_bookings: otherFamilyBookings
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
        .select('id, display_name, name, date_of_birth, relationship, account_type')
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
      toast.warning('Please enter a name');
      return;
    }

    if (!familyFormData.date_of_birth) {
      toast.warning('Please enter a date of birth');
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
      toast.error('Failed to add family member. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const handleEditFamilyMember = async () => {
    if (!editingMember || !familyFormData.display_name.trim()) {
      toast.warning('Please enter a name');
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
      toast.error('Failed to update family member. Please try again.');
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
      toast.error('Failed to delete family member. Please try again.');
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
      display_name: member.display_name || '',
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
        // User-facing errors (402 = Payment Required) - show message without console error
        if (response.status === 402) {
          toast.error(data.error || 'Payment required');
          return;
        }
        throw new Error(data.error || 'Failed to book session');
      }

      // Show success message with any warnings
      if (data.message) {
        toast.success(data.message);
      }

      await fetchSessions();
    } catch (error) {
      console.error('Error booking session:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to book session. Please try again.');
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

      // Show cancellation message with refund status
      if (data.message) {
        toast.info(data.message);
      }

      await fetchSessions();
    } catch (error) {
      console.error('Error canceling booking:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to cancel booking. Please try again.');
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-3">
                <Image src="/icon.png" alt="The Forge logo" width={48} height={48} className="w-14 h-14 sm:w-16 sm:h-16 object-contain" />
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white">Book a Class</h1>
                  <p className="text-gray-400 text-xs sm:text-sm">Reserve your spot in upcoming sessions</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/athlete">
                <button className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition-colors duration-200 min-h-[44px] text-xs sm:text-sm bg-teal-500 hover:bg-teal-600 text-white">
                  <ChevronLeft size={16} />
                  Back
                </button>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 min-h-[44px] text-xs sm:text-sm"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Low Sessions Warning Banner */}
      {athleteStatus?.using10Card && athleteStatus.tenCardRemaining <= 2 && athleteStatus.tenCardRemaining > 0 && (
        <div className="bg-yellow-900/50 border-b border-yellow-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-500 rounded-full p-1 flex-shrink-0">
                  <span className="text-yellow-900 font-bold text-sm px-1">{athleteStatus.tenCardRemaining}</span>
                </div>
                <p className="text-yellow-200 text-sm">
                  <span className="font-semibold">Low sessions!</span> {athleteStatus.tenCardRemaining} session{athleteStatus.tenCardRemaining > 1 ? 's' : ''} remaining.
                </p>
              </div>
              <Link href="/athlete?tab=payment" className="self-end sm:self-auto">
                <button className="bg-yellow-500 hover:bg-yellow-400 text-yellow-900 font-semibold px-4 py-2 rounded-lg text-sm transition-colors min-h-[44px]">
                  Buy More
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* No Sessions Warning Banner */}
      {athleteStatus && !athleteStatus.hasAccess && (
        <div className="bg-red-900/50 border-b border-red-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p className="text-red-200 text-sm">
                <span className="font-semibold">No active subscription or sessions.</span> Purchase a subscription or 10-card to book classes.
              </p>
              <Link href="/athlete?tab=payment" className="self-end sm:self-auto">
                <button className="bg-red-500 hover:bg-red-400 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors min-h-[44px]">
                  Payment Options
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 pb-12">
        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handlePreviousWeek}
            className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-full transition-colors duration-200"
            title="Previous Week"
            aria-label="Previous week"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="text-center">
            <h2 className="text-sm md:text-lg font-bold text-white">
              {weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} -{' '}
              {new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </h2>
          </div>

          <button
            onClick={handleNextWeek}
            className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-full transition-colors duration-200"
            title="Next Week"
            aria-label="Next week"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Booking For - Compact Selectable Cards */}
        {familyMembers.length > 0 && (
          <div className="mb-6">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold text-sm">Select who you&apos;re booking for:</h3>
                <button
                  onClick={openAddModal}
                  className="px-2 py-0.5 bg-teal-500 hover:bg-teal-600 text-white rounded text-xs font-medium transition-colors whitespace-nowrap"
                >
                  + Family
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {familyMembers.map((member) => (
                  <div
                    key={member.id}
                    onClick={() => setBookingForMemberId(member.id)}
                    className={`relative cursor-pointer rounded-lg px-3 py-2 border-2 transition-all ${
                      bookingForMemberId === member.id
                        ? 'border-teal-500 bg-teal-500/10'
                        : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`font-medium text-sm ${bookingForMemberId === member.id ? 'text-teal-300' : 'text-white'}`}>
                        {member.account_type === 'primary' ? 'You' : (member.display_name || member.name)}
                      </span>

                      {member.account_type === 'family_member' && (
                        <div className="flex gap-1 ml-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => openEditModal(member)}
                            className="p-0.5 text-gray-400 hover:text-white transition-colors"
                            title="Edit"
                            aria-label="Edit"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteFamilyMember(member.id, member.display_name || 'Family Member')}
                            disabled={processing === member.id}
                            className="p-0.5 text-gray-400 hover:text-red-400 disabled:text-gray-600 transition-colors"
                            title="Delete"
                            aria-label="Delete"
                          >
                            {processing === member.id ? '...' : <Trash2 size={12} />}
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

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-teal-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('booked')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'booked'
                ? 'bg-teal-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Booked
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
          <div className="space-y-6">
            {/* Group sessions by day */}
            {(() => {
              // Filter sessions based on filter state
              const filteredSessions = filter === 'booked'
                ? sessions.filter(s => s.user_booking_status === 'confirmed' || s.user_booking_status === 'waitlist')
                : sessions;

              if (filteredSessions.length === 0) {
                return (
                  <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
                    <Calendar size={48} className="mx-auto text-gray-600 mb-4" />
                    <p className="text-gray-400 text-lg mb-2">No booked sessions this week</p>
                    <p className="text-gray-500 text-sm">Click &quot;All&quot; to view available sessions</p>
                  </div>
                );
              }

              return Array.from(new Set(filteredSessions.map(s => s.date))).map((date) => {
                const daySessions = filteredSessions.filter(s => s.date === date);

              return (
                <div key={date}>
                  {/* Day Header */}
                  <h2 className="text-lg font-bold text-teal-400 mb-3">{formatDate(date)}</h2>

                  {/* Sessions Grid - 3 columns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {daySessions.map((session) => (
                      <div
                        key={session.id}
                        className={`bg-gray-800 rounded-lg p-4 border ${
                          session.user_booking_status !== 'none'
                            ? 'border-teal-500'
                            : 'border-gray-700'
                        } hover:border-gray-600 transition-colors duration-200`}
                      >
                        <div className="flex gap-3">
                          {/* Left side - Info */}
                          <div className="flex-1 min-w-0">
                            {/* Time and badges */}
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <h3 className="text-lg font-semibold text-white">
                                {formatTime(session.time)}
                              </h3>
                              {session.user_booking_status === 'confirmed' && (
                                <span className="px-2 py-0.5 bg-teal-500/20 text-teal-300 text-xs rounded-full flex items-center gap-1">
                                  <Check size={12} />
                                  Booked
                                </span>
                              )}
                              {session.user_booking_status === 'waitlist' && (
                                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded-full flex items-center gap-1">
                                  <Clock size={12} />
                                  Waitlist
                                </span>
                              )}
                            </div>

                            {/* Family bookings */}
                            {session.other_family_bookings.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {session.other_family_bookings.map((booking) => (
                                  <span key={booking.id} className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded-full flex items-center gap-1">
                                    <User size={12} />
                                    {booking.name}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Details */}
                            <div className="space-y-1 text-sm">
                              <div>
                                <span className="text-gray-400">Type:</span>{' '}
                                <span className="text-white font-medium">{session.workout_type}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Users size={14} className={getCapacityColor(session.confirmed_count, session.capacity)} />
                                <span className="text-gray-400 text-xs">
                                  {session.confirmed_count}/{session.capacity}
                                </span>
                                {getCapacityBadge(session)}
                              </div>
                            </div>
                          </div>

                          {/* Right side - Action Button */}
                          <div className="flex flex-col justify-center">
                            {session.user_booking_status === 'none' ? (
                              <button
                                onClick={() => handleBook(session.id)}
                                disabled={processing === session.id}
                                className="px-4 py-2.5 sm:px-3 sm:py-1.5 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg sm:rounded transition-colors duration-200 whitespace-nowrap min-h-[44px] sm:min-h-0"
                              >
                                {processing === session.id ? 'Booking...' : 'Book'}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleCancel(session.id, session.user_booking_id!)}
                                disabled={processing === session.id}
                                className="flex items-center justify-center gap-1.5 px-3 py-2.5 sm:px-2 sm:py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg sm:rounded transition-colors duration-200 min-h-[44px] sm:min-h-0"
                              >
                                <X size={16} />
                                {processing === session.id ? 'Canceling...' : 'Cancel'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
              });
            })()}
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
                  aria-label="Close"
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
                    required
                    maxLength={100}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    value={familyFormData.date_of_birth}
                    onChange={(e) => setFamilyFormData({ ...familyFormData, date_of_birth: e.target.value })}
                    required
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
