/**
 * Movement Analytics Utilities
 * Query and analyze lift/benchmark frequency in workouts
 */

import { supabase } from '@/lib/supabase';
import type { ConfiguredLift, ConfiguredBenchmark, ConfiguredForgeBenchmark } from '@/types/movements';

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

export interface ExerciseFrequency {
  id: string;
  name: string;
  category: string;
  count: number;
  lastProgrammed: string; // ISO date string
}

export interface DateRangeFilter {
  startDate?: string; // ISO date string (YYYY-MM-DD)
  endDate?: string;   // ISO date string (YYYY-MM-DD)
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
  let query = supabase
    .from('wods')
    .select('id, date, sections');

  if (filter?.startDate) {
    query = query.gte('date', filter.startDate);
  }
  if (filter?.endDate) {
    query = query.lte('date', filter.endDate);
  }

  const { data: workouts, error } = await query;

  if (error) {
    console.error('Error fetching workouts for lift frequency:', error);
    return [];
  }

  // Aggregate lift data
  const liftMap = new Map<string, {
    id: string;
    name: string;
    count: number;
    lastUsed: string;
    totalSets: number;
    totalReps: number;
    percentages: number[];
  }>();

  workouts?.forEach(workout => {
    const sections = workout.sections as Array<{
      lifts?: ConfiguredLift[];
    }>;

    sections?.forEach(section => {
      section.lifts?.forEach(lift => {
        const existing = liftMap.get(lift.id);

        if (existing) {
          existing.count++;
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
            count: 1,
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
    const avgSets = lift.count > 0 ? lift.totalSets / lift.count : undefined;
    const avgReps = lift.count > 0 ? lift.totalReps / lift.count : undefined;

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
      count: lift.count,
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
  let query = supabase
    .from('wods')
    .select('id, date, sections');

  if (filter?.startDate) {
    query = query.gte('date', filter.startDate);
  }
  if (filter?.endDate) {
    query = query.lte('date', filter.endDate);
  }

  const { data: workouts, error } = await query;

  if (error) {
    console.error('Error fetching workouts for benchmark frequency:', error);
    return [];
  }

  // Aggregate benchmark data
  const benchmarkMap = new Map<string, {
    id: string;
    name: string;
    type: string;
    count: number;
    lastUsed: string;
    scalingOptions: string[];
  }>();

  workouts?.forEach(workout => {
    const sections = workout.sections as Array<{
      benchmarks?: ConfiguredBenchmark[];
    }>;

    sections?.forEach(section => {
      section.benchmarks?.forEach(benchmark => {
        const existing = benchmarkMap.get(benchmark.id);

        if (existing) {
          existing.count++;
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
            count: 1,
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
      count: benchmark.count,
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
  let query = supabase
    .from('wods')
    .select('id, date, sections');

  if (filter?.startDate) {
    query = query.gte('date', filter.startDate);
  }
  if (filter?.endDate) {
    query = query.lte('date', filter.endDate);
  }

  const { data: workouts, error } = await query;

  if (error) {
    console.error('Error fetching workouts for forge benchmark frequency:', error);
    return [];
  }

  // Aggregate forge benchmark data
  const forgeMap = new Map<string, {
    id: string;
    name: string;
    type: string;
    count: number;
    lastUsed: string;
    scalingOptions: string[];
  }>();

  workouts?.forEach(workout => {
    const sections = workout.sections as Array<{
      forge_benchmarks?: ConfiguredForgeBenchmark[];
    }>;

    sections?.forEach(section => {
      section.forge_benchmarks?.forEach(forge => {
        const existing = forgeMap.get(forge.id);

        if (existing) {
          existing.count++;
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
            count: 1,
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
      count: forge.count,
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

  // Create lookup maps for fuzzy matching
  const exercisesByName = new Map<string, { id: string; name: string; category: string }>();
  exercisesData?.forEach(ex => {
    // Add by name (lowercase for case-insensitive matching)
    exercisesByName.set(ex.name.toLowerCase(), { id: ex.id, name: ex.name, category: ex.category });
    // Also add by display_name if different
    if (ex.display_name && ex.display_name.toLowerCase() !== ex.name.toLowerCase()) {
      exercisesByName.set(ex.display_name.toLowerCase(), { id: ex.id, name: ex.name, category: ex.category });
    }
  });

  // Fetch WODs
  let query = supabase
    .from('wods')
    .select('id, date, sections');

  if (filter?.startDate) {
    query = query.gte('date', filter.startDate);
  }
  if (filter?.endDate) {
    query = query.lte('date', filter.endDate);
  }

  const { data: workouts, error } = await query;

  if (error) {
    console.error('Error fetching workouts for exercise frequency:', error);
    return [];
  }

  // Aggregate exercise data from WOD content
  const exerciseMap = new Map<string, {
    id: string;
    name: string;
    category: string;
    count: number;
    lastProgrammed: string;
  }>();

  // Regex patterns for extracting exercises (from movement-extraction.ts)
  // Updated to handle special characters like °, /, . in exercise names
  const patterns = [
    // Pattern 1: Number + x + Movement (e.g., "10x Air Squats")
    /^(?:\d+[\s-]*x[\s-]*|[\d-]+[\s-]*x[\s-]*)([^\n@]+?)(?:\s+x\s+\d+|\s*@|$)/i,
    // Pattern 2: Bullet/asterisk + Movement (e.g., "* Arm Circles", "* 90° Ext. Rotation (SU)")
    /^[\s*•\-]+\s*([^\n@]+?)(?:\s+x\s+\d+|\s*@|$)/,
    // Pattern 3: Number + Movement (e.g., "10 Air Squats")
    /^(?:\d+[\s-]*)([^\n@]+?)(?:\s+x\s+\d+|\s*@|$)/,
    // Pattern 4: Rep scheme + Movement (e.g., "21-15-9 Thrusters")
    /^(?:\d+-\d+(?:-\d+)*[\s-]*)([^\n@]+?)(?:\s+x\s+\d+|\s*@|$)/,
    // Pattern 5: Plain exercise name (e.g., "Air Squats", "Rope Climbs")
    /^([^\n@\d*•\-][^\n@]+?)(?:\s+x\s+\d+|\s*@|$)/,
  ];

  workouts?.forEach(workout => {
    const sections = workout.sections as Array<{ content?: string }>;

    sections?.forEach(section => {
      if (!section.content) return;

      const lines = section.content.split('\n');

      lines.forEach(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;

        // Try each pattern
        for (const pattern of patterns) {
          const match = trimmedLine.match(pattern);

          if (match && match[1]) {
            let movementText = match[1].trim();
            // Remove trailing punctuation
            movementText = movementText.replace(/[,;.!?]+$/, '');

            // Normalize to title case
            const normalized = movementText
              .split(/\s+/)
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ')
              .trim();

            // Try to match against exercises database
            // First try exact match
            let exercise = exercisesByName.get(normalized.toLowerCase());

            // If no exact match, try to find exercise name as prefix
            // This handles cases like "Push-Up Strict 5 seconds down, 5 seconds up"
            if (!exercise) {
              const normalizedLower = normalized.toLowerCase();
              for (const [dbName, dbExercise] of exercisesByName.entries()) {
                if (normalizedLower.startsWith(dbName)) {
                  exercise = dbExercise;
                  break;
                }
              }
            }

            if (exercise) {
              const existing = exerciseMap.get(exercise.id);

              if (existing) {
                existing.count++;
                if (workout.date > existing.lastProgrammed) {
                  existing.lastProgrammed = workout.date;
                }
              } else {
                exerciseMap.set(exercise.id, {
                  id: exercise.id,
                  name: exercise.name,
                  category: exercise.category,
                  count: 1,
                  lastProgrammed: workout.date,
                });
              }
            }

            break; // Match found, don't try other patterns
          }
        }
      });
    });
  });

  // Convert to array and sort by frequency
  const exerciseAnalysis: ExerciseFrequency[] = Array.from(exerciseMap.values());
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
