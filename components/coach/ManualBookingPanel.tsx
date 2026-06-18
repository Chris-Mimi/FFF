'use client';

import { Member } from '@/hooks/coach/useSessionDetails';
import { useMemo, useRef, useState } from 'react';

interface ManualBookingPanelProps {
  availableMembers: Member[];
  selectedMemberId: string;
  onMemberSelect: (memberId: string) => void;
  onAddMember: () => Promise<void>;
  onAddTrialAthlete: () => Promise<void>;
  onAddDropIn: () => Promise<void>;
  isLoading: boolean;
  capacity: number;
  confirmedCount: number;
  trialCount: number;
  dropInCount: number;
  isSessionActive: boolean;
}

const ALPHABET = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '#'];

// First letter of a name, bucketed to A–Z or '#' for anything non-alphabetic.
const getInitial = (name: string) => {
  const c = name.trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : '#';
};

export default function ManualBookingPanel({
  availableMembers,
  selectedMemberId,
  onMemberSelect,
  onAddMember,
  onAddTrialAthlete,
  onAddDropIn,
  isLoading,
  capacity,
  confirmedCount,
  trialCount,
  dropInCount,
  isSessionActive,
}: ManualBookingPanelProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const letterRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleSelect = (value: string) => {
    if (value === '__trial__') {
      onMemberSelect('');
      void onAddTrialAthlete();
      return;
    }
    if (value === '__dropin__') {
      onMemberSelect('');
      void onAddDropIn();
      return;
    }
    onMemberSelect(value);
  };

  // Mobile picker: members grouped by first letter so a side A–Z rail can
  // jump straight to a name instead of scrolling the whole list.
  const grouped = useMemo(() => {
    const sorted = [...availableMembers].sort((a, b) => a.name.localeCompare(b.name));
    const groups: { letter: string; members: Member[] }[] = [];
    for (const m of sorted) {
      const letter = getInitial(m.name);
      let g = groups.find(x => x.letter === letter);
      if (!g) {
        g = { letter, members: [] };
        groups.push(g);
      }
      g.members.push(m);
    }
    return groups;
  }, [availableMembers]);

  const availableLetters = useMemo(() => new Set(grouped.map(g => g.letter)), [grouped]);

  const scrollToLetter = (letter: string) => {
    letterRefs.current[letter]?.scrollIntoView({ block: 'start' });
  };

  const selectedMember = availableMembers.find(m => m.id === selectedMemberId);
  const totalTaken = confirmedCount + trialCount + dropInCount;

  if (!isSessionActive) return null;

  const addButton = (
    <button
      onClick={onAddMember}
      disabled={!selectedMemberId || isLoading}
      className='px-4 py-2.5 bg-[#178da6] hover:bg-[#14758c] disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition whitespace-nowrap'
    >
      {isLoading ? 'Adding...' : 'Add Member'}
    </button>
  );

  return (
    <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
      <h3 className='text-base font-semibold text-gray-800 mb-3'>Add Member Manually</h3>

      {/* Desktop: native select (type-to-jump works with a keyboard) */}
      <div className='hidden sm:flex gap-2'>
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
          <option value='__dropin__'>+ Drop-in (enter name)</option>
          {availableMembers.map(member => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
        {addButton}
      </div>

      {/* Mobile: custom picker with an A–Z rail to jump to a letter */}
      <div className='sm:hidden space-y-2'>
        <button
          type='button'
          onClick={() => setMobileOpen(o => !o)}
          disabled={isLoading || availableMembers.length === 0}
          className='w-full flex items-center justify-between px-3 py-2.5 border border-gray-300 rounded-md bg-white text-left text-gray-900 disabled:bg-gray-100'
        >
          <span className={selectedMember ? '' : 'text-gray-500'}>
            {availableMembers.length === 0
              ? 'No available members'
              : selectedMember
                ? selectedMember.name
                : 'Select a member...'}
          </span>
          <span className='text-gray-400 ml-2'>{mobileOpen ? '▲' : '▼'}</span>
        </button>

        {mobileOpen && (
          <div className='relative border border-gray-300 rounded-md bg-white overflow-hidden'>
            <div className='max-h-72 overflow-y-auto pr-7'>
              <button
                type='button'
                onClick={() => {
                  handleSelect('__trial__');
                  setMobileOpen(false);
                }}
                className='block w-full text-left px-3 py-2.5 text-[#178da6] font-medium border-b border-gray-100 hover:bg-blue-50'
              >
                + Trial Athlete (enter name)
              </button>
              <button
                type='button'
                onClick={() => {
                  handleSelect('__dropin__');
                  setMobileOpen(false);
                }}
                className='block w-full text-left px-3 py-2.5 text-purple-700 font-medium border-b border-gray-100 hover:bg-purple-50'
              >
                + Drop-in (enter name)
              </button>
              {grouped.map(g => (
                <div
                  key={g.letter}
                  ref={el => {
                    letterRefs.current[g.letter] = el;
                  }}
                >
                  <div className='sticky top-0 px-3 py-1 bg-gray-100 text-xs font-semibold text-gray-500'>
                    {g.letter}
                  </div>
                  {g.members.map(member => (
                    <button
                      key={member.id}
                      type='button'
                      onClick={() => {
                        onMemberSelect(member.id);
                        setMobileOpen(false);
                      }}
                      className={`block w-full text-left px-3 py-2.5 hover:bg-blue-50 ${
                        member.id === selectedMemberId
                          ? 'bg-blue-50 text-[#178da6] font-medium'
                          : 'text-gray-900'
                      }`}
                    >
                      {member.name}
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {/* A–Z rail */}
            <div className='absolute right-0 top-0 bottom-0 w-6 flex flex-col items-center justify-center bg-white/80 border-l border-gray-100'>
              {ALPHABET.map(letter => {
                const enabled = availableLetters.has(letter);
                return (
                  <button
                    key={letter}
                    type='button'
                    disabled={!enabled}
                    onClick={() => scrollToLetter(letter)}
                    className={`leading-none text-[10px] font-medium py-px ${
                      enabled ? 'text-[#178da6]' : 'text-gray-300'
                    }`}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {addButton}
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
