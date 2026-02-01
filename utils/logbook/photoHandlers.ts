/**
 * Utility functions for whiteboard photo handling
 */

/**
 * Calculate ISO week number for a given date
 * ISO weeks start on Monday and Week 1 contains January 4th
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Format ISO week string from date (e.g., "2026-W05")
 */
export function formatISOWeek(date: Date): string {
  const weekNumber = getWeekNumber(date);
  return `${date.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
}
