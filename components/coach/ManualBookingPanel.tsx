'use client';

import { Member } from '@/hooks/coach/useSessionDetails';

interface ManualBookingPanelProps {
  availableMembers: Member[];
  selectedMemberId: string;
  onMemberSelect: (memberId: string) => void;
  onAddMember: () => Promise<void>;
  isLoading: boolean;
  capacity: number;
  confirmedCount: number;
  isSessionActive: boolean;
}

export default function ManualBookingPanel({
  availableMembers,
  selectedMemberId,
  onMemberSelect,
  onAddMember,
  isLoading,
  capacity,
  confirmedCount,
  isSessionActive,
}: ManualBookingPanelProps) {
  if (!isSessionActive) return null;

  return (
    <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
      <h3 className='text-base font-semibold text-gray-800 mb-3'>Add Member Manually</h3>
      <div className='flex items-center gap-2'>
        <select
          value={selectedMemberId}
          onChange={e => onMemberSelect(e.target.value)}
          disabled={isLoading || availableMembers.length === 0}
          className='flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 disabled:bg-gray-100'
        >
          <option value=''>
            {availableMembers.length === 0 ? 'No available members' : 'Select a member...'}
          </option>
          {availableMembers.map(member => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
        <button
          onClick={onAddMember}
          disabled={!selectedMemberId || isLoading}
          className='px-4 py-2 bg-[#208479] hover:bg-[#1a6b62] disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition whitespace-nowrap'
        >
          {isLoading ? 'Adding...' : 'Add Member'}
        </button>
      </div>
      <p className='text-xs text-gray-600 mt-2'>
        {capacity === 0
          ? 'Unlimited spots available'
          : confirmedCount >= capacity
            ? '⚠️ Session is full - member will be added to waitlist'
            : `${capacity - confirmedCount} spot(s) available`}
      </p>
    </div>
  );
}
