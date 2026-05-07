'use client';

import { X } from 'lucide-react';
import type { PatternWithExercises, PatternGapResult } from '@/types/planner';

/** Same color thresholds as Movement Tracking panel (day-based) */
const getExerciseDateColor = (date: string | undefined): string => {
  if (!date) return 'bg-gray-100 text-gray-500';
  const days = Math.floor((Date.now() - new Date(date + 'T00:00:00').getTime()) / 86400000);
  if (days <= 14) return 'bg-green-50 text-green-700 border-green-200';
  if (days <= 28) return 'bg-yellow-50 text-yellow-600 border-yellow-200';
  if (days <= 60) return 'bg-orange-50 text-orange-600 border-orange-200';
  return 'bg-red-50 text-red-700 border-red-200';
};

const formatExerciseDate = (date: string | undefined): string => {
  if (!date) return 'Never';
  return new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

interface Props {
  pattern: PatternWithExercises;
  gaps: PatternGapResult[];
  onOpenExercisePicker: (patternId: string) => void;
  onRemoveExercise: (patternId: string, exerciseId: string) => Promise<void> | void;
}

export default function PatternExerciseChips({
  pattern,
  gaps,
  onOpenExercisePicker,
  onRemoveExercise,
}: Props) {
  if (pattern.exercises.length === 0) {
    return (
      <p className='text-xs text-gray-400 italic'>
        No exercises assigned.{' '}
        <button
          onClick={() => onOpenExercisePicker(pattern.id)}
          className='text-[#178da6] hover:underline'
        >
          Add some
        </button>
      </p>
    );
  }

  const gap = gaps.find(g => g.patternId === pattern.id);
  const sortedExercises = [...pattern.exercises].sort((a, b) => {
    const aName = a.display_name || a.name;
    const bName = b.display_name || b.name;
    const aDate = gap?.exerciseLastDates[aName];
    const bDate = gap?.exerciseLastDates[bName];
    // Most recently programmed first, never programmed last, then alphabetical
    const aDays = aDate ? Math.floor((Date.now() - new Date(aDate + 'T00:00:00').getTime()) / 86400000) : 99999;
    const bDays = bDate ? Math.floor((Date.now() - new Date(bDate + 'T00:00:00').getTime()) / 86400000) : 99999;
    if (aDays !== bDays) return aDays - bDays;
    return aName.localeCompare(bName);
  });

  return (
    <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5'>
      <div className='col-span-2 md:col-span-3 lg:col-span-4 flex items-center gap-3 text-[10px] text-gray-500 pb-0.5'>
        <span className='text-green-600'>● ≤14 days</span>
        <span className='text-yellow-500'>● 15–28 days</span>
        <span className='text-orange-500'>● 29–60 days</span>
        <span className='text-red-600'>● 60+ days</span>
        <span className='text-gray-400'>● Never</span>
      </div>
      {sortedExercises.map(ex => {
        const displayName = ex.display_name || ex.name;
        const lastDate = gap?.exerciseLastDates[displayName];
        const colorClass = getExerciseDateColor(lastDate);
        return (
          <div
            key={ex.id}
            className={`group flex items-center justify-between px-2 py-1.5 rounded border text-xs ${colorClass}`}
            title={`Last programmed: ${formatExerciseDate(lastDate)}`}
          >
            <span className='truncate mr-1'>{displayName}</span>
            <button
              onClick={() => onRemoveExercise(pattern.id, ex.id)}
              className='opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 shrink-0 transition-opacity'
              title='Remove from pattern'
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
