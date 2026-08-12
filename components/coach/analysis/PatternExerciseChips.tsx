'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { PatternWithExercises, PatternGapResult } from '@/types/planner';
import { lastUniqueWorkouts, type ExerciseFrequency } from '@/utils/movement-analytics';

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
  /** Full-history exercise frequency map (lowercased name/display_name → freq). */
  exerciseHistory?: Map<string, ExerciseFrequency>;
  historyLoading?: boolean;
  onLoadExerciseHistory?: () => void;
}

export default function PatternExerciseChips({
  pattern,
  gaps,
  onOpenExercisePicker,
  onRemoveExercise,
  exerciseHistory,
  historyLoading = false,
  onLoadExerciseHistory,
}: Props) {
  // Exercise id whose "last 5 unique workouts" popover is open (null = none).
  const [openExId, setOpenExId] = useState<string | null>(null);
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

  const openEx = openExId ? sortedExercises.find(e => e.id === openExId) : undefined;
  const openName = openEx ? (openEx.display_name || openEx.name) : null;
  const openFreq = openName && exerciseHistory ? exerciseHistory.get(openName.toLowerCase()) : undefined;
  const last5 = openFreq ? lastUniqueWorkouts(openFreq.workouts, 5) : [];

  return (
    <div className='space-y-2'>
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
          const isOpen = openExId === ex.id;
          return (
            <div
              key={ex.id}
              className={`group flex items-center justify-between px-2 py-1.5 rounded border text-xs ${colorClass} ${
                isOpen ? 'ring-2 ring-offset-1 ring-gray-500' : ''
              }`}
              title={`Last programmed: ${formatExerciseDate(lastDate)}`}
            >
              <button
                type='button'
                onClick={() => {
                  onLoadExerciseHistory?.();
                  setOpenExId(isOpen ? null : ex.id);
                }}
                className='truncate mr-1 text-left flex-1 hover:underline cursor-pointer'
                title='Click for the last 5 unique workouts'
              >
                {displayName}
              </button>
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

      {/* Last-5-unique-workouts popover for the clicked exercise chip */}
      {openExId && openName && (
        <div className='rounded-lg border border-gray-200 bg-white p-3'>
          <div className='flex items-start justify-between gap-2 mb-1.5'>
            <div className='text-xs font-semibold text-gray-700'>
              Last 5 unique workouts · {openName}
            </div>
            <button
              type='button'
              onClick={() => setOpenExId(null)}
              className='text-gray-400 hover:text-gray-600 shrink-0'
              aria-label='Close'
            >
              <X size={14} />
            </button>
          </div>
          {historyLoading ? (
            <div className='text-xs text-gray-400 italic'>Loading…</div>
          ) : last5.length === 0 ? (
            <div className='text-xs text-gray-400 italic'>No programming history found.</div>
          ) : (
            <ol className='space-y-1'>
              {last5.map((w, i) => (
                <li key={`${w.workout_name ?? w.date}-${i}`} className='flex items-baseline gap-2 text-xs'>
                  <span className='text-gray-400 shrink-0'>{i + 1}.</span>
                  <span className='font-medium text-gray-800'>
                    {w.workout_name || 'Untitled workout'}
                  </span>
                  <span className='text-gray-500 shrink-0'>
                    {new Date(w.date + 'T00:00:00').toLocaleDateString('en-GB', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: '2-digit',
                    })}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
