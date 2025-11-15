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
    const regex = new RegExp(`(${term})`, 'gi');
    result = result.replace(regex, '<mark class="bg-yellow-200 text-gray-900">$1</mark>');
  });

  return result;
};
