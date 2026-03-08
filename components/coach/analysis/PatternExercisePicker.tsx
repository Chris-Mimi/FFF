'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, X, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { FocusTrap } from '@/components/ui/FocusTrap';

interface Exercise {
  id: string;
  name: string;
  display_name: string | null;
  category: string;
}

interface PatternExercisePickerProps {
  isOpen: boolean;
  onClose: () => void;
  patternName: string;
  exercises: Exercise[];
  selectedExerciseIds: Set<string>;
  onToggleExercise: (exerciseId: string) => void;
  exerciseLastDates?: Map<string, string>;
  allPatternExerciseIds?: Set<string>;
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

export default function PatternExercisePicker({
  isOpen,
  onClose,
  patternName,
  exercises,
  selectedExerciseIds,
  onToggleExercise,
  exerciseLastDates,
  allPatternExerciseIds,
}: PatternExercisePickerProps) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Reset to all-collapsed when picker opens
  useEffect(() => {
    if (isOpen) {
      const allCollapsed: Record<string, boolean> = {};
      const categories = new Set(exercises.map(e => e.category || 'Other'));
      categories.forEach(cat => { allCollapsed[cat] = true; });
      setCollapsed(allCollapsed);
      setSearch('');
    }
  }, [isOpen, exercises]);

  const filtered = useMemo(() => {
    if (!search.trim()) return exercises;
    const q = search.toLowerCase();
    return exercises.filter(
      e =>
        e.name.toLowerCase().includes(q) ||
        (e.display_name && e.display_name.toLowerCase().includes(q))
    );
  }, [exercises, search]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Exercise[]>();
    filtered.forEach(ex => {
      const cat = ex.category || 'Other';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(ex);
    });
    // Sort groups by CATEGORY_ORDER
    const sorted = new Map<string, Exercise[]>();
    CATEGORY_ORDER.forEach(cat => {
      if (groups.has(cat)) {
        sorted.set(cat, groups.get(cat)!);
        groups.delete(cat);
      }
    });
    // Remaining categories
    groups.forEach((exs, cat) => {
      sorted.set(cat, exs);
    });
    // Sort each category: selected first, then alphabetical within each group
    sorted.forEach((exs, cat) => {
      sorted.set(cat, exs.sort((a, b) => {
        const aSelected = selectedExerciseIds.has(a.id) ? 0 : 1;
        const bSelected = selectedExerciseIds.has(b.id) ? 0 : 1;
        if (aSelected !== bSelected) return aSelected - bSelected;
        return (a.display_name || a.name).localeCompare(b.display_name || b.name);
      }));
    });
    return sorted;
  }, [filtered, selectedExerciseIds]);

  if (!isOpen) return null;

  return (
    <FocusTrap>
      <div
        className='fixed inset-0 z-50 flex items-center justify-center bg-black/30'
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className='bg-white rounded-lg shadow-2xl w-[calc(100%-2rem)] max-w-lg max-h-[80vh] flex flex-col'>
          {/* Header */}
          <div className='bg-[#178da6] text-white px-4 py-3 rounded-t-lg flex justify-between items-center'>
            <h3 className='text-sm font-bold truncate'>
              Add Exercises to &ldquo;{patternName}&rdquo;
            </h3>
            <button onClick={onClose} className='hover:bg-[#14758c] rounded p-1'>
              <X size={16} />
            </button>
          </div>

          {/* Search */}
          <div className='p-3 border-b'>
            <div className='relative'>
              <Search size={14} className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400' />
              <input
                type='text'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder='Search exercises...'
                autoFocus
                className='w-full pl-8 pr-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#178da6] focus:border-transparent'
              />
            </div>
            <p className='text-xs text-gray-500 mt-1'>
              {selectedExerciseIds.size} selected
            </p>
          </div>

          {/* Exercise list */}
          <div className='flex-1 overflow-y-auto p-3 space-y-3'>
            {Array.from(grouped.entries()).map(([category, exs]) => {
              const selectedInCategory = exs.filter(ex => selectedExerciseIds.has(ex.id)).length;
              return (
                <div key={category}>
                  <button
                    onClick={() => setCollapsed(prev => ({ ...prev, [category]: !prev[category] }))}
                    className='w-full flex items-center gap-1.5 py-1.5 hover:bg-gray-50 rounded transition'
                  >
                    {collapsed[category] ? <ChevronRight size={14} className='text-gray-500 shrink-0' /> : <ChevronDown size={14} className='text-gray-500 shrink-0' />}
                    <span className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                      {category}
                    </span>
                    <span className='text-xs text-gray-400'>({exs.length})</span>
                    {selectedInCategory > 0 && (
                      <span className='text-xs text-[#178da6] font-medium ml-auto mr-1'>
                        {selectedInCategory} selected
                      </span>
                    )}
                  </button>
                  <div className='space-y-0.5 ml-1'>
                    {exs.map(ex => {
                      const isSelected = selectedExerciseIds.has(ex.id);
                      if (collapsed[category] && !isSelected) return null;
                      // Staleness styling for non-selected exercises
                      let stalenessClass = 'hover:bg-gray-50 text-gray-700';
                      if (!isSelected && exerciseLastDates) {
                        const lastDate = exerciseLastDates.get(ex.id);
                        if (!lastDate) {
                          // Never programmed
                          stalenessClass = 'hover:bg-gray-50 text-gray-300 italic';
                        } else {
                          const daysSince = Math.floor((Date.now() - new Date(lastDate + 'T00:00:00').getTime()) / 86400000);
                          if (daysSince > 180) {
                            stalenessClass = 'hover:bg-gray-50 text-gray-300 italic';
                          } else if (daysSince > 90) {
                            stalenessClass = 'hover:bg-gray-50 text-gray-400';
                          }
                        }
                      }

                      return (
                        <button
                          key={ex.id}
                          onClick={() => onToggleExercise(ex.id)}
                          className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-sm transition ${
                            isSelected
                              ? 'bg-[#178da6]/10 text-[#178da6] font-medium'
                              : stalenessClass
                          }${!isSelected && allPatternExerciseIds && !allPatternExerciseIds.has(ex.id) ? ' border border-gray-200' : ''}`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-[#178da6] border-[#178da6]'
                              : 'border-gray-300'
                          }`}>
                            {isSelected && <Check size={12} className='text-white' />}
                          </div>
                          <span className='truncate'>
                            {ex.display_name || ex.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className='p-3 border-t bg-gray-50 rounded-b-lg'>
            <button
              onClick={onClose}
              className='w-full px-3 py-2 bg-[#178da6] text-white rounded text-sm font-semibold hover:bg-[#14758c] transition'
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </FocusTrap>
  );
}
