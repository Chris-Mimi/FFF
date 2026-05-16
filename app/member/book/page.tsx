'use client';

import { confirm } from '@/lib/confirm';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Calendar, Users, Clock, LogOut, ChevronLeft, ChevronRight, X, Check, Edit2, Trash2, User, Lock } from 'lucide-react';
import { signOut } from '@/lib/auth';
import Image from 'next/image';
import Link from 'next/link';
import { FocusTrap } from '@/components/ui/FocusTrap';
import { NotificationPrompt } from '@/components/ui/NotificationPrompt';
import { getMaxVisibleSessionDate, DEFAULT_BOOKING_RULES, sessionStartInstant } from '@/lib/bookingRules';

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
  is_locked: boolean;
  attendees: string[];
  lock_at_ms: number; // ms epoch when this session's booking window closes (sessionStart - leadMinutes)
}

interface FamilyMember {
  id: string;
  display_name: string | null;
  name: string | null;
  date_of_birth: string | null;
  relationship: 'self' | 'spouse' | 'child' | 'other';
  account_type: 'primary' | 'family_member';
  guardian_only: boolean | null;
}

export default function MemberBookingPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(getInitialWeekStart());
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
  const [filter, setFilter] = useState<'all' | 'booked' | 'wod' | 'foundations' | 'kids'>('all');
  const scrolledForWeekRef = useRef<string | null>(null);
  const [releaseConfig, setReleaseConfig] = useState<{
    next_week_release_day_of_week: number;
    next_week_release_time: string;
    auto_lock_lead_minutes: number;
    session_type_lock_minutes: Array<{ session_type: string; auto_lock_lead_minutes: number }>;
  }>({
    next_week_release_day_of_week: DEFAULT_BOOKING_RULES.next_week_release_day_of_week,
    next_week_release_time: DEFAULT_BOOKING_RULES.next_week_release_time,
    auto_lock_lead_minutes: DEFAULT_BOOKING_RULES.auto_lock_lead_minutes,
    session_type_lock_minutes: [],
  });
  // Tick every 60s so card countdowns refresh without a full re-fetch.
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    checkAuth();
    // Load the next-week release config (non-sensitive; falls back to defaults on failure)
    fetch('/api/booking-rules/public')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setReleaseConfig(data); })
      .catch(() => { /* keep defaults */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user && bookingForMemberId) {
      fetchSessions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, user, bookingForMemberId, releaseConfig]);

  // Scroll today's session group into view when viewing the current week.
  // Program drops Sunday, so by mid-week the first days on screen are past and
  // new users mistook them for bookable (attempted last-week bookings).
  useEffect(() => {
    if (loading || sessions.length === 0) return;
    const todayStr = formatLocalDate(new Date());
    const currentMonday = formatLocalDate(getMonday(new Date()));
    const viewingMonday = formatLocalDate(weekStart);
    if (viewingMonday !== currentMonday) return;
    if (scrolledForWeekRef.current === viewingMonday) return;
    const el = document.getElementById(`day-${todayStr}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      scrolledForWeekRef.current = viewingMonday;
    }
  }, [loading, sessions, weekStart]);

  const checkAuth = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      router.push('/login');
      return;
    }

    // Check if user is a member and get athlete access info (including 10-card)
    const { data: member } = await supabase
      .from('members')
      .select('id, email, status, athlete_subscription_status, athlete_subscription_end, membership_types, ten_card_sessions_used, ten_card_total, ten_card_expiry_date')
      .eq('id', authUser.id)
      .single();

    if (!member) {
      toast.warning('Du musst registriertes Mitglied sein, um Sessions zu buchen.');
      router.push('/');
      return;
    }

    if (member.status !== 'active') {
      toast.warning('Dein Konto wartet auf die Freigabe. Bitte warte auf die Bestätigung durch den Coach.');
      router.push('/');
      return;
    }

    // Calculate 10-card status (for 10-card members only)
    const now = new Date();
    const hasTenCardMembership = member.membership_types?.includes('ten_card') || false;
    const tenCardTotal = member.ten_card_total || 10;
    const tenCardUsed = member.ten_card_sessions_used || 0;
    const tenCardRemaining = tenCardTotal - tenCardUsed;
    const tenCardExpiryDate = member.ten_card_expiry_date ? new Date(member.ten_card_expiry_date) : null;
    const tenCardExpired = !!(tenCardExpiryDate && tenCardExpiryDate < now);
    const hasTenCardSessions = tenCardRemaining > 0 && !tenCardExpired;

    // All active members can book freely. 10-card members need sessions remaining.
    const hasAccess = !hasTenCardMembership || hasTenCardSessions;

    setAthleteStatus({
      hasAccess,
      status: member.athlete_subscription_status,
      trialEnd: member.athlete_subscription_end,
      tenCardRemaining,
      tenCardExpired,
      using10Card: hasTenCardMembership && hasTenCardSessions
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

      // Time-gate next week: at most, athletes can see up to maxVisibleDate
      // (defaults to end-of-this-week; bumps to end-of-next-week after Sunday 14:00)
      const maxVisibleDate = getMaxVisibleSessionDate({
        ...DEFAULT_BOOKING_RULES,
        ...releaseConfig,
      });

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
          is_locked,
          bookings (
            id,
            member_id,
            status
          )
        `)
        .eq('status', 'published')
        .gte('date', formatLocalDate(weekStart))
        .lt('date', formatLocalDate(weekEnd))
        .lte('date', formatLocalDate(maxVisibleDate))
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
          b.member_id === bookingForMemberId && (b.status === 'confirmed' || b.status === 'waitlist')
        );

        // Find bookings for ALL OTHER family members (for badge display)
        const familyMemberIds = familyMembers.map(fm => fm.id);
        const otherFamilyBookings = bookings
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((b: any) =>
            familyMemberIds.includes(b.member_id) &&
            b.member_id !== bookingForMemberId &&
            (b.status === 'confirmed' || b.status === 'waitlist')
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

        // Compute effective lock using Berlin-wall-clock session start, minus per-type lead minutes.
        // (Per-type override → global override → 0.) Same shape as the server-side guard.
        const startInstant = sessionStartInstant(session.date, session.time);
        const leadMinutes =
          releaseConfig.session_type_lock_minutes.find(r => r.session_type === workoutType)?.auto_lock_lead_minutes
          ?? releaseConfig.auto_lock_lead_minutes
          ?? 0;
        const lockAtMs = startInstant.getTime() - leadMinutes * 60_000;
        const effectivelyLocked =
          session.is_locked === true ||
          (session.is_locked === null && lockAtMs <= Date.now());

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
          other_family_bookings: otherFamilyBookings,
          is_locked: effectivelyLocked,
          attendees: [],
          lock_at_ms: lockAtMs,
        };
      });

      setSessions(processedSessions);

      // Fetch attendee names for sessions where user is booked
      const bookedSessionIds = processedSessions
        .filter(s => s.user_booking_status !== 'none')
        .map(s => s.id);

      if (bookedSessionIds.length > 0) {
        try {
          const { data: { session: authSession } } = await supabase.auth.getSession();
          if (authSession) {
            const res = await fetch(
              `/api/bookings/attendees?sessionIds=${bookedSessionIds.join(',')}&memberId=${bookingForMemberId}`,
              { headers: { Authorization: `Bearer ${authSession.access_token}` } }
            );
            if (res.ok) {
              const { attendees } = await res.json();
              if (attendees && Object.keys(attendees).length > 0) {
                setSessions(prev => prev.map(s => ({
                  ...s,
                  attendees: attendees[s.id] || []
                })));
              }
            }
          }
        } catch {
          // Attendee names are non-critical — silently skip
        }
      }
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
        .select('id, display_name, name, date_of_birth, relationship, account_type, guardian_only')
        .or(`id.eq.${userId},primary_member_id.eq.${userId}`)
        .order('account_type', { ascending: false }); // Primary first

      if (error) throw error;
      const members = data || [];
      setFamilyMembers(members);

      // Set default booking member. Guardian-only accounts can't self-book, so default
      // to their first family member (saves a click). Falls back to userId if no family
      // members exist yet — the server-side guard will reject the booking and the UI
      // surface will show "+ Family" so they can add one.
      if (!bookingForMemberId) {
        const primary = members.find(m => m.id === userId);
        const firstFamily = members.find(m => m.account_type === 'family_member');
        if (primary?.guardian_only && firstFamily) {
          setBookingForMemberId(firstFamily.id);
        } else {
          setBookingForMemberId(userId);
        }
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
          name: familyFormData.display_name.trim(),
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

    if (!familyFormData.date_of_birth) {
      toast.warning('Please enter a date of birth');
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
    if (!await confirm({ title: 'Remove Family Member', message: `Are you sure you want to remove ${memberName} from your family members?`, confirmText: 'Remove', variant: 'danger' })) {
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
    if (!await confirm({ title: 'Cancel Booking', message: 'Are you sure you want to cancel this booking?', confirmText: 'Cancel Booking', variant: 'danger' })) {
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

      // Show cancellation message — late cancels get a distinct warning.
      if (data.status === 'late_cancel') {
        toast.warning(
          'Booking cancelled. This is past the lock time, so it is recorded as a late cancel.'
        );
      } else if (data.message) {
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

  // "Closes in 1d 4h" / "Closes in 3h 12m" / "Closes in 14m". Amber under 2h, red under 30m.
  const renderBookingCountdown = (lockAtMs: number) => {
    const ms = lockAtMs - nowMs;
    if (ms <= 0) return null;
    const totalMinutes = Math.floor(ms / 60_000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes - days * 60 * 24) / 60);
    const minutes = totalMinutes - days * 60 * 24 - hours * 60;
    let label: string;
    if (days > 0) label = `${days}d ${hours}h`;
    else if (hours > 0) label = `${hours}h ${minutes}m`;
    else label = `${Math.max(1, minutes)}m`;
    const color =
      totalMinutes < 30 ? 'text-red-400'
      : totalMinutes < 120 ? 'text-amber-400'
      : 'text-gray-400';
    return (
      <div className={`flex items-center gap-1 text-xs ${color}`}>
        <Clock size={12} />
        <span>Closes in {label}</span>
      </div>
    );
  };

  const getCapacityColor = (confirmed: number, capacity: number, accentColor: string) => {
    if (capacity === 0) return accentColor;
    const percentage = (confirmed / capacity) * 100;
    if (percentage >= 100) return 'text-red-400';
    if (percentage >= 80) return 'text-yellow-400';
    return accentColor;
  };

  const getCapacityBadge = (session: WeeklySession, accentColor: string) => {
    if (session.capacity === 0) {
      return <span className={`${accentColor} text-sm`}>Unlimited spots</span>;
    }

    const spotsLeft = session.capacity - session.confirmed_count;

    if (spotsLeft > 0) {
      return (
        <span className={`${accentColor} text-sm`}>
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
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Image src="/icon.png" alt="The Forge logo" width={48} height={48} className="w-10 h-10 sm:w-16 sm:h-16 object-contain flex-shrink-0" />
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-white">Book a Class</h1>
                <p className="text-gray-400 text-xs sm:text-sm truncate">Reserve your spot in upcoming sessions</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link href="/athlete">
                <button className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition-colors duration-200 min-h-[44px] text-xs sm:text-sm bg-teal-500 hover:bg-teal-600 text-white">
                  <ChevronLeft size={16} />
                  <span>Athlete App</span>
                </button>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 min-h-[44px] text-xs sm:text-sm"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
          <div className="mt-3">
            <NotificationPrompt />
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

      {/* 10-Card Expired/Empty Warning Banner */}
      {athleteStatus && !athleteStatus.hasAccess && (
        <div className="bg-red-900/50 border-b border-red-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p className="text-red-200 text-sm">
                <span className="font-semibold">{athleteStatus.tenCardExpired ? 'Your 10-card has expired.' : 'No sessions remaining on your 10-card.'}</span> Purchase a new 10-card to book classes.
              </p>
              <Link href="/athlete?tab=payment" className="self-end sm:self-auto">
                <button className="bg-red-500 hover:bg-red-400 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors min-h-[44px]">
                  Purchase 10-Card
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
                {familyMembers
                  .filter(member => !(member.account_type === 'primary' && member.guardian_only))
                  .map((member) => (
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
                        <div className="flex ml-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => openEditModal(member)}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                            title="Edit"
                            aria-label="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteFamilyMember(member.id, member.display_name || 'Family Member')}
                            disabled={processing === member.id}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-red-400 disabled:text-gray-600 transition-colors"
                            title="Delete"
                            aria-label="Delete"
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

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(['all', 'booked', 'wod', 'foundations', 'kids'] as const).map((f) => {
            const activeBg = f === 'kids'
              ? 'bg-teal-400'
              : f === 'foundations'
              ? 'bg-[#3092a6]'
              : f === 'wod'
              ? 'bg-teal-700'
              : 'bg-teal-800';
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === f
                    ? `${activeBg} text-white`
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {f === 'all' ? 'All' : f === 'booked' ? 'Booked' : f === 'wod' ? 'WOD' : f === 'foundations' ? 'Foundations' : 'Kids'}
              </button>
            );
          })}
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
              const KIDS_TYPES = ['Kids', 'Kids & Teens', 'ElternKind Turnen', 'FitKids Turnen'];
              const FOUNDATIONS_TYPES = ['Foundations', 'Foundations/WOD', 'Diapers & Dumbbells'];
              const filteredSessions = filter === 'booked'
                ? sessions.filter(s => s.user_booking_status === 'confirmed' || s.user_booking_status === 'waitlist')
                : filter === 'kids'
                ? sessions.filter(s => KIDS_TYPES.includes(s.workout_type))
                : filter === 'foundations'
                ? sessions.filter(s => FOUNDATIONS_TYPES.includes(s.workout_type))
                : filter === 'wod'
                ? sessions.filter(s => !KIDS_TYPES.includes(s.workout_type) && !FOUNDATIONS_TYPES.includes(s.workout_type))
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
                <div key={date} id={`day-${date}`} style={{ scrollMarginTop: '1rem' }}>
                  {/* Day Header */}
                  <h2 className="text-lg font-bold text-teal-400 mb-3">{formatDate(date)}</h2>

                  {/* Sessions Grid - 3 columns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {daySessions.map((session) => {
                      const isKids = KIDS_TYPES.includes(session.workout_type);
                      const isFoundations = FOUNDATIONS_TYPES.includes(session.workout_type);
                      const borderAccent = isKids
                        ? 'border-l-teal-400'
                        : isFoundations
                        ? 'border-l-[#3092a6]'
                        : 'border-l-teal-700';
                      const textAccent = isKids ? 'text-teal-400' : isFoundations ? 'text-[#3092a6]' : 'text-teal-700';
                      const btnBg = isKids
                        ? 'bg-teal-400 hover:bg-teal-500'
                        : isFoundations
                        ? 'bg-[#3092a6] hover:bg-[#287f90]'
                        : 'bg-teal-700 hover:bg-teal-800';
                      return (
                      <div
                        key={session.id}
                        className={`bg-gray-800 rounded-lg p-4 border border-l-4 ${borderAccent} ${
                          session.user_booking_status !== 'none'
                            ? 'border-t-teal-500 border-r-teal-500 border-b-teal-500'
                            : 'border-t-gray-700 border-r-gray-700 border-b-gray-700'
                        } hover:border-t-gray-600 hover:border-r-gray-600 hover:border-b-gray-600 transition-colors duration-200`}
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
                                <Users size={14} className={getCapacityColor(session.confirmed_count, session.capacity, textAccent)} />
                                <span className="text-gray-400 text-xs">
                                  {session.confirmed_count}/{session.capacity === 0 ? '∞' : session.capacity}
                                </span>
                                {getCapacityBadge(session, textAccent)}
                              </div>
                              {!session.is_locked && renderBookingCountdown(session.lock_at_ms)}
                            </div>

                            {/* Attendee names - only visible when booked */}
                            {session.attendees.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-gray-700">
                                <p className="text-gray-400 text-xs">
                                  <span className="font-medium text-gray-300">Also attending:</span>{' '}
                                  {session.attendees.join(', ')}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Right side - Action Button */}
                          <div className="flex flex-col justify-center">
                            {session.is_locked && session.user_booking_status === 'none' ? (
                              <div className="flex items-center gap-1.5 px-3 py-2 text-gray-500 text-sm">
                                <Lock size={16} />
                                Locked
                              </div>
                            ) : session.user_booking_status === 'none' ? (
                              <button
                                onClick={() => handleBook(session.id)}
                                disabled={processing === session.id}
                                className={`px-4 py-2.5 sm:px-3 sm:py-1.5 ${btnBg} disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg sm:rounded transition-colors duration-200 whitespace-nowrap min-h-[44px] sm:min-h-0`}
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
                      );
                    })}
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
        <FocusTrap>
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
        </FocusTrap>
      )}
    </div>
  );
}

// Format a Date as YYYY-MM-DD in local timezone (avoids UTC day-shift)
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Default view on Sundays = next week (the program releases Sunday, so Sunday
// visitors want the new week, not the week that's ending). Mon–Sat = current week.
function getInitialWeekStart(): Date {
  const now = new Date();
  const monday = getMonday(now);
  if (now.getDay() === 0) {
    monday.setDate(monday.getDate() + 7);
  }
  return monday;
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
