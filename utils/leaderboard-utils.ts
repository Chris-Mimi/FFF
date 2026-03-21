export interface LeaderboardEntry {
  id: string;
  userId: string;
  memberName: string;
  rank: number;
  timeResult?: string;
  repsResult?: number;
  weightResult?: number;
  weightResult2?: number;
  roundsResult?: number;
  caloriesResult?: number;
  metresResult?: number;
  scalingLevel?: string;
  scalingLevel2?: string;
  track?: number;
  taskCompleted?: boolean;
  resultDate?: string;
  gender?: string | null;
}

// Gender map for whiteboard-only (unregistered) athletes
const WHITEBOARD_GENDERS: Record<string, 'M' | 'F'> = {
  'AndreasK': 'M', 'Carmine': 'M', 'DanielB': 'M', 'DanielS': 'M',
  'Denis': 'M', 'Dimitar': 'M', 'Dor': 'M', 'JürgenB': 'M',
  'Markus': 'M', 'Nils': 'M', 'Sebastian': 'M', 'Senol': 'M',
  'Stefan': 'M', 'Sven': 'M', 'Teemu': 'M', 'ThomasG': 'M',
  'ThomasH': 'M', 'TobiasB': 'M', 'Zoran': 'M',
  'Anfisa': 'F', 'AnjaG': 'F', 'Annerose': 'F', 'AnneS': 'F',
  'FranziskaH': 'F', 'FranziskaK': 'F', 'Irene': 'F', 'Jenny': 'F',
  'JuliaW': 'F', 'Justine': 'F', 'Kathrin': 'F', 'Leah': 'F',
  'Lena': 'F', 'LisaV': 'F', 'Madeleine': 'F', 'Martina': 'F',
  'Miriam': 'F', 'Regina': 'F', 'Sabrina': 'F', 'Sandra': 'F',
  'SusanneG': 'F', 'Valerie': 'F', 'Veronika': 'F',
};

export function getWhiteboardGender(name: string | null | undefined): string | null {
  if (!name) return null;
  return WHITEBOARD_GENDERS[name] || null;
}

export interface RawSectionResult {
  id: string;
  user_id: string;
  whiteboard_name?: string | null;
  time_result?: string | null;
  reps_result?: number | null;
  weight_result?: number | null;
  weight_result_2?: number | null;
  rounds_result?: number | null;
  calories_result?: number | null;
  metres_result?: number | null;
  scaling_level?: string | null;
  scaling_level_2?: string | null;
  track?: number | null;
  task_completed?: boolean | null;
  workout_date?: string | null;
}

export interface RawLiftResult {
  id: string;
  user_id: string;
  lift_name: string;
  weight_kg: number;
  reps: number;
  rep_max_type?: string | null;
  rep_scheme?: string | null;
  lift_date?: string;
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
  max_time?: boolean;
  reps?: boolean;
  load?: boolean;
  rounds_reps?: boolean;
  calories?: boolean;
  metres?: boolean;
  checkbox?: boolean;
  scaling?: boolean;
  time_amrap?: boolean;
}

/**
 * Detect the primary scoring type from a section's scoring_fields.
 * Priority: time/max_time > rounds_reps > reps > load/weight > calories > metres > checkbox
 */
export function detectScoringType(scoringFields?: ScoringFields): string {
  if (!scoringFields) return 'time';
  if (scoringFields.max_time) return 'max_time';
  if (scoringFields.time_amrap && scoringFields.time && (scoringFields.rounds_reps || scoringFields.reps)) return 'time_amrap';
  if (scoringFields.time && (scoringFields.rounds_reps || scoringFields.reps)) return 'time_with_cap';
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
 *
 * Within the same scaling level, weight (load) is always used as the first
 * tiebreaker before the primary metric (unless weight IS the primary metric).
 * This matches CrossFit convention: heavier load at the same scaling = better.
 */
function compareByScoringType(a: RawSectionResult, b: RawSectionResult, type: string): number {
  // Weight tiebreaker: for non-weight primary types, higher load ranks first
  if (type !== 'weight') {
    const aW = a.weight_result || 0;
    const bW = b.weight_result || 0;
    if (aW !== bW && (aW > 0 || bW > 0)) return bW - aW;
  }

  switch (type) {
    case 'time': {
      const aTime = parseTimeToSeconds(a.time_result);
      const bTime = parseTimeToSeconds(b.time_result);
      return aTime - bTime; // ascending (faster = better)
    }
    case 'max_time': {
      const aTime = parseTimeToSeconds(a.time_result);
      const bTime = parseTimeToSeconds(b.time_result);
      // Infinity means no result — sort last
      if (aTime === Infinity && bTime === Infinity) return 0;
      if (aTime === Infinity) return 1;
      if (bTime === Infinity) return -1;
      return bTime - aTime; // descending (longer = better)
    }
    case 'time_with_cap': {
      const aFinished = !!(a.time_result && a.time_result.trim() !== '');
      const bFinished = !!(b.time_result && b.time_result.trim() !== '');
      if (aFinished && bFinished) return parseTimeToSeconds(a.time_result) - parseTimeToSeconds(b.time_result);
      if (aFinished && !bFinished) return -1; // finisher beats cap-hitter
      if (!aFinished && bFinished) return 1;
      // Both hit cap: compare rounds+reps descending
      const aRounds = a.rounds_result || 0;
      const bRounds = b.rounds_result || 0;
      if (aRounds !== bRounds) return bRounds - aRounds;
      return (b.reps_result || 0) - (a.reps_result || 0);
    }
    case 'time_amrap': {
      // Primary: reps/rounds descending (more = better)
      const aRnds = a.rounds_result || 0;
      const bRnds = b.rounds_result || 0;
      if (aRnds !== bRnds) return bRnds - aRnds;
      const aReps = a.reps_result || 0;
      const bReps = b.reps_result || 0;
      if (aReps !== bReps) return bReps - aReps;
      // Tiebreaker: time ascending (faster = better, optional)
      const aT = parseTimeToSeconds(a.time_result);
      const bT = parseTimeToSeconds(b.time_result);
      return aT - bT;
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
    const key = r.user_id || `wb:${r.whiteboard_name}`;
    const existing = best.get(key);
    if (!existing) {
      best.set(key, r);
      continue;
    }
    const cmp = compareByScoringType(r, existing, scoringType);
    if (cmp < 0) {
      // Better score — replace
      best.set(key, r);
    } else if (cmp === 0 && r.workout_date && existing.workout_date && r.workout_date > existing.workout_date) {
      // Equal score — prefer most recent result so edits are reflected
      best.set(key, r);
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
  scoringType: string,
  memberGenders?: Record<string, string | null>
): LeaderboardEntry[] {
  // Filter out results with no meaningful data
  // Check primary scoring field first, then fall back to any non-empty field
  const hasAnyData = (r: RawSectionResult) =>
    (r.time_result && r.time_result.trim() !== '') ||
    (r.reps_result || 0) > 0 ||
    (r.weight_result || 0) > 0 ||
    (r.rounds_result || 0) > 0 ||
    (r.calories_result || 0) > 0 ||
    (r.metres_result || 0) > 0;
  const valid = results.filter(r => {
    switch (scoringType) {
      case 'time': return (r.time_result && r.time_result.trim() !== '') || hasAnyData(r);
      case 'time_with_cap': return (r.time_result && r.time_result.trim() !== '') || (r.rounds_result || 0) > 0 || (r.reps_result || 0) > 0;
      case 'time_amrap': return (r.rounds_result || 0) > 0 || (r.reps_result || 0) > 0;
      case 'rounds_reps': return (r.rounds_result || 0) > 0 || (r.reps_result || 0) > 0;
      case 'reps': return (r.reps_result || 0) > 0;
      case 'weight': return (r.weight_result || 0) > 0;
      case 'calories': return (r.calories_result || 0) > 0;
      case 'metres': return (r.metres_result || 0) > 0;
      case 'checkbox': return r.task_completed !== null && r.task_completed !== undefined;
      default: return true;
    }
  });

  // Sort: Rx first, then Sc1/Sc2/Sc3; within each scaling level: Track 1 > 2 > 3 > untracked; then by scoring type
  const scalingOrder: Record<string, number> = { 'Rx': 0, 'Sc1': 1, 'Sc2': 2, 'Sc3': 3 };
  const sorted = [...valid].sort((a, b) => {
    const aScale = scalingOrder[a.scaling_level || ''] ?? 4;
    const bScale = scalingOrder[b.scaling_level || ''] ?? 4;
    if (aScale !== bScale) return aScale - bScale;
    // Track: 1 < 2 < 3 < null (lower track = higher rank)
    const aTrack = a.track ?? 4;
    const bTrack = b.track ?? 4;
    if (aTrack !== bTrack) return aTrack - bTrack;
    return compareByScoringType(a, b, scoringType);
  });

  // Assign ranks
  return sorted.map((r, i) => ({
    id: r.id,
    userId: r.user_id,
    memberName: memberNames[r.user_id] || r.whiteboard_name || 'Unknown',
    rank: i + 1,
    timeResult: r.time_result || undefined,
    repsResult: r.reps_result || undefined,
    weightResult: r.weight_result || undefined,
    weightResult2: r.weight_result_2 || undefined,
    roundsResult: r.rounds_result || undefined,
    caloriesResult: r.calories_result || undefined,
    metresResult: r.metres_result || undefined,
    scalingLevel: r.scaling_level || undefined,
    scalingLevel2: r.scaling_level_2 || undefined,
    track: r.track || undefined,
    taskCompleted: r.task_completed ?? undefined,
    gender: memberGenders?.[r.user_id] ?? getWhiteboardGender(r.whiteboard_name) ?? undefined,
  }));
}

/**
 * Get best benchmark result per user across all time, then rank.
 */
export function rankBenchmarkResults(
  results: RawBenchmarkResult[],
  memberNames: Record<string, string>,
  benchmarkType: string,
  memberGenders?: Record<string, string | null>
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
    gender: memberGenders?.[r.user_id] ?? undefined,
  }));
}

/**
 * Keep only the best (heaviest) lift per user.
 */
export function bestLiftPerUser(results: RawLiftResult[]): RawLiftResult[] {
  const best = new Map<string, RawLiftResult>();
  for (const r of results) {
    const existing = best.get(r.user_id);
    if (!existing || r.weight_kg > existing.weight_kg) {
      best.set(r.user_id, r);
    }
  }
  return [...best.values()];
}

/**
 * Rank lift results by weight descending (heavier = better).
 */
export function rankLiftResults(
  results: RawLiftResult[],
  memberNames: Record<string, string>,
  memberGenders?: Record<string, string | null>
): LeaderboardEntry[] {
  const valid = results.filter(r => r.weight_kg > 0);
  const sorted = [...valid].sort((a, b) => b.weight_kg - a.weight_kg);

  return sorted.map((r, i) => ({
    id: r.id,
    userId: r.user_id,
    memberName: memberNames[r.user_id] || 'Unknown',
    rank: i + 1,
    weightResult: r.weight_kg,
    resultDate: r.lift_date,
    gender: memberGenders?.[r.user_id] ?? undefined,
  }));
}

/**
 * Format a leaderboard entry's result as a display string.
 * Shows the primary result plus any additional non-empty fields as extras.
 */
export function formatResult(entry: LeaderboardEntry, scoringType: string): string {
  let primary: string;

  switch (scoringType) {
    case 'time':
    case 'max_time':
      if (entry.timeResult) { primary = entry.timeResult; break; }
      if (entry.repsResult) { primary = `${entry.repsResult} reps`; break; }
      if (entry.weightResult) { primary = `${entry.weightResult} kg`; break; }
      primary = '-'; break;
    case 'time_with_cap':
      if (entry.timeResult) { primary = entry.timeResult; break; }
      if (entry.roundsResult && entry.repsResult) { primary = `CAP ${entry.roundsResult}+${entry.repsResult}`; break; }
      if (entry.roundsResult) { primary = `CAP ${entry.roundsResult} rounds`; break; }
      primary = `CAP ${entry.repsResult || 0} reps`; break;
    case 'time_amrap': {
      const repsStr = entry.roundsResult && entry.repsResult
        ? `${entry.roundsResult}+${entry.repsResult}`
        : entry.roundsResult
        ? `${entry.roundsResult} rounds`
        : `${entry.repsResult || 0} reps`;
      primary = entry.timeResult ? `${repsStr} (${entry.timeResult})` : repsStr; break;
    }
    case 'rounds_reps':
      if (entry.roundsResult && entry.repsResult) { primary = `${entry.roundsResult}+${entry.repsResult}`; break; }
      if (entry.roundsResult) { primary = `${entry.roundsResult} rounds`; break; }
      primary = `${entry.repsResult || 0} reps`; break;
    case 'reps':
      primary = `${entry.repsResult || 0} reps`; break;
    case 'weight':
      primary = entry.weightResult2
        ? `${entry.weightResult || 0}/${entry.weightResult2} kg`
        : `${entry.weightResult || 0} kg`;
      break;
    case 'calories':
      primary = `${entry.caloriesResult || 0} cal`; break;
    case 'metres':
      primary = `${entry.metresResult || 0} m`; break;
    case 'checkbox':
      primary = entry.taskCompleted ? 'Completed' : 'Not completed'; break;
    default:
      primary = '-'; break;
  }

  // Append extra fields not already shown in primary
  const extras: string[] = [];
  if (scoringType !== 'weight' && entry.weightResult) {
    extras.push(entry.weightResult2 ? `${entry.weightResult}/${entry.weightResult2} kg` : `${entry.weightResult} kg`);
  } else if (entry.weightResult2) {
    extras.push(`${entry.weightResult2} kg`);
  }
  if (!['metres'].includes(scoringType) && entry.metresResult) extras.push(`${entry.metresResult} m`);
  if (!['reps', 'rounds_reps', 'time_with_cap', 'time_amrap'].includes(scoringType) && entry.repsResult) extras.push(`${entry.repsResult} reps`);
  if (!['calories'].includes(scoringType) && entry.caloriesResult) extras.push(`${entry.caloriesResult} cal`);

  if (extras.length > 0) return `${primary} · ${extras.join(' · ')}`;
  return primary;
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
