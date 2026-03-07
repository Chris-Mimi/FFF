'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { PatternWithExercises, ProgrammingPlanItem, PatternGapResult } from '@/types/planner';
import { computePatternGaps, detectWeeklyCoverage, generateWeeks } from '@/utils/pattern-analytics';
import PatternManager from './PatternManager';
import PatternExercisePicker from './PatternExercisePicker';
import GapAnalysisPanel from './GapAnalysisPanel';
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

const PAST_WEEKS = 6;
const FUTURE_WEEKS = 12;

export default function PlannerSection({ exercises }: PlannerSectionProps) {
  const [patterns, setPatterns] = useState<PatternWithExercises[]>([]);
  const [planItems, setPlanItems] = useState<ProgrammingPlanItem[]>([]);
  const [gaps, setGaps] = useState<PatternGapResult[]>([]);
  const [coverage, setCoverage] = useState<Map<string, Set<string>>>(new Map());
  const [loading, setLoading] = useState(true);
  const [gapLoading, setGapLoading] = useState(false);

  // Exercise picker state
  const [pickerPatternId, setPickerPatternId] = useState<string | null>(null);

  // Track filter: 'adults' excludes Kids & Teens, 'kids' shows only Kids & Teens
  const [trackFilter, setTrackFilter] = useState<'adults' | 'kids'>('adults');

  // Fetch patterns with their exercises (filtered by track)
  const fetchPatterns = useCallback(async (track: 'adults' | 'kids' = 'adults') => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data: patternData, error: patternError } = await supabase
      .from('movement_patterns')
      .select('*')
      .eq('user_id', user.user.id)
      .eq('track', track)
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
        .map(pe => ({
          id: (pe.exercises as any)?.id || pe.exercise_id,
          name: (pe.exercises as any)?.name || '',
          display_name: (pe.exercises as any)?.display_name,
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

    const weeks = generateWeeks(PAST_WEEKS, FUTURE_WEEKS);
    const startDate = weeks[0];
    const endDate = weeks[weeks.length - 1];

    const { data } = await supabase
      .from('programming_plan_items')
      .select('*')
      .eq('user_id', user.user.id)
      .gte('week_start', startDate)
      .lte('week_start', endDate);

    setPlanItems(data || []);
  }, []);

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

    const weeks = generateWeeks(PAST_WEEKS, FUTURE_WEEKS);
    const startDate = weeks[0];
    const endDate = weeks[weeks.length - 1];

    const [gapResults, coverageResults] = await Promise.all([
      computePatternGaps(pats, 16, excludeSessionTypes),
      detectWeeklyCoverage(pats, startDate, endDate, excludeSessionTypes),
    ]);

    setGaps(gapResults);
    setCoverage(coverageResults);
    setGapLoading(false);
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      const pats = await fetchPatterns(trackFilter);
      await fetchPlanItems();
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
      const pats = await fetchPatterns(trackFilter);
      await fetchPlanItems();
      if (pats && pats.length > 0) {
        await computeAnalysis(pats, trackFilter);
      }
    };
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackFilter]);

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
        track: trackFilter,
      });

    if (error) {
      if (error.code === '23505') {
        toast.error('A pattern with that name already exists');
      } else {
        toast.error('Failed to create pattern');
      }
      return;
    }

    const pats = await fetchPatterns(trackFilter);
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

    const pats = await fetchPatterns(trackFilter);
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

    const pats = await fetchPatterns(trackFilter);
    if (pats) await computeAnalysis(pats, trackFilter);
    toast.success('Pattern deleted');
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

    const pats = await fetchPatterns(trackFilter);
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

    const pats = await fetchPatterns(trackFilter);
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

  return (
    <div className='space-y-4'>
      {/* Track filter toggle */}
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

      <PatternManager
        patterns={patterns}
        onCreatePattern={handleCreatePattern}
        onUpdatePattern={handleUpdatePattern}
        onDeletePattern={handleDeletePattern}
        onOpenExercisePicker={setPickerPatternId}
        onRemoveExercise={handleRemoveExercise}
      />

      <GapAnalysisPanel
        gaps={gaps}
        loading={loading || gapLoading}
      />

      <PlanningGrid
        patterns={patterns}
        planItems={planItems}
        coverage={coverage}
        onTogglePlan={handleTogglePlan}
        pastWeeks={PAST_WEEKS}
        futureWeeks={FUTURE_WEEKS}
      />

      <PatternExercisePicker
        isOpen={!!pickerPatternId}
        onClose={() => setPickerPatternId(null)}
        patternName={pickerPattern?.name || ''}
        exercises={exercises}
        selectedExerciseIds={pickerSelectedIds}
        onToggleExercise={handleToggleExercise}
      />
    </div>
  );
}
