/**
 * Loads an athlete's whole workout history for the Logbook search.
 *
 * Deliberately NOT reusing `useLogbookData`'s `filterUserWorkouts`: that runs two
 * queries per workout (session lookup + booking lookup), which is fine for one day and
 * ruinous across a full history. This does four bulk, paginated reads instead.
 *
 * Paginated because `bookings` (4,400+), `wod_section_results` (3,700+) and `wods` are
 * all growing tables sitting in front of PostgREST's silent 1000-row cap — see
 * `memory-bank/claude-rules.md`.
 *
 * Loads once, on first open, and holds the result for the session.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  buildHistoryEntries,
  collectTerms,
  type HistoryEntry,
  type HistoryScoreRow,
  type HistoryWod,
  type TermCount,
} from '@/utils/athlete-history-search';

const PAGE = 1000;

/** Page through a growing table, applying `build` to each page's query. */
async function fetchAllRows<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

/** Supabase `.in()` has a practical URL-length ceiling; chunk long id lists. */
async function fetchByIds<T>(
  ids: string[],
  chunk: number,
  build: (slice: string[]) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const rows: T[] = [];
  for (let i = 0; i < ids.length; i += chunk) {
    const { data, error } = await build(ids.slice(i, i + chunk));
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
  }
  return rows;
}

export interface UseHistorySearchResult {
  entries: HistoryEntry[];
  terms: TermCount[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useHistorySearch(
  userId: string,
  enabled: boolean
): UseHistorySearchResult {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [terms, setTerms] = useState<TermCount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedFor = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Every session this athlete was confirmed into.
      const bookings = await fetchAllRows<{ session_id: string }>((from, to) =>
        supabase
          .from('bookings')
          .select('session_id')
          .eq('member_id', userId)
          .eq('status', 'confirmed')
          .range(from, to)
      );
      const sessionIds = [...new Set(bookings.map((b) => b.session_id).filter(Boolean))];
      if (sessionIds.length === 0) {
        setEntries([]);
        setTerms([]);
        loadedFor.current = userId;
        return;
      }

      // 2. Those sessions → workout ids + times.
      const sessions = await fetchByIds<{
        id: string;
        workout_id: string | null;
        time: string | null;
      }>(sessionIds, 200, (slice) =>
        supabase.from('weekly_sessions').select('id, workout_id, time').in('id', slice)
      );

      const sessionTimes = new Map<string, string | null>();
      for (const s of sessions) {
        if (s.workout_id) sessionTimes.set(s.workout_id, s.time);
      }
      const wodIds = [...sessionTimes.keys()];
      if (wodIds.length === 0) {
        setEntries([]);
        setTerms([]);
        loadedFor.current = userId;
        return;
      }

      // 3. The workouts themselves, and 4. this athlete's own scores.
      //    `publish_sections` decides which sections are searchable at all.
      const [wods, scores] = await Promise.all([
        fetchByIds<HistoryWod>(wodIds, 100, (slice) =>
          supabase
            .from('wods')
            .select('id, date, title, workout_name, session_type, sections, publish_sections')
            .in('id', slice)
        ),
        fetchByIds<HistoryScoreRow>(wodIds, 100, (slice) =>
          supabase
            .from('wod_section_results')
            .select(
              'wod_id, section_id, time_result, reps_result, weight_result, weight_result_2, weight_result_3, rounds_result, calories_result, metres_result, scaling_level, scaling_level_2, scaling_level_3, track, task_completed, dnf'
            )
            .eq('member_id', userId)
            .in('wod_id', slice)
        ),
      ]);

      const built = buildHistoryEntries({ wods, sessionTimes, scores });
      setEntries(built);
      setTerms(collectTerms(built));
      loadedFor.current = userId;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      console.error('Error loading workout history:', message);
      setError('Could not load your workout history. Pull down to try again.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!enabled) return;
    if (loadedFor.current === userId) return;
    void load();
  }, [enabled, userId, load]);

  const reload = useCallback(() => {
    loadedFor.current = null;
    void load();
  }, [load]);

  return { entries, terms, loading, error, reload };
}
