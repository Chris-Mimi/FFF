/**
 * Helper function to ensure time is zero-padded for select dropdown
 * @param time - Time string in HH:MM format
 * @returns Zero-padded time string
 */
export function padTime(time: string): string {
  if (!time) return '12:00';
  const [hours, minutes] = time.split(':');
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
}

/**
 * Calculate modal bounds for resizing
 * @returns Object with min/max width and height
 */
export function calculateModalBounds() {
  return {
    minWidth: 400,
    minHeight: 500,
    maxWidth: window.innerWidth - 100,
    maxHeight: window.innerHeight - 100,
  };
}
