'use client';

import { ChevronDown, GripVertical, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
  if (lift.rm_test) {
    return `${lift.name} ${lift.rm_test}`;
  }
  if (lift.rep_type === 'constant') {
    const base = `${lift.name} ${lift.sets}x${lift.reps}`;
    return lift.percentage_1rm ? `${base} @ ${lift.percentage_1rm}%` : base;
  } else {
    // Variable reps: show as "5-3-1" format
    const reps = lift.variable_sets?.map(s => s.reps).join('-') || '';
    const percentages = lift.variable_sets?.map(s => s.percentage_1rm) || [];

    let base = `${lift.name} ${reps}`;

    // Only show percentages if ALL sets have them defined (no undefined/null values)
    const allHavePercentages = percentages.length > 0 && percentages.every(p => p !== undefined && p !== null);
    if (allHavePercentages) {
      // Show ALL percentages for each set: "40-40-50-50-50-50-50%"
      base += ` @ ${percentages.join('-')}%`;
    }

    return base;
  }
}

function formatBenchmark(benchmark: ConfiguredBenchmark): { name: string; description?: string; exercises?: string[] } {
  const scaling = benchmark.scaling_option ? ` (${benchmark.scaling_option})` : '';
  return {
    name: `${benchmark.name}${scaling}`,
    description: benchmark.description,
    exercises: benchmark.exercises
  };
}

function formatForgeBenchmark(forge: ConfiguredForgeBenchmark): { name: string; description?: string; exercises?: string[] } {
  const scaling = forge.scaling_option ? ` (${forge.scaling_option})` : '';
  return {
    name: `${forge.name}${scaling}`,
    description: forge.description,
    exercises: forge.exercises
  };
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
  onEditLift,
  onTextareaInteraction,
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
  onEditLift: (sectionId: string, liftIndex: number) => void;
  onTextareaInteraction?: (sectionId: string, cursorPosition: number) => void;
}) {
  const endTime = elapsedMinutes + section.duration;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const intentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [intentExpanded, setIntentExpanded] = useState(false);

  // Auto-resize textarea as content changes
  useEffect(() => {
    if (textareaRef.current && isExpanded) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [section.content, isExpanded]);

  // Auto-resize intent textarea
  useEffect(() => {
    if (intentTextareaRef.current && intentExpanded) {
      intentTextareaRef.current.style.height = 'auto';
      intentTextareaRef.current.style.height = `${intentTextareaRef.current.scrollHeight}px`;
    }
  }, [section.intent_notes, intentExpanded]);

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
              className='px-3 py-1 border border-gray-300 rounded text-sm font-semibold focus:ring-2 focus:ring-[#178da6] focus:border-transparent bg-white text-gray-900'
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
                className='w-16 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-[#178da6] focus:border-transparent bg-white text-gray-900'
              />
              <span className='text-gray-700'>mins</span>
            </div>

            <div className='text-xs text-gray-700 bg-white px-2 py-1 rounded border border-gray-200'>
              {elapsedMinutes + 1}-{endTime} min
            </div>

            {/* Workout Type Dropdown - Available for all section types */}
            <div className='flex items-center gap-2'>
              <label className='text-xs font-semibold text-gray-700'>Type:</label>
              <select
                value={section.workout_type_id || ''}
                onChange={e => onUpdate({ workout_type_id: e.target.value })}
                className='px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900 bg-white text-xs'
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

            {/* Scoring Configuration - For WOD and other workout sections */}
            {(section.type === 'WOD' || section.type === 'WOD Pt.1' || section.type === 'WOD Pt.2' || section.type === 'WOD Pt.3' || section.type === 'WOD Pt.4' || section.type === 'WOD Pt.5' || section.type === 'WOD Pt.6' ||
              section.type === 'Olympic Lifting' || section.type === 'Skill' || section.type === 'Gymnastics' ||
              section.type === 'Strength' || section.type === 'Finisher/Bonus!' || section.type === 'Accessory' || section.type === 'WOD movements') && (
            <div className='flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200'>
              <label className='text-xs font-semibold text-gray-700 whitespace-nowrap'>
                📊 Scoring:
              </label>
              <div className='flex flex-wrap gap-x-3 gap-y-1'>
                  {/* Time (lower is better) */}
                  <label className='flex items-center gap-1 text-xs cursor-pointer text-gray-900 whitespace-nowrap'>
                    <input
                      type='checkbox'
                      checked={section.scoring_fields?.time ?? false}
                      onChange={e => onUpdate({
                        scoring_fields: {
                          ...section.scoring_fields,
                          time: e.target.checked,
                          ...(e.target.checked ? { max_time: false } : {})
                        }
                      })}
                      className='rounded border-gray-300'
                    />
                    <span>Time</span>
                  </label>

                  {/* Max Time (higher is better, e.g. max hold) */}
                  <label className='flex items-center gap-1 text-xs cursor-pointer text-gray-900 whitespace-nowrap'>
                    <input
                      type='checkbox'
                      checked={section.scoring_fields?.max_time ?? false}
                      onChange={e => onUpdate({
                        scoring_fields: {
                          ...section.scoring_fields,
                          max_time: e.target.checked,
                          ...(e.target.checked ? { time: false } : {})
                        }
                      })}
                      className='rounded border-gray-300'
                    />
                    <span>Max Time</span>
                  </label>

                  {/* Reps */}
                  <label className='flex items-center gap-1 text-xs cursor-pointer text-gray-900 whitespace-nowrap'>
                    <input
                      type='checkbox'
                      checked={section.scoring_fields?.reps ?? false}
                      onChange={e => onUpdate({
                        scoring_fields: {
                          ...section.scoring_fields,
                          reps: e.target.checked
                        }
                      })}
                      className='rounded border-gray-300'
                    />
                    <span>Reps</span>
                  </label>

                  {/* Rounds + Reps */}
                  <label className='flex items-center gap-1 text-xs cursor-pointer text-gray-900 whitespace-nowrap'>
                    <input
                      type='checkbox'
                      checked={section.scoring_fields?.rounds_reps ?? false}
                      onChange={e => onUpdate({
                        scoring_fields: {
                          ...section.scoring_fields,
                          rounds_reps: e.target.checked
                        }
                      })}
                      className='rounded border-gray-300'
                    />
                    <span>Rounds+Reps</span>
                  </label>

                  {/* Load — numbered toggle boxes */}
                  <div className='flex items-center gap-1 text-xs text-gray-900 whitespace-nowrap'>
                    <span>Load</span>
                    {[1, 2, 3].map(n => {
                      const isActive = n === 1 ? !!section.scoring_fields?.load
                        : n === 2 ? !!section.scoring_fields?.load2
                        : !!section.scoring_fields?.load3;
                      return (
                        <button
                          key={n}
                          type='button'
                          onClick={() => {
                            const sf = { ...section.scoring_fields };
                            if (isActive) {
                              // Turning off: also disable higher levels
                              if (n === 1) { sf.load = false; sf.load2 = false; sf.load3 = false; }
                              else if (n === 2) { sf.load2 = false; sf.load3 = false; }
                              else { sf.load3 = false; }
                            } else {
                              // Turning on: also enable lower levels
                              if (n === 1) { sf.load = true; }
                              else if (n === 2) { sf.load = true; sf.load2 = true; }
                              else { sf.load = true; sf.load2 = true; sf.load3 = true; }
                            }
                            onUpdate({ scoring_fields: sf });
                          }}
                          className={`w-5 h-5 text-[10px] font-bold rounded transition-colors ${
                            isActive
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>

                  {/* Scaling — numbered toggle boxes */}
                  <div className='flex items-center gap-1 text-xs text-gray-900 whitespace-nowrap'>
                    <span>Scaling</span>
                    {[1, 2, 3].map(n => {
                      const isActive = n === 1 ? !!section.scoring_fields?.scaling
                        : n === 2 ? !!section.scoring_fields?.scaling_2
                        : !!section.scoring_fields?.scaling_3;
                      return (
                        <button
                          key={n}
                          type='button'
                          onClick={() => {
                            const sf = { ...section.scoring_fields };
                            if (isActive) {
                              if (n === 1) { sf.scaling = false; sf.scaling_2 = false; sf.scaling_3 = false; }
                              else if (n === 2) { sf.scaling_2 = false; sf.scaling_3 = false; }
                              else { sf.scaling_3 = false; }
                            } else {
                              if (n === 1) { sf.scaling = true; }
                              else if (n === 2) { sf.scaling = true; sf.scaling_2 = true; }
                              else { sf.scaling = true; sf.scaling_2 = true; sf.scaling_3 = true; }
                            }
                            onUpdate({ scoring_fields: sf });
                          }}
                          className={`w-5 h-5 text-[10px] font-bold rounded transition-colors ${
                            isActive
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>

                  {/* Calories */}
                  <label className='flex items-center gap-1 text-xs cursor-pointer text-gray-900 whitespace-nowrap'>
                    <input
                      type='checkbox'
                      checked={section.scoring_fields?.calories ?? false}
                      onChange={e => onUpdate({
                        scoring_fields: {
                          ...section.scoring_fields,
                          calories: e.target.checked
                        }
                      })}
                      className='rounded border-gray-300'
                    />
                    <span>Cal</span>
                  </label>

                  {/* Metres */}
                  <label className='flex items-center gap-1 text-xs cursor-pointer text-gray-900 whitespace-nowrap'>
                    <input
                      type='checkbox'
                      checked={section.scoring_fields?.metres ?? false}
                      onChange={e => onUpdate({
                        scoring_fields: {
                          ...section.scoring_fields,
                          metres: e.target.checked
                        }
                      })}
                      className='rounded border-gray-300'
                    />
                    <span>m</span>
                  </label>

                  {/* Checkbox */}
                  <label className='flex items-center gap-1 text-xs cursor-pointer text-gray-900 whitespace-nowrap'>
                    <input
                      type='checkbox'
                      checked={section.scoring_fields?.checkbox ?? false}
                      onChange={e => onUpdate({
                        scoring_fields: {
                          ...section.scoring_fields,
                          checkbox: e.target.checked
                        }
                      })}
                      className='rounded border-gray-300'
                    />
                    <span>Task✓</span>
                  </label>

                  {/* Track selector */}
                  <label className='flex items-center gap-1 text-xs cursor-pointer text-gray-900 whitespace-nowrap'>
                    <input
                      type='checkbox'
                      checked={section.scoring_fields?.track ?? false}
                      onChange={e => onUpdate({
                        scoring_fields: {
                          ...section.scoring_fields,
                          track: e.target.checked
                        }
                      })}
                      className='rounded border-gray-300'
                    />
                    <span>Trk</span>
                  </label>
                </div>

              {/* Time mode toggle: shown when Time + (Reps or Rounds+Reps) are both enabled */}
              {section.scoring_fields?.time && (section.scoring_fields?.reps || section.scoring_fields?.rounds_reps) && (
                <div className='flex items-center gap-1 ml-2'>
                  <div className='flex rounded overflow-hidden border border-gray-300 text-[10px] font-medium'>
                    <button
                      type='button'
                      onClick={() => onUpdate({
                        scoring_fields: { ...section.scoring_fields, time_amrap: false }
                      })}
                      className={`px-2 py-0.5 transition-colors ${
                        !section.scoring_fields?.time_amrap
                          ? 'bg-teal-600 text-white'
                          : 'bg-white text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      For Time (Cap)
                    </button>
                    <button
                      type='button'
                      onClick={() => onUpdate({
                        scoring_fields: { ...section.scoring_fields, time_amrap: true }
                      })}
                      className={`px-2 py-0.5 transition-colors border-l border-gray-300 ${
                        section.scoring_fields?.time_amrap
                          ? 'bg-amber-500 text-white'
                          : 'bg-white text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      Time + AMRAP
                    </button>
                  </div>
                </div>
              )}
            </div>
            )}

            <div className='ml-auto flex items-center gap-2'>
              <button
                type='button'
                onClick={onToggleExpand}
                className='text-gray-600 hover:text-gray-900 hover:bg-gray-200 p-1.5 rounded transition'
                title={isExpanded ? 'Collapse' : 'Expand'}
                aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
              >
                <ChevronDown
                  size={18}
                  className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                />
              </button>
              <button
                type='button'
                onClick={onDelete}
                className='text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition'
                title='Delete section'
                aria-label='Delete section'
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
                <div className='space-y-3'>
                  {/* Lifts */}
                  {section.lifts && section.lifts.length > 0 && (
                    <div className='space-y-2'>
                      <div className='flex flex-wrap gap-2'>
                        {section.lifts.map((lift, idx) => (
                          <div
                            key={idx}
                            onClick={e => {
                              e.stopPropagation();
                              onEditLift(section.id, idx);
                            }}
                            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium cursor-pointer transition ${
                              lift.rm_test
                                ? 'bg-amber-100 text-amber-900 border border-amber-400 hover:bg-amber-200'
                                : 'bg-blue-100 text-blue-900 border border-blue-300 hover:bg-blue-200'
                            }`}
                            title={lift.rm_test ? 'RM Test - Click to edit' : 'Click to edit lift'}
                          >
                            <GripVertical size={14} className={lift.rm_test ? 'text-amber-600' : 'text-blue-600'} />
                            <span>{formatLift(lift)}</span>
                            <button
                              type='button'
                              onClick={e => {
                                e.stopPropagation();
                                onRemoveLift(section.id, idx);
                              }}
                              className={`rounded-full p-0.5 ${
                                lift.rm_test
                                  ? 'text-amber-600 hover:text-amber-800 hover:bg-amber-200'
                                  : 'text-blue-600 hover:text-blue-800 hover:bg-blue-200'
                              }`}
                              title='Remove lift'
                              aria-label='Remove lift'
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Benchmarks */}
                  {section.benchmarks && section.benchmarks.length > 0 && (
                    <div className='space-y-2'>
                      <div className='flex flex-wrap gap-2'>
                        {section.benchmarks.map((benchmark, idx) => {
                          const formatted = formatBenchmark(benchmark);
                          return (
                            <div
                              key={idx}
                              className='flex items-center gap-2 bg-teal-100 text-teal-900 rounded-md px-3 py-1.5 text-sm font-medium border border-teal-300'
                            >
                              <GripVertical size={14} className='text-teal-600' />
                              <span>{formatted.name}</span>
                              <button
                                type='button'
                                onClick={e => {
                                  e.stopPropagation();
                                  onRemoveBenchmark(section.id, idx);
                                }}
                                className='text-teal-600 hover:text-teal-800 hover:bg-teal-200 rounded-full p-0.5'
                                title='Remove benchmark'
                                aria-label='Remove benchmark'
                              >
                                <X size={14} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      {/* Benchmark Descriptions */}
                      {section.benchmarks.map((benchmark, idx) => {
                        const formatted = formatBenchmark(benchmark);
                        return formatted.description ? (
                          <div key={`description-${idx}`} className='text-sm bg-teal-50 p-3 rounded border border-teal-200 text-teal-800 whitespace-pre-wrap'>
                            {formatted.description}
                          </div>
                        ) : null;
                      })}
                      {/* Benchmark Exercises */}
                      {section.benchmarks.map((benchmark, idx) => (
                        benchmark.exercises && benchmark.exercises.length > 0 && (
                          <div key={`exercises-${idx}`} className='text-sm bg-teal-50 p-3 rounded border border-teal-200 text-gray-700'>
                            {benchmark.exercises.join(' • ')}
                          </div>
                        )
                      ))}
                    </div>
                  )}

                  {/* Forge Benchmarks */}
                  {section.forge_benchmarks && section.forge_benchmarks.length > 0 && (
                    <div className='space-y-2'>
                      <div className='flex flex-wrap gap-2'>
                        {section.forge_benchmarks.map((forge, idx) => {
                          const formatted = formatForgeBenchmark(forge);
                          return (
                            <div
                              key={idx}
                              className='flex items-center gap-2 bg-cyan-100 text-cyan-900 rounded-md px-3 py-1.5 text-sm font-medium border border-cyan-300'
                            >
                              <GripVertical size={14} className='text-cyan-600' />
                              <span>{formatted.name}</span>
                              <button
                                type='button'
                                onClick={e => {
                                  e.stopPropagation();
                                  onRemoveForgeBenchmark(section.id, idx);
                                }}
                                className='text-cyan-600 hover:text-cyan-800 hover:bg-cyan-200 rounded-full p-0.5'
                                title='Remove forge benchmark'
                                aria-label='Remove forge benchmark'
                              >
                                <X size={14} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      {/* Forge Benchmark Descriptions */}
                      {section.forge_benchmarks.map((forge, idx) => {
                        const formatted = formatForgeBenchmark(forge);
                        return formatted.description ? (
                          <div key={`description-${idx}`} className='text-sm bg-cyan-50 p-3 rounded border border-cyan-200 text-cyan-800 whitespace-pre-wrap'>
                            {formatted.description}
                          </div>
                        ) : null;
                      })}
                      {/* Forge Benchmark Exercises */}
                      {section.forge_benchmarks.map((forge, idx) => (
                        forge.exercises && forge.exercises.length > 0 && (
                          <div key={`exercises-${idx}`} className='text-sm bg-cyan-50 p-3 rounded border border-cyan-200 text-gray-700'>
                            {forge.exercises.join(' • ')}
                          </div>
                        )
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Intent / Stimulus Notes */}
              {(() => {
                const hasIntent = !!(section.intent_notes && section.intent_notes.trim());
                return (
                  <div className={`border rounded-lg ${hasIntent && !intentExpanded ? 'border-amber-500 bg-amber-200' : 'border-amber-200 bg-amber-50'}`}>
                    <button
                      type='button'
                      onClick={() => setIntentExpanded(v => !v)}
                      className='w-full flex items-center justify-between px-2 py-1.5 text-left'
                      aria-label={intentExpanded ? 'Collapse intent/stimulus' : 'Expand intent/stimulus'}
                    >
                      <div className='flex items-center gap-1.5'>
                        <span className='text-xs font-semibold text-amber-800'>Intent / Stimulus</span>
                        {hasIntent && !intentExpanded && (
                          <span className='text-xs text-amber-700 font-normal italic truncate max-w-[180px]'>
                            — {section.intent_notes!.trim()}
                          </span>
                        )}
                      </div>
                      <ChevronDown
                        size={15}
                        className={`text-amber-600 transition-transform flex-shrink-0 ${intentExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {intentExpanded && (
                      <div className='px-2 pb-2'>
                        <div className='flex items-center justify-end mb-1'>
                          <label className='flex items-center gap-1.5 text-xs text-amber-700 cursor-pointer'>
                            <input
                              type='checkbox'
                              checked={section.show_intent_to_athletes ?? false}
                              onChange={e => onUpdate({ show_intent_to_athletes: e.target.checked })}
                              className='rounded border-amber-300 text-amber-600 focus:ring-amber-500'
                            />
                            Show to athletes
                          </label>
                        </div>
                        <textarea
                          ref={intentTextareaRef}
                          value={section.intent_notes || ''}
                          onChange={e => onUpdate({ intent_notes: e.target.value })}
                          placeholder='e.g., Build to heavy single, Sprint pace sub-8min, Focus on form'
                          rows={2}
                          maxLength={500}
                          className='w-full px-2 py-1.5 border border-amber-200 rounded text-sm bg-white resize-none overflow-hidden focus:ring-2 focus:ring-amber-400 focus:border-transparent text-gray-900 placeholder-gray-400'
                        />
                      </div>
                    )}
                  </div>
                );
              })()}

              <textarea
                ref={textareaRef}
                value={section.content}
                onChange={e => onUpdate({ content: e.target.value })}
                onClick={e => onTextareaInteraction?.(section.id, e.currentTarget.selectionStart)}
                onSelect={e => onTextareaInteraction?.(section.id, e.currentTarget.selectionStart)}
                onBlur={e => onTextareaInteraction?.(section.id, e.currentTarget.selectionStart)}
                placeholder='Add exercises (one per line):&#10;* Burpees&#10;* Elephant Walk&#10;* ATY Raises'
                rows={3}
                data-section-id={section.id}
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent font-mono text-sm bg-white resize-none overflow-hidden min-h-[80px] text-gray-900 placeholder-gray-400'
              />
              <p className='text-xs text-gray-600'>
                Tip: Use * for bullet points, add reps/sets, cut/paste, reorder freely
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default WODSectionComponent;
