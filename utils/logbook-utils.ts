/**
 * Logbook-specific utility functions
 * Re-exports date utilities for convenience and adds workout filtering logic
 */

import { formatDate as formatDateUtil, getWeekDates as getWeekDatesUtil, getMonthDates } from './date-utils';
import type { ConfiguredLift, ConfiguredBenchmark, ConfiguredForgeBenchmark } from '@/types/movements';

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
  session_type?: string;
  workout_name?: string;
  date: string;
  time?: string;
  tracks?: { name: string; color: string };
  workout_types?: { name: string };
  sections: Array<{
    id: string;
    type: string;
    content: string;
    duration?: string;
    lifts?: ConfiguredLift[];
    benchmarks?: ConfiguredBenchmark[];
    forge_benchmarks?: ConfiguredForgeBenchmark[];
    scoring_fields?: {
      time?: boolean;
      reps?: boolean;
      rounds_reps?: boolean;
      load?: boolean;
      calories?: boolean;
      metres?: boolean;
      checkbox?: boolean;
      scaling?: boolean;
    };
  }>;
  publish_sections?: string[];
  attended?: boolean;
  booked?: boolean;
}

/**
 * Get published sections for a workout
 * Filters sections based on publish_sections array
 * @param wod - Workout object
 * @returns Array of published sections only, or all sections if no filter
 */
const ALL_SECTIONS_USER_IDS = [
  '84280ec0-7cc6-40e2-818b-d8843c30ce29', // Chris
  'fc5b34d5-e3f2-42ea-b029-c5994b2cf610', // Mimi
];

export const getPublishedSections = (wod: WOD, userId?: string) => {
  // Coach/Mimi accounts see all sections
  if (userId && ALL_SECTIONS_USER_IDS.includes(userId)) {
    return wod.sections;
  }
  if (!wod.publish_sections || wod.publish_sections.length === 0) {
    return wod.sections;
  }
  return wod.sections.filter(section =>
    wod.publish_sections?.includes(section.id)
  );
};
