/**
 * Matches exercise names found in section content text against the exercise database.
 * Returns exercises that have a video_url for auto-detected video play buttons.
 */

export interface MatchedExerciseVideo {
  exerciseName: string;  // Display name or name from DB
  videoUrl: string;      // The video URL
  lineIndex: number;     // Which line in the content it was found on
}

interface SectionLike {
  content: string;
}

interface ExerciseRecord {
  name: string;
  display_name?: string;
  video_url: string | null;
}

/**
 * Scan section content for exercise names that exist in the exercises database
 * and have a video_url. Returns matched exercises sorted by line order.
 *
 * Matching logic:
 * - Splits content by lines
 * - Strips bullet markers (*, -, numbers) and leading whitespace
 * - Strips trailing rep/set info (e.g., "3x10", "@ 70%", "(each side)")
 * - Matches against exercise name and display_name (case-insensitive)
 * - Only returns exercises that have a non-null video_url
 */
export function matchSectionExercises(
  content: string,
  exercises: ExerciseRecord[]
): MatchedExerciseVideo[] {
  if (!content?.trim() || !exercises?.length) return [];

  // Pre-build a lookup map: lowercase name -> exercise (with video)
  const exerciseMap = new Map<string, { name: string; displayName: string; videoUrl: string }>();

  for (const ex of exercises) {
    if (!ex.video_url) continue;

    const entry = {
      name: ex.name,
      displayName: ex.display_name || ex.name,
      videoUrl: ex.video_url,
    };

    // Index by both name and display_name (lowercase)
    exerciseMap.set(ex.name.toLowerCase(), entry);
    if (ex.display_name) {
      exerciseMap.set(ex.display_name.toLowerCase(), entry);
    }
  }

  if (exerciseMap.size === 0) return [];

  const lines = content.split('\n');
  const matched: MatchedExerciseVideo[] = [];
  const seen = new Set<string>(); // Avoid duplicates if same exercise on multiple lines

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Strip bullet markers: "* ", "- ", "1. ", "1) "
    let cleaned = line.replace(/^\s*(?:[*\-]\s*|\d+[.)]\s*)/, '').trim();
    if (!cleaned) continue;

    // Strip leading rep/set prefixes
    // e.g., "3x Back Squat" -> "Back Squat"
    // e.g., "5x3 Deadlift" -> "Deadlift"
    cleaned = cleaned
      .replace(/^\d+x\d*\s+/i, '')          // 3x Back Squat, 5x3 Deadlift
      .replace(/^\d+\s*(?:reps?|sets?)\s+/i, '') // 3 sets Back Squat
      .trim();

    // Strip trailing rep/set/percentage info
    // e.g., "Deadlift 3x5 @ 80%" -> "Deadlift"
    // e.g., "Box Jumps (24in)" -> "Box Jumps"
    cleaned = cleaned
      .replace(/\s+\d+x\d+.*$/i, '')        // 3x10, 5x5 @ 70%
      .replace(/\s+\d+\s*(?:reps?|sets?).*$/i, '') // 10 reps, 3 sets
      .replace(/\s*@\s*\d+%.*$/i, '')        // @ 80%
      .replace(/\s*\([^)]*\)\s*$/, '')       // (each side), (24in)
      .replace(/\s+x\s*\d+.*$/i, '')         // x 10
      .trim();

    if (!cleaned) continue;

    // Try exact match first (most reliable)
    const exactMatch = exerciseMap.get(cleaned.toLowerCase());
    if (exactMatch && !seen.has(exactMatch.name.toLowerCase())) {
      seen.add(exactMatch.name.toLowerCase());
      matched.push({
        exerciseName: exactMatch.displayName,
        videoUrl: exactMatch.videoUrl,
        lineIndex: i,
      });
      continue;
    }

    // Partial match: an exercise name appears somewhere in the line (e.g. a
    // multi-movement line like "KB Dead Bug, Plank" or "3x Back Squat").
    // Use the original line (lowered) so stripping didn't remove parts of the
    // name (e.g. "(SU)"). Collect EVERY word-boundary match, then accept them
    // longest-first and skip any that overlap an already-accepted span. This
    // makes the most specific name win ("KB Dead Bug" beats "Dead Bug") and lets
    // a single line surface more than one movement. (S384)
    const lineLower = line.toLowerCase();
    const boundaryChar = /[\s,;:\-–—/|]/;
    const candidates: { idx: number; len: number; entry: { name: string; displayName: string; videoUrl: string } }[] = [];
    for (const [key, entry] of exerciseMap) {
      // Only match exercise names at least 4 chars (avoid false positives like "Row")
      if (key.length < 4) continue;
      const idx = lineLower.indexOf(key);
      if (idx === -1) continue;
      const charBefore = idx > 0 ? lineLower[idx - 1] : ' ';
      const charAfter = idx + key.length < lineLower.length ? lineLower[idx + key.length] : ' ';
      if (!boundaryChar.test(charBefore) || !boundaryChar.test(charAfter)) continue;
      candidates.push({ idx, len: key.length, entry });
    }
    candidates.sort((a, b) => b.len - a.len); // longest (most specific) first
    const claimed: Array<[number, number]> = [];
    for (const c of candidates) {
      const end = c.idx + c.len;
      if (claimed.some(([s, e]) => c.idx < e && end > s)) continue; // overlaps a longer match
      if (seen.has(c.entry.name.toLowerCase())) continue;
      claimed.push([c.idx, end]);
      seen.add(c.entry.name.toLowerCase());
      matched.push({
        exerciseName: c.entry.displayName,
        videoUrl: c.entry.videoUrl,
        lineIndex: i,
      });
    }
  }

  return matched;
}

/**
 * Scan ALL sections' content for exercise names with video URLs.
 * Returns a deduplicated list of matched exercises (alphabetically sorted).
 */
export function matchAllSectionsExercises(
  sections: SectionLike[],
  exercises: ExerciseRecord[]
): MatchedExerciseVideo[] {
  if (!sections?.length || !exercises?.length) return [];

  // Combine all section content into one string for matching
  const allContent = sections.map(s => s.content).join('\n');
  return matchSectionExercises(allContent, exercises);
}
