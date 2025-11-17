import { WODFormData } from '@/components/coach/WorkoutModal';

export type CardState = 'empty' | 'draft' | 'published';

/**
 * Determine visual state of a WOD card based on publish status
 * @param wod - WOD data
 * @returns Card state (empty, draft, or published)
 */
export const getCardState = (wod: WODFormData): CardState => {
  if (!wod.workout_publish_status) return 'empty'; // No workout content
  if (wod.workout_publish_status === 'draft') return 'draft'; // Draft workout
  return 'published'; // Published workout
};

/**
 * Get Tailwind CSS classes for card styling based on state
 * @param state - Card state (empty, draft, or published)
 * @returns Tailwind CSS class string
 */
export const getCardClasses = (state: CardState): string => {
  if (state === 'empty') return 'bg-gray-200 border-2 border-dashed border-gray-400';
  if (state === 'draft') return 'bg-gray-400 border-2 border-gray-500';
  return 'bg-[#208479] border-2 border-[#1a6b62]'; // published - teal
};
