export interface LeaderboardEntry {
  id: string;
  userId: string;
  memberName: string;
  rank: number;
  timeResult?: string;
  repsResult?: number;
  weightResult?: number;
  weightResult2?: number;
  weightResult3?: number;
  roundsResult?: number;
  caloriesResult?: number;
  metresResult?: number;
  scalingLevel?: string;
  scalingLevel2?: string;
  scalingLevel3?: string;
  track?: number;
  taskCompleted?: boolean;
  dnf?: boolean;
  resultDate?: string;
  gender?: string | null;
  age?: number | null;
  sessionTime?: string;
}

// Gender map for whiteboard-only (unregistered) athletes
const WHITEBOARD_GENDERS: Record<string, 'M' | 'F'> = {
  'AndreasK': 'M', 'Bodo': 'M', 'Carmine': 'M', 'Chris': 'M',
  'ChristianM': 'M', 'ChristianT': 'M', 'DanielB': 'M', 'DanielG': 'M',
  'DanielS': 'M', 'David': 'M', 'Denis': 'M', 'Dimitar': 'M', 'Dor': 'M',
  'Jens': 'M', 'Jürgen': 'M', 'JürgenB': 'M', 'Lukas': 'M', 'LukasS': 'M',
  'Manuel': 'M', 'ManuelH': 'M', 'Markus': 'M', 'MichaelG': 'M',
  'MichaelJ': 'M', 'MichaelM': 'M', 'MichaelS': 'M', 'MichaelW': 'M', 'Moritz': 'M',
  'Nils': 'M', 'Patrik': 'M', 'Paul': 'M', 'PaulB': 'M', 'Peter': 'M',
  'Petr': 'M', 'Ralph': 'M', 'Robert': 'M', 'Sebastian': 'M', 'Senol': 'M',
  'Sergej': 'M', 'Stefan': 'M', 'Steven': 'M', 'Sven': 'M', 'SvenH': 'M',
  'Teemu': 'M', 'ThomasG': 'M', 'ThomasH': 'M', 'ThomasS': 'M',
  'Tobias': 'M', 'TobiasB': 'M', 'TobiasG': 'M', 'TobiasW': 'M',
  'Torben': 'M', 'Wayne': 'M', 'Zoran': 'M',
  'Aline': 'F', 'Anfisa': 'F', 'AnjaB': 'F', 'AnjaG': 'F', 'AnnaHa': 'F', 'Bettina': 'F',
  'AnnaHo': 'F', 'Anne': 'F', 'Anneke': 'F', 'Annerose': 'F', 'AnneS': 'F',
  'Carole': 'F', 'Claudia': 'F', 'Dinny': 'F', 'FranziskaH': 'F',
  'FranziskaK': 'F', 'Gloria': 'F', 'HannahS': 'F', 'Ina': 'F',
  'Irene': 'F', 'Jenny': 'F', 'Jolanda': 'F', 'JuliaW': 'F', 'Justine': 'F',
  'Katharina': 'F', 'KathiH': 'F', 'Kathrin': 'F', 'Katja': 'F',
  'Leah': 'F', 'Lena': 'F', 'LisaB': 'F', 'LisaV': 'F', 'Madeleine': 'F',
  'Marion': 'F', 'MarionW': 'F', 'Martina': 'F', 'MichaelaE': 'F',
  'MichaelaS': 'F', 'Mimi': 'F', 'Minja': 'F', 'Miriam': 'F',
  'NikolinaK': 'F', 'NikolinaV': 'F', 'Petra': 'F', 'Regina': 'F',
  'Rosita': 'F', 'Sabrina': 'F', 'Sandra': 'F', 'Sigrid': 'F', 'Sole': 'F',
  'Soledad': 'F', 'Sonja': 'F', 'SonjaH': 'F', 'Susanne': 'F',
  'SusanneG': 'F', 'Tabea': 'F', 'Valerie': 'F', 'Veronika': 'F',
};

export function getWhiteboardGender(name: string | null | undefined): string | null {
  if (!name) return null;
  return WHITEBOARD_GENDERS[name] || null;
}

export interface RawSectionResult {
  id: string;
  user_id: string;
  member_id?: string | null;
  whiteboard_name?: string | null;
  time_result?: string | null;
  reps_result?: number | null;
  weight_result?: number | null;
  weight_result_2?: number | null;
  weight_result_3?: number | null;
  rounds_result?: number | null;
  calories_result?: number | null;
  metres_result?: number | null;
  scaling_level?: string | null;
  scaling_level_2?: string | null;
  scaling_level_3?: string | null;
  track?: number | null;
  task_completed?: boolean | null;
  dnf?: boolean | null;
  workout_date?: string | null;
  wod_id?: string | null;
  session_time?: string | null; // "HH:MM" — annotated by caller for tiebreakers
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
  wod_id?: string | null;
  session_time?: string | null; // "HH:MM" — annotated by caller for tiebreakers
}

interface RawBenchmarkResult {
  id: string;
  user_id: string;
  time_result?: string | null;
  reps_result?: number | null;
  rounds_result?: number | null;
  weight_result?: number | null;
  scaling_level?: string | null;
  scaling_level_2?: string | null;
  scaling_level_3?: string | null;
  track?: number | null;
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
 * Priority: time/max_time > rounds_reps > reps+cals > reps > load/weight > calories > metres > checkbox
 */
export function detectScoringType(scoringFields?: ScoringFields): string {
  if (!scoringFields) return 'time';
  if (scoringFields.max_time) return 'max_time';
  if (scoringFields.time_amrap && scoringFields.time && (scoringFields.rounds_reps || scoringFields.reps)) return 'time_amrap';
  if (scoringFields.time && (scoringFields.rounds_reps || scoringFields.reps)) return 'time_with_cap';
  if (scoringFields.time) return 'time';
  if (scoringFields.rounds_reps) return 'rounds_reps';
  if (scoringFields.reps && scoringFields.calories) return 'reps_cals';
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
  // Weight tiebreaker: for non-weight primary types, higher load ranks first.
  // Chains through all three load slots (weight_result, weight_result_2, weight_result_3)
  // so that heavier secondary/tertiary loads (e.g. DB weight in a multi-movement WOD)
  // are honored before falling through to the primary metric.
  if (type !== 'weight') {
    const aLoads = [a.weight_result || 0, a.weight_result_2 || 0, a.weight_result_3 || 0];
    const bLoads = [b.weight_result || 0, b.weight_result_2 || 0, b.weight_result_3 || 0];
    for (let i = 0; i < 3; i++) {
      if (aLoads[i] !== bLoads[i] && (aLoads[i] > 0 || bLoads[i] > 0)) return bLoads[i] - aLoads[i];
    }
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
    case 'reps_cals':
      return ((b.reps_result || 0) + (b.calories_result || 0)) - ((a.reps_result || 0) + (a.calories_result || 0)); // combined total, descending
    case 'weight': {
      // Primary weight comparison chains through all three load slots
      const aLoads = [a.weight_result || 0, a.weight_result_2 || 0, a.weight_result_3 || 0];
      const bLoads = [b.weight_result || 0, b.weight_result_2 || 0, b.weight_result_3 || 0];
      for (let i = 0; i < 3; i++) {
        if (aLoads[i] !== bLoads[i]) return bLoads[i] - aLoads[i];
      }
      return 0;
    }
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
    const key = r.user_id || (r.member_id ? `member:${r.member_id}` : `wb:${r.whiteboard_name}`);
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
  memberGenders?: Record<string, string | null>,
  memberAges?: Record<string, number | null>
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
    // DNF entries always show on leaderboard (sorted to bottom)
    if (r.dnf) return true;
    switch (scoringType) {
      case 'time': return (r.time_result && r.time_result.trim() !== '') || hasAnyData(r);
      case 'time_with_cap': return (r.time_result && r.time_result.trim() !== '') || (r.rounds_result || 0) > 0 || (r.reps_result || 0) > 0;
      case 'time_amrap': return (r.rounds_result || 0) > 0 || (r.reps_result || 0) > 0;
      case 'rounds_reps': return (r.rounds_result || 0) > 0 || (r.reps_result || 0) > 0;
      case 'reps': return (r.reps_result || 0) > 0;
      case 'reps_cals': return (r.reps_result || 0) > 0 || (r.calories_result || 0) > 0;
      case 'weight': return (r.weight_result || 0) > 0;
      case 'calories': return (r.calories_result || 0) > 0;
      case 'metres': return (r.metres_result || 0) > 0;
      case 'checkbox': return r.task_completed !== null && r.task_completed !== undefined;
      default: return true;
    }
  });

  // Sort: Aggregate scaling score (lower = better) > Track > Scoring type
  // Rx=0, Sc1=1, Sc2=2, Sc3=3; sum all set levels for a single comparable score
  const scalingValue: Record<string, number> = { 'Rx': 0, 'Rx(M)': 0, 'Sc1': 1, 'Sc2': 2, 'Sc3': 3 };
  const MISSING_SCALING = 4; // null/blank scaling ranks below Sc3
  const aggregateScaling = (r: RawSectionResult) =>
    (r.scaling_level ? (scalingValue[r.scaling_level] ?? MISSING_SCALING) : MISSING_SCALING) +
    (r.scaling_level_2 ? (scalingValue[r.scaling_level_2] ?? MISSING_SCALING) : MISSING_SCALING) +
    (r.scaling_level_3 ? (scalingValue[r.scaling_level_3] ?? MISSING_SCALING) : MISSING_SCALING);
  // Primary comparator: the chain that determines whether two entries are tied for the same rank.
  // Tiebreakers AFTER this chain (age/date/time) only affect display order, not rank number.
  // Tier: 0 = real score, 1 = DNF. Sort by tier first so DNF falls below real scores.
  const tierOf = (r: RawSectionResult): number => (r.dnf ? 1 : 0);
  const comparePrimary = (a: RawSectionResult, b: RawSectionResult): number => {
    const tierDiff = tierOf(a) - tierOf(b);
    if (tierDiff !== 0) return tierDiff;
    const scaleDiff = aggregateScaling(a) - aggregateScaling(b);
    if (scaleDiff !== 0) return scaleDiff;
    const aTrack = a.track ?? 4;
    const bTrack = b.track ?? 4;
    if (aTrack !== bTrack) return aTrack - bTrack;
    return compareByScoringType(a, b, scoringType);
  };
  const ageOf = (r: RawSectionResult): number | null => memberAges?.[r.user_id] ?? null;
  const compareAge = (a: RawSectionResult, b: RawSectionResult): number => {
    const aAge = ageOf(a);
    const bAge = ageOf(b);
    if (aAge === bAge) return 0;
    if (aAge === null) return 1;
    if (bAge === null) return -1;
    return bAge - aAge;
  };
  const timeToMinutes = (t?: string | null): number => {
    if (!t) return Infinity;
    const [h, m] = t.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return Infinity;
    return h * 60 + m;
  };
  const sorted = [...valid].sort((a, b) => {
    const primary = comparePrimary(a, b);
    if (primary !== 0) return primary;
    // Tiebreaker 1: age DESC (older first). Missing DOB ranks below any known age.
    const ageDiff = compareAge(a, b);
    if (ageDiff !== 0) return ageDiff;
    // Tiebreaker 2: workout_date ASC (earlier = performed first).
    const aDate = a.workout_date || '9999-99-99';
    const bDate = b.workout_date || '9999-99-99';
    if (aDate !== bDate) return aDate < bDate ? -1 : 1;
    // Tiebreaker 3: session_time ASC (17:15 before 18:30).
    return timeToMinutes(a.session_time) - timeToMinutes(b.session_time);
  });

  // Assign ranks — tied entries (same primary chain) share the same rank number.
  // Standard competition ranking: 1, 1, 1, 4, 5, ...
  const ranks: number[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && comparePrimary(sorted[i - 1], sorted[i]) === 0) {
      ranks.push(ranks[i - 1]);
    } else {
      ranks.push(i + 1);
    }
  }
  return sorted.map((r, i) => ({
    id: r.id,
    userId: r.user_id || (r.member_id ? `member:${r.member_id}` : `wb:${r.whiteboard_name}`),
    memberName: memberNames[r.user_id] || (r.member_id ? memberNames[`member:${r.member_id}`] : null) || r.whiteboard_name || 'Unknown',
    rank: ranks[i],
    timeResult: r.time_result || undefined,
    repsResult: r.reps_result || undefined,
    weightResult: r.weight_result || undefined,
    weightResult2: r.weight_result_2 || undefined,
    weightResult3: r.weight_result_3 || undefined,
    roundsResult: r.rounds_result || undefined,
    caloriesResult: r.calories_result || undefined,
    metresResult: r.metres_result || undefined,
    scalingLevel: r.scaling_level || undefined,
    scalingLevel2: r.scaling_level_2 || undefined,
    scalingLevel3: r.scaling_level_3 || undefined,
    track: r.track || undefined,
    taskCompleted: r.task_completed ?? undefined,
    dnf: r.dnf ?? undefined,
    resultDate: r.workout_date || undefined,
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
  memberGenders?: Record<string, string | null>,
  memberAges?: Record<string, number | null>
): LeaderboardEntry[] {
  // Determine scoring direction from benchmark type
  const typeLower = benchmarkType.toLowerCase();
  let isTimeBased = typeLower.includes('time');
  let isRepsBased = typeLower.includes('rep') || typeLower.includes('amrap') || typeLower.includes('tabata');
  // Fallback for "Other" or unrecognised types: infer from actual data
  if (!isTimeBased && !isRepsBased) {
    const hasTime = results.some(r => r.time_result && r.time_result.trim() !== '');
    const hasReps = results.some(r => (r.reps_result || 0) > 0 || (r.rounds_result || 0) > 0);
    const hasWeight = results.some(r => (r.weight_result || 0) > 0);
    if (hasTime) isTimeBased = true;
    else if (hasReps && !hasWeight) isRepsBased = true;
  }

  // Composite score for rounds+reps comparison (higher = better)
  const roundsRepsScore = (r: RawBenchmarkResult) =>
    (r.rounds_result || 0) * 10000 + (r.reps_result || 0);

  // Filter out entries with no meaningful data
  const valid = results.filter(r =>
    (r.time_result && r.time_result.trim() !== '') ||
    (r.reps_result || 0) > 0 ||
    (r.rounds_result || 0) > 0 ||
    (r.weight_result || 0) > 0
  );

  // Group by user, pick best
  const bestByUser = new Map<string, RawBenchmarkResult>();

  for (const r of valid) {
    const existing = bestByUser.get(r.user_id);
    if (!existing) {
      bestByUser.set(r.user_id, r);
      continue;
    }

    // Compare to find better result
    let isBetter = false;
    if (isTimeBased) {
      const rTime = parseTimeToSeconds(r.time_result);
      const eTime = parseTimeToSeconds(existing.time_result);
      if (rTime !== Infinity && eTime !== Infinity) {
        isBetter = rTime < eTime;
      } else if (rTime !== Infinity) {
        isBetter = true; // finisher beats cap-hitter
      } else if (eTime === Infinity) {
        // Both hit cap: more rounds+reps = better
        isBetter = roundsRepsScore(r) > roundsRepsScore(existing);
      }
    } else if (isRepsBased) {
      isBetter = roundsRepsScore(r) > roundsRepsScore(existing);
    } else {
      // Default: weight-based (higher is better)
      isBetter = (r.weight_result || 0) > (existing.weight_result || 0);
    }

    if (isBetter) bestByUser.set(r.user_id, r);
  }

  // Sort best results: aggregate scaling score (lower = better) > Track > primary metric
  // Rx=0, Sc1=1, Sc2=2, Sc3=3; sum all set levels for a single comparable score
  const scalingValue: Record<string, number> = { 'Rx': 0, 'Rx(M)': 0, 'Sc1': 1, 'Sc2': 2, 'Sc3': 3 };
  const MISSING_SCALING = 4; // null/blank scaling ranks below Sc3
  const aggregateScaling = (r: RawBenchmarkResult) =>
    (r.scaling_level ? (scalingValue[r.scaling_level] ?? MISSING_SCALING) : MISSING_SCALING) +
    (r.scaling_level_2 ? (scalingValue[r.scaling_level_2] ?? MISSING_SCALING) : MISSING_SCALING) +
    (r.scaling_level_3 ? (scalingValue[r.scaling_level_3] ?? MISSING_SCALING) : MISSING_SCALING);
  // Primary comparator: the chain that determines whether two entries are tied for the same rank.
  // Tiebreakers AFTER this chain (age/date) only affect display order, not rank number.
  const comparePrimary = (a: RawBenchmarkResult, b: RawBenchmarkResult): number => {
    const scaleDiff = aggregateScaling(a) - aggregateScaling(b);
    if (scaleDiff !== 0) return scaleDiff;
    const aTrack = a.track ?? 4;
    const bTrack = b.track ?? 4;
    if (aTrack !== bTrack) return aTrack - bTrack;
    if (!isTimeBased && !isRepsBased) {
      // Weight IS the primary metric, skip weight tiebreaker
    } else {
      const aW = a.weight_result || 0;
      const bW = b.weight_result || 0;
      if (aW !== bW && (aW > 0 || bW > 0)) return bW - aW;
    }
    if (isTimeBased) {
      const aTime = parseTimeToSeconds(a.time_result);
      const bTime = parseTimeToSeconds(b.time_result);
      const aFinished = aTime !== Infinity;
      const bFinished = bTime !== Infinity;
      if (aFinished && bFinished) return aTime - bTime;
      if (aFinished && !bFinished) return -1;
      if (!aFinished && bFinished) return 1;
      return roundsRepsScore(b) - roundsRepsScore(a);
    }
    if (isRepsBased) return roundsRepsScore(b) - roundsRepsScore(a);
    return (b.weight_result || 0) - (a.weight_result || 0);
  };
  const ageOf = (r: RawBenchmarkResult): number | null => memberAges?.[r.user_id] ?? null;
  const compareAge = (a: RawBenchmarkResult, b: RawBenchmarkResult): number => {
    const aAge = ageOf(a);
    const bAge = ageOf(b);
    if (aAge === bAge) return 0;
    if (aAge === null) return 1;
    if (bAge === null) return -1;
    return bAge - aAge;
  };
  const bests = [...bestByUser.values()];
  bests.sort((a, b) => {
    const primary = comparePrimary(a, b);
    if (primary !== 0) return primary;
    // Tiebreaker 1: age DESC (older first). Missing DOB ranks below any known age.
    const ageDiff = compareAge(a, b);
    if (ageDiff !== 0) return ageDiff;
    // Tiebreaker 2: result_date ASC (earlier PR = performed first).
    const aDate = a.result_date || '9999-99-99';
    const bDate = b.result_date || '9999-99-99';
    if (aDate !== bDate) return aDate < bDate ? -1 : 1;
    return 0;
  });

  // Assign ranks — tied entries (same primary chain) share the same rank number.
  const ranks: number[] = [];
  for (let i = 0; i < bests.length; i++) {
    if (i > 0 && comparePrimary(bests[i - 1], bests[i]) === 0) {
      ranks.push(ranks[i - 1]);
    } else {
      ranks.push(i + 1);
    }
  }

  return bests.map((r, i) => ({
    id: r.id,
    userId: r.user_id,
    memberName: memberNames[r.user_id] || (r.user_id.startsWith('wb:') ? r.user_id.slice(3) : 'Unknown'),
    rank: ranks[i],
    timeResult: r.time_result || undefined,
    repsResult: r.reps_result || undefined,
    roundsResult: r.rounds_result || undefined,
    weightResult: r.weight_result || undefined,
    scalingLevel: r.scaling_level || undefined,
    scalingLevel2: r.scaling_level_2 || undefined,
    scalingLevel3: r.scaling_level_3 || undefined,
    track: r.track || undefined,
    resultDate: r.result_date,
    gender: memberGenders?.[r.user_id] ?? (r.user_id.startsWith('wb:') ? getWhiteboardGender(r.user_id.slice(3)) : undefined) ?? undefined,
    age: memberAges?.[r.user_id] ?? null,
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
 * Tied entries share the same rank; within a tied group, display order is:
 * age DESC (older first, missing DOB treated as youngest) → lift_date ASC → session_time ASC.
 */
export function rankLiftResults(
  results: RawLiftResult[],
  memberNames: Record<string, string>,
  memberGenders?: Record<string, string | null>,
  whiteboardEntries?: LeaderboardEntry[],
  memberAges?: Record<string, number | null>
): LeaderboardEntry[] {
  const valid = results.filter(r => r.weight_kg > 0);

  const entries: LeaderboardEntry[] = valid.map((r) => ({
    id: r.id,
    userId: r.user_id,
    memberName: memberNames[r.user_id] || 'Unknown',
    rank: 0,
    weightResult: r.weight_kg,
    resultDate: r.lift_date,
    gender: memberGenders?.[r.user_id] ?? undefined,
    age: memberAges?.[r.user_id] ?? null,
    sessionTime: r.session_time || undefined,
  }));

  if (whiteboardEntries?.length) {
    entries.push(...whiteboardEntries);
  }

  const ageOf = (e: LeaderboardEntry): number | null => e.age ?? null;
  const compareAge = (a: LeaderboardEntry, b: LeaderboardEntry): number => {
    const aAge = ageOf(a);
    const bAge = ageOf(b);
    if (aAge === bAge) return 0;
    if (aAge === null) return 1;
    if (bAge === null) return -1;
    return bAge - aAge;
  };
  const timeToMinutes = (t?: string | null): number => {
    if (!t) return Infinity;
    const [h, m] = t.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return Infinity;
    return h * 60 + m;
  };

  entries.sort((a, b) => {
    const weightDiff = (b.weightResult || 0) - (a.weightResult || 0);
    if (weightDiff !== 0) return weightDiff;
    const ageDiff = compareAge(a, b);
    if (ageDiff !== 0) return ageDiff;
    const aDate = a.resultDate || '9999-99-99';
    const bDate = b.resultDate || '9999-99-99';
    if (aDate !== bDate) return aDate < bDate ? -1 : 1;
    return timeToMinutes(a.sessionTime) - timeToMinutes(b.sessionTime);
  });

  for (let i = 0; i < entries.length; i++) {
    if (i > 0 && (entries[i - 1].weightResult || 0) === (entries[i].weightResult || 0)) {
      entries[i].rank = entries[i - 1].rank;
    } else {
      entries[i].rank = i + 1;
    }
  }

  return entries;
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
      if (entry.roundsResult && entry.repsResult) { primary = `Time Cap ${entry.roundsResult}+${entry.repsResult}`; break; }
      if (entry.roundsResult) { primary = `Time Cap ${entry.roundsResult} rounds`; break; }
      primary = `Time Cap ${entry.repsResult || 0} reps`; break;
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
    case 'reps_cals':
      primary = `${entry.repsResult || 0} reps + ${entry.caloriesResult || 0} cal`; break;
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
  if (!['reps', 'reps_cals', 'rounds_reps', 'time', 'max_time', 'time_with_cap', 'time_amrap'].includes(scoringType) && entry.repsResult) extras.push(`${entry.repsResult} reps`);
  if (!['calories', 'reps_cals'].includes(scoringType) && entry.caloriesResult) extras.push(`${entry.caloriesResult} cal`);

  if (extras.length > 0) return `${primary} · ${extras.join(' · ')}`;
  return primary;
}

/**
 * Format benchmark result for display (auto-detect from available fields).
 */
export function formatBenchmarkResult(entry: LeaderboardEntry, benchmarkType?: string): string {
  const parts: string[] = [];
  if (entry.timeResult) parts.push(entry.timeResult);
  // No time but has rounds/reps = hit the time cap (only for time-based benchmarks)
  const typeLower = (benchmarkType || '').toLowerCase();
  const isTimeBasedBm = typeLower.includes('time');
  const isTimeCap = isTimeBasedBm && !entry.timeResult && (entry.roundsResult || entry.repsResult);
  if (entry.roundsResult && entry.repsResult) {
    parts.push(`${isTimeCap ? 'Time Cap ' : ''}${entry.roundsResult}+${entry.repsResult}`);
  } else if (entry.roundsResult) {
    parts.push(`${isTimeCap ? 'Time Cap ' : ''}${entry.roundsResult} rounds`);
  } else if (entry.repsResult) {
    parts.push(`${isTimeCap ? 'Time Cap ' : ''}${entry.repsResult} reps`);
  }
  if (entry.weightResult) parts.push(`${entry.weightResult} kg`);
  return parts.join(' · ') || '-';
}
