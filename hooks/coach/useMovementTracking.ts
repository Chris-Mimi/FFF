'use client';

import { supabase } from '@/lib/supabase';
import { extractMovementsFromWod } from '@/utils/movement-extraction';
import { WODFormData } from '@/components/coach/WorkoutModal';
import type { TrackedExercise } from '@/lib/exercise-storage';
import { useEffect, useState, useRef, useCallback } from 'react';

export interface TrackingData {
  // member_id -> exercise_name -> count
  [memberId: string]: Record<string, number>;
}

export interface LastPerformedData {
  // member_id -> exercise_name -> date string (YYYY-MM-DD) or null
  [memberId: string]: Record<string, string | null>;
}

// exercise_name -> most recent date (YYYY-MM-DD) across ALL published wods
export type GlobalLastProgrammedData = Record<string, string | null>;

interface UseMovementTrackingProps {
  selectedMembers: string[];
  trackedExercises: TrackedExercise[];
  exerciseNames: Set<string>;
}

export function useMovementTracking({
  selectedMembers,
  trackedExercises,
  exerciseNames,
}: UseMovementTrackingProps) {
  const [trackingData, setTrackingData] = useState<TrackingData>({});
  const [lastPerformedData, setLastPerformedData] = useState<LastPerformedData>({});
  const [globalLastProgrammed, setGlobalLastProgrammed] = useState<GlobalLastProgrammedData>({});
  const [loading, setLoading] = useState(false);
  const wodMovementCache = useRef<Map<string, Set<string>>>(new Map());
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  // Helper: extract movements per wod (memoized)
  const getWodMovements = useCallback((wodId: string, wod: WODFormData): Set<string> => {
    if (wodMovementCache.current.has(wodId)) {
      return wodMovementCache.current.get(wodId)!;
    }
    const knownNames = exerciseNames.size > 0 ? exerciseNames : undefined;
    const movs = extractMovementsFromWod(wod, knownNames);
    wodMovementCache.current.set(wodId, movs);
    return movs;
  }, [exerciseNames]);

  // Compute global last-programmed dates (independent of athlete selection)
  const computeGlobal = useCallback(async () => {
    if (trackedExercises.length === 0) {
      setGlobalLastProgrammed({});
      return;
    }

    const trackedNames = trackedExercises.map(e => e.display_name || e.name);

    // Fetch ALL published wods
    const { data: sessions, error } = await supabase
      .from('weekly_sessions')
      .select(`
        id,
        date,
        wods!inner (
          id,
          title,
          sections,
          workout_publish_status
        )
      `)
      .eq('wods.workout_publish_status', 'published');

    if (error) {
      console.error('Error fetching global wods:', error);
      return;
    }

    const globalDates: GlobalLastProgrammedData = {};
    trackedNames.forEach(name => { globalDates[name] = null; });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sessions?.forEach((s: any) => {
      const wod = s.wods;
      if (!wod) return;
      const wodData: WODFormData = {
        id: wod.id,
        title: wod.title,
        date: s.date,
        sections: wod.sections || [],
        classTimes: [],
        maxCapacity: 0,
      };
      const wodMovs = getWodMovements(wod.id, wodData);
      const wodMovsLower = new Set(Array.from(wodMovs).map(m => m.toLowerCase()));
      trackedNames.forEach(name => {
        if (wodMovsLower.has(name.toLowerCase())) {
          if (!globalDates[name] || s.date > globalDates[name]!) {
            globalDates[name] = s.date;
          }
        }
      });
    });

    setGlobalLastProgrammed(globalDates);
  }, [trackedExercises, getWodMovements]);

  const computeTracking = useCallback(async () => {
    if (trackedExercises.length === 0) {
      setTrackingData({});
      setLastPerformedData({});
      return;
    }

    if (selectedMembers.length === 0) {
      setTrackingData({});
      setLastPerformedData({});
      return;
    }

    setLoading(true);
    try {
      // Step 1: Get all confirmed bookings for selected athletes
      const { data: bookings, error: bErr } = await supabase
        .from('bookings')
        .select('member_id, session_id')
        .in('member_id', selectedMembers)
        .eq('status', 'confirmed');

      if (bErr) throw bErr;
      if (!bookings || bookings.length === 0) {
        setTrackingData({});
        setLastPerformedData({});
        setLoading(false);
        return;
      }

      // Group session IDs per member
      const memberSessions: Record<string, Set<string>> = {};
      const allSessionIds = new Set<string>();
      bookings.forEach(b => {
        if (!memberSessions[b.member_id]) memberSessions[b.member_id] = new Set();
        memberSessions[b.member_id].add(b.session_id);
        allSessionIds.add(b.session_id);
      });

      // Step 2: Fetch wods for those sessions (only published)
      const sessionIdArr = [...allSessionIds];
      const batchSize = 200;
      const allWodsBySession: Record<string, WODFormData> = {};

      for (let i = 0; i < sessionIdArr.length; i += batchSize) {
        const batch = sessionIdArr.slice(i, i + batchSize);
        const { data: sessions, error: sErr } = await supabase
          .from('weekly_sessions')
          .select(`
            id,
            date,
            wods!inner (
              id,
              title,
              sections,
              workout_publish_status
            )
          `)
          .in('id', batch)
          .eq('wods.workout_publish_status', 'published');

        if (sErr) throw sErr;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sessions?.forEach((s: any) => {
          const wod = s.wods;
          if (wod) {
            allWodsBySession[s.id] = {
              id: wod.id,
              title: wod.title,
              date: s.date,
              sections: wod.sections || [],
              classTimes: [],
              maxCapacity: 0,
            };
          }
        });
      }

      // Step 3: Cross-reference per athlete (case-insensitive)
      const trackedNames = trackedExercises.map(e => e.display_name || e.name);
      const result: TrackingData = {};
      const lastDates: LastPerformedData = {};

      for (const memberId of selectedMembers) {
        const counts: Record<string, number> = {};
        const dates: Record<string, string | null> = {};
        trackedNames.forEach(name => { counts[name] = 0; dates[name] = null; });

        const sessions = memberSessions[memberId];
        if (sessions) {
          sessions.forEach(sessionId => {
            const wod = allWodsBySession[sessionId];
            if (!wod) return;
            const wodMovs = getWodMovements(wod.id!, wod);
            const wodMovsLower = new Set(Array.from(wodMovs).map(m => m.toLowerCase()));
            trackedNames.forEach(name => {
              if (wodMovsLower.has(name.toLowerCase())) {
                counts[name]++;
                const wodDate = wod.date;
                if (wodDate && (!dates[name] || wodDate > dates[name]!)) {
                  dates[name] = wodDate;
                }
              }
            });
          });
        }
        result[memberId] = counts;
        lastDates[memberId] = dates;
      }

      setTrackingData(result);
      setLastPerformedData(lastDates);
    } catch (error) {
      console.error('Error computing movement tracking:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedMembers, trackedExercises, getWodMovements]);

  // Compute global last-programmed (runs whenever tracked exercises change, independent of athletes)
  useEffect(() => {
    computeGlobal();
  }, [computeGlobal]);

  // Debounced trigger for per-athlete tracking
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(computeTracking, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [computeTracking]);

  return { trackingData, lastPerformedData, globalLastProgrammed, loading };
}
