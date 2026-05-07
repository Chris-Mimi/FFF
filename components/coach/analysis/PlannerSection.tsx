'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { PatternWithExercises, ProgrammingPlanItem, PatternGapResult, WeeklyCoverageMap } from '@/types/planner';
import { computePatternGaps, detectWeeklyCoverage, generateWeeks } from '@/utils/pattern-analytics';
import { getExerciseFrequency } from '@/utils/movement-analytics';
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

function deriveWindow(viewMonths: ViewMonths, anchorOffsetWeeks: number) {
  const totalWeeks = VIEW_TO_WEEKS[viewMonths];
  const pastWeeks = Math.floor((totalWeeks - 1) / 2);
  const futureWeeks = totalWeeks - 1 - pastWeeks;
  const anchorDate = new Date();
  anchorDate.setDate(anchorDate.getDate() + anchorOffsetWeeks * 7);
  return { pastWeeks, futureWeeks, anchorDate };
}

export default function PlannerSection({ exercises }: PlannerSectionProps) {
  const [patterns, setPatterns] = useState<PatternWithExercises[]>([]);
  const [planItems, setPlanItems] = useState<ProgrammingPlanItem[]>([]);
  const [gaps, setGaps] = useState<PatternGapResult[]>([]);
  const [coverage, setCoverage] = useState<WeeklyCoverageMap>(new Map());
  const [, setLoading] = useState(true);
  const [, setGapLoading] = useState(false);
  const [exerciseLastDates, setExerciseLastDates] = useState<Map<string, string>>(new Map());

  // Exercise picker state
  const [pickerPatternId, setPickerPatternId] = useState<string | null>(null);

  // Info modal
  const [infoOpen, setInfoOpen] = useState(false);

  // Track filter scopes the WODs feeding coverage/gap analysis.
  // Patterns themselves are shared across both tracks.
  const [trackFilter, setTrackFilter] = useState<'adults' | 'kids'>('adults');

  // Date-window controls. viewMonths persists across page loads;
  // anchor offset resets to 0 (centered on today) each load.
  const [viewMonths, setViewMonths] = useState<ViewMonths>(3);
  const [anchorOffsetWeeks, setAnchorOffsetWeeks] = useState(0);

  // PatternManager is fully self-managed again — the grid expands inline
  // (see PlanningGrid's inlineExpandedId state) so the upper panel doesn't
  // need to be controlled from here.
  const [expandedPatternId, setExpandedPatternId] = useState<string | null>(null);
  const [patternsPanelOpen, setPatternsPanelOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (raw === '1' || raw === '3' || raw === '6' || raw === '12') {
      setViewMonths(Number(raw) as ViewMonths);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(VIEW_STORAGE_KEY, String(viewMonths));
  }, [viewMonths]);

  const { pastWeeks, futureWeeks, anchorDate } = useMemo(
    () => deriveWindow(viewMonths, anchorOffsetWeeks),
    [viewMonths, anchorOffsetWeeks],
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
      .select('pattern_id, exercise_id, exercises(id, name, display_name)')
      .in('pattern_id', patternData.map(p => p.id));

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

    const [gapResults, coverageResults] = await Promise.all([
      computePatternGaps(pats, 16, excludeSessionTypes),
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

  // Initial load
  useEffect(() => {
    const init = async () => {
      const pats = await fetchPatterns();
      await Promise.all([fetchPlanItems(), fetchExerciseLastDates()]);
      if (pats && pats.length > 0) {
        await computeAnalysis(pats, trackFilter);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch patterns and re-compute when track filter changes
  useEffect(() => {
    const refresh = async () => {
      const pats = await fetchPatterns();
      await fetchPlanItems();
      if (pats && pats.length > 0) {
        await computeAnalysis(pats, trackFilter);
      }
    };
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackFilter]);

  // Re-fetch plan items + recompute coverage when the date window changes.
  // Patterns themselves don't depend on the window, so we skip refetching them.
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (patterns.length === 0) return;
    fetchPlanItems();
    computeAnalysis(patterns, trackFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pastWeeks, futureWeeks, anchorTime]);

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

    const pats = await fetchPatterns();
    if (pats) await computeAnalysis(pats, trackFilter);
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

    const pats = await fetchPatterns();
    if (pats) await computeAnalysis(pats, trackFilter);
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

    const pats = await fetchPatterns();
    if (pats) await computeAnalysis(pats, trackFilter);
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
        .insert({ pattern_id: pickerPatternId, exercise_id: exerciseId });

      if (error) {
        toast.error('Failed to add exercise');
        return;
      }
    }

    const pats = await fetchPatterns();
    if (pats) await computeAnalysis(pats, trackFilter);
  };

  const handleAssignFromUncategorized = async (exerciseId: string, patternId: string) => {
    const { error } = await supabase
      .from('movement_pattern_exercises')
      .insert({ pattern_id: patternId, exercise_id: exerciseId });

    if (error) {
      toast.error('Failed to assign exercise');
      return;
    }

    const target = patterns.find(p => p.id === patternId);
    toast.success(`Added to "${target?.name || 'pattern'}"`);

    const pats = await fetchPatterns();
    if (pats) await computeAnalysis(pats, trackFilter);
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

    const pats = await fetchPatterns();
    if (pats) await computeAnalysis(pats, trackFilter);
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
        expandedPatternId={expandedPatternId}
        onExpandedPatternChange={setExpandedPatternId}
        isPanelOpen={patternsPanelOpen}
        onPanelOpenChange={setPatternsPanelOpen}
      />

      {/* Date-window controls */}
      <div className='flex items-center justify-between gap-2 flex-wrap'>
        <div className='flex items-center gap-1'>
          <button
            onClick={() => setAnchorOffsetWeeks(o => o - Math.max(1, Math.floor(VIEW_TO_WEEKS[viewMonths] / 2)))}
            className='flex items-center gap-1 text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-600 hover:border-[#178da6] hover:text-[#178da6] transition'
            title='Scroll back'
          >
            <ChevronLeft size={14} />
            <span>Prev</span>
          </button>
          <button
            onClick={() => setAnchorOffsetWeeks(0)}
            disabled={anchorOffsetWeeks === 0}
            className='text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-600 hover:border-[#178da6] hover:text-[#178da6] transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:text-gray-600'
            title='Center on today'
          >
            Today
          </button>
          <button
            onClick={() => setAnchorOffsetWeeks(o => o + Math.max(1, Math.floor(VIEW_TO_WEEKS[viewMonths] / 2)))}
            className='flex items-center gap-1 text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-600 hover:border-[#178da6] hover:text-[#178da6] transition'
            title='Scroll forward'
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
