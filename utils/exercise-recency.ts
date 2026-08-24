import { getExerciseFrequency } from '@/utils/movement-analytics';

// ============================================================================
// Exercise recency bands — the single source of truth for the "how long since I
// last programmed this?" colour coding. Used by the Planner pattern chips AND the
// Movement Library popup in the workout create/edit modal, so the two surfaces can
// never drift apart. Bands (days since last programmed):
//   ≤14 fresh · ≤28 recent · ≤60 aging · ≤90 stale · 90+ old · no date = never.
// "Never" is a genuine retire/never-used cue.
// ============================================================================

export type RecencyBand = 'never' | 'fresh' | 'recent' | 'aging' | 'stale' | 'old';

export function exerciseRecencyBand(date: string | undefined | null): RecencyBand {
  if (!date) return 'never';
  const days = Math.floor((Date.now() - new Date(date + 'T00:00:00').getTime()) / 86400000);
  if (days <= 14) return 'fresh';
  if (days <= 28) return 'recent';
  if (days <= 60) return 'aging';
  if (days <= 90) return 'stale';
  return 'old';
}

// Pill/background classes — used by the Planner chips (dense bordered pills).
const RECENCY_PILL_CLASS: Record<RecencyBand, string> = {
  never: 'bg-gray-500 text-white border-gray-500',
  fresh: 'bg-green-50 text-green-700 border-green-200',
  recent: 'bg-yellow-50 text-yellow-600 border-yellow-200',
  aging: 'bg-orange-50 text-orange-600 border-orange-200',
  stale: 'bg-red-50 text-red-700 border-red-200',
  old: 'bg-gray-100 text-gray-500 border-gray-200',
};

// Dot classes — used by the Movement Library list (a small leading dot keeps the
// dense catalogue readable; "never" is faint since most of the catalogue is unused).
const RECENCY_DOT_CLASS: Record<RecencyBand, string> = {
  never: 'bg-gray-300',
  fresh: 'bg-green-500',
  recent: 'bg-yellow-400',
  aging: 'bg-orange-400',
  stale: 'bg-red-500',
  old: 'bg-gray-400',
};

export function getExerciseRecencyPillColor(date: string | undefined | null): string {
  return RECENCY_PILL_CLASS[exerciseRecencyBand(date)];
}

export function getExerciseRecencyDotColor(date: string | undefined | null): string {
  return RECENCY_DOT_CLASS[exerciseRecencyBand(date)];
}

/** Short "1 Jan" style label, or "Never". Used in the Planner chip labels. */
export function formatExerciseDate(date: string | undefined | null): string {
  if (!date) return 'Never';
  return new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** Full tooltip sentence for a library row. */
export function formatExerciseRecency(date: string | undefined | null): string {
  if (!date) return 'Never programmed';
  const days = Math.floor((Date.now() - new Date(date + 'T00:00:00').getTime()) / 86400000);
  const when = new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const ago = days <= 0 ? 'today' : days === 1 ? '1 day ago' : `${days} days ago`;
  return `Last programmed ${when} (${ago})`;
}

// ----------------------------------------------------------------------------
// Session cache for the full-history recency map (exercise id → last-programmed
// ISO date). getExerciseFrequency() scans the entire published-workout history,
// so we run it ONCE per page session and share the promise across every popup
// open. The Planner pays the same cost on mount; this makes the library popup
// free after the first open.
// ----------------------------------------------------------------------------
let _recencyMapPromise: Promise<Map<string, string>> | null = null;

export function getExerciseRecencyMap(force = false): Promise<Map<string, string>> {
  if (!_recencyMapPromise || force) {
    _recencyMapPromise = getExerciseFrequency()
      .then((freqs) => {
        const map = new Map<string, string>();
        freqs.forEach((f) => {
          if (f.lastProgrammed) map.set(f.id, f.lastProgrammed);
        });
        return map;
      })
      .catch((err) => {
        _recencyMapPromise = null; // let a later open retry after a failed scan
        throw err;
      });
  }
  return _recencyMapPromise;
}
