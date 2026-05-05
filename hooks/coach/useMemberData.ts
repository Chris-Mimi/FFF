import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { authFetch } from '@/lib/auth-fetch';
import { useRouter } from 'next/navigation';
import { MemberStatus, MembershipType, ClassType, Member, getAge } from '@/types/member';

export function useMemberData() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<MemberStatus>('active');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilters, setSelectedFilters] = useState<MembershipType[]>([]);
  const [selectedClassTypes, setSelectedClassTypes] = useState<ClassType[]>([]);
  const [ageFilter, setAgeFilter] = useState<'all' | 'adults' | 'kids' | '<7' | '7-11' | '12-16' | '7-16'>('all');
  const [attendanceTimeframe, setAttendanceTimeframe] = useState<7 | 30 | 365 | 'all'>('all');
  const [pendingCount, setPendingCount] = useState(0);
  const [atRiskCount, setAtRiskCount] = useState(0);
  const [unlinkedWhiteboardNames, setUnlinkedWhiteboardNames] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUnlinkedWhiteboardNames = async () => {
    try {
      const [scoresRes, membersRes] = await Promise.all([
        supabase
          .from('wod_section_results')
          .select('whiteboard_name')
          .not('whiteboard_name', 'is', null)
          .is('member_id', null),
        supabase
          .from('members')
          .select('whiteboard_name')
          .not('whiteboard_name', 'is', null),
      ]);

      if (scoresRes.error || membersRes.error) {
        console.error(
          'Error fetching unlinked whiteboard names:',
          scoresRes.error || membersRes.error
        );
        return;
      }

      const assigned = new Set(
        (membersRes.data || []).map(m => (m.whiteboard_name as string).toLowerCase())
      );
      const unique = [...new Set((scoresRes.data || []).map(r => r.whiteboard_name as string))]
        .filter(name => !assigned.has(name.toLowerCase()))
        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
      setUnlinkedWhiteboardNames(unique);
    } catch (err) {
      console.error('Error fetching unlinked whiteboard names:', err);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      }
    };
    checkAuth();
    fetchMembersWithAttendance(activeTab, attendanceTimeframe);
    fetchPendingCount();
    fetchAtRiskCount(attendanceTimeframe);
    fetchUnlinkedWhiteboardNames();
  }, [activeTab, attendanceTimeframe, router]);

  const fetchPendingCount = async () => {
    try {
      const { count, error } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (error) throw error;
      setPendingCount(count || 0);
    } catch (error) {
      console.error('Error fetching pending count:', error);
    }
  };

  const fetchAtRiskCount = async (timeframe: 7 | 30 | 365 | 'all') => {
    try {
      const daysParam = timeframe === 'all' ? 36500 : timeframe;
      const regularTypes = ['member', 'ten_card', 'wellpass', 'hansefit'];

      const { data: activeMembers } = await supabase
        .from('members')
        .select('id, membership_types, guardian_only')
        .eq('status', 'active')
        .eq('guardian_only', false);

      if (!activeMembers || activeMembers.length === 0) {
        setAtRiskCount(0);
        return;
      }

      // Filter to regular membership types
      const regularMembers = activeMembers.filter(m =>
        m.membership_types?.some((type: string) => regularTypes.includes(type))
      );

      if (regularMembers.length === 0) {
        setAtRiskCount(0);
        return;
      }

      const memberIds = regularMembers.map(m => m.id);

      const { data: attendanceData } = await supabase.rpc(
        'get_all_members_attendance',
        { p_member_ids: memberIds, p_days_back: daysParam }
      );

      const attendedIds = new Set(
        (attendanceData || []).map((row: { member_id: string }) => row.member_id)
      );

      const count = regularMembers.filter(m => !attendedIds.has(m.id)).length;
      setAtRiskCount(count);
    } catch (error) {
      console.error('Error fetching at-risk count:', error);
    }
  };

  const fetchMembersWithAttendance = async (status: MemberStatus, timeframe: 7 | 30 | 365 | 'all') => {
    const daysParam = timeframe === 'all' ? 36500 : timeframe;
    setLoading(true);
    try {
      let query = supabase.from('members').select('id, email, name, display_name, phone, status, account_type, primary_member_id, athlete_trial_start, athlete_subscription_status, athlete_subscription_start, athlete_subscription_end, subscription_tier, created_at, membership_types, ten_card_purchase_date, ten_card_sessions_used, ten_card_total, ten_card_expiry_date, date_of_birth, class_types, gender, guardian_only, primary_payment_method, ten_card_holder_id');

      if (status === 'subscriptions') {
        query = query
          .eq('status', 'active')
          .in('athlete_subscription_status', ['trial', 'active']);
      } else if (status === 'at-risk') {
        query = query.eq('status', 'active');
      } else {
        query = query.eq('status', status);
      }

      const { data: membersData, error: membersError } = await query
        .order('created_at', { ascending: false });

      if (membersError) {
        console.error('fetchMembers error:', membersError);
        throw membersError;
      }

      const memberIds = (membersData || []).map(m => m.id);

      // Fetch subscription plan types
      let planTypeMap: Record<string, 'monthly' | 'yearly'> = {};
      if (memberIds.length > 0) {
        const { data: subsData } = await supabase
          .from('subscriptions')
          .select('member_id, plan_type')
          .in('member_id', memberIds)
          .in('status', ['active', 'trialing']);

        if (subsData) {
          planTypeMap = Object.fromEntries(
            subsData.map((row: { member_id: string; plan_type: string }) => [
              row.member_id,
              row.plan_type as 'monthly' | 'yearly',
            ])
          );
        }
      }

      let attendanceMap: Record<string, number> = {};

      if (memberIds.length > 0) {
        const { data: attendanceData, error: attendanceError } = await supabase.rpc(
          'get_all_members_attendance',
          { p_member_ids: memberIds, p_days_back: daysParam }
        );

        if (!attendanceError && attendanceData) {
          attendanceMap = Object.fromEntries(
            attendanceData.map((row: { member_id: string; attendance_count: number }) => [
              row.member_id,
              row.attendance_count,
            ])
          );
        }
      }

      // Fetch last attendance dates for at-risk tab
      let lastAttendanceMap: Record<string, string> = {};
      if (status === 'at-risk' && memberIds.length > 0) {
        const { data: lastAttendanceData, error: lastAttendanceError } = await supabase.rpc(
          'get_members_last_attendance',
          { p_member_ids: memberIds }
        );

        if (!lastAttendanceError && lastAttendanceData) {
          lastAttendanceMap = Object.fromEntries(
            lastAttendanceData.map((row: { member_id: string; last_attendance_date: string }) => [
              row.member_id,
              row.last_attendance_date,
            ])
          );
        }
      }

      // Bookings that debit a ten-card, split into past (consumed) and upcoming.
      // Attribution goes to the holder (booker.ten_card_holder_id || booker.id),
      // matching the increment logic in /api/bookings/create. The chip uses these
      // to show actual usage; comparing against ten_card_sessions_used surfaces
      // manual-override mismatches (e.g. coach typed in a counter without bookings).
      const upcomingTenCardMap: Record<string, number> = {};
      const pastTenCardMap: Record<string, number> = {};
      const tenCardHolders = (membersData || [])
        .filter(m => (m.membership_types || []).includes('ten_card'));
      if (tenCardHolders.length > 0) {
        const todayIso = new Date().toISOString().split('T')[0];
        const { data: tenCardBookings } = await supabase
          .from('bookings')
          .select('member_id, status, weekly_sessions!inner(date), members!inner(id, ten_card_holder_id, primary_payment_method, membership_types)')
          .in('status', ['confirmed', 'no_show', 'late_cancel']);

        type Row = {
          member_id: string;
          status: 'confirmed' | 'no_show' | 'late_cancel';
          weekly_sessions: { date: string } | { date: string }[];
          members: { id: string; ten_card_holder_id: string | null; primary_payment_method: string | null; membership_types: string[] | null } | { id: string; ten_card_holder_id: string | null; primary_payment_method: string | null; membership_types: string[] | null }[];
        };
        const purchaseByHolder = new Map<string, string | null>(
          tenCardHolders.map(m => [m.id, m.ten_card_purchase_date])
        );
        (tenCardBookings as Row[] | null)?.forEach(row => {
          const booker = Array.isArray(row.members) ? row.members[0] : row.members;
          const ws = Array.isArray(row.weekly_sessions) ? row.weekly_sessions[0] : row.weekly_sessions;
          if (!booker || !ws?.date) return;
          const effectiveMethod = booker.primary_payment_method || booker.membership_types?.[0] || null;
          if (effectiveMethod !== 'ten_card') return;
          const holderId = booker.ten_card_holder_id || booker.id;
          const purchaseDate = purchaseByHolder.get(holderId);
          // Bound by the holder's card purchase date — bookings before that
          // belong to a previous card and should not count against this one.
          if (purchaseDate && ws.date < purchaseDate) return;
          if (ws.date >= todayIso) {
            if (row.status !== 'confirmed') return; // only confirmed reserves a future slot
            upcomingTenCardMap[holderId] = (upcomingTenCardMap[holderId] || 0) + 1;
          } else {
            pastTenCardMap[holderId] = (pastTenCardMap[holderId] || 0) + 1;
          }
        });
      }

      let membersWithAttendance = (membersData || []).map(member => ({
        ...member,
        subscription_plan_type: planTypeMap[member.id] || null,
        attendance_count: attendanceMap[member.id] || 0,
        last_attendance_date: lastAttendanceMap[member.id] || null,
        upcoming_ten_card_bookings: upcomingTenCardMap[member.id] || 0,
        past_ten_card_bookings: pastTenCardMap[member.id] || 0,
      }));

      // Family members inherit subscription status from their primary member
      const familyMembers = membersWithAttendance.filter(m => m.account_type === 'family_member' && m.primary_member_id);
      if (familyMembers.length > 0) {
        const primaryIds = [...new Set(familyMembers.map(m => m.primary_member_id!))];
        // Check which primaries are already in the fetched set
        const fetchedPrimaryMap = new Map<string, { athlete_subscription_status: string; athlete_subscription_start: string | null; athlete_subscription_end: string | null; subscription_tier: string | null; id: string; name?: string | null; display_name?: string | null }>(
          membersWithAttendance.filter(m => primaryIds.includes(m.id)).map(m => [m.id, m])
        );
        // Fetch any missing primaries
        const missingIds = primaryIds.filter(id => !fetchedPrimaryMap.has(id));
        if (missingIds.length > 0) {
          const { data: primaryData } = await supabase
            .from('members')
            .select('id, name, display_name, athlete_subscription_status, athlete_subscription_start, athlete_subscription_end, subscription_tier')
            .in('id', missingIds);
          if (primaryData) {
            primaryData.forEach(p => fetchedPrimaryMap.set(p.id, p));
          }
        }
        // Apply primary's subscription fields to family members
        membersWithAttendance = membersWithAttendance.map(m => {
          if (m.account_type === 'family_member' && m.primary_member_id) {
            const primary = fetchedPrimaryMap.get(m.primary_member_id);
            if (primary) {
              return {
                ...m,
                primary_member_name: primary.display_name || primary.name || null,
                athlete_subscription_status: primary.athlete_subscription_status,
                athlete_subscription_start: primary.athlete_subscription_start,
                athlete_subscription_end: primary.athlete_subscription_end,
                subscription_tier: primary.subscription_tier,
                subscription_plan_type: planTypeMap[primary.id] || null,
              };
            }
          }
          return m;
        });
      }

      // Filter at-risk: 0 attendance + regular membership types, exclude guardian-only
      if (status === 'at-risk') {
        const regularTypes = ['member', 'ten_card', 'wellpass', 'hansefit'];
        membersWithAttendance = membersWithAttendance.filter(member => {
          const hasZeroAttendance = member.attendance_count === 0;
          const isRegularMember = member.membership_types?.some(
            (type: string) => regularTypes.includes(type)
          );
          return hasZeroAttendance && isRegularMember && !member.guardian_only;
        });
      }

      setMembers(membersWithAttendance);

      // Auto-expire trials and cash-activated subs past their end date
      // Pass planTypeMap so members with active Stripe subscriptions are not expired
      autoExpireSubscriptions(membersWithAttendance, planTypeMap);
      // Check for subscriptions expiring within 14 days
      checkExpiringSubscriptions(membersWithAttendance);
    } catch (error) {
      console.error('fetchMembersWithAttendance failed:', error);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  // Auto-expire trials and cash-activated subs that have passed their end date
  // Skip members with active/trialing Stripe subscriptions (Stripe is source of truth)
  const expiredIdsRef = useRef<Set<string>>(new Set());
  const autoExpireSubscriptions = async (membersList: Member[], stripeSubMap: Record<string, string>) => {
    const now = new Date();
    const expired = membersList.filter(m =>
      m.account_type !== 'family_member' &&
      (m.athlete_subscription_status === 'trial' || m.athlete_subscription_status === 'active') &&
      m.athlete_subscription_end &&
      new Date(m.athlete_subscription_end) < now &&
      !expiredIdsRef.current.has(m.id) &&
      !stripeSubMap[m.id] // Skip if member has active/trialing Stripe subscription
    );

    if (expired.length === 0) return;

    await Promise.all(expired.map(async (m) => {
      try {
        await authFetch('/api/members/athlete-subscription', {
          method: 'POST',
          body: JSON.stringify({ memberId: m.id, action: 'expire' }),
        });
        expiredIdsRef.current.add(m.id);
      } catch (err) {
        console.error('Auto-expire failed for', m.id, err);
      }
    }));

    // Update local state
    setMembers(prev => prev.map(m =>
      expiredIdsRef.current.has(m.id)
        ? { ...m, athlete_subscription_status: 'expired' }
        : m
    ));
  };

  // Send 14-day expiry warning for cash-activated subs (once per session)
  const warnedIdsRef = useRef<Set<string>>(new Set());
  const checkExpiringSubscriptions = async (membersList: Member[]) => {
    const now = new Date();
    const fourteenDays = 14 * 24 * 60 * 60 * 1000;
    const expiringSoon = membersList.filter(m =>
      m.account_type !== 'family_member' &&
      m.athlete_subscription_status === 'active' &&
      m.athlete_subscription_end &&
      !warnedIdsRef.current.has(m.id) &&
      (() => {
        const end = new Date(m.athlete_subscription_end!);
        const diff = end.getTime() - now.getTime();
        return diff > 0 && diff <= fourteenDays;
      })()
    );

    if (expiringSoon.length === 0) return;

    await Promise.all(expiringSoon.map(async (m) => {
      try {
        await authFetch('/api/notifications/subscription-expiring', {
          method: 'POST',
          body: JSON.stringify({ memberId: m.id }),
        });
        warnedIdsRef.current.add(m.id);
      } catch (err) {
        console.error('Expiry warning failed for', m.id, err);
      }
    }));
  };

  const refreshData = () => fetchMembersWithAttendance(activeTab, attendanceTimeframe);
  const refreshPendingCount = () => fetchPendingCount();

  const toggleFilter = (type: MembershipType) => {
    setSelectedFilters(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleClassTypeFilter = (type: ClassType) => {
    setSelectedClassTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleAgeFilterChange = (newFilter: 'all' | 'adults' | 'kids' | '<7' | '7-11' | '12-16' | '7-16') => {
    setAgeFilter(newFilter);
    if (newFilter === 'kids' || newFilter === '7-16' || newFilter === '<7' || newFilter === '7-11' || newFilter === '12-16') {
      setSelectedFilters(prev => prev.filter(type => ['member', 'ten_card', 'wellpass'].includes(type)));
    }
  };

  // Apply filters
  let filteredMembers = members;

  if (ageFilter === 'kids') {
    filteredMembers = filteredMembers.filter(member => {
      const age = getAge(member.date_of_birth);
      return age !== null && age < 16;
    });
  } else if (ageFilter === 'adults') {
    filteredMembers = filteredMembers.filter(member => {
      const age = getAge(member.date_of_birth);
      return age === null || age >= 16;
    });
  } else if (ageFilter === '7-16') {
    filteredMembers = filteredMembers.filter(member => {
      const age = getAge(member.date_of_birth);
      return age !== null && age >= 7 && age <= 16;
    });
  } else if (ageFilter === '<7') {
    filteredMembers = filteredMembers.filter(member => {
      const age = getAge(member.date_of_birth);
      return age !== null && age < 7;
    });
  } else if (ageFilter === '7-11') {
    filteredMembers = filteredMembers.filter(member => {
      const age = getAge(member.date_of_birth);
      return age !== null && age >= 7 && age <= 11;
    });
  } else if (ageFilter === '12-16') {
    filteredMembers = filteredMembers.filter(member => {
      const age = getAge(member.date_of_birth);
      return age !== null && age >= 12 && age <= 16;
    });
  }

  if (selectedFilters.length > 0) {
    filteredMembers = filteredMembers.filter(member =>
      member.membership_types?.some(type => selectedFilters.includes(type))
    );
  }

  if (selectedClassTypes.length > 0) {
    filteredMembers = filteredMembers.filter(member =>
      member.class_types?.some(type => selectedClassTypes.includes(type))
    );
  }

  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    filteredMembers = filteredMembers.filter(member =>
      member.name?.toLowerCase().includes(q) ||
      member.display_name?.toLowerCase().includes(q) ||
      member.email?.toLowerCase().includes(q)
    );
  }

  const getMembershipTypeCounts = () => {
    const counts: Record<MembershipType, number> = {
      member: 0, drop_in: 0, ten_card: 0, wellpass: 0, hansefit: 0,
    };
    members.forEach(member => {
      member.membership_types?.forEach(type => {
        counts[type]++;
      });
    });
    return counts;
  };

  const membershipCounts = getMembershipTypeCounts();

  return {
    activeTab,
    setActiveTab,
    members,
    setMembers,
    loading,
    filteredMembers,
    selectedFilters,
    setSelectedFilters,
    selectedClassTypes,
    setSelectedClassTypes,
    ageFilter,
    attendanceTimeframe,
    setAttendanceTimeframe,
    pendingCount,
    atRiskCount,
    membershipCounts,
    refreshData,
    refreshPendingCount,
    refreshWhiteboardNames: fetchUnlinkedWhiteboardNames,
    unlinkedWhiteboardNames,
    toggleFilter,
    toggleClassTypeFilter,
    handleAgeFilterChange,
    searchQuery,
    setSearchQuery,
  };
}
