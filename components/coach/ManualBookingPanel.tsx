'use client';

import { Member } from '@/hooks/coach/useSessionDetails';

interface ManualBookingPanelProps {
  availableMembers: Member[];
  selectedMemberId: string;
  onMemberSelect: (memberId: string) => void;
  onAddMember: () => Promise<void>;
  onAddTrialAthlete: () => Promise<void>;
  isLoading: boolean;
  capacity: number;
  confirmedCount: number;
  trialCount: number;
  isSessionActive: boolean;
}

export default function ManualBookingPanel({
  availableMembers,
  selectedMemberId,
  onMemberSelect,
  onAddMember,
  onAddTrialAthlete,
  isLoading,
  capacity,
  confirmedCount,
  trialCount,
  isSessionActive,
}: ManualBookingPanelProps) {
  if (!isSessionActive) return null;

  const handleSelect = (value: string) => {
    if (value === '__trial__') {
      onMemberSelect('');
      void onAddTrialAthlete();
      return;
    }
    onMemberSelect(value);
  };

  const totalTaken = confirmedCount + trialCount;

  return (
    <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
      <h3 className='text-base font-semibold text-gray-800 mb-3'>Add Member Manually</h3>
      <div className='flex flex-col sm:flex-row gap-2'>
        <select
          value={selectedMemberId}
          onChange={e => handleSelect(e.target.value)}
          disabled={isLoading}
          className='flex-1 px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900 disabled:bg-gray-100'
        >
          <option value=''>
            {availableMembers.length === 0 ? 'No available members' : 'Select a member...'}
          </option>
          <option value='__trial__'>+ Trial Athlete (enter name)</option>
          {availableMembers.map(member => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
        <button
          onClick={onAddMember}
          disabled={!selectedMemberId || isLoading}
          className='px-4 py-2.5 bg-[#178da6] hover:bg-[#14758c] disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition whitespace-nowrap'
        >
          {isLoading ? 'Adding...' : 'Add Member'}
        </button>
      </div>
      <p className='text-xs text-gray-600 mt-2'>
        {capacity === 0
          ? 'Unlimited spots available'
          : totalTaken >= capacity
            ? '⚠️ Session is full - member will be added to waitlist'
            : `${capacity - totalTaken} spot(s) available${trialCount > 0 ? ` (${trialCount} trial${trialCount === 1 ? '' : 's'} included)` : ''}`}
      </p>
    </div>
  );
}
