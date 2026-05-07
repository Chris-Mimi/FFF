'use client';

import { useMemo, useState, Fragment } from 'react';
import { Check, X, ChevronRight, ChevronDown } from 'lucide-react';
import type { PatternWithExercises, ProgrammingPlanItem, PlanningGridWeek, WeeklyCoverageMap, PatternGapResult } from '@/types/planner';
import { getMonday, generateWeeks } from '@/utils/pattern-analytics';
import { formatDate } from '@/utils/date-utils';
import PatternExerciseChips from './PatternExerciseChips';

interface PlanningGridProps {
  patterns: PatternWithExercises[];
  planItems: ProgrammingPlanItem[];
  coverage: WeeklyCoverageMap; // weekMonday → patternId → { exercises[], dates[] }
  gaps: PatternGapResult[];
  onTogglePlan: (patternId: string, weekStart: string) => void;
  onOpenExercisePicker: (patternId: string) => void;
  onRemoveExercise: (patternId: string, exerciseId: string) => Promise<void> | void;
  pastWeeks?: number;
  futureWeeks?: number;
  anchorDate?: Date;
}

interface SelectedPast {
  patternId: string;
  patternName: string;
  color: string;
  weekStart: string;
  weekLabel: string;
}

export default function PlanningGrid({
  patterns,
  planItems,
  coverage,
  gaps,
  onTogglePlan,
  onOpenExercisePicker,
  onRemoveExercise,
  pastWeeks = 6,
  futureWeeks = 12,
  anchorDate,
}: PlanningGridProps) {
  const [inlineExpandedId, setInlineExpandedId] = useState<string | null>(null);
  const anchorTime = anchorDate?.getTime();
  const weeks: PlanningGridWeek[] = useMemo(() => {
    const mondayStrs = generateWeeks(pastWeeks, futureWeeks, anchorTime ? new Date(anchorTime) : undefined);
    const currentMonday = formatDate(getMonday(new Date()));

    return mondayStrs.map(ws => {
      const d = new Date(ws + 'T00:00:00');
      return {
        weekStart: ws,
        weekLabel: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        isPast: ws < currentMonday,
        isCurrent: ws === currentMonday,
      };
    });
  }, [pastWeeks, futureWeeks, anchorTime]);

  // Build plan item lookup: `${patternId}_${weekStart}` → PlanItem
  const planLookup = useMemo(() => {
    const map = new Map<string, ProgrammingPlanItem>();
    planItems.forEach(item => {
      map.set(`${item.pattern_id}_${item.week_start}`, item);
    });
    return map;
  }, [planItems]);

  const [selectedPast, setSelectedPast] = useState<SelectedPast | null>(null);
  const selectedDetail = selectedPast
    ? coverage.get(selectedPast.weekStart)?.get(selectedPast.patternId) || null
    : null;

  if (patterns.length === 0) {
    return (
      <div className='bg-white rounded-lg shadow-sm border p-4 text-center text-sm text-gray-500'>
        Create movement patterns to see the planning grid.
      </div>
    );
  }

  return (
    <div className='bg-white rounded-lg shadow-sm border'>
      <h3 className='text-sm md:text-base font-semibold text-gray-800 p-3 md:p-4 border-b'>
        Planning Grid
      </h3>
      <div className='overflow-x-auto'>
        <table className='min-w-full border-collapse'>
          <thead>
            <tr>
              <th className='sticky left-0 z-10 bg-gray-100 px-3 py-2 text-left text-xs font-semibold text-gray-600 border-b border-r min-w-[140px] md:min-w-[180px]'>
                Pattern
              </th>
              {weeks.map(week => (
                <th
                  key={week.weekStart}
                  className={`px-1 py-2 text-center text-xs font-medium border-b min-w-[48px] ${
                    week.isCurrent
                      ? 'bg-[#178da6]/10 text-[#178da6] font-bold'
                      : week.isPast
                      ? 'bg-gray-50 text-gray-400'
                      : 'bg-white text-gray-600'
                  }`}
                >
                  {week.weekLabel}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {patterns.map(pattern => {
              const isInlineExpanded = inlineExpandedId === pattern.id;
              return (
              <Fragment key={pattern.id}>
              <tr className='hover:bg-gray-50/50'>
                <td className='sticky left-0 z-10 bg-white px-3 py-2 border-b border-r'>
                  <button
                    type='button'
                    onClick={() => setInlineExpandedId(isInlineExpanded ? null : pattern.id)}
                    className='flex items-center gap-1.5 w-full text-left hover:text-[#178da6] transition'
                    title='Show exercises in this pattern'
                  >
                    {isInlineExpanded ? (
                      <ChevronDown size={12} className='shrink-0 text-gray-400' />
                    ) : (
                      <ChevronRight size={12} className='shrink-0 text-gray-400' />
                    )}
                    <div
                      className='w-2.5 h-2.5 rounded-full shrink-0'
                      style={{ backgroundColor: pattern.color }}
                    />
                    <span className='text-xs md:text-sm font-medium truncate'>
                      {pattern.name}
                    </span>
                  </button>
                </td>
                {weeks.map(week => {
                  const isCovered = coverage.get(week.weekStart)?.has(pattern.id) || false;
                  const isPlanned = planLookup.has(`${pattern.id}_${week.weekStart}`);
                  const isSelected =
                    selectedPast?.patternId === pattern.id &&
                    selectedPast?.weekStart === week.weekStart;

                  // Past + current: coverage view (covered dot is clickable for details).
                  // Current also falls back to planning circle when no coverage yet.
                  // Future: planning view only.
                  const showCoverageView = week.isPast || week.isCurrent;
                  const renderCovered = (
                    <button
                      type='button'
                      onClick={() =>
                        setSelectedPast(isSelected ? null : {
                          patternId: pattern.id,
                          patternName: pattern.name,
                          color: pattern.color,
                          weekStart: week.weekStart,
                          weekLabel: week.weekLabel,
                        })
                      }
                      className='w-full flex justify-center'
                      title='Click to see exercises used'
                    >
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center transition ${
                          isSelected ? 'ring-2 ring-offset-1 ring-gray-700' : ''
                        }`}
                        style={{ backgroundColor: pattern.color }}
                      >
                        <Check size={12} className='text-white' />
                      </div>
                    </button>
                  );
                  const renderPlanningButton = (
                    <button
                      onClick={() => onTogglePlan(pattern.id, week.weekStart)}
                      className='w-full flex justify-center'
                      title={isPlanned ? 'Remove from plan' : 'Add to plan'}
                    >
                      {isPlanned ? (
                        <div
                          className='w-5 h-5 rounded-full border-2 flex items-center justify-center'
                          style={{
                            borderColor: pattern.color,
                            backgroundColor: pattern.color + '20',
                          }}
                        >
                          <Check size={10} style={{ color: pattern.color }} />
                        </div>
                      ) : (
                        <div className='w-5 h-5 rounded-full border-2 border-dashed border-gray-300 hover:border-gray-400 transition' />
                      )}
                    </button>
                  );

                  return (
                    <td
                      key={week.weekStart}
                      className={`px-1 py-2 text-center border-b ${
                        week.isCurrent ? 'bg-[#178da6]/5' : ''
                      }`}
                    >
                      {showCoverageView ? (
                        isCovered ? (
                          renderCovered
                        ) : week.isCurrent ? (
                          // Current week, no coverage yet: still let coach toggle planning
                          renderPlanningButton
                        ) : (
                          // Past, no coverage
                          <div className='flex justify-center'>
                            <div className='w-5 h-5 rounded-full bg-gray-100' />
                          </div>
                        )
                      ) : (
                        renderPlanningButton
                      )}
                    </td>
                  );
                })}
              </tr>
              {isInlineExpanded && (
                <tr>
                  <td colSpan={weeks.length + 1} className='bg-gray-50/60 border-b px-3 py-2'>
                    <PatternExerciseChips
                      pattern={pattern}
                      gaps={gaps}
                      onOpenExercisePicker={onOpenExercisePicker}
                      onRemoveExercise={onRemoveExercise}
                    />
                  </td>
                </tr>
              )}
              </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {selectedPast && selectedDetail && (
        <div className='border-t bg-gray-50 p-3 md:p-4'>
          <div className='flex items-start justify-between gap-2 mb-2'>
            <div className='flex items-center gap-2 flex-wrap'>
              <div
                className='w-2.5 h-2.5 rounded-full shrink-0'
                style={{ backgroundColor: selectedPast.color }}
              />
              <span className='text-sm font-semibold text-gray-800'>
                {selectedPast.patternName}
              </span>
              <span className='text-xs text-gray-500'>
                · week of {selectedPast.weekLabel}
              </span>
            </div>
            <button
              type='button'
              onClick={() => setSelectedPast(null)}
              className='text-gray-400 hover:text-gray-600 shrink-0'
              aria-label='Close details'
            >
              <X size={16} />
            </button>
          </div>
          <div className='flex flex-wrap gap-1.5 mb-2'>
            {selectedDetail.exercises.map(ex => (
              <span
                key={ex}
                className='inline-flex items-center px-2 py-0.5 rounded text-xs bg-white border border-gray-200 text-gray-700'
              >
                {ex}
              </span>
            ))}
          </div>
          <div className='text-xs text-gray-500'>
            Programmed on:{' '}
            {selectedDetail.dates
              .map(d =>
                new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })
              )
              .join(', ')}
          </div>
        </div>
      )}
    </div>
  );
}
