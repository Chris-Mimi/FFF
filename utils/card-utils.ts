import { WODFormData } from '@/components/coach/WorkoutModal';

export type CardState = 'empty' | 'draft-default' | 'draft' | 'published';

/**
 * Check if a draft workout is still in its default/untouched state
 * (all sections have empty content and no structured data)
 */
const isDefaultDraft = (wod: WODFormData): boolean => {
  if (!wod.sections || wod.sections.length === 0) return true;
  return wod.sections.every(
    (s) =>
      !s.content?.trim() &&
      (!s.lifts || s.lifts.length === 0) &&
      (!s.benchmarks || s.benchmarks.length === 0) &&
      (!s.forge_benchmarks || s.forge_benchmarks.length === 0)
  );
};

/**
 * Determine visual state of a WOD card based on publish status
 * @param wod - WOD data
 * @returns Card state (empty, draft-default, draft, or published)
 */
export const getCardState = (wod: WODFormData): CardState => {
  if (!wod.workout_publish_status) return 'empty'; // No workout content
  if (wod.workout_publish_status === 'draft') {
    return isDefaultDraft(wod) ? 'draft-default' : 'draft';
  }
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
  if (state === 'draft-default') return 'bg-gray-200 border-2 border-gray-300';
  if (state === 'draft') return 'bg-gray-400 border-2 border-gray-500';

  const tier = getSessionTier(title);
  if (tier === 'kids') return 'bg-teal-400 border-2 border-teal-500 text-white';
  if (tier === 'foundations') return 'bg-[#3092a6] border-2 border-teal-700 text-white';
  return 'bg-teal-700 border-2 border-teal-300'; // standard (WOD, Endurance, etc.)
};
