import { extractMovementsFromText } from './movement-extraction';

/**
 * Suggest library exercises for a benchmark / forge benchmark based on its name + description.
 * Returns canonical exercise names (matching exercises.name) found via the same heuristics
 * the planner extractor uses on WOD section content. The coach reviews + confirms in the picker.
 */
export function suggestExercisesForBenchmark(
  name: string,
  description: string,
  knownExerciseNames: string[]
): string[] {
  if (knownExerciseNames.length === 0) return [];

  const knownLower = new Set(knownExerciseNames.map(n => n.toLowerCase()));
  const knownList = Array.from(knownLower);
  const movements = new Set<string>();

  // Run the extractor on name + description (treats them as content lines)
  if (name) extractMovementsFromText(name, movements, knownLower, knownList);
  if (description) extractMovementsFromText(description, movements, knownLower, knownList);

  // Map back to original casing from knownExerciseNames so the picker comparison works
  const result: string[] = [];
  const movementsLower = new Set(Array.from(movements).map(m => m.toLowerCase()));
  for (const exact of knownExerciseNames) {
    if (movementsLower.has(exact.toLowerCase())) result.push(exact);
  }
  return result;
}
