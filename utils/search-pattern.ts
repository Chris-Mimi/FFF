/**
 * Builds the regex used by the search boxes (Workouts page, Movement Library).
 *
 * The intent is "match from the start of a word": typing `Ring` should find
 * "Ring Muscle-Up" but not "hamstring" or "during".
 *
 * The naive way to do that is to prefix `\b`, and that's what both search boxes
 * did — but it silently breaks whenever the query starts with something that
 * isn't a word character. `\b` only matches where a word char meets a non-word
 * char, so `\b#` needs a *word* character immediately before the `#`. In real
 * text the `#` follows a space or starts the string, so the boundary never
 * exists and the query can never match anything. S411: typing `#26.` on the
 * Workouts page returned nothing, while `Endurance` found "Endurance #26.1".
 *
 * The same trap catches `(6/9kg)`, `-Ups`, and any German term starting with an
 * umlaut — JS `\w` is ASCII-only, so `Ü` is a non-word char too.
 *
 * Fix: apply the boundary only on a side where it can actually mean something.
 */

/** JS `\b` only knows ASCII word chars, so test for exactly those. */
const startsWithWordChar = (s: string) => /^\w/.test(s);
const endsWithWordChar = (s: string) => /\w$/.test(s);

/**
 * @param phrase  raw search text (already trimmed)
 * @param exact   require a word boundary at the END too — the Workouts search
 *                turns this on when the user typed a trailing space, meaning
 *                "this whole word" rather than "starts with".
 */
export function buildSearchPattern(phrase: string, exact = false): RegExp {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const lead = startsWithWordChar(phrase) ? '\\b' : '';
  const tail = exact && endsWithWordChar(phrase) ? '\\b' : '';
  return new RegExp(`${lead}${escaped}${tail}`, 'i');
}

/** Convenience wrapper for the common "does this text match?" call. */
export function matchesSearch(text: string, phrase: string, exact = false): boolean {
  if (!text || !phrase) return false;
  return buildSearchPattern(phrase, exact).test(text);
}
