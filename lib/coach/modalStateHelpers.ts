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
  const w = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const h = typeof window !== 'undefined' ? window.innerHeight : 800;
  return {
    minWidth: 400,
    minHeight: 500,
    maxWidth: w - 100,
    maxHeight: h - 100,
  };
}
