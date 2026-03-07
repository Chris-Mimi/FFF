export interface MovementPattern {
  id: string;
  user_id: string;
  name: string;
  color: string;
  staleness_yellow: number;
  staleness_red: number;
  sort_order: number;
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
}

export interface PlanningGridWeek {
  weekStart: string; // YYYY-MM-DD Monday
  weekLabel: string; // e.g., "Mar 3"
  isPast: boolean;
  isCurrent: boolean;
}
