/**
 * Search an athlete's own workout history.
 *
 * Athletes had no way to find a past workout except by already knowing its date — every
 * athlete surface (My WODs, Logbook, Leaderboard) is date-driven. This powers a search
 * inside the Logbook: find the workout, see the score, jump to its leaderboard.
 *
 * TWO DESIGN DECISIONS, both driven by how Chris actually writes workouts:
 *
 * 1. THE WORKOUT NAME IS THE INDEX. Every one of the 556 wods has a `workout_name`, and
 *    he writes it as the movement list — "Run, T2B, Burpee, Bear Crawl, WBs". Splitting
 *    those names yields the gym's real vocabulary (Push-up 43, Pull-up 35, PP 31, DUs 25,
 *    T2B 21, BJ 19, TGU 17 …) in the same shorthand athletes read on the whiteboard.
 *    That beats matching against the 719-row exercise catalogue, which was tried first
 *    and failed: `matchAllSectionsExercises` looks for the exact catalogue name in the
 *    text, so "Jump Rope Double-Unders (DUs)" never matched the written "Jump Rope
 *    Double-Unders". On the 28.08 workout it found five warm-up drills and none of the
 *    actual movements. The coach's Movement Info bar is left alone — it's tuned for a
 *    different job where a missed chip costs nothing.
 *
 * 2. ONLY PUBLISHED SECTIONS ARE SEARCHABLE. Chris publishes the WOD and any scored Lift
 *    sections; warm-ups, drills and prep never reach the athlete app. Searching what they
 *    were never shown would be confusing, and would expose coach-side content — the
 *    Whiteboard Intro section, for one, holds athlete names as its body text.
 *
 * Coach-authored prose is deliberately not surfaced anywhere here: it's written by Chris
 * in English for himself and his coaches, and CFH's members are German.
 */

import {
  detectScoringType,
  formatResult,
  type LeaderboardEntry,
  type ScoringFieldsForFormat,
} from '@/utils/leaderboard-utils';

export interface HistorySection {
  id: string;
  type?: string;
  content?: string;
  scoring_fields?: Record<string, boolean> | null;
}

export interface HistoryWod {
  id: string;
  date: string;
  title?: string | null;
  workout_name?: string | null;
  session_type?: string | null;
  sections?: HistorySection[] | null;
  publish_sections?: string[] | null;
}

export interface HistoryScoreRow {
  wod_id: string;
  section_id: string;
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
}

export interface HistoryScore {
  /** Section type, e.g. "WOD", "Strength" — a structural label, not coach prose */
  label: string;
  /** Formatted by the same function the leaderboard uses */
  text: string;
}

export interface HistoryEntry {
  wodId: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM, or null when the session time is unknown */
  time: string | null;
  /** The workout's name, as the athlete sees it */
  title: string;
  /** Movement terms split out of the name — the browse vocabulary */
  terms: string[];
  /** Lowercased name + published section text, for free-text search */
  searchText: string;
  /** One per scored section; empty means they attended with no score recorded */
  scores: HistoryScore[];
}

/**
 * Split a workout name into its movement terms.
 *
 * Names are comma- or ampersand-separated movement lists. Drops workout numbering
 * ("#26.10"), parenthetical asides ("(Strength Builder)") and anything starting with a
 * digit, which is a rep scheme rather than a movement.
 */
export function splitWorkoutName(name: string): string[] {
  const parts: string[] = [];
  for (const raw of String(name).split(/[,&]/)) {
    const term = raw
      .replace(/#\d+(\.\d+)?/g, '')
      .replace(/\([^)]*\)/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!term || term.length < 2) continue;
    if (/^\d/.test(term)) continue;
    parts.push(term);
  }
  return [...new Set(parts)];
}

/** Display name for a workout, preferring the coach's explicit workout name. */
function wodTitle(wod: HistoryWod): string {
  return (
    wod.workout_name?.trim() ||
    wod.title?.trim() ||
    wod.session_type?.trim() ||
    'Workout'
  );
}

/**
 * The sections this athlete can actually see.
 *
 * Mirrors `getPublishedSections` in `utils/logbook-utils`, including its fallback: a
 * workout with no `publish_sections` shows everything, which is what the Logbook does,
 * so search stays consistent with what's on screen. 62 of 556 wods are in that state
 * (kids classes, Open Gym) and they carry no scores worth searching anyway.
 */
function visibleSections(wod: HistoryWod): HistorySection[] {
  const sections = (wod.sections ?? []).filter(
    (s): s is HistorySection => !!s && typeof s === 'object'
  );
  const published = wod.publish_sections;
  if (!published || published.length === 0) return sections;
  return sections.filter((s) => published.includes(s.id));
}

/** Map a stored result row onto the leaderboard's entry shape so its formatter can be
 *  reused — keeping scores worded here exactly as they are on the leaderboard. */
function toEntry(row: HistoryScoreRow): LeaderboardEntry {
  return {
    id: `${row.wod_id}:${row.section_id}`,
    userId: '',
    memberName: '',
    rank: 0,
    timeResult: row.time_result ?? undefined,
    repsResult: row.reps_result ?? undefined,
    weightResult: row.weight_result ?? undefined,
    weightResult2: row.weight_result_2 ?? undefined,
    weightResult3: row.weight_result_3 ?? undefined,
    roundsResult: row.rounds_result ?? undefined,
    caloriesResult: row.calories_result ?? undefined,
    metresResult: row.metres_result ?? undefined,
    scalingLevel: row.scaling_level ?? undefined,
    scalingLevel2: row.scaling_level_2 ?? undefined,
    scalingLevel3: row.scaling_level_3 ?? undefined,
    track: row.track ?? undefined,
    taskCompleted: row.task_completed ?? undefined,
    dnf: row.dnf ?? undefined,
  };
}

/**
 * Build the searchable history.
 *
 * `wods` must already be narrowed to workouts this athlete was booked into — no access
 * filtering happens here.
 */
export function buildHistoryEntries(params: {
  wods: HistoryWod[];
  /** wod id → session time (HH:MM:SS) */
  sessionTimes: Map<string, string | null>;
  scores: HistoryScoreRow[];
}): HistoryEntry[] {
  const { wods, sessionTimes, scores } = params;

  const scoresByWod = new Map<string, HistoryScoreRow[]>();
  for (const row of scores) {
    const list = scoresByWod.get(row.wod_id);
    if (list) list.push(row);
    else scoresByWod.set(row.wod_id, [row]);
  }

  const entries: HistoryEntry[] = [];

  for (const wod of wods) {
    const sections = visibleSections(wod);
    const title = wodTitle(wod);
    const terms = splitWorkoutName(title);

    const sectionText = sections.map((s) => s.content ?? '').join('\n');
    const searchText = `${title}\n${sectionText}`.toLowerCase();

    const sectionById = new Map(sections.map((s) => [s.id, s]));
    const rows = scoresByWod.get(wod.id) ?? [];

    const scoreList: HistoryScore[] = [];
    for (const row of rows) {
      const baseId = String(row.section_id).replace(/-content-0$/, '');
      const section = sectionById.get(baseId);
      // A score whose section is unpublished or has since been deleted can't be
      // formatted (we don't know its scoring type) — skip rather than guess.
      if (!section) continue;
      const fields = (section.scoring_fields ?? {}) as ScoringFieldsForFormat &
        Record<string, boolean>;
      const text = formatResult(toEntry(row), detectScoringType(fields), fields);
      if (!text || text === '-') continue;
      scoreList.push({ label: section.type?.trim() || 'Score', text });
    }

    const time = sessionTimes.get(wod.id) ?? null;

    entries.push({
      wodId: wod.id,
      date: wod.date,
      time: time ? time.slice(0, 5) : null,
      title,
      terms,
      searchText,
      scores: scoreList,
    });
  }

  // Newest first — "what did I do recently" is the common case.
  return entries.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return (b.time ?? '').localeCompare(a.time ?? '');
  });
}

export interface TermCount {
  term: string;
  count: number;
}

/**
 * Every movement term in this athlete's own history, most-used first — so the movements
 * they actually do sit at the top of the browse list.
 */
export function collectTerms(entries: HistoryEntry[]): TermCount[] {
  const freq = new Map<string, number>();
  for (const entry of entries) {
    for (const term of entry.terms) {
      freq.set(term, (freq.get(term) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => (b.count !== a.count ? b.count - a.count : a.term.localeCompare(b.term)));
}

export interface HistoryFilters {
  /** Free text — matches the workout name, its published text, and the date */
  query?: string;
  /** Exact term, chosen from the browse chips */
  term?: string | null;
  /** YYYY-MM-DD inclusive bounds */
  from?: string | null;
  to?: string | null;
}

export function filterHistory(
  entries: HistoryEntry[],
  filters: HistoryFilters
): HistoryEntry[] {
  const q = filters.query?.trim().toLowerCase() ?? '';
  const term = filters.term ?? null;

  return entries.filter((entry) => {
    if (term && !entry.terms.includes(term)) return false;
    if (filters.from && entry.date < filters.from) return false;
    if (filters.to && entry.date > filters.to) return false;
    if (!q) return true;
    if (entry.date.includes(q)) return true;
    return entry.searchText.includes(q);
  });
}

/**
 * Term suggestions for the type-ahead, ranked so a term *starting* with what they typed
 * beats one merely containing it, then by how often they've done it.
 */
export function suggestTerms(
  entries: HistoryEntry[],
  query: string,
  limit = 8
): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const starts: TermCount[] = [];
  const contains: TermCount[] = [];
  for (const tc of collectTerms(entries)) {
    const lower = tc.term.toLowerCase();
    if (lower.startsWith(q)) starts.push(tc);
    else if (lower.includes(q)) contains.push(tc);
  }

  return [...starts, ...contains].slice(0, limit).map((tc) => tc.term);
}
