import { WODFormData } from '@/components/coach/WorkoutModal';

// Words to exclude from movement names (noise words)
const excludeWords = new Set([
  'reps', 'rep', 'rounds', 'round', 'minutes', 'minute', 'min', 'mins',
  'seconds', 'second', 'sec', 'secs', 'meter', 'meters', 'calories', 'cal',
  'cals', 'each', 'side', 'total', 'amrap', 'emom', 'for', 'time', 'the',
  'and', 'or', 'of', 'in', 'at', 'to', 'a', 'an', 'with', 'without',
  'rx', 'scaled', 'beginner', 'intermediate', 'advanced'
]);

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
  const cleaned = word.toLowerCase();
  return !excludeWords.has(cleaned) &&
         cleaned.length > 1 &&
         !/^\d+$/.test(cleaned);
};

/**
 * Extract movements from WOD sections using pattern matching
 * @param wods - Array of WOD data to extract movements from
 * @returns Map of movement names to occurrence counts
 */
export const extractMovements = (wods: WODFormData[]): Map<string, number> => {
  const movementCounts = new Map<string, number>();

  wods.forEach(wod => {
    const movementsInThisWod = new Set<string>();

    wod.sections.forEach(section => {
      const lines = section.content.split('\n');

      lines.forEach(line => {
        // Split by both '+' and ',' to handle multiple exercises on same line
        const parts = line.split(/[+,]/).map(p => p.trim());

        parts.forEach(part => {
          const trimmedLine = part.trim();
          if (!trimmedLine) return;

        // Pattern 1: Number + x + Movement (e.g., "10x Air Squats", "10x Pass Throughs (PVC)")
        const numberXPattern = /^(?:\d+[\s-]*x[\s-]*|[\d-]+[\s-]*x[\s-]*)([\w\s\-()]+?)(?:\s*[@\d]|$)/i;
        let match = trimmedLine.match(numberXPattern);

        // Pattern 2: Bullet/asterisk + Movement (e.g., "* Arm Circles", "- Butt Kicks")
        if (!match) {
          const bulletPattern = /^[\s*•\-]+\s*([\w\s\-()]+?)(?:\s*[@\d]|$)/;
          match = trimmedLine.match(bulletPattern);
        }

        // Pattern 3: Number + Movement (e.g., "10 Air Squats", "21-15-9 Thrusters")
        if (!match) {
          const numberPattern = /^(?:\d+[\s-]*)([\w\s\-()]+?)(?:\s*[@\d]|$)/;
          match = trimmedLine.match(numberPattern);
        }

        // Pattern 4: Rep scheme + Movement (e.g., "21-15-9 Thrusters")
        if (!match) {
          const repSchemePattern = /^(?:\d+-\d+(?:-\d+)*[\s-]*)([\w\s\-()]+?)(?:\s*[@\d]|$)/;
          match = trimmedLine.match(repSchemePattern);
        }

        if (match && match[1]) {
          // Extract and clean the movement name
          let movementText = match[1].trim();

          // Remove trailing punctuation but keep parentheses
          movementText = movementText.replace(/[,;.!?]+$/, '');

          // Check if there's parenthetical content (like "PVC" or "Resistance Band")
          const hasParentheses = /\(([^)]+)\)/.test(movementText);

          if (hasParentheses) {
            // Preserve the entire phrase including parentheses
            const movement = normalizeMovement(movementText);
            if (movement.length >= 3) {
              movementsInThisWod.add(movement);
            }
          } else {
            // Split into words and filter out noise for non-parenthetical movements
            const words = movementText.split(/\s+/).filter(isValidMovementWord);

            // Take up to 4 words for the movement name (most movements are 1-4 words)
            if (words.length > 0 && words.length <= 4) {
              const movement = normalizeMovement(words.join(' '));

              // Only add if movement name is substantial (at least 3 characters)
              if (movement.length >= 3) {
                movementsInThisWod.add(movement);
              }
            }
          }
        }
        });
      });
    });

    // Increment count once per workout
    movementsInThisWod.forEach(movement => {
      movementCounts.set(movement, (movementCounts.get(movement) || 0) + 1);
    });
  });

  return movementCounts;
};
