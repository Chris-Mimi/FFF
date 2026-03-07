'use client';

import { useMemo } from 'react';
import { Check } from 'lucide-react';
import type { PatternWithExercises, ProgrammingPlanItem, PlanningGridWeek } from '@/types/planner';
import { getMonday, generateWeeks } from '@/utils/pattern-analytics';

interface PlanningGridProps {
  patterns: PatternWithExercises[];
  planItems: ProgrammingPlanItem[];
  coverage: Map<string, Set<string>>; // weekMonday → Set<patternId> (auto-detected)
  onTogglePlan: (patternId: string, weekStart: string) => void;
  pastWeeks?: number;
  futureWeeks?: number;
}

export default function PlanningGrid({
  patterns,
  planItems,
  coverage,
  onTogglePlan,
  pastWeeks = 6,
  futureWeeks = 12,
}: PlanningGridProps) {
  const weeks: PlanningGridWeek[] = useMemo(() => {
    const mondayStrs = generateWeeks(pastWeeks, futureWeeks);
    const currentMonday = getMonday(new Date()).toISOString().split('T')[0];

    return mondayStrs.map(ws => {
      const d = new Date(ws + 'T00:00:00');
      return {
        weekStart: ws,
        weekLabel: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        isPast: ws < currentMonday,
        isCurrent: ws === currentMonday,
      };
    });
  }, [pastWeeks, futureWeeks]);

  // Build plan item lookup: `${patternId}_${weekStart}` → PlanItem
  const planLookup = useMemo(() => {
    const map = new Map<string, ProgrammingPlanItem>();
    planItems.forEach(item => {
      map.set(`${item.pattern_id}_${item.week_start}`, item);
    });
    return map;
  }, [planItems]);

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
            {patterns.map(pattern => (
              <tr key={pattern.id} className='hover:bg-gray-50/50'>
                <td className='sticky left-0 z-10 bg-white px-3 py-2 border-b border-r'>
                  <div className='flex items-center gap-2'>
                    <div
                      className='w-2.5 h-2.5 rounded-full shrink-0'
                      style={{ backgroundColor: pattern.color }}
                    />
                    <span className='text-xs md:text-sm font-medium text-gray-800 truncate'>
                      {pattern.name}
                    </span>
                  </div>
                </td>
                {weeks.map(week => {
                  const isCovered = coverage.get(week.weekStart)?.has(pattern.id) || false;
                  const isPlanned = planLookup.has(`${pattern.id}_${week.weekStart}`);

                  return (
                    <td
                      key={week.weekStart}
                      className={`px-1 py-2 text-center border-b ${
                        week.isCurrent ? 'bg-[#178da6]/5' : ''
                      }`}
                    >
                      {week.isPast ? (
                        // Past: show auto-detected coverage
                        isCovered ? (
                          <div className='flex justify-center'>
                            <div
                              className='w-5 h-5 rounded-full flex items-center justify-center'
                              style={{ backgroundColor: pattern.color }}
                              title='Covered this week'
                            >
                              <Check size={12} className='text-white' />
                            </div>
                          </div>
                        ) : (
                          <div className='flex justify-center'>
                            <div className='w-5 h-5 rounded-full bg-gray-100' />
                          </div>
                        )
                      ) : (
                        // Future: click to toggle plan
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
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
