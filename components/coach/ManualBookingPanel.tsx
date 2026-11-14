'use client';

import { Member } from '@/hooks/coach/useSessionDetails';
import { isKidAge } from '@/lib/bookingRules';
import { useMemo, useRef, useState } from 'react';

type Group = 'adults' | 'kids';

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
  isKidsClass: boolean;
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
  isKidsClass,
}: ManualBookingPanelProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const letterRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // Adults / Kids split (S433). Kid = under 16 by DOB, same rule as booking (isKidAge).
  // Kids classes open on the Kids tab.
  const [group, setGroup] = useState<Group>(isKidsClass ? 'kids' : 'adults');

  const { adults, kids } = useMemo(() => {
    const a: Member[] = [];
    const k: Member[] = [];
    for (const m of availableMembers) (isKidAge(m.date_of_birth) ? k : a).push(m);
    return { adults: a, kids: k };
  }, [availableMembers]);

  const shownMembers = group === 'kids' ? kids : adults;

  const switchGroup = (g: Group) => {
    setGroup(g);
    // Clear a selection that isn't in the new list, so "Add Member" can't add a hidden name.
    if (selectedMemberId && !(g === 'kids' ? kids : adults).some(m => m.id === selectedMemberId)) {
      onMemberSelect('');
    }
  };

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
    const sorted = [...shownMembers].sort((a, b) => a.name.localeCompare(b.name));
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
  }, [shownMembers]);

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
      <div className='flex items-center justify-between gap-2 mb-3'>
        <h3 className='text-base font-semibold text-gray-800'>Add Member Manually</h3>
        <div className='inline-flex rounded-md border border-gray-300 overflow-hidden text-sm'>
          {(['adults', 'kids'] as const).map(g => (
            <button
              key={g}
              type='button'
              onClick={() => switchGroup(g)}
              className={`px-3 py-1.5 transition ${
                group === g ? 'bg-[#178da6] text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {g === 'adults' ? `Adults (${adults.length})` : `Kids (${kids.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop: native select (type-to-jump works with a keyboard) */}
      <div className='hidden sm:flex gap-2'>
        <select
          value={selectedMemberId}
          onChange={e => handleSelect(e.target.value)}
          disabled={isLoading}
          className='flex-1 px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900 disabled:bg-gray-100'
        >
          <option value=''>
            {shownMembers.length === 0
              ? `No available ${group}`
              : group === 'kids' ? 'Select a kid...' : 'Select an adult...'}
          </option>
          <option value='__trial__'>+ Trial Athlete (enter name)</option>
          <option value='__dropin__'>+ Drop-in (enter name)</option>
          {shownMembers.map(member => (
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
          disabled={isLoading}
          className='w-full flex items-center justify-between px-3 py-2.5 border border-gray-300 rounded-md bg-white text-left text-gray-900 disabled:bg-gray-100'
        >
          <span className={selectedMember ? '' : 'text-gray-500'}>
            {selectedMember
              ? selectedMember.name
              : shownMembers.length === 0
                ? `No available ${group}`
                : group === 'kids' ? 'Select a kid...' : 'Select an adult...'}
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
