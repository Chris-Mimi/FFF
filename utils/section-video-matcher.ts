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

    // Try partial match: content line starts with exercise name
    // This handles cases like "Deadlift - heavy" where stripping didn't catch the suffix
    for (const [key, entry] of exerciseMap) {
      if (seen.has(entry.name.toLowerCase())) continue;
      if (cleaned.toLowerCase().startsWith(key) || key.startsWith(cleaned.toLowerCase())) {
        // Only match if the shorter string is at least 4 chars (avoid false positives like "Row")
        const shorter = Math.min(cleaned.length, key.length);
        if (shorter >= 4) {
          seen.add(entry.name.toLowerCase());
          matched.push({
            exerciseName: entry.displayName,
            videoUrl: entry.videoUrl,
            lineIndex: i,
          });
          break;
        }
      }
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
