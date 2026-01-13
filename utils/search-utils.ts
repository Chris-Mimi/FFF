/**
 * Escape special regex characters in a string
 * @param str - String to escape
 * @returns Escaped string safe for use in RegExp
 */
const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Highlight search terms in text with HTML mark tags
 * @param text - Text to highlight search terms in
 * @param searchTerms - Array of terms to highlight
 * @returns Text with highlighted search terms
 */
export const highlightText = (text: string, searchTerms: string[]): string => {
  if (!searchTerms.length) return text;

  let result = text;
  searchTerms.forEach(term => {
    const escapedTerm = escapeRegex(term);
    const regex = new RegExp(`(${escapedTerm})`, 'gi');
    result = result.replace(regex, '<mark class="bg-yellow-200 text-gray-900">$1</mark>');
  });

  return result;
};
