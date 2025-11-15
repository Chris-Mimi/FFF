/**
 * Format date to YYYY-MM-DD string
 * @param date - Date to format
 * @returns Formatted date string
 */
export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get ISO week number for a given date
 * @param date - Date to get week number for
 * @returns ISO week number
 */
export const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

/**
 * Get dates for a week starting Monday
 * @param selectedDate - Reference date within the week
 * @returns Array of 7 dates (Monday-Sunday)
 */
export const getWeekDates = (selectedDate: Date): Date[] => {
  const curr = new Date(selectedDate);
  curr.setHours(0, 0, 0, 0); // Reset time to midnight
  const day = curr.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Adjust to Monday
  curr.setDate(curr.getDate() + diff);

  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(curr);
    dates.push(date);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
};

/**
 * Get dates for a month view (6 weeks, 42 days)
 * @param selectedDate - Reference date within the month
 * @returns Array of 42 dates starting from Monday of first week
 */
export const getMonthDates = (selectedDate: Date): Date[] => {
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const firstDay = new Date(year, month, 1, 0, 0, 0, 0);

  // Start from Monday of the week containing the 1st
  const dayOfWeek = firstDay.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to Monday
  const startDate = new Date(firstDay);
  startDate.setDate(firstDay.getDate() + diff);

  const dates = [];
  const current = new Date(startDate);

  // Get 6 weeks (42 days) to cover full month
  for (let i = 0; i < 42; i++) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

/**
 * Get display string for date range
 * @param dates - Array of dates to display
 * @returns Formatted date range string
 */
export const getDisplayDateRange = (dates: Date[]): string => {
  if (dates.length === 0) return '';

  const firstDate = dates[0];
  const lastDate = dates[dates.length - 1];

  const formatMonthDay = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return `${formatMonthDay(firstDate)} - ${formatMonthDay(lastDate)}`;
};
