'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, ArrowRight } from 'lucide-react';
import type { PatternWithExercises } from '@/types/planner';

interface Exercise {
  id: string;
  name: string;
  display_name: string | null;
  category: string;
}

interface UncategorizedExercisesProps {
  exercises: Exercise[];
  assignedIds: Set<string>;
  patterns: PatternWithExercises[];
  onAssign: (exerciseId: string, patternId: string) => Promise<void>;
}

const CATEGORY_ORDER = [
  'Pre-Workout',
  'Olympic Lifting & Barbell Movements',
  'Compound Exercises',
  'Gymnastics & Bodyweight',
  'Core, Abs & Isometric Holds',
  'Cardio & Conditioning',
  'Strength & Functional Conditioning',
  'Recovery & Stretching',
];

const HIDDEN_BY_DEFAULT = new Set(['Pre-Workout', 'Recovery & Stretching']);

export default function UncategorizedExercises({
  exercises,
  assignedIds,
  patterns,
  onAssign,
}: UncategorizedExercisesProps) {
  const [expanded, setExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [popoverFor, setPopoverFor] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Close popover on outside click
  useEffect(() => {
    if (!popoverFor) return;
    const onDoc = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverFor(null);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [popoverFor]);

  const unassigned = useMemo(() => {
    return exercises.filter(ex => {
      if (assignedIds.has(ex.id)) return false;
      const cat = ex.category || 'Other';
      if (!showAll && HIDDEN_BY_DEFAULT.has(cat)) return false;
      return true;
    });
  }, [exercises, assignedIds, showAll]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Exercise[]>();
    unassigned.forEach(ex => {
      const cat = ex.category || 'Other';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(ex);
    });
    const sorted = new Map<string, Exercise[]>();
    CATEGORY_ORDER.forEach(cat => {
      if (groups.has(cat)) {
        sorted.set(cat, groups.get(cat)!);
        groups.delete(cat);
      }
    });
    groups.forEach((exs, cat) => sorted.set(cat, exs));
    sorted.forEach((exs, cat) => {
      sorted.set(cat, exs.sort((a, b) =>
        (a.display_name || a.name).localeCompare(b.display_name || b.name)
      ));
    });
    return sorted;
  }, [unassigned]);

  const handleAssign = async (exerciseId: string, patternId: string) => {
    setAssigning(exerciseId);
    setPopoverFor(null);
    try {
      await onAssign(exerciseId, patternId);
    } finally {
      setAssigning(null);
    }
  };

  const totalCount = unassigned.length;

  return (
    <div className='border border-gray-200 rounded-lg bg-white'>
      <button
        onClick={() => setExpanded(prev => !prev)}
        className='w-full flex items-center justify-between p-3 md:p-4 hover:bg-gray-50 transition'
      >
        <div className='flex items-center gap-2'>
          {expanded ? <ChevronDown size={16} className='text-gray-500' /> : <ChevronRight size={16} className='text-gray-500' />}
          <h3 className='text-sm md:text-base font-semibold text-gray-800'>
            Uncategorised Exercises
          </h3>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            totalCount === 0 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {totalCount}
          </span>
        </div>
        {totalCount === 0 && (
          <span className='text-xs text-green-700 font-medium'>All sorted ✓</span>
        )}
      </button>

      {expanded && (
        <div className='border-t border-gray-200'>
          <div className='px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-2 text-xs'>
            <span className='text-gray-600'>
              Click <b>Move to…</b> on any row to assign it to a pattern. Once assigned, the
              exercise drops out of this list.
            </span>
            <label className='flex items-center gap-1.5 shrink-0 cursor-pointer text-gray-700'>
              <input
                type='checkbox'
                checked={showAll}
                onChange={(e) => setShowAll(e.target.checked)}
                className='cursor-pointer'
              />
              <span>Include warm-ups &amp; stretches</span>
            </label>
          </div>

          {totalCount === 0 ? (
            <div className='p-6 text-center text-sm text-gray-500'>
              {patterns.length === 0
                ? 'Create a pattern first, then exercises will show up here for assignment.'
                : 'Every exercise is in at least one pattern. Nice work.'}
            </div>
          ) : patterns.length === 0 ? (
            <div className='p-6 text-center text-sm text-amber-700 bg-amber-50'>
              No patterns yet. Create one above before you can assign exercises here.
            </div>
          ) : (
            <div className='p-3 space-y-3 max-h-[60vh] overflow-y-auto'>
              {Array.from(grouped.entries()).map(([category, exs]) => (
                <div key={category}>
                  <button
                    onClick={() => setCollapsed(prev => ({ ...prev, [category]: !prev[category] }))}
                    className='w-full flex items-center gap-1.5 py-1 hover:bg-gray-50 rounded transition'
                  >
                    {collapsed[category] ? <ChevronRight size={12} className='text-gray-500 shrink-0' /> : <ChevronDown size={12} className='text-gray-500 shrink-0' />}
                    <span className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                      {category}
                    </span>
                    <span className='text-xs text-gray-400'>({exs.length})</span>
                  </button>
                  {!collapsed[category] && (
                    <div className='ml-1 space-y-0.5'>
                      {exs.map(ex => (
                        <div key={ex.id} className='relative flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded text-sm'>
                          <span className='flex-1 truncate text-gray-700'>
                            {ex.display_name || ex.name}
                          </span>
                          <button
                            onClick={() => setPopoverFor(popoverFor === ex.id ? null : ex.id)}
                            disabled={assigning === ex.id}
                            className='shrink-0 flex items-center gap-1 text-xs px-2 py-1 rounded border border-[#178da6] text-[#178da6] hover:bg-[#178da6] hover:text-white transition disabled:opacity-50'
                          >
                            {assigning === ex.id ? 'Adding…' : (
                              <>
                                Move to <ArrowRight size={11} />
                              </>
                            )}
                          </button>

                          {popoverFor === ex.id && (
                            <div
                              ref={popoverRef}
                              className='absolute right-0 top-full mt-1 z-20 bg-white border-2 border-amber-300 rounded-lg shadow-lg p-2 min-w-[200px] max-w-[280px]'
                            >
                              <div className='text-xs font-semibold text-gray-600 mb-1.5 px-1'>
                                Add to pattern:
                              </div>
                              <div className='flex flex-wrap gap-1'>
                                {patterns.map(p => (
                                  <button
                                    key={p.id}
                                    onClick={() => handleAssign(ex.id, p.id)}
                                    className='flex items-center gap-1.5 text-xs px-2 py-1 rounded border border-gray-200 hover:border-[#178da6] hover:bg-[#178da6]/5 transition'
                                  >
                                    <span
                                      className='w-2.5 h-2.5 rounded-full shrink-0'
                                      style={{ backgroundColor: p.color || '#9ca3af' }}
                                    />
                                    <span className='truncate max-w-[140px]'>{p.name}</span>
                                  </button>
                                ))}
                              </div>
                              <button
                                onClick={() => setPopoverFor(null)}
                                className='mt-1.5 w-full text-xs text-gray-500 hover:text-gray-700 py-0.5'
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
