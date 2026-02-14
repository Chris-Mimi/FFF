import { WODFormData } from '@/components/coach/WorkoutModal';

// Words to exclude from movement names (noise words)
// NOTE: Do NOT add words that are legitimate parts of exercise names
// (e.g., "partner", "lock", "hold", "touch"). The 2-word minimum for
// content-extracted movements already prevents single-word noise.
const excludeWords = new Set([
  'reps', 'rep', 'rounds', 'round', 'minutes', 'minute', 'min', 'mins',
  'seconds', 'second', 'sec', 'secs', 'meter', 'meters', 'metre', 'metres',
  'calories', 'cal', 'cals', 'each', 'side', 'total', 'amrap', 'emom',
  'for', 'time', 'the', 'and', 'or', 'of', 'in', 'at', 'to', 'a', 'an',
  'with', 'without', 'rx', 'scaled', 'beginner', 'intermediate', 'advanced',
  'sets', 'set', 'work', 'rest', 'then', 'every', 'try', 'add', 'weight',
  'into', 'from', 'on', 'off', 'per', 'between', 'after', 'before',
  'during', 'until', 'cap', 'as', 'heavy', 'possible', 'light', 'moderate',
  'fast', 'slow', 'all', 'out', 'max', 'effort', 'build', 'working', 'use',
  'do', 'go', 'start', 'finish', 'complete', 'perform', 'repeat', 'increase',
  'decrease', 'maintain', 'keep', 'switch', 'alternate', 'immediately',
  'across', 'unbroken', 'teams', 'team', 'you', 'your', 'can', 'should',
  'must', 'will', 'need', 'using', 'positions', 'position',
  'kcal', 'kg', 'lbs', 'lb', 'ft', 'km', 'mi', 'hr', 'hrs',
]);

// Phrases that indicate coaching instructions, not exercises
const instructionPhrases = [
  'try to', 'add weight', 'each round', 'rest between', 'rest after',
  'work at', 'work up', 'build to', 'build up', 'start with', 'finish with',
  'as heavy as', 'as fast as', 'go heavy', 'go light', 'stay consistent',
  'scale to', 'modify to', 'option to', 'aim for', 'target',
  'same weight', 'increase weight', 'decrease weight',
];

// Helper function to normalize movement name
const normalizeMovement = (movement: string): string => {
  return movement
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();
};

// Helper function to check if a word is likely part of a movement name
const isValidMovementWord = (word: string): boolean => {
  const cleaned = word.toLowerCase().replace(/[()]/g, '');
  return !excludeWords.has(cleaned) &&
         cleaned.length > 1 &&
         !/^\d+$/.test(cleaned) &&
         !/^\d+\w{1,3}$/.test(cleaned); // reject "50kg", "15m", "3rm" etc.
};

// Check if a line is a coaching instruction rather than an exercise
const isInstructionLine = (line: string): boolean => {
  const lower = line.toLowerCase();
  return instructionPhrases.some(phrase => lower.includes(phrase));
};

// Strip instruction-like parenthetical content from a line
// Keeps equipment labels like "(PVC)", "(Resistance Band)"
// Strips instructions like "(3 positions, 15 reps each using fractionals)"
const stripInstructionParens = (text: string): string => {
  return text.replace(/\(([^)]*)\)/g, (_match, inner) => {
    const words = inner.trim().split(/\s+/);
    // Keep short equipment/variant labels (1-3 words, no digits)
    if (words.length <= 3 && !/\d/.test(inner)) return _match;
    // Strip everything else
    return '';
  }).replace(/\s{2,}/g, ' ').trim();
};

/**
 * Extract movement names from a single WOD's sections
 * Sources: structured data (lifts, benchmarks, forge_benchmarks) + content text parsing
 * @returns Set of normalized movement names
 */
export const extractMovementsFromWod = (wod: WODFormData): Set<string> => {
  const movements = new Set<string>();

  wod.sections.forEach(section => {
    // Source 1: Structured lift names
    section.lifts?.forEach((lift: any) => {
      if (lift.name) movements.add(normalizeMovement(lift.name));
    });

    // Source 2: Structured benchmark names and exercises
    section.benchmarks?.forEach((benchmark: any) => {
      if (benchmark.name) movements.add(normalizeMovement(benchmark.name));
      benchmark.exercises?.forEach((ex: string) => {
        if (ex) movements.add(normalizeMovement(ex));
      });
    });

    // Source 3: Structured forge benchmark names and exercises
    section.forge_benchmarks?.forEach((forge: any) => {
      if (forge.name) movements.add(normalizeMovement(forge.name));
      forge.exercises?.forEach((ex: string) => {
        if (ex) movements.add(normalizeMovement(ex));
      });
    });

    // Source 4: Parse exercise names from content text
    const lines = section.content.split('\n');

    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      // Skip coaching instruction lines
      if (isInstructionLine(trimmedLine)) return;

      // Strip instruction parentheticals BEFORE splitting on commas
      // This prevents "(3 positions, 15 reps each)" from being split into fragments
      const lineWithoutInstructionParens = stripInstructionParens(trimmedLine);

      // Split by '+' and ',' for multiple exercises on same line
      const parts = lineWithoutInstructionParens.split(/[+,]/).map(p => p.trim());

      parts.forEach(part => {
        if (!part) return;

        // Skip instruction fragments
        if (isInstructionLine(part)) return;

        // Remove any stray unmatched closing parens
        const cleanedPart = part.replace(/\)$/, '').trim();
        if (!cleanedPart) return;

        let movementText = '';

        // Pattern 1: Bullet/asterisk + Movement — greedy capture (full exercise name after bullet)
        const bulletMatch = cleanedPart.match(/^[*•]\s+(.+)$/);
        if (bulletMatch) {
          movementText = bulletMatch[1];
        }

        // Pattern 2: Number + x + Movement (e.g., "10x Air Squats")
        if (!movementText) {
          const nxMatch = cleanedPart.match(/^\d+[\s-]*x[\s-]*(.+)$/i);
          if (nxMatch) movementText = nxMatch[1];
        }

        // Pattern 3: Number/rep-scheme + Movement (e.g., "10 Air Squats", "21-15-9 Thrusters")
        if (!movementText) {
          const numMatch = cleanedPart.match(/^\d+(?:-\d+)*\s+(.+)$/);
          if (numMatch) movementText = numMatch[1];
        }

        if (!movementText) return;

        // Clean trailing noise: @ weights, standalone trailing numbers/units
        movementText = movementText.replace(/\s*@.*$/, ''); // "@ 50kg" and after
        movementText = movementText.replace(/\s+\d+\s*(?:kg|lbs?|m|ft|cal|kcal|reps?)?\s*$/i, ''); // trailing "50kg", "15m"
        movementText = movementText.replace(/[,;.!?:]+$/, ''); // trailing punctuation
        movementText = movementText.trim();

        if (!movementText) return;

        // Skip if the extracted text is a coaching instruction
        if (isInstructionLine(movementText)) return;

        // If text contains equipment parenthetical, truncate after it
        const parenMatch = movementText.match(/^(.*?\([^)]+\))/);

        if (parenMatch) {
          const movement = normalizeMovement(parenMatch[1]);
          if (movement.length >= 3) {
            movements.add(movement);
          }
        } else {
          const words = movementText.split(/\s+/).filter(isValidMovementWord);

          // Require at least 2 words for content-extracted movements
          // (single words from free text are too noisy — structured data handles single-word names)
          if (words.length >= 2 && words.length <= 6) {
            const movement = normalizeMovement(words.join(' '));

            if (movement.length >= 3) {
              movements.add(movement);
            }
          }
        }
      });
    });
  });

  return movements;
};

/**
 * Extract movements from WOD sections using structured data + pattern matching
 * @param wods - Array of WOD data to extract movements from
 * @returns Map of movement names to occurrence counts
 */
export const extractMovements = (wods: WODFormData[]): Map<string, number> => {
  const movementCounts = new Map<string, number>();

  wods.forEach(wod => {
    const movementsInThisWod = extractMovementsFromWod(wod);

    // Increment count once per workout
    movementsInThisWod.forEach(movement => {
      movementCounts.set(movement, (movementCounts.get(movement) || 0) + 1);
    });
  });

  return movementCounts;
};
