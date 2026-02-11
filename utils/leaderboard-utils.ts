export interface LeaderboardEntry {
  id: string;
  userId: string;
  memberName: string;
  rank: number;
  timeResult?: string;
  repsResult?: number;
  weightResult?: number;
  roundsResult?: number;
  caloriesResult?: number;
  metresResult?: number;
  scalingLevel?: string;
  taskCompleted?: boolean;
  resultDate?: string;
}

export interface RawSectionResult {
  id: string;
  user_id: string;
  time_result?: string | null;
  reps_result?: number | null;
  weight_result?: number | null;
  rounds_result?: number | null;
  calories_result?: number | null;
  metres_result?: number | null;
  scaling_level?: string | null;
  task_completed?: boolean | null;
}

interface RawBenchmarkResult {
  id: string;
  user_id: string;
  time_result?: string | null;
  reps_result?: number | null;
  weight_result?: number | null;
  scaling_level?: string | null;
  result_date?: string;
}

interface ScoringFields {
  time?: boolean;
  reps?: boolean;
  load?: boolean;
  rounds_reps?: boolean;
  calories?: boolean;
  metres?: boolean;
  checkbox?: boolean;
  scaling?: boolean;
}

/**
 * Detect the primary scoring type from a section's scoring_fields.
 * Priority: time > rounds_reps > reps > load/weight > calories > metres > checkbox
 */
export function detectScoringType(scoringFields?: ScoringFields): string {
  if (!scoringFields) return 'time';
  if (scoringFields.time) return 'time';
  if (scoringFields.rounds_reps) return 'rounds_reps';
  if (scoringFields.reps) return 'reps';
  if (scoringFields.load) return 'weight';
  if (scoringFields.calories) return 'calories';
  if (scoringFields.metres) return 'metres';
  if (scoringFields.checkbox) return 'checkbox';
  return 'time';
}

/**
 * Parse time string "mm:ss" or "h:mm:ss" to total seconds for comparison.
 * Returns Infinity for unparseable/missing times so they sort last.
 */
function parseTimeToSeconds(time?: string | null): number {
  if (!time || time.trim() === '') return Infinity;
  const clean = time.trim();

  // Handle special values
  if (clean.toLowerCase().startsWith('dnf') || clean.toLowerCase().startsWith('cap')) return Infinity;

  const parts = clean.split(':').map(Number);
  if (parts.some(isNaN)) return Infinity;

  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

/**
 * Compare two results by scoring type.
 * Returns negative if a should rank higher (better).
 */
function compareByScoringType(a: RawSectionResult, b: RawSectionResult, type: string): number {
  switch (type) {
    case 'time': {
      const aTime = parseTimeToSeconds(a.time_result);
      const bTime = parseTimeToSeconds(b.time_result);
      return aTime - bTime; // ascending (faster = better)
    }
    case 'rounds_reps': {
      const aRounds = a.rounds_result || 0;
      const bRounds = b.rounds_result || 0;
      if (aRounds !== bRounds) return bRounds - aRounds; // descending
      return (b.reps_result || 0) - (a.reps_result || 0); // tiebreak by reps
    }
    case 'reps':
      return (b.reps_result || 0) - (a.reps_result || 0); // descending
    case 'weight':
      return (b.weight_result || 0) - (a.weight_result || 0); // descending
    case 'calories':
      return (b.calories_result || 0) - (a.calories_result || 0); // descending
    case 'metres':
      return (b.metres_result || 0) - (a.metres_result || 0); // descending
    case 'checkbox': {
      const aVal = a.task_completed ? 1 : 0;
      const bVal = b.task_completed ? 1 : 0;
      return bVal - aVal; // completed first
    }
    default:
      return 0;
  }
}

/**
 * Deduplicate section results: keep only the best result per user.
 * Used when aggregating results from same-named workouts across multiple dates.
 */
export function bestResultPerUser(
  results: RawSectionResult[],
  scoringType: string
): RawSectionResult[] {
  const best = new Map<string, RawSectionResult>();
  for (const r of results) {
    const existing = best.get(r.user_id);
    if (!existing) {
      best.set(r.user_id, r);
      continue;
    }
    if (compareByScoringType(r, existing, scoringType) < 0) {
      best.set(r.user_id, r);
    }
  }
  return [...best.values()];
}

/**
 * Rank WOD section results by scoring type.
 */
export function rankSectionResults(
  results: RawSectionResult[],
  memberNames: Record<string, string>,
  scoringType: string
): LeaderboardEntry[] {
  // Filter out results with no meaningful data
  const valid = results.filter(r => {
    switch (scoringType) {
      case 'time': return r.time_result && r.time_result.trim() !== '';
      case 'rounds_reps': return (r.rounds_result || 0) > 0 || (r.reps_result || 0) > 0;
      case 'reps': return (r.reps_result || 0) > 0;
      case 'weight': return (r.weight_result || 0) > 0;
      case 'calories': return (r.calories_result || 0) > 0;
      case 'metres': return (r.metres_result || 0) > 0;
      case 'checkbox': return r.task_completed !== null && r.task_completed !== undefined;
      default: return true;
    }
  });

  // Sort
  const sorted = [...valid].sort((a, b) => compareByScoringType(a, b, scoringType));

  // Assign ranks
  return sorted.map((r, i) => ({
    id: r.id,
    userId: r.user_id,
    memberName: memberNames[r.user_id] || 'Unknown',
    rank: i + 1,
    timeResult: r.time_result || undefined,
    repsResult: r.reps_result || undefined,
    weightResult: r.weight_result || undefined,
    roundsResult: r.rounds_result || undefined,
    caloriesResult: r.calories_result || undefined,
    metresResult: r.metres_result || undefined,
    scalingLevel: r.scaling_level || undefined,
    taskCompleted: r.task_completed ?? undefined,
  }));
}

/**
 * Get best benchmark result per user across all time, then rank.
 */
export function rankBenchmarkResults(
  results: RawBenchmarkResult[],
  memberNames: Record<string, string>,
  benchmarkType: string
): LeaderboardEntry[] {
  // Determine scoring direction from benchmark type
  const isTimeBased = benchmarkType.toLowerCase().includes('time');
  const isRepsBased = benchmarkType.toLowerCase().includes('rep');

  // Group by user, pick best
  const bestByUser = new Map<string, RawBenchmarkResult>();

  for (const r of results) {
    const existing = bestByUser.get(r.user_id);
    if (!existing) {
      bestByUser.set(r.user_id, r);
      continue;
    }

    // Compare to find better result
    let isBetter = false;
    if (isTimeBased) {
      isBetter = parseTimeToSeconds(r.time_result) < parseTimeToSeconds(existing.time_result);
    } else if (isRepsBased) {
      isBetter = (r.reps_result || 0) > (existing.reps_result || 0);
    } else {
      // Default: weight-based (higher is better)
      isBetter = (r.weight_result || 0) > (existing.weight_result || 0);
    }

    if (isBetter) bestByUser.set(r.user_id, r);
  }

  // Sort best results
  const bests = [...bestByUser.values()];
  bests.sort((a, b) => {
    if (isTimeBased) return parseTimeToSeconds(a.time_result) - parseTimeToSeconds(b.time_result);
    if (isRepsBased) return (b.reps_result || 0) - (a.reps_result || 0);
    return (b.weight_result || 0) - (a.weight_result || 0);
  });

  return bests.map((r, i) => ({
    id: r.id,
    userId: r.user_id,
    memberName: memberNames[r.user_id] || 'Unknown',
    rank: i + 1,
    timeResult: r.time_result || undefined,
    repsResult: r.reps_result || undefined,
    weightResult: r.weight_result || undefined,
    scalingLevel: r.scaling_level || undefined,
    resultDate: r.result_date,
  }));
}

/**
 * Format a leaderboard entry's result as a display string.
 */
export function formatResult(entry: LeaderboardEntry, scoringType: string): string {
  switch (scoringType) {
    case 'time':
      return entry.timeResult || '-';
    case 'rounds_reps':
      if (entry.roundsResult && entry.repsResult) return `${entry.roundsResult}+${entry.repsResult}`;
      if (entry.roundsResult) return `${entry.roundsResult} rounds`;
      return `${entry.repsResult || 0} reps`;
    case 'reps':
      return `${entry.repsResult || 0} reps`;
    case 'weight':
      return `${entry.weightResult || 0} kg`;
    case 'calories':
      return `${entry.caloriesResult || 0} cal`;
    case 'metres':
      return `${entry.metresResult || 0} m`;
    case 'checkbox':
      return entry.taskCompleted ? 'Completed' : 'Not completed';
    default:
      return '-';
  }
}

/**
 * Format benchmark result for display (auto-detect from available fields).
 */
export function formatBenchmarkResult(entry: LeaderboardEntry): string {
  const parts: string[] = [];
  if (entry.timeResult) parts.push(entry.timeResult);
  if (entry.repsResult) parts.push(`${entry.repsResult} reps`);
  if (entry.weightResult) parts.push(`${entry.weightResult} kg`);
  return parts.join(' / ') || '-';
}
