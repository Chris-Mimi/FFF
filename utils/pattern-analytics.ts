/**
 * Pattern Analytics - Gap analysis for movement patterns
 * Computes staleness of coach-defined movement patterns by checking
 * when linked exercises last appeared in published workouts.
 */

import { fetchPublishedWorkouts, fetchAcronymMap, fetchLiftExerciseMap, type DateRangeFilter } from '@/utils/movement-analytics';
import { extractMovementsFromWod, extractMovementsWithMetadata, type MovementMetadata } from '@/utils/movement-extraction';
import { formatDate } from '@/utils/date-utils';
import type { PatternWithExercises, PatternGapResult, WeeklyCoverageMap, PatternWeekCoverage, CoveredExercise } from '@/types/planner';
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

  // Fetch all published workouts in the lookback window + acronym + lift-link maps (parallel)
  const [workouts, acronymMap, liftExerciseMap] = await Promise.all([
    fetchPublishedWorkouts(filter, 'pattern gap analysis'),
    fetchAcronymMap(),
    fetchLiftExerciseMap(),
  ]);

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
      allExerciseNames,
      acronymMap,
      liftExerciseMap
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
 * For the planning grid: detect which patterns are covered in each week,
 * AND which specific exercises matched on which workout dates.
 * Returns weekMonday → patternId → { exercises[], dates[] }.
 */
export async function detectWeeklyCoverage(
  patterns: PatternWithExercises[],
  startDate: string,
  endDate: string,
  excludeSessionTypes?: string[]
): Promise<WeeklyCoverageMap> {
  if (patterns.length === 0) return new Map();

  const filter: DateRangeFilter = { startDate, endDate, excludeSessionTypes };
  const [workouts, acronymMap, liftExerciseMap] = await Promise.all([
    fetchPublishedWorkouts(filter, 'weekly coverage'),
    fetchAcronymMap(),
    fetchLiftExerciseMap(),
  ]);

  const allExerciseNames = new Set<string>();
  patterns.forEach(p => p.exercises.forEach(e => {
    allExerciseNames.add(e.name);
    if (e.display_name) allExerciseNames.add(e.display_name);
  }));

  const coverage: WeeklyCoverageMap = new Map();

  for (const workout of workouts) {
    const metaMap = extractMovementsWithMetadata(
      { sections: workout.sections, date: workout.date } as Pick<WODFormData, 'sections' | 'date'> as WODFormData,
      allExerciseNames,
      acronymMap,
      liftExerciseMap
    );
    // Build a lowercase → metadata lookup so pattern-exercise matching can pull
    // rmType into the per-week coverage detail.
    const metaByLower = new Map<string, MovementMetadata>();
    for (const [name, meta] of metaMap.entries()) {
      metaByLower.set(name.toLowerCase(), meta);
    }

    const workoutDate = new Date(workout.date + 'T00:00:00');
    const day = workoutDate.getDay();
    const monday = new Date(workoutDate);
    monday.setDate(workoutDate.getDate() - ((day + 6) % 7));
    const mondayStr = formatDate(monday);

    for (const pattern of patterns) {
      const matched: { name: string; rmType?: CoveredExercise['rmType'] }[] = [];
      for (const e of pattern.exercises) {
        const hitName = metaByLower.get(e.name.toLowerCase());
        const hitDisplay = e.display_name ? metaByLower.get(e.display_name.toLowerCase()) : undefined;
        const hit = hitName || hitDisplay;
        if (hit) {
          matched.push({
            name: e.display_name || e.name,
            rmType: hit.rmType,
          });
        }
      }
      if (matched.length === 0) continue;

      let weekMap = coverage.get(mondayStr);
      if (!weekMap) {
        weekMap = new Map<string, PatternWeekCoverage>();
        coverage.set(mondayStr, weekMap);
      }
      let detail = weekMap.get(pattern.id);
      if (!detail) {
        detail = { exercises: [], dates: [] };
        weekMap.set(pattern.id, detail);
      }
      for (const m of matched) {
        let existing = detail.exercises.find(x => x.name === m.name);
        if (!existing) {
          existing = { name: m.name, rmType: m.rmType, occurrences: [] };
          detail.exercises.push(existing);
        } else if (!existing.rmType && m.rmType) {
          existing.rmType = m.rmType;
        }
        // One occurrence per (exercise, workout date). Guards against an exercise
        // matching twice in the same workout (e.g. via name + display_name).
        if (!existing.occurrences.some(o => o.date === workout.date)) {
          existing.occurrences.push({ date: workout.date, rmType: m.rmType });
        }
      }
      if (!detail.dates.includes(workout.date)) detail.dates.push(workout.date);
    }
  }

  for (const weekMap of coverage.values()) {
    for (const detail of weekMap.values()) {
      detail.exercises.sort((a, b) => a.name.localeCompare(b.name));
      detail.exercises.forEach(ex => ex.occurrences.sort((a, b) => a.date.localeCompare(b.date)));
      detail.dates.sort();
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

/** Generate array of week start dates (Mondays, local time) for a range */
export function generateWeeks(pastWeeks: number, futureWeeks: number, anchorDate?: Date): string[] {
  const anchor = anchorDate || new Date();
  const anchorMonday = getMonday(anchor);
  const weeks: string[] = [];

  for (let i = -pastWeeks; i <= futureWeeks; i++) {
    const d = new Date(anchorMonday);
    d.setDate(d.getDate() + i * 7);
    weeks.push(formatDate(d));
  }

  return weeks;
}
