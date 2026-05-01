export interface MovementPattern {
  id: string;
  user_id: string;
  name: string;
  color: string;
  staleness_yellow: number;
  staleness_red: number;
  sort_order: number;
  track: 'adults' | 'kids';
  created_at: string;
  updated_at: string;
}

export interface MovementPatternExercise {
  id: string;
  pattern_id: string;
  exercise_id: string;
}

export interface PatternWithExercises extends MovementPattern {
  exercises: { id: string; name: string; display_name?: string }[];
}

export interface ProgrammingPlanItem {
  id: string;
  user_id: string;
  pattern_id: string;
  week_start: string; // YYYY-MM-DD (Monday)
  notes: string;
}

export interface PatternGapResult {
  patternId: string;
  patternName: string;
  color: string;
  exerciseCount: number;
  lastProgrammedDate: string | null;
  weeksSinceLastProgrammed: number | null;
  staleness: 'green' | 'yellow' | 'red' | 'never';
  stalenessYellow: number;
  stalenessRed: number;
  coveredExercises: string[];
  /** Per-exercise last-programmed dates: exercise name → date string (YYYY-MM-DD) */
  exerciseLastDates: Record<string, string>;
}

export interface PlanningGridWeek {
  weekStart: string; // YYYY-MM-DD Monday
  weekLabel: string; // e.g., "Mar 3"
  isPast: boolean;
  isCurrent: boolean;
}

export interface PatternWeekCoverage {
  exercises: string[]; // display_name || name; deduped; sorted alphabetically
  dates: string[];     // YYYY-MM-DD; deduped; sorted ascending
}

/** weekMonday (YYYY-MM-DD) → patternId → coverage detail */
export type WeeklyCoverageMap = Map<string, Map<string, PatternWeekCoverage>>;
