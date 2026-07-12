'use client';

import TenCardModal from '@/components/coach/TenCardModal';
import MemberCard from '@/components/coach/members/MemberCard';
import MemberFilters from '@/components/coach/members/MemberFilters';
import WellpassTab from '@/components/coach/members/WellpassTab';
import { useMemberData } from '@/hooks/coach/useMemberData';
import { useMemberActions } from '@/hooks/coach/useMemberActions';
import { signOut } from '@/lib/auth';
import { Member } from '@/types/member';
import { AlertTriangle, Check, Clock, LogOut, Pause, Search, Sparkles, UserCheck, UserX, X } from 'lucide-react';
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
    lowTenCardCount,
    membershipCounts,
    refreshData,
    refreshPendingCount,
    refreshWhiteboardNames,
    unlinkedWhiteboardNames,
    toggleFilter,
    toggleClassTypeFilter,
    handleAgeFilterChange,
    searchQuery,
    setSearchQuery,
  } = useMemberData();

  const {
    processingMemberId,
    handleApprove,
    handleReject,
    handleBlock,
    handleUnapprove,
    handleUnblock,
    handlePark,
    handleRestart,
    handleStartTrial,
    handleExtendTrial,
    handleActivateSubscription,
    handleActivateMonthly,
    handleActivatePermanent,
    handleCancelSubscription,
    handleToggleMembershipType,
    handleToggleClassType,
    handleSetGender,
    handleToggleGuardianOnly,
    handleSetPaymentMethod,
    handleSetTenCardHolder,
  } = useMemberActions(refreshData, refreshPendingCount, setMembers, refreshWhiteboardNames);

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
              activeTab === 'pending' || activeTab === 'blocked' || activeTab === 'parked'
                ? 'border-teal-500 text-teal-500'
                : pendingCount > 0
                ? 'border-transparent text-orange-400 hover:text-orange-300 animate-pulse'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-1 md:gap-2">
              <Clock size={16} className="md:w-[18px] md:h-[18px]" />
              Pending
              {pendingCount > 0 && activeTab !== 'pending' && activeTab !== 'blocked' && activeTab !== 'parked' && (
                <span className="inline-flex items-center justify-center w-4 h-4 md:w-5 md:h-5 text-[10px] md:text-xs font-bold text-white bg-orange-500 rounded-full">
                  {pendingCount}
                </span>
              )}
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
          <button
            onClick={() => setActiveTab('low-ten-card')}
            className={`px-3 md:px-6 py-2 md:py-3 font-medium transition-colors duration-200 border-b-2 text-sm md:text-base whitespace-nowrap flex-shrink-0 ${
              activeTab === 'low-ten-card'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-1 md:gap-2">
              <AlertTriangle size={16} className="md:w-[18px] md:h-[18px]" />
              10-Card
              {lowTenCardCount > 0 && activeTab !== 'low-ten-card' && (
                <span className="inline-flex items-center justify-center w-4 h-4 md:w-5 md:h-5 text-[10px] md:text-xs font-bold text-white bg-purple-600 rounded-full">
                  {lowTenCardCount}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('wellpass')}
            className={`px-3 md:px-6 py-2 md:py-3 font-medium transition-colors duration-200 border-b-2 text-sm md:text-base whitespace-nowrap flex-shrink-0 ${
              activeTab === 'wellpass'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-1 md:gap-2">
              <Sparkles size={16} className="md:w-[18px] md:h-[18px]" />
              Wellpass
            </div>
          </button>
        </div>
      </div>

      {/* Filters (hidden on Wellpass tab — that tab manages its own state) */}
      {activeTab !== 'wellpass' && (
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
      )}

      {/* Search (hidden on Wellpass tab) */}
      {activeTab !== 'wellpass' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full pl-10 pr-10 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                aria-label="Clear search"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Pending / Blocked / Parked sub-toggle (rare edge-case states, grouped under one tab) */}
      {(activeTab === 'pending' || activeTab === 'blocked' || activeTab === 'parked') && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="inline-flex rounded-lg border border-gray-700 overflow-hidden">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === 'pending' ? 'bg-teal-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              <Clock size={14} />
              Pending
              {pendingCount > 0 && (
                <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-orange-500 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('blocked')}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === 'blocked' ? 'bg-teal-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              <UserX size={14} />
              Blocked
            </button>
            <button
              onClick={() => setActiveTab('parked')}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === 'parked' ? 'bg-teal-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              <Pause size={14} />
              Parked
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 pb-12">
        {activeTab === 'wellpass' ? (
          <WellpassTab />
        ) : loading ? (
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
              {activeTab === 'low-ten-card' && 'No 10-card members are running low.'}
              {activeTab === 'parked' && 'No parked members. Park an athlete from the Active tab to hide them here.'}
            </p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
            <p className="text-gray-400 text-lg">
              {searchQuery ? `No members match "${searchQuery}"` : 'No members match the selected filters'}
            </p>
          </div>
        ) : (
          <div className="grid gap-2">
            {filteredMembers.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                activeTab={activeTab}
                processingMemberId={processingMemberId}
                unlinkedWhiteboardNames={unlinkedWhiteboardNames}
                onApprove={handleApprove}
                onReject={handleReject}
                onBlock={handleBlock}
                onUnapprove={handleUnapprove}
                onUnblock={handleUnblock}
                onPark={handlePark}
                onRestart={handleRestart}
                onStartTrial={handleStartTrial}
                onExtendTrial={handleExtendTrial}
                onActivateSubscription={handleActivateSubscription}
                onActivateMonthly={handleActivateMonthly}
                onActivatePermanent={handleActivatePermanent}
                onCancelSubscription={handleCancelSubscription}
                onToggleMembershipType={handleToggleMembershipType}
                onToggleClassType={handleToggleClassType}
                onSetGender={handleSetGender}
                onToggleGuardianOnly={handleToggleGuardianOnly}
                onSetPaymentMethod={handleSetPaymentMethod}
                onSetTenCardHolder={handleSetTenCardHolder}
                onOpenTenCard={(m) => {
                  // Refresh members list so chip + modal show fresh counter on open.
                  // Cheap safety net for the "chip shows full, modal shows fewer used" drift case.
                  refreshData();
                  setTenCardModal({ isOpen: true, member: m });
                }}
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
