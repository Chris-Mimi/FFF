/**
 * Pattern Analytics - Gap analysis for movement patterns
 * Computes staleness of coach-defined movement patterns by checking
 * when linked exercises last appeared in published workouts.
 */

import { fetchPublishedWorkouts, type DateRangeFilter } from '@/utils/movement-analytics';
import { extractMovementsFromWod } from '@/utils/movement-extraction';
import type { PatternWithExercises, PatternGapResult } from '@/types/planner';
import type { WODFormData } from '@/components/coach/WorkoutModal';

/**
 * Compute gap analysis for all movement patterns.
 * For each pattern, finds the most recent workout where any linked exercise appeared.
 */
export async function computePatternGaps(
  patterns: PatternWithExercises[],
  lookbackWeeks: number = 16,
  excludeSessionTypes?: string[]
): Promise<PatternGapResult[]> {
  if (patterns.length === 0) return [];

  // Build date range for lookback
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - lookbackWeeks * 7);

  const filter: DateRangeFilter = {
    startDate: startDate.toISOString().split('T')[0],
    endDate: now.toISOString().split('T')[0],
    excludeSessionTypes,
  };

  // Fetch all published workouts in the lookback window
  const workouts = await fetchPublishedWorkouts(filter, 'pattern gap analysis');

  // Build set of all known exercise names (for extraction matching)
  const allExerciseNames = new Set<string>();
  patterns.forEach(p => p.exercises.forEach(e => {
    allExerciseNames.add(e.name);
    if (e.display_name) allExerciseNames.add(e.display_name);
  }));

  // Extract movements from each workout
  const workoutMovements: { date: string; movements: Set<string> }[] = workouts.map(w => ({
    date: w.date,
    movements: extractMovementsFromWod(
      { sections: w.sections, date: w.date } as Pick<WODFormData, 'sections' | 'date'> as WODFormData,
      allExerciseNames
    ),
  }));

  // Sort by date descending (most recent first) for early exit
  workoutMovements.sort((a, b) => b.date.localeCompare(a.date));

  // For each pattern, find the most recent workout that covers it
  return patterns.map(pattern => {
    const exerciseNamesLower = new Set(
      pattern.exercises.flatMap(e => {
        const names = [e.name.toLowerCase()];
        if (e.display_name) names.push(e.display_name.toLowerCase());
        return names;
      })
    );

    let lastProgrammedDate: string | null = null;
    const coveredExercises: string[] = [];
    const exerciseLastDates: Record<string, string> = {};

    for (const wm of workoutMovements) {
      const movementsLower = new Set(
        Array.from(wm.movements).map(m => m.toLowerCase())
      );

      for (const exName of exerciseNamesLower) {
        if (movementsLower.has(exName)) {
          if (!lastProgrammedDate) lastProgrammedDate = wm.date;
          const original = pattern.exercises.find(
            e => e.name.toLowerCase() === exName ||
              (e.display_name && e.display_name.toLowerCase() === exName)
          );
          if (original) {
            if (!coveredExercises.includes(original.name)) {
              coveredExercises.push(original.name);
            }
            // Track per-exercise last date (first match = most recent, since sorted desc)
            const exKey = original.display_name || original.name;
            if (!exerciseLastDates[exKey]) {
              exerciseLastDates[exKey] = wm.date;
            }
          }
        }
      }

      // Once all exercises have dates, we can stop
      if (Object.keys(exerciseLastDates).length === pattern.exercises.length) {
        break;
      }
    }

    // Calculate weeks since last programmed
    let weeksSinceLastProgrammed: number | null = null;
    if (lastProgrammedDate) {
      const lastDate = new Date(lastProgrammedDate);
      const diffMs = now.getTime() - lastDate.getTime();
      weeksSinceLastProgrammed = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
    }

    // Determine staleness level
    let staleness: PatternGapResult['staleness'] = 'never';
    if (weeksSinceLastProgrammed !== null) {
      if (weeksSinceLastProgrammed >= pattern.staleness_red) {
        staleness = 'red';
      } else if (weeksSinceLastProgrammed >= pattern.staleness_yellow) {
        staleness = 'yellow';
      } else {
        staleness = 'green';
      }
    }

    return {
      patternId: pattern.id,
      patternName: pattern.name,
      color: pattern.color,
      exerciseCount: pattern.exercises.length,
      lastProgrammedDate,
      weeksSinceLastProgrammed,
      staleness,
      stalenessYellow: pattern.staleness_yellow,
      stalenessRed: pattern.staleness_red,
      coveredExercises,
      exerciseLastDates,
    };
  });
}

/**
 * For the planning grid: detect which patterns are covered in each week.
 * Returns a map of weekStart → Set of patternIds that were covered.
 */
export async function detectWeeklyCoverage(
  patterns: PatternWithExercises[],
  startDate: string,
  endDate: string,
  excludeSessionTypes?: string[]
): Promise<Map<string, Set<string>>> {
  if (patterns.length === 0) return new Map();

  const filter: DateRangeFilter = { startDate, endDate, excludeSessionTypes };
  const workouts = await fetchPublishedWorkouts(filter, 'weekly coverage');

  const allExerciseNames = new Set<string>();
  patterns.forEach(p => p.exercises.forEach(e => {
    allExerciseNames.add(e.name);
    if (e.display_name) allExerciseNames.add(e.display_name);
  }));

  // Map: weekMonday → Set<patternId>
  const coverage = new Map<string, Set<string>>();

  for (const workout of workouts) {
    const movements = extractMovementsFromWod(
      { sections: workout.sections, date: workout.date } as Pick<WODFormData, 'sections' | 'date'> as WODFormData,
      allExerciseNames
    );
    const movementsLower = new Set(
      Array.from(movements).map(m => m.toLowerCase())
    );

    // Find the Monday of this workout's week
    const workoutDate = new Date(workout.date + 'T00:00:00');
    const day = workoutDate.getDay();
    const monday = new Date(workoutDate);
    monday.setDate(workoutDate.getDate() - ((day + 6) % 7));
    const mondayStr = monday.toISOString().split('T')[0];

    for (const pattern of patterns) {
      const hasMatch = pattern.exercises.some(e =>
        movementsLower.has(e.name.toLowerCase()) ||
        (e.display_name && movementsLower.has(e.display_name.toLowerCase()))
      );
      if (hasMatch) {
        if (!coverage.has(mondayStr)) {
          coverage.set(mondayStr, new Set());
        }
        coverage.get(mondayStr)!.add(pattern.id);
      }
    }
  }

  return coverage;
}

/** Get the Monday of a given date's week */
export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - ((day + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Generate array of week start dates (Mondays) for a range */
export function generateWeeks(pastWeeks: number, futureWeeks: number): string[] {
  const today = new Date();
  const currentMonday = getMonday(today);
  const weeks: string[] = [];

  for (let i = -pastWeeks; i <= futureWeeks; i++) {
    const d = new Date(currentMonday);
    d.setDate(d.getDate() + i * 7);
    weeks.push(d.toISOString().split('T')[0]);
  }

  return weeks;
}
