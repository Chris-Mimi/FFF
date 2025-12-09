/**
 * Converts plain text URLs into clickable HTML links
 * Preserves line breaks and other text formatting
 */
export function linkifyText(text: string): string {
  if (!text) return '';

  // URL regex pattern that matches http://, https://, and www. URLs
  const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;

  // Replace URLs with anchor tags
  const linkedText = text.replace(urlPattern, (url) => {
    // Add https:// to www. URLs
    const href = url.startsWith('www.') ? `https://${url}` : url;
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">${url}</a>`;
  });

  // Preserve line breaks by converting \n to <br>
  return linkedText.replace(/\n/g, '<br>');
}
