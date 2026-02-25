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

type SessionTier = 'standard' | 'foundations' | 'kids';

const FOUNDATIONS_KEYWORDS = ['foundations', 'diapers & dumbbells', 'diapers and dumbbells'];
const KIDS_KEYWORDS = ['kids', 'kids & teens', 'kids and teens', 'fitkids turnen', 'elternkind turnen'];

/**
 * Determine color tier based on session type title
 */
const getSessionTier = (title?: string): SessionTier => {
  if (!title) return 'standard';
  const lower = title.toLowerCase();
  if (KIDS_KEYWORDS.some((k) => lower === k)) return 'kids';
  if (FOUNDATIONS_KEYWORDS.some((k) => lower === k || lower.startsWith(k))) return 'foundations';
  return 'standard';
};

/**
 * Get Tailwind CSS classes for card styling based on state and session type
 * @param state - Card state (empty, draft, or published)
 * @param title - Session type title (e.g. "WOD", "Foundations", "Kids & Teens")
 * @returns Tailwind CSS class string
 */
export const getCardClasses = (state: CardState, title?: string): string => {
  if (state === 'empty') return 'bg-gray-200 border-2 border-dashed border-gray-400';
  if (state === 'draft') return 'bg-gray-400 border-2 border-gray-500';

  const tier = getSessionTier(title);
  if (tier === 'kids') return 'bg-teal-400 border-2 border-teal-500 text-white';
  if (tier === 'foundations') return 'bg-teal-500 border-2 border-teal-600 text-white';
  return 'bg-teal-700 border-2 border-teal-800'; // standard (WOD, Endurance, etc.)
};
