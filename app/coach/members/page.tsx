'use client';

import TenCardModal from '@/components/TenCardModal';
import { signOut } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Check, Clock, LogOut, UserCheck, UserX, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type MemberStatus = 'pending' | 'active' | 'blocked';

type MembershipType = 'member' | 'drop_in' | 'ten_card' | 'wellpass' | 'hansefit' | 'trial';

interface Member {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  status: MemberStatus;
  account_type: 'primary' | 'family_member';
  primary_member_id: string | null;
  athlete_trial_start: string | null;
  athlete_subscription_status: 'trial' | 'active' | 'expired';
  athlete_subscription_end: string | null;
  created_at: string;
  membership_types: MembershipType[];
  ten_card_purchase_date: string | null;
  ten_card_sessions_used: number;
}

const MEMBERSHIP_TYPE_LABELS: Record<MembershipType, string> = {
  member: 'Mb',
  drop_in: 'Di',
  ten_card: '10',
  wellpass: 'Wp',
  hansefit: 'Hf',
  trial: 'Pt',
};

const MEMBERSHIP_TYPE_COLORS: Record<MembershipType, { active: string; inactive: string }> = {
  member: { active: 'bg-blue-600 text-white', inactive: 'bg-gray-700 text-gray-300 hover:bg-blue-600/20' },
  drop_in: { active: 'bg-emerald-600 text-white', inactive: 'bg-gray-700 text-gray-300 hover:bg-emerald-600/20' },
  ten_card: { active: 'bg-purple-600 text-white', inactive: 'bg-gray-700 text-gray-300 hover:bg-purple-600/20' },
  wellpass: { active: 'bg-orange-600 text-white', inactive: 'bg-gray-700 text-gray-300 hover:bg-orange-600/20' },
  hansefit: { active: 'bg-pink-600 text-white', inactive: 'bg-gray-700 text-gray-300 hover:bg-pink-600/20' },
  trial: { active: 'bg-amber-600 text-white', inactive: 'bg-gray-700 text-gray-300 hover:bg-amber-600/20' },
};

export default function CoachMembersPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<MemberStatus>('active');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingMemberId, setProcessingMemberId] = useState<string | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<MembershipType[]>([]);
  const [tenCardModal, setTenCardModal] = useState<{
    isOpen: boolean;
    member: Member | null;
  }>({ isOpen: false, member: null });

  useEffect(() => {
    // Check authentication (simple check for now)
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      }
    };
    checkAuth();
    fetchMembers(activeTab);
  }, [activeTab, router]);

  const fetchMembers = async (status: MemberStatus) => {
    console.log('🚀 fetchMembers starting, status:', status);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });

      console.log('🔍 fetchMembers result:', { data, error });

      if (error) {
        console.error('❌ fetchMembers error:', error);
        throw error;
      }

      console.log('✅ fetchMembers success:', data?.length, 'members, first member 10-card data:', data?.[0]?.ten_card_purchase_date, data?.[0]?.ten_card_sessions_used);
      setMembers(data || []);
    } catch (error) {
      console.error('💥 fetchMembers failed:', error);
      setLoading(false); // Make sure loading ends even on error
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (memberId: string) => {
    setProcessingMemberId(memberId);
    try {
      const response = await fetch('/api/members/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve member');
      }

      // Refresh members list
      await fetchMembers(activeTab);
    } catch (error) {
      console.error('Error approving member:', error);
      alert('Failed to approve member. Please try again.');
    } finally {
      setProcessingMemberId(null);
    }
  };

  const handleBlock = async (memberId: string) => {
    if (!confirm('Are you sure you want to block this member?')) {
      return;
    }

    setProcessingMemberId(memberId);
    try {
      const response = await fetch('/api/members/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to block member');
      }

      // Refresh members list
      await fetchMembers(activeTab);
    } catch (error) {
      console.error('Error blocking member:', error);
      alert('Failed to block member. Please try again.');
    } finally {
      setProcessingMemberId(null);
    }
  };

  const toggleFilter = (type: MembershipType) => {
    setSelectedFilters(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleToggleMembershipType = async (memberId: string, type: MembershipType, currentTypes: MembershipType[]) => {
    try {
      const newTypes = currentTypes.includes(type)
        ? currentTypes.filter(t => t !== type)
        : [...currentTypes, type];

      const { error } = await supabase
        .from('members')
        .update({ membership_types: newTypes })
        .eq('id', memberId);

      if (error) throw error;

      // Update local state
      setMembers(prevMembers =>
        prevMembers.map(m =>
          m.id === memberId ? { ...m, membership_types: newTypes } : m
        )
      );
    } catch (error) {
      console.error('Error updating membership types:', error);
      alert('Failed to update membership type');
    }
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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter members based on selected membership types
  const filteredMembers = selectedFilters.length === 0
    ? members
    : members.filter(member =>
        member.membership_types?.some(type => selectedFilters.includes(type))
      );

  const getMembershipTypeCounts = () => {
    const counts: Record<MembershipType, number> = {
      member: 0,
      drop_in: 0,
      ten_card: 0,
      wellpass: 0,
      hansefit: 0,
      trial: 0,
    };

    members.forEach(member => {
      member.membership_types?.forEach(type => {
        counts[type]++;
      });
    });

    return counts;
  };

  const getTrialStatus = (member: Member) => {
    if (member.athlete_subscription_status === 'trial' && member.athlete_subscription_end) {
      const daysLeft = Math.ceil(
        (new Date(member.athlete_subscription_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysLeft > 0 ? `${daysLeft} days left` : 'Expired';
    }
    return member.athlete_subscription_status === 'active' ? 'Active' : 'No access';
  };

  const membershipCounts = getMembershipTypeCounts();
  const totalActiveAthletes = members.length;

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Member Management</h1>
              <p className="text-gray-400 text-sm mt-1">Approve and manage gym members</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/coach')}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200"
              >
                Back to Dashboard
              </button>
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

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex gap-2 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-6 py-3 font-medium transition-colors duration-200 border-b-2 ${
              activeTab === 'active'
                ? 'border-teal-500 text-teal-500'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <UserCheck size={18} />
              Active
            </div>
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-6 py-3 font-medium transition-colors duration-200 border-b-2 ${
              activeTab === 'pending'
                ? 'border-teal-500 text-teal-500'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock size={18} />
              Pending
            </div>
          </button>
          <button
            onClick={() => setActiveTab('blocked')}
            className={`px-6 py-3 font-medium transition-colors duration-200 border-b-2 ${
              activeTab === 'blocked'
                ? 'border-teal-500 text-teal-500'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <UserX size={18} />
              Blocked
            </div>
          </button>
        </div>
      </div>

      {/* Filters */}
      {members.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-400 font-medium">Filter by type:</span>
            {(Object.keys(MEMBERSHIP_TYPE_LABELS) as MembershipType[]).map(type => (
              <button
                key={type}
                onClick={() => toggleFilter(type)}
                className={`flex flex-col items-center px-2.5 py-1 rounded text-xs font-medium transition ${
                  selectedFilters.includes(type)
                    ? MEMBERSHIP_TYPE_COLORS[type].active
                    : MEMBERSHIP_TYPE_COLORS[type].inactive
                }`}
              >
                <span>{MEMBERSHIP_TYPE_LABELS[type]}</span>
                <span className="text-[10px] opacity-75">{membershipCounts[type]}</span>
              </button>
            ))}
            {selectedFilters.length > 0 && (
              <button
                onClick={() => setSelectedFilters([])}
                className="px-2.5 py-1 rounded text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition"
              >
                Clear ({filteredMembers.length})
              </button>
            )}
            <div className="ml-auto px-3 py-1 bg-gray-700 rounded text-xs font-medium text-gray-300">
              Total Athletes: {totalActiveAthletes}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 pb-12">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-teal-500 border-r-transparent"></div>
            <p className="text-gray-400 mt-4">Loading members...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
            <p className="text-gray-400 text-lg">
              {activeTab === 'pending' && 'No pending member requests'}
              {activeTab === 'active' && 'No active members'}
              {activeTab === 'blocked' && 'No blocked members'}
            </p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
            <p className="text-gray-400 text-lg">No members match the selected filters</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                className="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-gray-600 transition-colors duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-base font-semibold text-white">{member.name}</h3>
                      {member.account_type === 'family_member' && (
                        <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                          Family
                        </span>
                      )}
                      {member.membership_types?.includes('ten_card') && (
                        <button
                          onClick={() => setTenCardModal({ isOpen: true, member })}
                          className={`px-2 py-0.5 rounded text-xs font-medium transition cursor-pointer ${
                            member.ten_card_sessions_used >= 9
                              ? 'bg-red-600 text-white hover:bg-red-700'
                              : 'bg-purple-600 text-white hover:bg-purple-700'
                          }`}
                          title="Manage 10-card"
                        >
                          {member.ten_card_sessions_used || 0}/10
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-gray-400">Email:</span>{' '}
                        <span className="text-white">{member.email}</span>
                      </div>
                      {member.phone && (
                        <div>
                          <span className="text-gray-400">Phone:</span>{' '}
                          <span className="text-white">{member.phone}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-400">Registered:</span>{' '}
                        <span className="text-white">{formatDate(member.created_at)}</span>
                      </div>
                      {activeTab === 'active' && (
                        <div>
                          <span className="text-gray-400">Athlete Trial:</span>{' '}
                          <span className={`font-medium ${
                            member.athlete_subscription_status === 'trial' ? 'text-teal-400' :
                            member.athlete_subscription_status === 'active' ? 'text-green-400' :
                            'text-gray-500'
                          }`}>
                            {getTrialStatus(member)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Membership Type Checkboxes */}
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {(Object.keys(MEMBERSHIP_TYPE_LABELS) as MembershipType[]).map(type => {
                        const isChecked = member.membership_types?.includes(type) || false;
                        return (
                          <label
                            key={type}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer transition ${
                              isChecked
                                ? MEMBERSHIP_TYPE_COLORS[type].active
                                : MEMBERSHIP_TYPE_COLORS[type].inactive
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleMembershipType(member.id, type, member.membership_types || [])}
                              className="w-3 h-3 rounded"
                            />
                            <span>{MEMBERSHIP_TYPE_LABELS[type]}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  {activeTab === 'pending' && (
                    <div className="flex gap-2 ml-3">
                      <button
                        onClick={() => handleApprove(member.id)}
                        disabled={processingMemberId === member.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200 text-sm"
                      >
                        <Check size={16} />
                        Approve
                      </button>
                      <button
                        onClick={() => handleBlock(member.id)}
                        disabled={processingMemberId === member.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200 text-sm"
                      >
                        <X size={16} />
                        Block
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ten Card Modal */}
      <TenCardModal
        isOpen={tenCardModal.isOpen}
        onClose={() => setTenCardModal({ isOpen: false, member: null })}
        member={tenCardModal.member}
        onUpdate={() => fetchMembers(activeTab)}
      />
    </div>
  );
}
