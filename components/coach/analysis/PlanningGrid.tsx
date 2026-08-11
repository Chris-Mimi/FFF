'use client';

import { useMemo, useState, useRef, useCallback, Fragment } from 'react';
import { Check, X, ChevronRight, ChevronDown, GripVertical } from 'lucide-react';
import type { PatternWithExercises, ProgrammingPlanItem, PlanningGridWeek, WeeklyCoverageMap, PatternGapResult, ExerciseOccurrence } from '@/types/planner';
import type { ExerciseFrequency } from '@/utils/movement-analytics';
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
  /**
   * 'all': one row per pattern; a coverage dot fills when ANY linked exercise
   * appeared that week. 'rm-only': the grid explodes into one row per exercise
   * (grouped under its pattern), and a coverage dot fills only when THAT
   * exercise had a 1/3/5/10RM test that week.
   */
  contentFilter?: 'all' | 'rm-only';
  /** Click a week header to make that week the grid's start (left edge). */
  onSetStart?: (weekStart: string) => void;
  /** Reorder pattern groups (full id list in new order) — used in 'all' mode. */
  onReorderPatterns?: (orderedIds: string[]) => Promise<void> | void;
  /** Reorder exercises within one pattern — used in 'rm-only' mode. */
  onReorderExercises?: (patternId: string, orderedExerciseIds: string[]) => Promise<void> | void;
  /** Full-history exercise frequency map (exercise id → frequency), for the
   *  "last 3 unique workouts" popover when a coach clicks an exercise chip. */
  exerciseHistory?: Map<string, ExerciseFrequency>;
  /** True while the history map is being fetched (first chip click). */
  historyLoading?: boolean;
  /** Trigger the lazy full-history load (called on first exercise-chip click). */
  onLoadExerciseHistory?: () => void;
}

interface SelectedPast {
  patternId: string;
  patternName: string;
  color: string;
  weekStart: string;
  weekLabel: string;
}

interface SelectedExercise {
  patternId: string;
  patternName: string;
  color: string;
  exName: string;
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
  contentFilter = 'all',
  onSetStart,
  onReorderPatterns,
  onReorderExercises,
  exerciseHistory,
  historyLoading = false,
  onLoadExerciseHistory,
}: PlanningGridProps) {
  const rmOnly = contentFilter === 'rm-only';
  const [inlineExpandedId, setInlineExpandedId] = useState<string | null>(null);

  // Drag-reorder state. Patterns reorder in 'all' mode (group rows); exercises
  // reorder in 'rm-only' mode (within their group). Native HTML5 DnD — matches
  // PatternManager + the touch polyfill auto-attaches to draggable handles.
  const [draggedPatternId, setDraggedPatternId] = useState<string | null>(null);
  const [dragOverPatternId, setDragOverPatternId] = useState<string | null>(null);
  const [draggedEx, setDraggedEx] = useState<{ patternId: string; exId: string } | null>(null);
  const [dragOverExId, setDragOverExId] = useState<string | null>(null);

  const handlePatternDrop = (targetId: string) => {
    const dragged = draggedPatternId;
    setDraggedPatternId(null);
    setDragOverPatternId(null);
    if (!dragged || dragged === targetId) return;
    const ids = patterns.map(p => p.id);
    const from = ids.indexOf(dragged);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) return;
    ids.splice(from, 1);
    ids.splice(to, 0, dragged);
    onReorderPatterns?.(ids);
  };

  const handleExerciseDrop = (patternId: string, targetExId: string, orderedExIds: string[]) => {
    const dragged = draggedEx;
    setDraggedEx(null);
    setDragOverExId(null);
    if (!dragged || dragged.patternId !== patternId || dragged.exId === targetExId) return;
    const ids = [...orderedExIds];
    const from = ids.indexOf(dragged.exId);
    const to = ids.indexOf(targetExId);
    if (from === -1 || to === -1) return;
    ids.splice(from, 1);
    ids.splice(to, 0, dragged.exId);
    onReorderExercises?.(patternId, ids);
  };

  // Track the horizontal-scroll container's VISIBLE width. An expanded pattern's
  // exercise chips live in a full-width colSpan cell; at 6/12-month scale the
  // table is far wider than the viewport, so without this the chips stretch
  // across the entire scrolled width. We pin them (sticky) to a div sized to the
  // visible window instead. Callback ref (not useEffect) so the observer attaches
  // whenever the scroll div mounts — including after patterns load async, when an
  // initial empty-state render means the div isn't there on first mount.
  const [viewportWidth, setViewportWidth] = useState<number>(0);
  const roRef = useRef<ResizeObserver | null>(null);
  const scrollRefCb = useCallback((node: HTMLDivElement | null) => {
    roRef.current?.disconnect();
    if (!node) return;
    setViewportWidth(node.clientWidth);
    const ro = new ResizeObserver(() => setViewportWidth(node.clientWidth));
    ro.observe(node);
    roRef.current = ro;
  }, []);

  // Predicate: in rm-only mode a pattern-week is only "covered" if at least
  // one matched exercise carried an rmType.
  const isWeekCovered = (weekStart: string, patternId: string): boolean => {
    const detail = coverage.get(weekStart)?.get(patternId);
    if (!detail) return false;
    if (rmOnly) {
      return detail.exercises.some(ex => !!ex.rmType);
    }
    return true;
  };

  // Per-exercise RM-test occurrences for a given pattern-week (rm-only rows).
  const exerciseRmOccurrences = (
    weekStart: string,
    patternId: string,
    exName: string
  ): ExerciseOccurrence[] => {
    const ex = coverage.get(weekStart)?.get(patternId)?.exercises.find(x => x.name === exName);
    return ex?.occurrences.filter(o => !!o.rmType) ?? [];
  };

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

  // RM-only mode shows ONLY the dedicated RM-testing group (e.g. "Barbell
  // Strength Testing 1,3,5 & 10RM"). It's identified by the rep-max notation in
  // its name (a digit immediately followed by "RM", e.g. "10RM") — unique to
  // that group. Content-based detection can't be used: a movement like Back
  // Squat lives in several patterns, so its RM occurrence would mark all of them.
  const rmPatternIds = useMemo(() => {
    const ids = new Set<string>();
    for (const p of patterns) {
      if (/\d\s*RM\b/i.test(p.name)) ids.add(p.id);
    }
    return ids;
  }, [patterns]);

  const displayPatterns = rmOnly
    ? patterns.filter(p => rmPatternIds.has(p.id))
    : patterns;

  // Build plan item lookup: `${patternId}_${weekStart}` → PlanItem
  const planLookup = useMemo(() => {
    const map = new Map<string, ProgrammingPlanItem>();
    planItems.forEach(item => {
      map.set(`${item.pattern_id}_${item.week_start}`, item);
    });
    return map;
  }, [planItems]);

  const [selectedPast, setSelectedPast] = useState<SelectedPast | null>(null);
  const [selectedEx, setSelectedEx] = useState<SelectedExercise | null>(null);
  // Exercise id whose "last 3 unique workouts" popover is open inside the
  // 'all'-mode group-dot detail panel (null = none).
  const [selectedChipExId, setSelectedChipExId] = useState<string | null>(null);

  // Open/close a group-dot detail panel. Clearing the panel or switching to a
  // different pattern-week also closes any open exercise-chip popover.
  const selectPast = (next: SelectedPast | null) => {
    setSelectedChipExId(null);
    setSelectedPast(next);
  };

  // Resolve chip name (display_name || name) → exercise id, for the selected
  // pattern's exercises. Coverage chips carry only the name; the pattern's own
  // exercise list carries the id we key programming history by.
  const chipNameToExId = useMemo(() => {
    const m = new Map<string, string>();
    if (!selectedPast) return m;
    const pat = patterns.find(p => p.id === selectedPast.patternId);
    pat?.exercises.forEach(e => m.set(e.display_name || e.name, e.id));
    return m;
  }, [patterns, selectedPast]);

  // Last 5 UNIQUE workouts (deduped by workout_name, else date) the selected
  // chip's exercise was programmed in, most-recent first. `workouts` is already
  // sorted newest-first by getExerciseFrequency.
  const chipLast3 = useMemo(() => {
    if (!selectedChipExId || !exerciseHistory) return [];
    const freq = exerciseHistory.get(selectedChipExId);
    if (!freq) return [];
    const seen = new Set<string>();
    const out: { key: string; workout_name: string | null; date: string }[] = [];
    for (const w of freq.workouts) {
      const key = (w.workout_name || '').trim() || w.date;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ key, workout_name: w.workout_name, date: w.date });
      if (out.length === 5) break;
    }
    return out;
  }, [selectedChipExId, exerciseHistory]);

  const selectedDetailRaw = selectedPast
    ? coverage.get(selectedPast.weekStart)?.get(selectedPast.patternId) || null
    : null;
  const selectedDetail = selectedDetailRaw && rmOnly
    ? { ...selectedDetailRaw, exercises: selectedDetailRaw.exercises.filter(ex => !!ex.rmType) }
    : selectedDetailRaw;

  const selectedExOcc = selectedEx
    ? exerciseRmOccurrences(selectedEx.weekStart, selectedEx.patternId, selectedEx.exName)
    : [];

  // Reusable future-week planning circle (dashed = open slot, filled = planned).
  const renderPlanningCell = (pattern: PatternWithExercises, weekStart: string) => {
    const isPlanned = planLookup.has(`${pattern.id}_${weekStart}`);
    return (
      <button
        onClick={() => onTogglePlan(pattern.id, weekStart)}
        className='w-full flex justify-center'
        title={isPlanned ? 'Remove from plan' : 'Add to plan'}
      >
        {isPlanned ? (
          <div
            className='w-5 h-5 rounded-full border-2 flex items-center justify-center'
            style={{ borderColor: pattern.color, backgroundColor: pattern.color + '20' }}
          >
            <Check size={10} style={{ color: pattern.color }} />
          </div>
        ) : (
          <div className='w-5 h-5 rounded-full border-2 border-dashed border-gray-300 hover:border-gray-400 transition' />
        )}
      </button>
    );
  };

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
        {rmOnly && (
          <span className='ml-2 text-xs font-normal text-gray-500'>
            · RM testing — one row per exercise, dot fills on 1/3/5/10RM weeks
          </span>
        )}
      </h3>
      <div ref={scrollRefCb} className='overflow-x-auto'>
        <table className='min-w-full border-collapse'>
          <thead>
            <tr>
              <th className='sticky left-0 z-10 bg-gray-100 px-3 py-2 text-left text-xs font-semibold text-gray-600 border-b border-r min-w-[140px] md:min-w-[180px]'>
                {rmOnly ? 'Exercise' : 'Pattern'}
              </th>
              {weeks.map(week => (
                <th
                  key={week.weekStart}
                  className={`p-0 text-center text-xs font-medium border-b min-w-[48px] ${
                    week.isCurrent
                      ? 'bg-[#178da6]/10 text-[#178da6] font-bold'
                      : week.isPast
                      ? 'bg-gray-50 text-gray-400'
                      : 'bg-white text-gray-600'
                  }`}
                >
                  <button
                    type='button'
                    onClick={() => onSetStart?.(week.weekStart)}
                    className='w-full px-1 py-2 hover:bg-[#178da6]/20 transition cursor-pointer'
                    title='Start the grid from this week'
                  >
                    {week.weekLabel}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rmOnly && displayPatterns.length === 0 && (
              <tr>
                <td
                  colSpan={weeks.length + 1}
                  className='px-3 py-6 text-center text-sm text-gray-500 border-b'
                >
                  No RM-testing group found. Name a movement pattern with rep-max notation (e.g. &ldquo;… 1,3,5 &amp; 10RM&rdquo;) to show it here.
                </td>
              </tr>
            )}
            {displayPatterns.map(pattern => {
              // ---- RM-only mode: pattern header row + one row per exercise ----
              if (rmOnly) {
                // Stored order (sort_order) — drag a row to reorder.
                const orderedExercises = pattern.exercises;
                const exIdOrder = orderedExercises.map(e => e.id);
                return (
                  <Fragment key={pattern.id}>
                    {/* Pattern header — group label + future-week planning circles */}
                    <tr className='bg-gray-50'>
                      <td className='sticky left-0 z-10 bg-gray-50 px-3 py-2 border-b border-r'>
                        <div className='flex items-center gap-1.5'>
                          <div
                            className='w-2.5 h-2.5 rounded-full shrink-0'
                            style={{ backgroundColor: pattern.color }}
                          />
                          <span className='text-xs md:text-sm font-semibold text-gray-800 truncate'>
                            {pattern.name}
                          </span>
                        </div>
                      </td>
                      {weeks.map(week => (
                        <td
                          key={week.weekStart}
                          className={`px-1 py-2 text-center border-b bg-gray-50 ${
                            week.isCurrent ? 'bg-[#178da6]/5' : ''
                          }`}
                        >
                          {!week.isPast && !week.isCurrent
                            ? renderPlanningCell(pattern, week.weekStart)
                            : null}
                        </td>
                      ))}
                    </tr>
                    {/* Exercise rows */}
                    {orderedExercises.length === 0 ? (
                      <tr>
                        <td
                          colSpan={weeks.length + 1}
                          className='px-3 py-2 pl-8 text-xs text-gray-400 italic border-b'
                        >
                          No exercises in this pattern.
                        </td>
                      </tr>
                    ) : (
                      orderedExercises.map(ex => {
                        const exName = ex.display_name || ex.name;
                        const isDragged = draggedEx?.exId === ex.id && draggedEx?.patternId === pattern.id;
                        const isDragOver = dragOverExId === ex.id && draggedEx?.patternId === pattern.id;
                        return (
                          <tr
                            key={ex.id}
                            className={`hover:bg-gray-50/50 ${isDragged ? 'opacity-40' : ''} ${
                              isDragOver ? 'bg-[#178da6]/10' : ''
                            }`}
                            onDragOver={e => {
                              if (draggedEx?.patternId === pattern.id && draggedEx.exId !== ex.id) {
                                e.preventDefault();
                                setDragOverExId(ex.id);
                              }
                            }}
                            onDrop={() => handleExerciseDrop(pattern.id, ex.id, exIdOrder)}
                          >
                            <td className='sticky left-0 z-10 bg-white px-3 py-2 pl-6 border-b border-r'>
                              <div className='flex items-center gap-1.5'>
                                <span
                                  draggable
                                  onDragStart={() => setDraggedEx({ patternId: pattern.id, exId: ex.id })}
                                  onDragEnd={() => { setDraggedEx(null); setDragOverExId(null); }}
                                  className='cursor-grab active:cursor-grabbing shrink-0 text-gray-300 hover:text-gray-500 pointer-coarse:opacity-100 transition'
                                  title='Drag to reorder'
                                >
                                  <GripVertical size={13} />
                                </span>
                                <span className='text-xs md:text-sm text-gray-700 truncate'>
                                  {exName}
                                </span>
                              </div>
                            </td>
                            {weeks.map(week => {
                              const showCoverage = week.isPast || week.isCurrent;
                              if (!showCoverage) {
                                return (
                                  <td
                                    key={week.weekStart}
                                    className='px-1 py-2 border-b'
                                  />
                                );
                              }
                              const occ = exerciseRmOccurrences(week.weekStart, pattern.id, exName);
                              const isCov = occ.length > 0;
                              const isSel =
                                selectedEx?.patternId === pattern.id &&
                                selectedEx?.exName === exName &&
                                selectedEx?.weekStart === week.weekStart;
                              return (
                                <td
                                  key={week.weekStart}
                                  className={`px-1 py-2 text-center border-b ${
                                    week.isCurrent ? 'bg-[#178da6]/5' : ''
                                  }`}
                                >
                                  {isCov ? (
                                    <button
                                      type='button'
                                      onClick={() =>
                                        setSelectedEx(isSel ? null : {
                                          patternId: pattern.id,
                                          patternName: pattern.name,
                                          color: pattern.color,
                                          exName,
                                          weekStart: week.weekStart,
                                          weekLabel: week.weekLabel,
                                        })
                                      }
                                      className='w-full flex justify-center'
                                      title='Click to see the RM-test date'
                                    >
                                      <div
                                        className={`w-5 h-5 rounded-full flex items-center justify-center transition ${
                                          isSel ? 'ring-2 ring-offset-1 ring-gray-700' : ''
                                        }`}
                                        style={{ backgroundColor: pattern.color }}
                                      >
                                        <Check size={12} className='text-white' />
                                      </div>
                                    </button>
                                  ) : (
                                    <div className='flex justify-center'>
                                      <div className='w-5 h-5 rounded-full bg-gray-100' />
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })
                    )}
                  </Fragment>
                );
              }

              // ---- 'all' mode: one row per pattern (with inline-expand chips) ----
              const isInlineExpanded = inlineExpandedId === pattern.id;
              const isPatternDragged = draggedPatternId === pattern.id;
              const isPatternDragOver = dragOverPatternId === pattern.id;
              return (
              <Fragment key={pattern.id}>
              <tr
                className={`hover:bg-gray-50/50 ${isPatternDragged ? 'opacity-40' : ''} ${
                  isPatternDragOver ? 'bg-[#178da6]/10' : ''
                }`}
                onDragOver={e => {
                  if (draggedPatternId && draggedPatternId !== pattern.id) {
                    e.preventDefault();
                    setDragOverPatternId(pattern.id);
                  }
                }}
                onDrop={() => handlePatternDrop(pattern.id)}
              >
                <td className='sticky left-0 z-10 bg-white px-3 py-2 border-b border-r'>
                  <div className='flex items-center gap-1.5'>
                  <span
                    draggable
                    onDragStart={() => setDraggedPatternId(pattern.id)}
                    onDragEnd={() => { setDraggedPatternId(null); setDragOverPatternId(null); }}
                    className='cursor-grab active:cursor-grabbing shrink-0 text-gray-300 hover:text-gray-500 pointer-coarse:opacity-100 transition'
                    title='Drag to reorder groups'
                  >
                    <GripVertical size={13} />
                  </span>
                  <button
                    type='button'
                    onClick={() => setInlineExpandedId(isInlineExpanded ? null : pattern.id)}
                    className='flex items-center gap-1.5 flex-1 text-left hover:text-[#178da6] transition'
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
                  </div>
                </td>
                {weeks.map(week => {
                  const isCovered = isWeekCovered(week.weekStart, pattern.id);
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
                        selectPast(isSelected ? null : {
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
                          renderPlanningCell(pattern, week.weekStart)
                        ) : (
                          // Past, no coverage
                          <div className='flex justify-center'>
                            <div className='w-5 h-5 rounded-full bg-gray-100' />
                          </div>
                        )
                      ) : (
                        renderPlanningCell(pattern, week.weekStart)
                      )}
                    </td>
                  );
                })}
              </tr>
              {isInlineExpanded && (
                <tr>
                  <td colSpan={weeks.length + 1} className='bg-gray-50/60 border-b p-0'>
                    {/* Pinned to the left edge of the scroll viewport and sized
                        to the visible width, so chips fill the visible window and
                        wrap within it rather than stretching across the full
                        scrolled width at 6/12-month scale. */}
                    <div
                      className='sticky left-0 px-3 py-2'
                      style={viewportWidth ? { width: viewportWidth } : undefined}
                    >
                      <PatternExerciseChips
                        pattern={pattern}
                        gaps={gaps}
                        onOpenExercisePicker={onOpenExercisePicker}
                        onRemoveExercise={onRemoveExercise}
                      />
                    </div>
                  </td>
                </tr>
              )}
              </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 'all' mode detail: which exercises covered the selected pattern-week */}
      {!rmOnly && selectedPast && selectedDetail && selectedDetail.exercises.length > 0 && (
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
              onClick={() => selectPast(null)}
              className='text-gray-400 hover:text-gray-600 shrink-0'
              aria-label='Close details'
            >
              <X size={16} />
            </button>
          </div>
          <div className='flex flex-wrap gap-1.5 mb-2'>
            {selectedDetail.exercises.map(ex => {
              const exId = chipNameToExId.get(ex.name);
              const isChipSel = !!exId && selectedChipExId === exId;
              return (
                <button
                  key={ex.name}
                  type='button'
                  disabled={!exId}
                  onClick={() => {
                    if (!exId) return;
                    onLoadExerciseHistory?.();
                    setSelectedChipExId(isChipSel ? null : exId);
                  }}
                  title={exId ? 'Click for the last 5 unique workouts' : undefined}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border transition ${
                    ex.rmType
                      ? 'bg-amber-50 border-amber-300 text-amber-800'
                      : 'bg-white border-gray-200 text-gray-700'
                  } ${
                    isChipSel ? 'ring-2 ring-offset-1 ring-gray-700' : ''
                  } ${exId ? 'hover:border-[#178da6] cursor-pointer' : 'cursor-default'}`}
                >
                  {ex.name}
                  {ex.rmType && (
                    <span className='inline-flex items-center px-1 py-px rounded bg-amber-200 text-amber-900 text-[10px] font-semibold'>
                      {ex.rmType}
                    </span>
                  )}
                </button>
              );
            })}
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

          {/* Last-3-unique-workouts popover for the clicked exercise chip */}
          {selectedChipExId && (
            <div className='mt-3 pt-3 border-t border-gray-200'>
              <div className='text-xs font-semibold text-gray-700 mb-1.5'>
                Last 5 unique workouts ·{' '}
                {selectedDetail.exercises.find(ex => chipNameToExId.get(ex.name) === selectedChipExId)?.name}
              </div>
              {historyLoading ? (
                <div className='text-xs text-gray-400 italic'>Loading…</div>
              ) : chipLast3.length === 0 ? (
                <div className='text-xs text-gray-400 italic'>No programming history found.</div>
              ) : (
                <ol className='space-y-1'>
                  {chipLast3.map((w, i) => (
                    <li key={w.key} className='flex items-baseline gap-2 text-xs'>
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
      )}

      {/* rm-only mode detail: the RM-test date(s) for the selected exercise-week */}
      {rmOnly && selectedEx && selectedExOcc.length > 0 && (
        <div className='border-t bg-gray-50 p-3 md:p-4'>
          <div className='flex items-start justify-between gap-2 mb-2'>
            <div className='flex items-center gap-2 flex-wrap'>
              <div
                className='w-2.5 h-2.5 rounded-full shrink-0'
                style={{ backgroundColor: selectedEx.color }}
              />
              <span className='text-sm font-semibold text-gray-800'>
                {selectedEx.exName}
              </span>
              <span className='text-xs text-gray-500'>
                · {selectedEx.patternName} · week of {selectedEx.weekLabel}
              </span>
            </div>
            <button
              type='button'
              onClick={() => setSelectedEx(null)}
              className='text-gray-400 hover:text-gray-600 shrink-0'
              aria-label='Close details'
            >
              <X size={16} />
            </button>
          </div>
          <div className='flex flex-wrap gap-1.5'>
            {selectedExOcc.map(o => (
              <span
                key={o.date}
                className='inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border bg-amber-50 border-amber-300 text-amber-800'
              >
                {new Date(o.date + 'T00:00:00').toLocaleDateString('en-GB', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: '2-digit',
                })}
                {o.rmType && (
                  <span className='inline-flex items-center px-1 py-px rounded bg-amber-200 text-amber-900 text-[10px] font-semibold'>
                    {o.rmType}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
