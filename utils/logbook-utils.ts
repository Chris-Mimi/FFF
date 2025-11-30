/**
 * Logbook-specific utility functions
 * Re-exports date utilities for convenience and adds workout filtering logic
 */

import { formatDate as formatDateUtil, getWeekDates as getWeekDatesUtil, getMonthDates } from './date-utils';

// Re-export date utils with logbook-friendly names
export const formatLocalDate = formatDateUtil;
export const getWeekDates = getWeekDatesUtil;
export const getMonthCalendarDays = getMonthDates;

/**
 * Interface for WOD structure
 */
export interface WOD {
  id: string;
  title: string;
  date: string;
  tracks?: { name: string; color: string };
  workout_types?: { name: string };
  sections: Array<{ id: string; type: string; content: string; duration?: string }>;
  published_section_ids?: string[];
  attended?: boolean;
  booked?: boolean;
}

/**
 * Get published sections for a workout
 * Filters sections based on published_section_ids array
 * @param wod - Workout object
 * @returns Array of published sections only, or all sections if no filter
 */
export const getPublishedSections = (wod: WOD) => {
  if (!wod.published_section_ids || wod.published_section_ids.length === 0) {
    return wod.sections;
  }
  return wod.sections.filter(section =>
    wod.published_section_ids?.includes(section.id)
  );
};
