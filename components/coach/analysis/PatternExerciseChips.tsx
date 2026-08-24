'use client';

import { useState } from 'react';
import { X, GripVertical } from 'lucide-react';
import type { PatternWithExercises, PatternGapResult } from '@/types/planner';
import { lastUniqueWorkouts, type ExerciseFrequency } from '@/utils/movement-analytics';
import { getExerciseRecencyPillColor as getExerciseDateColor, formatExerciseDate } from '@/utils/exercise-recency';

interface Props {
  pattern: PatternWithExercises;
  gaps: PatternGapResult[];
  onOpenExercisePicker: (patternId: string) => void;
  onRemoveExercise: (patternId: string, exerciseId: string) => Promise<void> | void;
  /** Full-history exercise frequency map (lowercased name/display_name → freq). */
  exerciseHistory?: Map<string, ExerciseFrequency>;
  historyLoading?: boolean;
  onLoadExerciseHistory?: () => void;
  /** When true, each chip gets a drag handle to move it to another group. */
  draggableExercises?: boolean;
  onExerciseDragStart?: (patternId: string, exerciseId: string) => void;
  onExerciseDragEnd?: () => void;
  /** When true, a "Select" mode lets the coach tick several chips and move them
   *  together to another group. */
  selectableExercises?: boolean;
  /** Other patterns this group's exercises can be moved to (id/name/color). */
  otherPatterns?: { id: string; name: string; color: string }[];
  onMoveExercises?: (fromPatternId: string, toPatternId: string, exerciseIds: string[]) => Promise<void>;
  onCopyExercises?: (fromPatternId: string, toPatternId: string, exerciseIds: string[]) => Promise<void>;
}

export default function PatternExerciseChips({
  pattern,
  gaps,
  onOpenExercisePicker,
  onRemoveExercise,
  exerciseHistory,
  historyLoading = false,
  onLoadExerciseHistory,
  draggableExercises = false,
  onExerciseDragStart,
  onExerciseDragEnd,
  selectableExercises = false,
  otherPatterns = [],
  onMoveExercises,
  onCopyExercises,
}: Props) {
  // Exercise id whose "last 5 unique workouts" popover is open (null = none).
  const [openExId, setOpenExId] = useState<string | null>(null);
  // Sort order: false = most-recently-programmed first (default); true = stalest
  // / never-programmed first, to surface retire candidates.
  const [staleFirst, setStaleFirst] = useState(false);
  // Multi-select move state.
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [moving, setMoving] = useState(false);
  // 'move' removes from this group; 'copy' keeps the originals here too.
  const [applyMode, setApplyMode] = useState<'move' | 'copy'>('move');

  const toggleSelectMode = () => {
    setSelectMode(m => !m);
    setSelectedIds(new Set());
    setOpenExId(null);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const doApply = async (toPatternId: string) => {
    if (selectedIds.size === 0 || !toPatternId) return;
    const fn = applyMode === 'copy' ? onCopyExercises : onMoveExercises;
    if (!fn) return;
    setMoving(true);
    await fn(pattern.id, toPatternId, Array.from(selectedIds));
    setMoving(false);
    setSelectedIds(new Set());
    setSelectMode(false);
  };
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

  // Authoritative last-programmed date: prefer FULL history (same source as the
  // popover) so a chip only reads grey/"Never" when it truly has no history.
  // Fall back to the gap-analysis window date if history isn't loaded yet.
  const dateFor = (displayName: string): string | undefined =>
    exerciseHistory?.get(displayName.toLowerCase())?.lastProgrammed
    || gap?.exerciseLastDates[displayName];

  const sortedExercises = [...pattern.exercises].sort((a, b) => {
    const aName = a.display_name || a.name;
    const bName = b.display_name || b.name;
    const aDate = dateFor(aName);
    const bDate = dateFor(bName);
    // Default: recent first, never last. staleFirst flips it (never/oldest first).
    const aDays = aDate ? Math.floor((Date.now() - new Date(aDate + 'T00:00:00').getTime()) / 86400000) : 99999;
    const bDays = bDate ? Math.floor((Date.now() - new Date(bDate + 'T00:00:00').getTime()) / 86400000) : 99999;
    if (aDays !== bDays) return staleFirst ? bDays - aDays : aDays - bDays;
    return aName.localeCompare(bName);
  });

  const openEx = openExId ? sortedExercises.find(e => e.id === openExId) : undefined;
  const openName = openEx ? (openEx.display_name || openEx.name) : null;
  const openFreq = openName && exerciseHistory ? exerciseHistory.get(openName.toLowerCase()) : undefined;
  const last5 = openFreq ? lastUniqueWorkouts(openFreq.workouts, 5) : [];

  return (
    <div className='space-y-2'>
      <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5'>
        <div className='col-span-2 md:col-span-3 lg:col-span-4 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-gray-500 pb-0.5'>
          <span className='text-green-600'>● ≤14 days</span>
          <span className='text-yellow-500'>● 15–28 days</span>
          <span className='text-orange-500'>● 29–60 days</span>
          <span className='text-red-600'>● 61–90 days</span>
          <span className='text-gray-400'>● 90+ days</span>
          <span className='text-gray-700'>● Never</span>
          <button
            type='button'
            onClick={() => setStaleFirst(v => !v)}
            className='ml-auto text-[10px] px-1.5 py-0.5 rounded border border-gray-200 text-gray-600 hover:border-[#178da6] hover:text-[#178da6] transition'
            title='Toggle sort order'
          >
            Sort: {staleFirst ? 'stale/never first' : 'recent first'}
          </button>
          {selectableExercises && (
            <button
              type='button'
              onClick={toggleSelectMode}
              className={`text-[10px] px-1.5 py-0.5 rounded border transition ${
                selectMode
                  ? 'bg-[#178da6] text-white border-[#178da6]'
                  : 'border-gray-200 text-gray-600 hover:border-[#178da6] hover:text-[#178da6]'
              }`}
              title='Select several exercises to move together'
            >
              {selectMode ? 'Cancel' : 'Select'}
            </button>
          )}
        </div>

        {/* Multi-select move bar */}
        {selectMode && (
          <div className='col-span-2 md:col-span-3 lg:col-span-4 flex flex-wrap items-center gap-2 rounded border border-[#178da6]/30 bg-[#178da6]/5 px-2 py-1.5 text-xs'>
            <span className='font-medium text-gray-700'>
              {selectedIds.size} selected
            </span>
            {/* Move vs Copy toggle */}
            <div className='flex rounded border border-gray-300 overflow-hidden'>
              {(['move', 'copy'] as const).map(m => (
                <button
                  key={m}
                  type='button'
                  onClick={() => setApplyMode(m)}
                  className={`px-2 py-1 capitalize transition ${
                    applyMode === m
                      ? 'bg-[#178da6] text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  } ${m === 'copy' ? 'border-l border-gray-300' : ''}`}
                  title={m === 'move' ? 'Remove from this group' : 'Keep the originals here too'}
                >
                  {m}
                </button>
              ))}
            </div>
            <select
              value=''
              disabled={selectedIds.size === 0 || moving || otherPatterns.length === 0}
              onChange={e => doApply(e.target.value)}
              className='px-2 py-1 border border-gray-300 rounded text-xs text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <option value=''>
                {moving ? 'Working…' : applyMode === 'copy' ? 'Copy to…' : 'Move to…'}
              </option>
              {otherPatterns.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {selectedIds.size > 0 && (
              <button
                type='button'
                onClick={() => setSelectedIds(new Set())}
                className='text-gray-500 hover:text-gray-700'
              >
                Clear
              </button>
            )}
            <span className='text-gray-400'>· tap chips to select</span>
          </div>
        )}
        {sortedExercises.map(ex => {
          const displayName = ex.display_name || ex.name;
          const lastDate = dateFor(displayName);
          const colorClass = getExerciseDateColor(lastDate);
          const isOpen = openExId === ex.id;
          const isSelected = selectedIds.has(ex.id);
          return (
            <div
              key={ex.id}
              className={`group flex items-center justify-between px-2 py-1.5 rounded border text-xs ${colorClass} ${
                selectMode && isSelected ? 'ring-2 ring-offset-1 ring-[#178da6]' : ''
              } ${!selectMode && isOpen ? 'ring-2 ring-offset-1 ring-gray-500' : ''}`}
              title={`Last programmed: ${formatExerciseDate(lastDate)}`}
            >
              {selectMode ? (
                <input
                  type='checkbox'
                  checked={isSelected}
                  onChange={() => toggleSelect(ex.id)}
                  className='shrink-0 mr-1.5 cursor-pointer accent-[#178da6]'
                />
              ) : draggableExercises && (
                <span
                  draggable
                  onDragStart={() => onExerciseDragStart?.(pattern.id, ex.id)}
                  onDragEnd={() => onExerciseDragEnd?.()}
                  className='cursor-grab active:cursor-grabbing shrink-0 text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity mr-0.5'
                  title='Drag to another group'
                >
                  <GripVertical size={12} />
                </span>
              )}
              <button
                type='button'
                onClick={() => {
                  if (selectMode) {
                    toggleSelect(ex.id);
                    return;
                  }
                  onLoadExerciseHistory?.();
                  setOpenExId(isOpen ? null : ex.id);
                }}
                className='truncate mr-1 text-left flex-1 hover:underline cursor-pointer'
                title={selectMode ? 'Tap to select' : 'Click for the last 5 unique workouts'}
              >
                {displayName}
              </button>
              {!selectMode && (
                <button
                  onClick={() => onRemoveExercise(pattern.id, ex.id)}
                  className='opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 shrink-0 transition-opacity'
                  title='Remove from pattern'
                >
                  <X size={12} />
                </button>
              )}
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
