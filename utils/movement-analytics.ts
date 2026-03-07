/**
 * Movement Analytics Utilities
 * Query and analyze lift/benchmark frequency in workouts
 */

import { supabase } from '@/lib/supabase';
import type { ConfiguredLift, ConfiguredBenchmark, ConfiguredForgeBenchmark } from '@/types/movements';
import { extractMovementsFromWod } from '@/utils/movement-extraction';
import type { WODFormData } from '@/components/coach/WorkoutModal';

// ============================================
// Types
// ============================================

export interface MovementFrequency {
  id: string;
  name: string;
  count: number;
  lastUsed: string; // ISO date string
}

export interface LiftAnalysis extends MovementFrequency {
  avgSets?: number;
  avgReps?: number;
  mostCommonPercentage?: number;
}

export interface BenchmarkAnalysis extends MovementFrequency {
  type: string;
  mostCommonScaling?: string;
}

export interface ForgeBenchmarkAnalysis extends MovementFrequency {
  type: string;
  mostCommonScaling?: string;
}

export interface ExerciseFrequencyWorkout {
  date: string;
  session_type: string;
  workout_name: string | null;
}

export interface ExerciseFrequency {
  id: string;
  name: string;
  category: string;
  count: number;
  lastProgrammed: string; // ISO date string
  workouts: ExerciseFrequencyWorkout[];
}

export interface DateRangeFilter {
  startDate?: string; // ISO date string (YYYY-MM-DD)
  endDate?: string;   // ISO date string (YYYY-MM-DD)
  excludeSessionTypes?: string[]; // e.g. ['Kids & Teens'] to exclude from results
}

// ============================================
// Shared Helpers
// ============================================

export interface PublishedWorkout {
  id: string;
  date: string;
  session_type: string;
  workout_name: string | null;
  workout_week: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sections: any[];
}

/**
 * Fetch published workouts via weekly_sessions (deduplicates by session).
 * Shared by all frequency analysis functions.
 */
export async function fetchPublishedWorkouts(filter?: DateRangeFilter, label = 'workouts'): Promise<PublishedWorkout[]> {
  let query = supabase
    .from('weekly_sessions')
    .select('date, wods(id, date, session_type, workout_name, workout_week, sections, workout_publish_status)');

  if (filter?.startDate) {
    query = query.gte('date', filter.startDate);
  }
  if (filter?.endDate) {
    query = query.lte('date', filter.endDate);
  }

  const { data: sessions, error } = await query;

  if (error) {
    console.error(`Error fetching ${label}:`, error);
    return [];
  }

  const excludeTypes = filter?.excludeSessionTypes?.map(t => t.toLowerCase()) || [];

  return sessions
    ?.filter((s: any) => s.wods !== null && s.wods.workout_publish_status === 'published')
    .filter((s: any) => excludeTypes.length === 0 || !excludeTypes.includes((s.wods.session_type || '').toLowerCase()))
    .map((s: any) => ({
      id: s.wods.id,
      date: s.date,
      session_type: s.wods.session_type || '',
      workout_name: s.wods.workout_name,
      workout_week: s.wods.workout_week,
      sections: s.wods.sections,
    })) || [];
}

/** Create unique workout identifier: workout_name + bi-weekly period if available, else date.
 *  Same workout_name within a 2-week window counts as one occurrence. */
function getWorkoutKey(workout: PublishedWorkout): string {
  if (workout.workout_name && workout.workout_week) {
    // workout_week is ISO format "YYYY-Www" e.g. "2026-W10"
    const match = workout.workout_week.match(/^(\d{4})-W(\d{2})$/);
    if (match) {
      const year = match[1];
      const week = parseInt(match[2], 10);
      // Round down to nearest even week to create 2-week windows: W10+W11→W10, W12+W13→W12
      const biWeek = week % 2 === 0 ? week : week - 1;
      return `${workout.workout_name}_${year}-W${String(biWeek).padStart(2, '0')}`;
    }
    return `${workout.workout_name}_${workout.workout_week}`;
  }
  return workout.date;
}

// ============================================
// Lift Frequency Analysis
// ============================================

/**
 * Get frequency of all lifts programmed within date range
 * @param filter Optional date range filter
 * @returns Array of lift frequencies sorted by count (descending)
 */
export async function getLiftFrequency(filter?: DateRangeFilter): Promise<LiftAnalysis[]> {
  const workouts = await fetchPublishedWorkouts(filter, 'workouts for lift frequency');

  // Aggregate lift data (count unique workouts by name+week or date)
  const liftMap = new Map<string, {
    id: string;
    name: string;
    uniqueWorkouts: Set<string>;
    lastUsed: string;
    totalSets: number;
    totalReps: number;
    percentages: number[];
  }>();

  workouts?.forEach(workout => {
    const workoutKey = getWorkoutKey(workout);

    const sections = workout.sections as Array<{
      lifts?: ConfiguredLift[];
    }>;

    sections?.forEach(section => {
      section.lifts?.forEach(lift => {
        const existing = liftMap.get(lift.id);

        if (existing) {
          existing.uniqueWorkouts.add(workoutKey);
          if (workout.date > existing.lastUsed) {
            existing.lastUsed = workout.date;
          }
          if (lift.sets) existing.totalSets += lift.sets;
          if (lift.reps) existing.totalReps += lift.reps;
          if (lift.percentage_1rm) existing.percentages.push(lift.percentage_1rm);
        } else {
          liftMap.set(lift.id, {
            id: lift.id,
            name: lift.name,
            uniqueWorkouts: new Set([workoutKey]),
            lastUsed: workout.date,
            totalSets: lift.sets || 0,
            totalReps: lift.reps || 0,
            percentages: lift.percentage_1rm ? [lift.percentage_1rm] : [],
          });
        }
      });
    });
  });

  // Convert to array and calculate averages
  const liftAnalysis: LiftAnalysis[] = Array.from(liftMap.values()).map(lift => {
    const count = lift.uniqueWorkouts.size;
    const avgSets = count > 0 ? lift.totalSets / count : undefined;
    const avgReps = count > 0 ? lift.totalReps / count : undefined;

    // Find most common percentage
    let mostCommonPercentage: number | undefined;
    if (lift.percentages.length > 0) {
      const percentageCount = new Map<number, number>();
      lift.percentages.forEach(pct => {
        percentageCount.set(pct, (percentageCount.get(pct) || 0) + 1);
      });
      const sorted = Array.from(percentageCount.entries()).sort((a, b) => b[1] - a[1]);
      mostCommonPercentage = sorted[0][0];
    }

    return {
      id: lift.id,
      name: lift.name,
      count: count,
      lastUsed: lift.lastUsed,
      avgSets: avgSets ? Math.round(avgSets * 10) / 10 : undefined,
      avgReps: avgReps ? Math.round(avgReps * 10) / 10 : undefined,
      mostCommonPercentage,
    };
  });

  // Sort by frequency (descending)
  return liftAnalysis.sort((a, b) => b.count - a.count);
}

/**
 * Get frequency of a specific lift by ID
 */
export async function getLiftFrequencyById(liftId: string, filter?: DateRangeFilter): Promise<LiftAnalysis | null> {
  const allLifts = await getLiftFrequency(filter);
  return allLifts.find(lift => lift.id === liftId) || null;
}

// ============================================
// Benchmark Frequency Analysis
// ============================================

/**
 * Get frequency of all benchmarks programmed within date range
 */
export async function getBenchmarkFrequency(filter?: DateRangeFilter): Promise<BenchmarkAnalysis[]> {
  const workouts = await fetchPublishedWorkouts(filter, 'workouts for benchmark frequency');

  // Aggregate benchmark data (count unique workouts by name+week or date)
  const benchmarkMap = new Map<string, {
    id: string;
    name: string;
    type: string;
    uniqueWorkouts: Set<string>;
    lastUsed: string;
    scalingOptions: string[];
  }>();

  workouts?.forEach(workout => {
    const workoutKey = getWorkoutKey(workout);

    const sections = workout.sections as Array<{
      benchmarks?: ConfiguredBenchmark[];
    }>;

    sections?.forEach(section => {
      section.benchmarks?.forEach(benchmark => {
        const existing = benchmarkMap.get(benchmark.id);

        if (existing) {
          existing.uniqueWorkouts.add(workoutKey);
          if (workout.date > existing.lastUsed) {
            existing.lastUsed = workout.date;
          }
          if (benchmark.scaling_option) {
            existing.scalingOptions.push(benchmark.scaling_option);
          }
        } else {
          benchmarkMap.set(benchmark.id, {
            id: benchmark.id,
            name: benchmark.name,
            type: benchmark.type,
            uniqueWorkouts: new Set([workoutKey]),
            lastUsed: workout.date,
            scalingOptions: benchmark.scaling_option ? [benchmark.scaling_option] : [],
          });
        }
      });
    });
  });

  // Convert to array and find most common scaling
  const benchmarkAnalysis: BenchmarkAnalysis[] = Array.from(benchmarkMap.values()).map(benchmark => {
    let mostCommonScaling: string | undefined;
    if (benchmark.scalingOptions.length > 0) {
      const scalingCount = new Map<string, number>();
      benchmark.scalingOptions.forEach(scaling => {
        scalingCount.set(scaling, (scalingCount.get(scaling) || 0) + 1);
      });
      const sorted = Array.from(scalingCount.entries()).sort((a, b) => b[1] - a[1]);
      mostCommonScaling = sorted[0][0];
    }

    return {
      id: benchmark.id,
      name: benchmark.name,
      type: benchmark.type,
      count: benchmark.uniqueWorkouts.size,
      lastUsed: benchmark.lastUsed,
      mostCommonScaling,
    };
  });

  return benchmarkAnalysis.sort((a, b) => b.count - a.count);
}

/**
 * Get frequency of a specific benchmark by ID
 */
export async function getBenchmarkFrequencyById(benchmarkId: string, filter?: DateRangeFilter): Promise<BenchmarkAnalysis | null> {
  const allBenchmarks = await getBenchmarkFrequency(filter);
  return allBenchmarks.find(benchmark => benchmark.id === benchmarkId) || null;
}

// ============================================
// Forge Benchmark Frequency Analysis
// ============================================

/**
 * Get frequency of all Forge benchmarks programmed within date range
 */
export async function getForgeBenchmarkFrequency(filter?: DateRangeFilter): Promise<ForgeBenchmarkAnalysis[]> {
  const workouts = await fetchPublishedWorkouts(filter, 'workouts for forge benchmark frequency');

  // Aggregate forge benchmark data (count unique workouts by name+week or date)
  const forgeMap = new Map<string, {
    id: string;
    name: string;
    type: string;
    uniqueWorkouts: Set<string>;
    lastUsed: string;
    scalingOptions: string[];
  }>();

  workouts?.forEach(workout => {
    const workoutKey = getWorkoutKey(workout);

    const sections = workout.sections as Array<{
      forge_benchmarks?: ConfiguredForgeBenchmark[];
    }>;

    sections?.forEach(section => {
      section.forge_benchmarks?.forEach(forge => {
        const existing = forgeMap.get(forge.id);

        if (existing) {
          existing.uniqueWorkouts.add(workoutKey);
          if (workout.date > existing.lastUsed) {
            existing.lastUsed = workout.date;
          }
          if (forge.scaling_option) {
            existing.scalingOptions.push(forge.scaling_option);
          }
        } else {
          forgeMap.set(forge.id, {
            id: forge.id,
            name: forge.name,
            type: forge.type,
            uniqueWorkouts: new Set([workoutKey]),
            lastUsed: workout.date,
            scalingOptions: forge.scaling_option ? [forge.scaling_option] : [],
          });
        }
      });
    });
  });

  // Convert to array and find most common scaling
  const forgeAnalysis: ForgeBenchmarkAnalysis[] = Array.from(forgeMap.values()).map(forge => {
    let mostCommonScaling: string | undefined;
    if (forge.scalingOptions.length > 0) {
      const scalingCount = new Map<string, number>();
      forge.scalingOptions.forEach(scaling => {
        scalingCount.set(scaling, (scalingCount.get(scaling) || 0) + 1);
      });
      const sorted = Array.from(scalingCount.entries()).sort((a, b) => b[1] - a[1]);
      mostCommonScaling = sorted[0][0];
    }

    return {
      id: forge.id,
      name: forge.name,
      type: forge.type,
      count: forge.uniqueWorkouts.size,
      lastUsed: forge.lastUsed,
      mostCommonScaling,
    };
  });

  return forgeAnalysis.sort((a, b) => b.count - a.count);
}

/**
 * Get frequency of a specific Forge benchmark by ID
 */
export async function getForgeBenchmarkFrequencyById(forgeId: string, filter?: DateRangeFilter): Promise<ForgeBenchmarkAnalysis | null> {
  const allForge = await getForgeBenchmarkFrequency(filter);
  return allForge.find(forge => forge.id === forgeId) || null;
}

// ============================================
// Exercise Frequency Analysis
// ============================================

/**
 * Get frequency of all exercises programmed within date range
 * Parses exercise names from WOD section content using regex patterns
 * @param filter Optional date range filter
 * @returns Array of exercise frequencies sorted by count (descending)
 */
export async function getExerciseFrequency(filter?: DateRangeFilter): Promise<ExerciseFrequency[]> {
  // Fetch all exercises from database for matching
  const { data: exercisesData, error: exercisesError } = await supabase
    .from('exercises')
    .select('id, name, display_name, category');

  if (exercisesError) {
    console.error('Error fetching exercises:', exercisesError);
    return [];
  }

  // Build name→exercise lookup (case-insensitive, by name and display_name)
  const exercisesByName = new Map<string, { id: string; name: string; category: string }>();
  const knownExerciseNames = new Set<string>();
  exercisesData?.forEach(ex => {
    exercisesByName.set(ex.name.toLowerCase(), { id: ex.id, name: ex.name, category: ex.category });
    knownExerciseNames.add(ex.name);
    if (ex.display_name && ex.display_name.toLowerCase() !== ex.name.toLowerCase()) {
      exercisesByName.set(ex.display_name.toLowerCase(), { id: ex.id, name: ex.name, category: ex.category });
      knownExerciseNames.add(ex.display_name);
    }
  });

  const workouts = await fetchPublishedWorkouts(filter, 'workouts for exercise frequency');

  // Aggregate exercise data using shared extraction logic
  const exerciseMap = new Map<string, {
    id: string;
    name: string;
    category: string;
    uniqueWorkouts: Map<string, ExerciseFrequencyWorkout>;
    lastProgrammed: string;
  }>();

  workouts?.forEach(workout => {
    const workoutKey = getWorkoutKey(workout);

    // Convert to WODFormData for extractMovementsFromWod
    const wodData: WODFormData = {
      id: workout.id,
      title: '',
      date: workout.date,
      sections: workout.sections || [],
      classTimes: [],
      maxCapacity: 0,
    };

    const movements = extractMovementsFromWod(wodData, knownExerciseNames);

    movements.forEach(movementName => {
      const exercise = exercisesByName.get(movementName.toLowerCase());
      if (!exercise) return;

      const existing = exerciseMap.get(exercise.id);
      const workoutEntry: ExerciseFrequencyWorkout = {
        date: workout.date,
        session_type: workout.session_type,
        workout_name: workout.workout_name,
      };

      if (existing) {
        existing.uniqueWorkouts.set(workoutKey, workoutEntry);
        if (workout.date > existing.lastProgrammed) {
          existing.lastProgrammed = workout.date;
        }
      } else {
        exerciseMap.set(exercise.id, {
          id: exercise.id,
          name: exercise.name,
          category: exercise.category,
          uniqueWorkouts: new Map([[workoutKey, workoutEntry]]),
          lastProgrammed: workout.date,
        });
      }
    });
  });

  // Convert to array and sort by frequency
  const exerciseAnalysis: ExerciseFrequency[] = Array.from(exerciseMap.values()).map(ex => ({
    id: ex.id,
    name: ex.name,
    category: ex.category,
    count: ex.uniqueWorkouts.size,
    lastProgrammed: ex.lastProgrammed,
    workouts: Array.from(ex.uniqueWorkouts.values()).sort((a, b) => b.date.localeCompare(a.date)),
  }));

  return exerciseAnalysis.sort((a, b) => b.count - a.count);
}

/**
 * Get frequency of a specific exercise by ID
 */
export async function getExerciseFrequencyById(exerciseId: string, filter?: DateRangeFilter): Promise<ExerciseFrequency | null> {
  const allExercises = await getExerciseFrequency(filter);
  return allExercises.find(ex => ex.id === exerciseId) || null;
}

// ============================================
// Combined Movement Analysis
// ============================================

/**
 * Get comprehensive movement summary for all types
 */
export async function getMovementSummary(filter?: DateRangeFilter): Promise<{
  lifts: LiftAnalysis[];
  benchmarks: BenchmarkAnalysis[];
  forgeBenchmarks: ForgeBenchmarkAnalysis[];
  totalWorkouts: number;
}> {
  const [lifts, benchmarks, forgeBenchmarks] = await Promise.all([
    getLiftFrequency(filter),
    getBenchmarkFrequency(filter),
    getForgeBenchmarkFrequency(filter),
  ]);

  // Get total workouts count
  let query = supabase
    .from('wods')
    .select('id', { count: 'exact', head: true });

  if (filter?.startDate) {
    query = query.gte('date', filter.startDate);
  }
  if (filter?.endDate) {
    query = query.lte('date', filter.endDate);
  }

  const { count } = await query;

  return {
    lifts,
    benchmarks,
    forgeBenchmarks,
    totalWorkouts: count || 0,
  };
}
