import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { authFetch } from '@/lib/auth-fetch';
import { useRouter } from 'next/navigation';
import { MemberStatus, MembershipType, ClassType, Member, getAge } from '@/types/member';
import { sessionStartInstant } from '@/lib/bookingRules';

export function useMemberData() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<MemberStatus>('active');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilters, setSelectedFilters] = useState<MembershipType[]>([]);
  const [selectedClassTypes, setSelectedClassTypes] = useState<ClassType[]>([]);
  const [ageFilter, setAgeFilter] = useState<'all' | 'adults' | 'kids' | '<7' | '7-11' | '12-16' | '7-16'>('all');
  const [attendanceTimeframe, setAttendanceTimeframe] = useState<7 | 30 | 60 | 365 | 'all'>('all');
  const [pendingCount, setPendingCount] = useState(0);
  const [atRiskCount, setAtRiskCount] = useState(0);
  const [lowTenCardCount, setLowTenCardCount] = useState(0);
  const [unlinkedWhiteboardNames, setUnlinkedWhiteboardNames] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUnlinkedWhiteboardNames = async () => {
    try {
      // Paginate the scores query — wod_section_results is a large growing table,
      // so an unbounded select caps at 1000 rows and silently drops names (S349).
      const PAGE = 1000;
      const scoreNames: string[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from('wod_section_results')
          .select('whiteboard_name')
          .not('whiteboard_name', 'is', null)
          .is('member_id', null)
          .range(from, from + PAGE - 1);
        if (error) {
          console.error('Error fetching unlinked whiteboard names:', error);
          return;
        }
        if (!data || data.length === 0) break;
        for (const r of data) scoreNames.push(r.whiteboard_name as string);
        if (data.length < PAGE) break;
      }

      const { data: memberRows, error: membersErr } = await supabase
        .from('members')
        .select('whiteboard_name')
        .not('whiteboard_name', 'is', null);
      if (membersErr) {
        console.error('Error fetching unlinked whiteboard names:', membersErr);
        return;
      }

      const assigned = new Set(
        (memberRows || []).map(m => (m.whiteboard_name as string).toLowerCase())
      );
      const unique = [...new Set(scoreNames)]
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
    fetchLowTenCardCount();
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

  // Count active ten_card holders whose remaining sessions are <= 1 (includes overage / negative).
  // Used for the "10-Card" tab badge. Matches the same filter used in the tab content path.
  const fetchLowTenCardCount = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('ten_card_sessions_used, ten_card_total, membership_types')
        .eq('status', 'active')
        .neq('parked', true)
        .contains('membership_types', ['ten_card']);
      if (error || !data) {
        setLowTenCardCount(0);
        return;
      }
      const count = data.filter(m => {
        const total = m.ten_card_total ?? 10;
        const used = m.ten_card_sessions_used ?? 0;
        return total - used <= 1;
      }).length;
      setLowTenCardCount(count);
    } catch (error) {
      console.error('Error fetching low ten-card count:', error);
      setLowTenCardCount(0);
    }
  };

  const fetchAtRiskCount = async (timeframe: 7 | 30 | 60 | 365 | 'all') => {
    try {
      const daysParam = timeframe === 'all' ? 36500 : timeframe;
      const regularTypes = ['member', 'ten_card', 'wellpass', 'hansefit'];

      const { data: activeMembers } = await supabase
        .from('members')
        .select('id, membership_types, guardian_only')
        .eq('status', 'active')
        .neq('parked', true)
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

  const fetchMembersWithAttendance = async (status: MemberStatus, timeframe: 7 | 30 | 60 | 365 | 'all') => {
    // Wellpass tab manages its own data fetching — skip the members query.
    if (status === 'wellpass') {
      setMembers([]);
      setLoading(false);
      return;
    }
    const daysParam = timeframe === 'all' ? 36500 : timeframe;
    setLoading(true);
    try {
      let query = supabase.from('members').select('id, email, name, display_name, phone, status, account_type, primary_member_id, athlete_trial_start, athlete_subscription_status, athlete_subscription_start, athlete_subscription_end, subscription_tier, created_at, membership_types, ten_card_purchase_date, ten_card_sessions_used, ten_card_sessions_used_offset, ten_card_total, ten_card_expiry_date, ten_card_notes, subscription_notes, date_of_birth, class_types, gender, guardian_only, primary_payment_method, ten_card_holder_id, wellpass_booking_restricted, parked');

      if (status === 'parked') {
        query = query.eq('parked', true);
      } else if (status === 'subscriptions') {
        query = query
          .eq('status', 'active')
          .neq('parked', true)
          .in('athlete_subscription_status', ['trial', 'active']);
      } else if (status === 'at-risk') {
        query = query.eq('status', 'active').neq('parked', true);
      } else if (status === 'low-ten-card') {
        query = query
          .eq('status', 'active')
          .neq('parked', true)
          .contains('membership_types', ['ten_card']);
      } else if (status === 'active') {
        query = query.eq('status', 'active').neq('parked', true);
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
      let subCreatedAtMap: Record<string, string> = {};
      if (memberIds.length > 0) {
        const { data: subsData } = await supabase
          .from('subscriptions')
          .select('member_id, plan_type, created_at')
          .in('member_id', memberIds)
          .in('status', ['active', 'trialing']);

        if (subsData) {
          planTypeMap = Object.fromEntries(
            subsData.map((row: { member_id: string; plan_type: string; created_at: string }) => [
              row.member_id,
              row.plan_type as 'monthly' | 'yearly',
            ])
          );
          subCreatedAtMap = Object.fromEntries(
            subsData.map((row: { member_id: string; plan_type: string; created_at: string }) => [
              row.member_id,
              row.created_at,
            ])
          );
        }
      }

      // Coach-only park/block reasons live in coach_member_notes (RLS: coaches only,
      // so athletes can't read them). Only needed on the tabs that show them.
      let notesMap: Record<string, { park_reason: string | null; block_reason: string | null }> = {};
      if ((status === 'parked' || status === 'blocked') && memberIds.length > 0) {
        const { data: notesData } = await supabase
          .from('coach_member_notes')
          .select('member_id, park_reason, block_reason')
          .in('member_id', memberIds);
        if (notesData) {
          notesMap = Object.fromEntries(
            notesData.map((n: { member_id: string; park_reason: string | null; block_reason: string | null }) => [
              n.member_id,
              { park_reason: n.park_reason, block_reason: n.block_reason },
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
      // Per-member (booker's own) count of consumed bookings toward whichever card
      // they debit — so a sharer kid's profile can show "used N of the shared card".
      const ownTenCardMap: Record<string, number> = {};
      const tenCardHolders = (membersData || [])
        .filter(m => (m.membership_types || []).includes('ten_card'));
      if (tenCardHolders.length > 0) {
        const nowMs = Date.now();
        const tenCardHolderIds = tenCardHolders.map(m => m.id);
        // Kids sharing a holder's card don't appear in tenCardHolders themselves
        // (they may have membership_types=['family_member'] or different types) but
        // their bookings still debit the holder. Fetch them so we can include their
        // bookings in the result set. Without this filter the system-wide bookings
        // query silently truncates at PostgREST's 1000-row cap.
        const { data: sharers } = await supabase
          .from('members')
          .select('id')
          .in('ten_card_holder_id', tenCardHolderIds);
        const relevantMemberIds = [...tenCardHolderIds, ...(sharers || []).map(s => s.id)];

        const { data: tenCardBookings } = await supabase
          .from('bookings')
          .select('member_id, status, weekly_sessions!inner(date, time), members!inner(id, ten_card_holder_id, primary_payment_method, membership_types)')
          .eq('ten_card_consumed', true)
          .in('member_id', relevantMemberIds);

        type Row = {
          member_id: string;
          status: 'confirmed' | 'no_show' | 'late_cancel';
          weekly_sessions: { date: string; time: string } | { date: string; time: string }[];
          members: { id: string; ten_card_holder_id: string | null; primary_payment_method: string | null; membership_types: string[] | null } | { id: string; ten_card_holder_id: string | null; primary_payment_method: string | null; membership_types: string[] | null }[];
        };
        // Normalize purchase date to YYYY-MM-DD for safe string comparison against
        // weekly_sessions.date. The column comes back as a full ISO timestamp
        // ('2026-04-20T00:00:00+00:00'), and `'2026-04-20' < '2026-04-20T...'` is
        // TRUE in JS — which silently drops the boundary-date booking.
        const purchaseByHolder = new Map<string, string | null>(
          tenCardHolders.map(m => [m.id, m.ten_card_purchase_date ? m.ten_card_purchase_date.split('T')[0] : null])
        );
        (tenCardBookings as Row[] | null)?.forEach(row => {
          const booker = Array.isArray(row.members) ? row.members[0] : row.members;
          const ws = Array.isArray(row.weekly_sessions) ? row.weekly_sessions[0] : row.weekly_sessions;
          if (!booker || !ws?.date) return;
          // Mirror the write-side decision (app/api/bookings/create): a booking
          // debits a 10-card iff the booker's effective payment method is ten_card.
          // Miriam (primary=wellpass, types=['wellpass','ten_card']) must NOT
          // attribute her own bookings to her card.
          const effectiveMethod = booker.primary_payment_method || booker.membership_types?.[0] || null;
          if (effectiveMethod !== 'ten_card') return;
          const holderId = booker.ten_card_holder_id || booker.id;
          const purchaseDate = purchaseByHolder.get(holderId);
          // Bound by the holder's card purchase date — bookings before that
          // belong to a previous card and should not count against this one.
          if (purchaseDate && ws.date < purchaseDate) return;
          // Past/upcoming split by date+time vs now (Berlin TZ-safe via
          // sessionStartInstant — naïve `new Date('YYYY-MM-DDTHH:MM')` would
          // be interpreted as runtime-local on Vercel and shift by 2h). A
          // 10:00 session today reads "past" at 10:01 instead of staying
          // "upcoming" until midnight.
          const sessionMs = sessionStartInstant(ws.date, ws.time || '00:00:00').getTime();
          if (sessionMs >= nowMs) {
            if (row.status !== 'confirmed') return; // only confirmed reserves a future slot
            upcomingTenCardMap[holderId] = (upcomingTenCardMap[holderId] || 0) + 1;
            ownTenCardMap[booker.id] = (ownTenCardMap[booker.id] || 0) + 1;
          } else {
            pastTenCardMap[holderId] = (pastTenCardMap[holderId] || 0) + 1;
            ownTenCardMap[booker.id] = (ownTenCardMap[booker.id] || 0) + 1;
          }
        });
      }

      // Holder card lookup so a sharer's profile can mirror the holder's balance.
      const holderCardById = new Map(
        tenCardHolders.map(m => [
          m.id,
          {
            used: m.ten_card_sessions_used ?? 0,
            total: m.ten_card_total ?? 10,
            name: m.display_name || m.name,
          },
        ])
      );

      let membersWithAttendance = (membersData || []).map(member => {
        // Sharer (kid on a parent's card): mirror the holder's balance + own usage.
        const sharedCard = member.ten_card_holder_id
          ? holderCardById.get(member.ten_card_holder_id) ?? null
          : null;
        return {
          ...member,
          subscription_plan_type: planTypeMap[member.id] || null,
          attendance_count: attendanceMap[member.id] || 0,
          last_attendance_date: lastAttendanceMap[member.id] || null,
          upcoming_ten_card_bookings: upcomingTenCardMap[member.id] || 0,
          past_ten_card_bookings: pastTenCardMap[member.id] || 0,
          own_ten_card_used: ownTenCardMap[member.id] || 0,
          shared_card_holder_name: sharedCard?.name ?? null,
          shared_card_used: sharedCard ? sharedCard.used : null,
          shared_card_total: sharedCard ? sharedCard.total : null,
          park_reason: notesMap[member.id]?.park_reason ?? null,
          block_reason: notesMap[member.id]?.block_reason ?? null,
        };
      });

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

      // Subscriptions tab: sort by when the athlete first subscribed.
      // Priority: Stripe sub created_at (own or primary's) → athlete_trial_start → member created_at.
      // Direction: newest first. Stable across cash renewals (athlete_subscription_start would reset).
      if (status === 'subscriptions') {
        const sortKey = (m: typeof membersWithAttendance[number]): string => {
          if (subCreatedAtMap[m.id]) return subCreatedAtMap[m.id];
          if (m.account_type === 'family_member' && m.primary_member_id && subCreatedAtMap[m.primary_member_id]) {
            return subCreatedAtMap[m.primary_member_id];
          }
          if (m.athlete_trial_start) return m.athlete_trial_start;
          return m.created_at;
        };
        membersWithAttendance = [...membersWithAttendance].sort((a, b) =>
          sortKey(b).localeCompare(sortKey(a))
        );
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

      // Filter low-ten-card: only ten-card members with <= 1 sessions remaining (includes overage).
      // Sort: smallest remaining first (overages on top).
      if (status === 'low-ten-card') {
        membersWithAttendance = membersWithAttendance
          .filter(member => {
            const total = member.ten_card_total ?? 10;
            const used = member.ten_card_sessions_used ?? 0;
            return total - used <= 1;
          })
          .sort((a, b) => {
            const aRem = (a.ten_card_total ?? 10) - (a.ten_card_sessions_used ?? 0);
            const bRem = (b.ten_card_total ?? 10) - (b.ten_card_sessions_used ?? 0);
            return aRem - bRem;
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
    // Cash subs get a 7-day grace past their end date before access is cut (S407,
    // Chris's call — being blocked the instant payment slips is unfriendly, and the
    // athlete app warns them to pay during the grace). Trials still expire on end date.
    const cashGraceCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const expired = membersList.filter(m => {
      if (m.account_type === 'family_member') return false;
      if (!m.athlete_subscription_end) return false;
      if (expiredIdsRef.current.has(m.id)) return false;
      if (stripeSubMap[m.id]) return false; // Stripe is source of truth — never auto-expire
      const end = new Date(m.athlete_subscription_end);
      if (m.athlete_subscription_status === 'trial') return end < now;
      if (m.athlete_subscription_status === 'active') return end < cashGraceCutoff;
      return false;
    });

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

  const refreshData = async () => {
    await Promise.all([
      fetchMembersWithAttendance(activeTab, attendanceTimeframe),
      fetchLowTenCardCount(),
    ]);
  };
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
    lowTenCardCount,
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
