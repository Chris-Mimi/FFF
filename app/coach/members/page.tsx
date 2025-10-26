'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Check, X, UserCheck, UserX, Clock, LogOut } from 'lucide-react';
import { signOut } from '@/lib/auth';

type MemberStatus = 'pending' | 'active' | 'blocked';

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
}

export default function CoachMembersPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<MemberStatus>('pending');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingMemberId, setProcessingMemberId] = useState<string | null>(null);

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
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
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

  const getTrialStatus = (member: Member) => {
    if (member.athlete_subscription_status === 'trial' && member.athlete_subscription_end) {
      const daysLeft = Math.ceil(
        (new Date(member.athlete_subscription_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysLeft > 0 ? `${daysLeft} days left` : 'Expired';
    }
    return member.athlete_subscription_status === 'active' ? 'Active' : 'No access';
  };

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
        ) : (
          <div className="grid gap-4">
            {members.map((member) => (
              <div
                key={member.id}
                className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-semibold text-white">{member.name}</h3>
                      {member.account_type === 'family_member' && (
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                          Family Member
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
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
                  </div>

                  {/* Actions */}
                  {activeTab === 'pending' && (
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleApprove(member.id)}
                        disabled={processingMemberId === member.id}
                        className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200"
                      >
                        <Check size={18} />
                        Approve
                      </button>
                      <button
                        onClick={() => handleBlock(member.id)}
                        disabled={processingMemberId === member.id}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200"
                      >
                        <X size={18} />
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
    </div>
  );
}
