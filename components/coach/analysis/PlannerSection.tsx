'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { PatternWithExercises, ProgrammingPlanItem, PatternGapResult, WeeklyCoverageMap } from '@/types/planner';
import { computePatternGaps, detectWeeklyCoverage, generateWeeks, getMonday } from '@/utils/pattern-analytics';
import { getExerciseFrequency, type ExerciseFrequency } from '@/utils/movement-analytics';
import { formatDate } from '@/utils/date-utils';
import PatternManager from './PatternManager';
import PatternExercisePicker from './PatternExercisePicker';
import PlannerInfoModal from './PlannerInfoModal';
import UncategorizedExercises from './UncategorizedExercises';
import { Info, ChevronLeft, ChevronRight } from 'lucide-react';

import PlanningGrid from './PlanningGrid';

interface Exercise {
  id: string;
  name: string;
  display_name: string | null;
  category: string;
}

interface PlannerSectionProps {
  exercises: Exercise[];
}

type ViewMonths = 1 | 3 | 6 | 12;
const VIEW_TO_WEEKS: Record<ViewMonths, number> = { 1: 5, 3: 13, 6: 26, 12: 52 };
const VIEW_STORAGE_KEY = 'planner-view-months';

// Start-anchored window: the grid's LEFT edge is `startMonday` and it runs
// forward by the chosen view length. So switching 1↔3↔6↔12mo keeps the same
// start date instead of re-centering on today (which made the left edge jump).
function deriveWindow(viewMonths: ViewMonths, startMonday: string) {
  const totalWeeks = VIEW_TO_WEEKS[viewMonths];
  return {
    pastWeeks: 0,
    futureWeeks: totalWeeks - 1,
    anchorDate: new Date(startMonday + 'T00:00:00'),
  };
}

// Shift a Monday-string by N weeks (negative = earlier), returns a Monday string.
function shiftMonday(mondayStr: string, deltaWeeks: number): string {
  const d = new Date(mondayStr + 'T00:00:00');
  d.setDate(d.getDate() + deltaWeeks * 7);
  return formatDate(d);
}

// Prev/Next nudge the start by ~1 month, regardless of the view length.
const STEP_WEEKS = 4;

// Start date that puts today's week roughly in the MIDDLE of a view this long.
// Used for the initial load + the "Today" (center) button.
function centeredStart(viewMonths: ViewMonths): string {
  const halfBack = Math.floor((VIEW_TO_WEEKS[viewMonths] - 1) / 2);
  return shiftMonday(formatDate(getMonday(new Date())), -halfBack);
}

export default function PlannerSection({ exercises }: PlannerSectionProps) {
  const [patterns, setPatterns] = useState<PatternWithExercises[]>([]);
  const [planItems, setPlanItems] = useState<ProgrammingPlanItem[]>([]);
  const [gaps, setGaps] = useState<PatternGapResult[]>([]);
  const [coverage, setCoverage] = useState<WeeklyCoverageMap>(new Map());
  const [, setLoading] = useState(true);
  const [, setGapLoading] = useState(false);
  const [exerciseLastDates, setExerciseLastDates] = useState<Map<string, string>>(new Map());

  // Full-history exercise programming map (lowercased name/display_name →
  // frequency incl. every workout), for the "last 5 unique workouts" popover
  // when a coach clicks an exercise chip in a group-dot detail panel. Lazily
  // loaded on first chip click (one all-history fetch), then cached.
  const [exerciseHistory, setExerciseHistory] = useState<Map<string, ExerciseFrequency>>(new Map());
  const [historyLoading, setHistoryLoading] = useState(false);
  const historyLoadedRef = useRef(false);

  // Exercise picker state
  const [pickerPatternId, setPickerPatternId] = useState<string | null>(null);

  // Info modal
  const [infoOpen, setInfoOpen] = useState(false);

  // Track filter scopes the WODs feeding coverage/gap analysis.
  // Patterns themselves are shared across both tracks.
  const [trackFilter, setTrackFilter] = useState<'adults' | 'kids'>('adults');

  // Date-window controls. viewMonths persists across page loads; the start date
  // (left edge of the grid) defaults to this week's Monday each load. Click a
  // week header in the grid, or use Prev/Next/Today, to move it.
  const [viewMonths, setViewMonths] = useState<ViewMonths>(6);
  const [startMonday, setStartMonday] = useState<string>(() => centeredStart(6));
  const centeredNow = centeredStart(viewMonths);

  // Content filter — restrict the grid to RM-tested exercises only.
  // Non-persistent: defaults to 'all' on every load.
  const [contentFilter, setContentFilter] = useState<'all' | 'rm-only'>('all');

  // PatternManager is fully self-managed again — the grid expands inline
  // (see PlanningGrid's inlineExpandedId state) so the upper panel doesn't
  // need to be controlled from here.
  const [expandedPatternId, setExpandedPatternId] = useState<string | null>(null);
  const [patternsPanelOpen, setPatternsPanelOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (raw === '1' || raw === '3' || raw === '6' || raw === '12') {
      const v = Number(raw) as ViewMonths;
      setViewMonths(v);
      // Recenter today for the restored view so the initial load is always
      // today-centered (after this, view changes stay start-anchored).
      setStartMonday(centeredStart(v));
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(VIEW_STORAGE_KEY, String(viewMonths));
  }, [viewMonths]);

  const { pastWeeks, futureWeeks, anchorDate } = useMemo(
    () => deriveWindow(viewMonths, startMonday),
    [viewMonths, startMonday],
  );
  const anchorTime = anchorDate.getTime();

  // Fetch patterns with their exercises (shared across tracks)
  const fetchPatterns = useCallback(async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data: patternData, error: patternError } = await supabase
      .from('movement_patterns')
      .select('*')
      .eq('user_id', user.user.id)
      .order('sort_order');

    if (patternError) {
      console.error('Error fetching patterns:', patternError);
      return;
    }

    if (!patternData || patternData.length === 0) {
      setPatterns([]);
      setLoading(false);
      return;
    }

    // Fetch exercises for all patterns
    const { data: peData } = await supabase
      .from('movement_pattern_exercises')
      .select('pattern_id, exercise_id, sort_order, exercises(id, name, display_name)')
      .in('pattern_id', patternData.map(p => p.id))
      .order('sort_order', { nullsFirst: false });

    const patternsWithExercises: PatternWithExercises[] = patternData.map(p => ({
      ...p,
      exercises: (peData || [])
        .filter(pe => pe.pattern_id === p.id)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((pe: any) => ({
          id: pe.exercises?.id || pe.exercise_id,
          name: pe.exercises?.name || '',
          display_name: pe.exercises?.display_name,
        })),
    }));

    setPatterns(patternsWithExercises);
    setLoading(false);
    return patternsWithExercises;
  }, []);

  // Fetch plan items
  const fetchPlanItems = useCallback(async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const weeks = generateWeeks(pastWeeks, futureWeeks, new Date(anchorTime));
    const startDate = weeks[0];
    const endDate = weeks[weeks.length - 1];

    const { data } = await supabase
      .from('programming_plan_items')
      .select('*')
      .eq('user_id', user.user.id)
      .gte('week_start', startDate)
      .lte('week_start', endDate);

    setPlanItems(data || []);
  }, [pastWeeks, futureWeeks, anchorTime]);

  // Compute gap analysis and coverage
  const computeAnalysis = useCallback(async (pats: PatternWithExercises[], filter: 'adults' | 'kids' = 'adults') => {
    if (pats.length === 0) {
      setGaps([]);
      setCoverage(new Map());
      return;
    }

    setGapLoading(true);

    // Adults: exclude Kids & Teens. Kids: exclude everything except Kids & Teens.
    const excludeSessionTypes = filter === 'adults'
      ? ['Kids & Teens']
      : ['WOD', 'Foundations', 'Foundations/WOD', 'Endurance', 'Session', 'Specialty/Party/Other'];

    const weeks = generateWeeks(pastWeeks, futureWeeks, new Date(anchorTime));
    const startDate = weeks[0];
    const endDate = weeks[weeks.length - 1];

    // Chip recency must look back at least as far as the leftmost visible grid
    // week — otherwise a week older than the fixed window shows a coverage check
    // in the grid while its exercise chip still reads grey "Never" (16-week floor
    // for when the grid is anchored at/after today).
    const weeksBackToGridStart = Math.ceil(
      (Date.now() - new Date(startDate + 'T00:00:00').getTime()) / (7 * 86400000)
    );
    const gapLookbackWeeks = Math.max(16, weeksBackToGridStart);

    const [gapResults, coverageResults] = await Promise.all([
      computePatternGaps(pats, gapLookbackWeeks, excludeSessionTypes),
      detectWeeklyCoverage(pats, startDate, endDate, excludeSessionTypes),
    ]);

    setGaps(gapResults);
    setCoverage(coverageResults);
    setGapLoading(false);
  }, [pastWeeks, futureWeeks, anchorTime]);

  // Fetch exercise last-programmed dates for picker staleness styling
  const fetchExerciseLastDates = useCallback(async () => {
    // Only look back 12 months for staleness — prevents unbounded growth
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const freqData = await getExerciseFrequency({
      startDate: twelveMonthsAgo.toISOString().split('T')[0],
    });
    const dateMap = new Map<string, string>();
    freqData.forEach(ex => {
      dateMap.set(ex.id, ex.lastProgrammed);
    });
    setExerciseLastDates(dateMap);
  }, []);

  // Lazy full-history load for the "last 3 unique workouts" chip popover.
  // No date filter → true "last 3 times programmed" regardless of how far back.
  const loadExerciseHistory = useCallback(async () => {
    if (historyLoadedRef.current) return;
    historyLoadedRef.current = true;
    setHistoryLoading(true);
    const freq = await getExerciseFrequency();
    // Key by lowercased name AND display_name so a chip (which carries
    // display_name || name) resolves even when two exercise records share a
    // display_name (e.g. "Good Morning" as both barbell-good-morning and
    // good-morning) — matching by name mirrors how the coverage dot matches.
    const map = new Map<string, ExerciseFrequency>();
    freq.forEach(f => {
      if (f.name) map.set(f.name.toLowerCase(), f);
      if (f.display_name) map.set(f.display_name.toLowerCase(), f);
    });
    setExerciseHistory(map);
    setHistoryLoading(false);
  }, []);

  // Initial load
  // Load patterns once on mount (patterns don't depend on the window or track).
  useEffect(() => {
    const init = async () => {
      await fetchPatterns();
      // loadExerciseHistory is eager (not just on chip click) so the group
      // chips can colour by FULL programming history — otherwise a chip reads
      // grey "Never" for anything outside the gap-analysis lookback window.
      await Promise.all([fetchPlanItems(), fetchExerciseLastDates(), loadExerciseHistory()]);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Single source of truth for coverage + plan items: recompute whenever the
  // patterns load OR the date window / track changes. Keying on `patterns` (not
  // just the window) fixes the initial-load race — a persisted view is restored
  // AFTER first paint, so the window widens before patterns finish loading. The
  // old window-only effect bailed on the empty-patterns guard and left coverage
  // scoped to the default window (dots missing before the default left edge);
  // toggling the view re-ran it and "fixed" it. (S382)
  useEffect(() => {
    fetchPlanItems();
    // computeAnalysis handles the empty-patterns case itself (clears gaps +
    // coverage), so we don't early-return here — that keeps the grid correct
    // when the last pattern is deleted. This is the SOLE recompute trigger:
    // every pattern edit calls fetchPatterns() → setPatterns(), and that
    // patterns change re-runs this effect. (S382)
    computeAnalysis(patterns, trackFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patterns, pastWeeks, futureWeeks, anchorTime, trackFilter]);

  // Pattern CRUD
  const handleCreatePattern = async (name: string, color: string) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { error } = await supabase
      .from('movement_patterns')
      .insert({
        user_id: user.user.id,
        name,
        color,
        sort_order: patterns.length,
      });

    if (error) {
      if (error.code === '23505') {
        toast.error('A pattern with that name already exists');
      } else {
        toast.error('Failed to create pattern');
      }
      return;
    }

    await fetchPatterns();
    toast.success(`Created "${name}"`);
  };

  const handleUpdatePattern = async (
    id: string,
    updates: { name?: string; color?: string; staleness_yellow?: number; staleness_red?: number }
  ) => {
    const { error } = await supabase
      .from('movement_patterns')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update pattern');
      return;
    }

    await fetchPatterns();
  };

  const handleDeletePattern = async (id: string) => {
    const { error } = await supabase
      .from('movement_patterns')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete pattern');
      return;
    }

    await fetchPatterns();
    toast.success('Pattern deleted');
  };

  // Reorder patterns
  const handleReorderPatterns = async (reorderedIds: string[]) => {
    // Optimistic update
    const reordered = reorderedIds
      .map(id => patterns.find(p => p.id === id))
      .filter((p): p is PatternWithExercises => !!p);
    setPatterns(reordered);

    // Persist sort_order to DB
    const updates = reorderedIds.map((id, idx) =>
      supabase
        .from('movement_patterns')
        .update({ sort_order: idx, updated_at: new Date().toISOString() })
        .eq('id', id)
    );
    const results = await Promise.all(updates);
    const failed = results.some(r => r.error);
    if (failed) {
      toast.error('Failed to save order');
      await fetchPatterns();
    }
  };

  // Reorder exercises WITHIN a pattern (RM-grid drag). orderedIds is the new
  // exercise-id order for that one pattern; persisted via sort_order.
  const handleReorderExercises = async (patternId: string, orderedIds: string[]) => {
    // Optimistic local reorder of that pattern's exercises array.
    setPatterns(prev =>
      prev.map(p => {
        if (p.id !== patternId) return p;
        const byId = new Map(p.exercises.map(e => [e.id, e]));
        const reordered = orderedIds
          .map(id => byId.get(id))
          .filter((e): e is PatternWithExercises['exercises'][number] => !!e);
        return { ...p, exercises: reordered };
      })
    );

    const updates = orderedIds.map((exId, idx) =>
      supabase
        .from('movement_pattern_exercises')
        .update({ sort_order: idx })
        .eq('pattern_id', patternId)
        .eq('exercise_id', exId)
    );
    const results = await Promise.all(updates);
    if (results.some(r => r.error)) {
      toast.error('Failed to save order');
      await fetchPatterns();
    }
  };

  // Exercise management for patterns
  const handleToggleExercise = async (exerciseId: string) => {
    if (!pickerPatternId) return;

    const pattern = patterns.find(p => p.id === pickerPatternId);
    if (!pattern) return;

    const isLinked = pattern.exercises.some(e => e.id === exerciseId);

    if (isLinked) {
      // Remove
      const { error } = await supabase
        .from('movement_pattern_exercises')
        .delete()
        .eq('pattern_id', pickerPatternId)
        .eq('exercise_id', exerciseId);

      if (error) {
        toast.error('Failed to remove exercise');
        return;
      }
    } else {
      // Add
      const { error } = await supabase
        .from('movement_pattern_exercises')
        .insert({ pattern_id: pickerPatternId, exercise_id: exerciseId, sort_order: pattern.exercises.length });

      if (error) {
        toast.error('Failed to add exercise');
        return;
      }
    }

    await fetchPatterns();
  };

  const handleAssignFromUncategorized = async (exerciseId: string, patternId: string) => {
    const targetCount = patterns.find(p => p.id === patternId)?.exercises.length ?? 0;
    const { error } = await supabase
      .from('movement_pattern_exercises')
      .insert({ pattern_id: patternId, exercise_id: exerciseId, sort_order: targetCount });

    if (error) {
      toast.error('Failed to assign exercise');
      return;
    }

    const target = patterns.find(p => p.id === patternId);
    toast.success(`Added to "${target?.name || 'pattern'}"`);

    await fetchPatterns();
  };

  const handleRemoveExercise = async (patternId: string, exerciseId: string) => {
    const { error } = await supabase
      .from('movement_pattern_exercises')
      .delete()
      .eq('pattern_id', patternId)
      .eq('exercise_id', exerciseId);

    if (error) {
      toast.error('Failed to remove exercise');
      return;
    }

    await fetchPatterns();
  };

  // Move an exercise from one pattern group to another (drag-drop in the
  // Movement Patterns panel). Insert into the target first (skip if already
  // there), then remove from the source — so a failure never orphans it.
  const handleMoveExercise = async (fromPatternId: string, toPatternId: string, exerciseId: string) => {
    if (fromPatternId === toPatternId) return;

    const target = patterns.find(p => p.id === toPatternId);
    const alreadyInTarget = target?.exercises.some(e => e.id === exerciseId);

    if (!alreadyInTarget) {
      const { error } = await supabase
        .from('movement_pattern_exercises')
        .insert({ pattern_id: toPatternId, exercise_id: exerciseId, sort_order: target?.exercises.length ?? 0 });
      if (error) {
        toast.error('Failed to move exercise');
        return;
      }
    }

    const { error: delError } = await supabase
      .from('movement_pattern_exercises')
      .delete()
      .eq('pattern_id', fromPatternId)
      .eq('exercise_id', exerciseId);

    if (delError) {
      toast.error('Failed to move exercise');
      await fetchPatterns();
      return;
    }

    await fetchPatterns();
    toast.success(`Moved to "${target?.name ?? 'group'}"`);
  };

  // Bulk version of handleMoveExercise — moves several selected exercises from
  // one group to another (multi-select move). Same insert-then-delete ordering.
  const handleMoveExercises = async (fromPatternId: string, toPatternId: string, exerciseIds: string[]) => {
    if (fromPatternId === toPatternId || exerciseIds.length === 0) return;

    const target = patterns.find(p => p.id === toPatternId);
    const targetIds = new Set(target?.exercises.map(e => e.id));
    const baseOrder = target?.exercises.length ?? 0;
    const toInsert = exerciseIds
      .filter(id => !targetIds.has(id))
      .map((id, i) => ({ pattern_id: toPatternId, exercise_id: id, sort_order: baseOrder + i }));

    if (toInsert.length > 0) {
      const { error } = await supabase.from('movement_pattern_exercises').insert(toInsert);
      if (error) {
        toast.error('Failed to move exercises');
        return;
      }
    }

    const { error: delError } = await supabase
      .from('movement_pattern_exercises')
      .delete()
      .eq('pattern_id', fromPatternId)
      .in('exercise_id', exerciseIds);

    if (delError) {
      toast.error('Failed to move exercises');
      await fetchPatterns();
      return;
    }

    await fetchPatterns();
    toast.success(`Moved ${exerciseIds.length} to "${target?.name ?? 'group'}"`);
  };

  // Copy several exercises to another group WITHOUT removing them from the
  // source — patterns can legitimately share an exercise (no exclusivity rule).
  const handleCopyExercises = async (fromPatternId: string, toPatternId: string, exerciseIds: string[]) => {
    if (fromPatternId === toPatternId || exerciseIds.length === 0) return;

    const target = patterns.find(p => p.id === toPatternId);
    const targetIds = new Set(target?.exercises.map(e => e.id));
    const baseOrder = target?.exercises.length ?? 0;
    const toInsert = exerciseIds
      .filter(id => !targetIds.has(id))
      .map((id, i) => ({ pattern_id: toPatternId, exercise_id: id, sort_order: baseOrder + i }));

    if (toInsert.length === 0) {
      toast.info(`Already in "${target?.name ?? 'that group'}"`);
      return;
    }

    const { error } = await supabase.from('movement_pattern_exercises').insert(toInsert);
    if (error) {
      toast.error('Failed to copy exercises');
      return;
    }

    await fetchPatterns();
    toast.success(`Copied ${toInsert.length} to "${target?.name ?? 'group'}"`);
  };

  // Plan item toggle
  const handleTogglePlan = async (patternId: string, weekStart: string) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const existing = planItems.find(
      item => item.pattern_id === patternId && item.week_start === weekStart
    );

    if (existing) {
      // Remove
      const { error } = await supabase
        .from('programming_plan_items')
        .delete()
        .eq('id', existing.id);

      if (error) {
        toast.error('Failed to remove plan item');
        return;
      }
    } else {
      // Add
      const { error } = await supabase
        .from('programming_plan_items')
        .insert({
          user_id: user.user.id,
          pattern_id: patternId,
          week_start: weekStart,
        });

      if (error) {
        toast.error('Failed to add plan item');
        return;
      }
    }

    await fetchPlanItems();
  };

  // Get picker data
  const pickerPattern = pickerPatternId
    ? patterns.find(p => p.id === pickerPatternId)
    : null;

  const pickerSelectedIds = pickerPattern
    ? new Set(pickerPattern.exercises.map(e => e.id))
    : new Set<string>();

  // All exercise IDs assigned to any pattern (for unassigned styling)
  const allPatternExerciseIds = useMemo(() => {
    const ids = new Set<string>();
    patterns.forEach(p => p.exercises.forEach(e => ids.add(e.id)));
    return ids;
  }, [patterns]);

  return (
    <div className='space-y-4'>
      {/* Track filter toggle + Info button */}
      <div className='flex items-center justify-between gap-2 flex-wrap'>
        <div className='flex items-center gap-2'>
          <span className='text-xs font-medium text-gray-500'>Track:</span>
          <div className='flex rounded-lg border border-gray-200 overflow-hidden'>
            <button
              onClick={() => setTrackFilter('adults')}
              className={`px-3 py-1 text-xs font-medium transition ${
                trackFilter === 'adults'
                  ? 'bg-[#178da6] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Adults
            </button>
            <button
              onClick={() => setTrackFilter('kids')}
              className={`px-3 py-1 text-xs font-medium transition border-l border-gray-200 ${
                trackFilter === 'kids'
                  ? 'bg-[#178da6] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Kids & Teens
            </button>
          </div>
        </div>
        <button
          onClick={() => setInfoOpen(true)}
          className='flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-600 hover:border-[#178da6] hover:text-[#178da6] transition'
          title='How the Planner works'
        >
          <Info size={14} />
          <span>How it works</span>
        </button>
      </div>

      <PatternManager
        patterns={patterns}
        gaps={gaps}
        onCreatePattern={handleCreatePattern}
        onUpdatePattern={handleUpdatePattern}
        onDeletePattern={handleDeletePattern}
        onOpenExercisePicker={setPickerPatternId}
        onRemoveExercise={handleRemoveExercise}
        onReorderPatterns={handleReorderPatterns}
        onMoveExercise={handleMoveExercise}
        onMoveExercises={handleMoveExercises}
        onCopyExercises={handleCopyExercises}
        expandedPatternId={expandedPatternId}
        onExpandedPatternChange={setExpandedPatternId}
        isPanelOpen={patternsPanelOpen}
        onPanelOpenChange={setPatternsPanelOpen}
        exerciseHistory={exerciseHistory}
        historyLoading={historyLoading}
        onLoadExerciseHistory={loadExerciseHistory}
      />

      {/* Content filter (RM testing focus) */}
      <div className='flex items-center gap-2'>
        <span className='text-xs font-medium text-gray-500'>Show:</span>
        <div className='flex rounded-lg border border-gray-200 overflow-hidden'>
          <button
            onClick={() => setContentFilter('all')}
            className={`px-3 py-1 text-xs font-medium transition ${
              contentFilter === 'all'
                ? 'bg-[#178da6] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setContentFilter('rm-only')}
            className={`px-3 py-1 text-xs font-medium transition border-l border-gray-200 ${
              contentFilter === 'rm-only'
                ? 'bg-[#178da6] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            RM Testing only
          </button>
        </div>
      </div>

      {/* Date-window controls */}
      <div className='flex items-center justify-between gap-2 flex-wrap'>
        <div className='flex items-center gap-1'>
          <button
            onClick={() => setStartMonday(m => shiftMonday(m, -STEP_WEEKS))}
            className='flex items-center gap-1 text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-600 hover:border-[#178da6] hover:text-[#178da6] transition'
            title='Move start ~1 month earlier'
          >
            <ChevronLeft size={14} />
            <span>Prev</span>
          </button>
          <button
            onClick={() => setStartMonday(centeredNow)}
            disabled={startMonday === centeredNow}
            className='text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-600 hover:border-[#178da6] hover:text-[#178da6] transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:text-gray-600'
            title='Center on today'
          >
            Today
          </button>
          <button
            onClick={() => setStartMonday(m => shiftMonday(m, STEP_WEEKS))}
            className='flex items-center gap-1 text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-600 hover:border-[#178da6] hover:text-[#178da6] transition'
            title='Move start ~1 month later'
          >
            <span>Next</span>
            <ChevronRight size={14} />
          </button>
        </div>
        <div className='flex rounded-lg border border-gray-200 overflow-hidden'>
          {([1, 3, 6, 12] as ViewMonths[]).map((m, i) => (
            <button
              key={m}
              onClick={() => setViewMonths(m)}
              className={`px-3 py-1 text-xs font-medium transition ${
                i > 0 ? 'border-l border-gray-200' : ''
              } ${
                viewMonths === m
                  ? 'bg-[#178da6] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {m}mo
            </button>
          ))}
        </div>
      </div>

      <PlanningGrid
        patterns={patterns}
        planItems={planItems}
        coverage={coverage}
        gaps={gaps}
        onTogglePlan={handleTogglePlan}
        onOpenExercisePicker={setPickerPatternId}
        onRemoveExercise={handleRemoveExercise}
        pastWeeks={pastWeeks}
        futureWeeks={futureWeeks}
        anchorDate={anchorDate}
        contentFilter={contentFilter}
        onSetStart={setStartMonday}
        onReorderPatterns={handleReorderPatterns}
        onReorderExercises={handleReorderExercises}
        exerciseHistory={exerciseHistory}
        historyLoading={historyLoading}
        onLoadExerciseHistory={loadExerciseHistory}
      />

      <UncategorizedExercises
        exercises={exercises}
        assignedIds={allPatternExerciseIds}
        patterns={patterns}
        onAssign={handleAssignFromUncategorized}
      />

      <PatternExercisePicker
        isOpen={!!pickerPatternId}
        onClose={() => setPickerPatternId(null)}
        patternName={pickerPattern?.name || ''}
        exercises={exercises}
        selectedExerciseIds={pickerSelectedIds}
        onToggleExercise={handleToggleExercise}
        exerciseLastDates={exerciseLastDates}
        allPatternExerciseIds={allPatternExerciseIds}
      />

      <PlannerInfoModal isOpen={infoOpen} onClose={() => setInfoOpen(false)} />
    </div>
  );
}
