import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
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
      const daysParam = timeframe === 'all' ? null : timeframe;
      const regularTypes = ['member', 'ten_card', 'wellpass', 'hansefit'];

      const { data: activeMembers } = await supabase
        .from('members')
        .select('id, membership_types')
        .eq('status', 'active');

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
    const daysParam = timeframe === 'all' ? null : timeframe;
    setLoading(true);
    try {
      let query = supabase.from('members').select('id, email, name, display_name, phone, status, account_type, primary_member_id, athlete_trial_start, athlete_subscription_status, athlete_subscription_end, created_at, membership_types, ten_card_purchase_date, ten_card_sessions_used, ten_card_total, ten_card_expiry_date, date_of_birth, class_types, gender');

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
          .eq('status', 'active');

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

      let membersWithAttendance = (membersData || []).map(member => ({
        ...member,
        subscription_plan_type: planTypeMap[member.id] || null,
        attendance_count: attendanceMap[member.id] || 0,
        last_attendance_date: lastAttendanceMap[member.id] || null,
      }));

      // Filter at-risk: 0 attendance + regular membership types only
      if (status === 'at-risk') {
        const regularTypes = ['member', 'ten_card', 'wellpass', 'hansefit'];
        membersWithAttendance = membersWithAttendance.filter(member => {
          const hasZeroAttendance = member.attendance_count === 0;
          const isRegularMember = member.membership_types?.some(
            (type: string) => regularTypes.includes(type)
          );
          return hasZeroAttendance && isRegularMember;
        });
      }

      setMembers(membersWithAttendance);
    } catch (error) {
      console.error('fetchMembersWithAttendance failed:', error);
      setLoading(false);
    } finally {
      setLoading(false);
    }
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

  const getMembershipTypeCounts = () => {
    const counts: Record<MembershipType, number> = {
      member: 0, drop_in: 0, ten_card: 0, wellpass: 0, hansefit: 0, trial: 0,
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
    toggleFilter,
    toggleClassTypeFilter,
    handleAgeFilterChange,
  };
}
