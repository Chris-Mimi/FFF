'use client';

import TenCardModal from '@/components/coach/TenCardModal';
import MemberCard from '@/components/coach/members/MemberCard';
import MemberFilters from '@/components/coach/members/MemberFilters';
import { useMemberData } from '@/hooks/coach/useMemberData';
import { useMemberActions } from '@/hooks/coach/useMemberActions';
import { signOut } from '@/lib/auth';
import { Member } from '@/types/member';
import { AlertTriangle, Check, Clock, LogOut, UserCheck, UserX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function CoachMembersPage() {
  const router = useRouter();
  const [tenCardModal, setTenCardModal] = useState<{
    isOpen: boolean;
    member: Member | null;
  }>({ isOpen: false, member: null });

  const {
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
  } = useMemberData();

  const {
    processingMemberId,
    handleApprove,
    handleBlock,
    handleUnapprove,
    handleUnblock,
    handleStartTrial,
    handleExtendTrial,
    handleActivateSubscription,
    handleToggleMembershipType,
    handleToggleClassType,
    handleSetGender,
  } = useMemberActions(refreshData, refreshPendingCount, setMembers);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 md:py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">
            <div>
              <h1 className="text-lg md:text-2xl font-bold text-white">Members</h1>
              <p className="text-gray-400 text-xs md:text-sm mt-1 hidden md:block">Approve and manage gym members</p>
            </div>
            <div className="grid grid-cols-2 md:flex md:items-center gap-2 md:gap-4">
              <button
                onClick={() => router.push('/coach')}
                className="flex items-center justify-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200 text-sm md:text-base"
              >
                Back
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 text-sm md:text-base"
              >
                <LogOut size={16} className="md:w-[18px] md:h-[18px]" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-3 md:mt-6">
        <div className="flex gap-1 md:gap-2 border-b border-gray-700 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-3 md:px-6 py-2 md:py-3 font-medium transition-colors duration-200 border-b-2 text-sm md:text-base whitespace-nowrap flex-shrink-0 ${
              activeTab === 'active'
                ? 'border-teal-500 text-teal-500'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-1 md:gap-2">
              <UserCheck size={16} className="md:w-[18px] md:h-[18px]" />
              Active
            </div>
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 md:px-6 py-2 md:py-3 font-medium transition-colors duration-200 border-b-2 text-sm md:text-base whitespace-nowrap flex-shrink-0 ${
              activeTab === 'pending'
                ? 'border-teal-500 text-teal-500'
                : pendingCount > 0
                ? 'border-transparent text-orange-400 hover:text-orange-300 animate-pulse'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-1 md:gap-2">
              <Clock size={16} className="md:w-[18px] md:h-[18px]" />
              Pending
              {pendingCount > 0 && activeTab !== 'pending' && (
                <span className="inline-flex items-center justify-center w-4 h-4 md:w-5 md:h-5 text-[10px] md:text-xs font-bold text-white bg-orange-500 rounded-full">
                  {pendingCount}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('blocked')}
            className={`px-3 md:px-6 py-2 md:py-3 font-medium transition-colors duration-200 border-b-2 text-sm md:text-base whitespace-nowrap flex-shrink-0 ${
              activeTab === 'blocked'
                ? 'border-teal-500 text-teal-500'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-1 md:gap-2">
              <UserX size={16} className="md:w-[18px] md:h-[18px]" />
              Blocked
            </div>
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`px-3 md:px-6 py-2 md:py-3 font-medium transition-colors duration-200 border-b-2 text-sm md:text-base whitespace-nowrap flex-shrink-0 ${
              activeTab === 'subscriptions'
                ? 'border-teal-500 text-teal-500'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-1 md:gap-2">
              <Check size={16} className="md:w-[18px] md:h-[18px]" />
              Subscriptions
            </div>
          </button>
          <button
            onClick={() => setActiveTab('at-risk')}
            className={`px-3 md:px-6 py-2 md:py-3 font-medium transition-colors duration-200 border-b-2 text-sm md:text-base whitespace-nowrap flex-shrink-0 ${
              activeTab === 'at-risk'
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-1 md:gap-2">
              <AlertTriangle size={16} className="md:w-[18px] md:h-[18px]" />
              At-Risk
              {atRiskCount > 0 && activeTab !== 'at-risk' && (
                <span className="inline-flex items-center justify-center w-4 h-4 md:w-5 md:h-5 text-[10px] md:text-xs font-bold text-white bg-orange-500 rounded-full">
                  {atRiskCount}
                </span>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Filters */}
      <MemberFilters
        attendanceTimeframe={attendanceTimeframe}
        onTimeframeChange={setAttendanceTimeframe}
        ageFilter={ageFilter}
        onAgeFilterChange={handleAgeFilterChange}
        selectedFilters={selectedFilters}
        onToggleFilter={toggleFilter}
        onClearFilters={() => setSelectedFilters([])}
        membershipCounts={membershipCounts}
        filteredCount={filteredMembers.length}
        selectedClassTypes={selectedClassTypes}
        onToggleClassType={toggleClassTypeFilter}
        onClearClassTypes={() => setSelectedClassTypes([])}
        hasMembers={members.length > 0}
      />

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
              {activeTab === 'subscriptions' && 'No members with subscriptions'}
              {activeTab === 'at-risk' && 'No at-risk members — everyone is attending!'}
            </p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
            <p className="text-gray-400 text-lg">No members match the selected filters</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {filteredMembers.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                activeTab={activeTab}
                processingMemberId={processingMemberId}
                onApprove={handleApprove}
                onBlock={handleBlock}
                onUnapprove={handleUnapprove}
                onUnblock={handleUnblock}
                onStartTrial={handleStartTrial}
                onExtendTrial={handleExtendTrial}
                onActivateSubscription={handleActivateSubscription}
                onToggleMembershipType={handleToggleMembershipType}
                onToggleClassType={handleToggleClassType}
                onSetGender={handleSetGender}
                onOpenTenCard={(m) => setTenCardModal({ isOpen: true, member: m })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Ten Card Modal */}
      <TenCardModal
        isOpen={tenCardModal.isOpen}
        onClose={() => setTenCardModal({ isOpen: false, member: null })}
        member={tenCardModal.member}
        onUpdate={refreshData}
      />
    </div>
  );
}
