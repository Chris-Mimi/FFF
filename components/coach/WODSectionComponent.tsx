'use client';

import { ChevronDown, GripVertical, Trash2, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { WODSection, ConfiguredLift, ConfiguredBenchmark, ConfiguredForgeBenchmark } from '@/types/movements';

interface WorkoutType {
  id: string;
  name: string;
  description: string | null;
}

interface SectionType {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
}

// ============================================
// Format Helper Functions
// ============================================

function formatLift(lift: ConfiguredLift): string {
  if (lift.rep_type === 'constant') {
    const base = `${lift.name} ${lift.sets}x${lift.reps}`;
    return lift.percentage_1rm ? `${base} @ ${lift.percentage_1rm}%` : base;
  } else {
    // Variable reps: show as "5-3-1" format
    const reps = lift.variable_sets?.map(s => s.reps).join('-') || '';
    return `${lift.name} ${reps}`;
  }
}

function formatBenchmark(benchmark: ConfiguredBenchmark): string {
  const scaling = benchmark.scaling_option ? ` (${benchmark.scaling_option})` : '';
  return `${benchmark.name}${scaling}`;
}

function formatForgeBenchmark(forge: ConfiguredForgeBenchmark): string {
  const scaling = forge.scaling_option ? ` (${forge.scaling_option})` : '';
  return `${forge.name}${scaling}`;
}

// ============================================
// Section Component
// ============================================
function WODSectionComponent({
  section,
  sectionIndex,
  elapsedMinutes,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onDelete,
  onSetActive,
  onDragStart,
  onDragOver,
  onDrop,
  workoutTypes,
  sectionTypes,
  loadingTracks,
  onRemoveLift,
  onRemoveBenchmark,
  onRemoveForgeBenchmark,
}: {
  section: WODSection;
  sectionIndex: number;
  elapsedMinutes: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (updates: Partial<WODSection>) => void;
  onDelete: () => void;
  onSetActive: () => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  workoutTypes: WorkoutType[];
  sectionTypes: SectionType[];
  loadingTracks: boolean;
  onRemoveLift: (sectionId: string, liftIndex: number) => void;
  onRemoveBenchmark: (sectionId: string, benchmarkIndex: number) => void;
  onRemoveForgeBenchmark: (sectionId: string, forgeIndex: number) => void;
}) {
  const endTime = elapsedMinutes + section.duration;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea as content changes
  useEffect(() => {
    if (textareaRef.current && isExpanded) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [section.content, isExpanded]);

  return (
    <div
      className='border border-gray-300 rounded-lg bg-white overflow-hidden'
      onClick={onSetActive}
      onDragOver={e => onDragOver(e, sectionIndex)}
      onDrop={e => onDrop(e, sectionIndex)}
    >
      {/* Section Header */}
      <div className='flex items-start gap-2 p-3 bg-gray-50 border-b border-gray-200'>
        {/* Drag Handle */}
        <div
          draggable
          onDragStart={e => onDragStart(e, sectionIndex)}
          className='cursor-move text-gray-400 hover:text-gray-600 mt-1'
        >
          <GripVertical size={18} />
        </div>

        {/* Main Content Area */}
        <div className='flex-1 min-w-0'>
          {/* Top Row: Type, Duration, Time Range, Actions */}
          <div className='flex items-center gap-3 flex-wrap mb-2'>
            <select
              value={section.type}
              onChange={e => onUpdate({ type: e.target.value })}
              className='px-3 py-1 border border-gray-300 rounded text-sm font-semibold focus:ring-2 focus:ring-[#208479] focus:border-transparent bg-white text-gray-900'
              disabled={loadingTracks}
            >
              {sectionTypes.map(type => (
                <option key={type.id} value={type.name}>
                  {type.name}
                </option>
              ))}
            </select>

            <div className='flex items-center gap-2 text-sm'>
              <input
                type='number'
                value={section.duration}
                onChange={e => onUpdate({ duration: parseInt(e.target.value) || 0 })}
                min='0'
                max='60'
                className='w-16 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-[#208479] focus:border-transparent bg-white text-gray-900'
              />
              <span className='text-gray-700'>mins</span>
            </div>

            <div className='text-xs text-gray-700 bg-white px-2 py-1 rounded border border-gray-200'>
              {elapsedMinutes + 1}-{endTime} min
            </div>

            {/* Workout Type Dropdown - Only for WOD sections */}
            {section.type === 'WOD' && (
              <div className='flex items-center gap-2'>
                <label className='text-xs font-semibold text-gray-700'>Type:</label>
                <select
                  value={section.workout_type_id || ''}
                  onChange={e => onUpdate({ workout_type_id: e.target.value })}
                  className='px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 bg-white text-xs'
                  disabled={loadingTracks}
                >
                  <option value=''>Select Type...</option>
                  {workoutTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className='ml-auto flex items-center gap-2'>
              <button
                type='button'
                onClick={onToggleExpand}
                className='text-gray-500 hover:text-gray-700 p-1'
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                <ChevronDown
                  size={16}
                  className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                />
              </button>
              <button
                type='button'
                onClick={onDelete}
                className='text-gray-400 hover:text-red-600 p-1'
                title='Delete section'
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* Content Preview/Editor */}
          {isExpanded ? (
            <div className='space-y-2'>
              {/* Movement Badges - Display configured lifts, benchmarks, forge benchmarks */}
              {((section.lifts && section.lifts.length > 0) ||
                (section.benchmarks && section.benchmarks.length > 0) ||
                (section.forge_benchmarks && section.forge_benchmarks.length > 0)) && (
                <div className='space-y-2'>
                  {/* Lifts */}
                  {section.lifts && section.lifts.length > 0 && (
                    <div className='flex flex-wrap gap-2'>
                      {section.lifts.map((lift, idx) => (
                        <div
                          key={idx}
                          className='flex items-center gap-2 bg-blue-100 text-blue-900 rounded-md px-3 py-1.5 text-sm font-medium border border-blue-300'
                        >
                          <GripVertical size={14} className='text-blue-600' />
                          <span>{formatLift(lift)}</span>
                          <button
                            type='button'
                            onClick={e => {
                              e.stopPropagation();
                              onRemoveLift(section.id, idx);
                            }}
                            className='text-blue-600 hover:text-blue-800 hover:bg-blue-200 rounded-full p-0.5'
                            title='Remove lift'
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Benchmarks */}
                  {section.benchmarks && section.benchmarks.length > 0 && (
                    <div className='flex flex-wrap gap-2'>
                      {section.benchmarks.map((benchmark, idx) => (
                        <div
                          key={idx}
                          className='flex items-center gap-2 bg-teal-100 text-teal-900 rounded-md px-3 py-1.5 text-sm font-medium border border-teal-300'
                        >
                          <GripVertical size={14} className='text-teal-600' />
                          <span>{formatBenchmark(benchmark)}</span>
                          <button
                            type='button'
                            onClick={e => {
                              e.stopPropagation();
                              onRemoveBenchmark(section.id, idx);
                            }}
                            className='text-teal-600 hover:text-teal-800 hover:bg-teal-200 rounded-full p-0.5'
                            title='Remove benchmark'
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Forge Benchmarks */}
                  {section.forge_benchmarks && section.forge_benchmarks.length > 0 && (
                    <div className='flex flex-wrap gap-2'>
                      {section.forge_benchmarks.map((forge, idx) => (
                        <div
                          key={idx}
                          className='flex items-center gap-2 bg-cyan-100 text-cyan-900 rounded-md px-3 py-1.5 text-sm font-medium border border-cyan-300'
                        >
                          <GripVertical size={14} className='text-cyan-600' />
                          <span>{formatForgeBenchmark(forge)}</span>
                          <button
                            type='button'
                            onClick={e => {
                              e.stopPropagation();
                              onRemoveForgeBenchmark(section.id, idx);
                            }}
                            className='text-cyan-600 hover:text-cyan-800 hover:bg-cyan-200 rounded-full p-0.5'
                            title='Remove forge benchmark'
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <textarea
                ref={textareaRef}
                value={section.content}
                onChange={e => onUpdate({ content: e.target.value })}
                placeholder='Add exercises (one per line):&#10;* Burpees&#10;* Elephant Walk&#10;* ATY Raises'
                rows={3}
                data-section-id={section.id}
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent font-mono text-sm bg-white resize-none overflow-hidden min-h-[80px] text-gray-900 placeholder-gray-400'
              />
              <p className='text-xs text-gray-600'>
                Tip: Use * for bullet points, add reps/sets, cut/paste, reorder freely
              </p>
            </div>
          ) : (
            <div
              onClick={onToggleExpand}
              className='cursor-pointer hover:bg-gray-50 rounded p-2 -m-2'
            >
              {section.content ? (
                <div className='text-sm text-gray-900 whitespace-pre-wrap font-mono bg-gray-50 p-2 rounded border border-gray-200 max-h-32 overflow-auto'>
                  {section.content}
                </div>
              ) : (
                <div className='text-sm text-gray-500 italic'>
                  No exercises added yet. Click here or Library to add exercises.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default WODSectionComponent;
