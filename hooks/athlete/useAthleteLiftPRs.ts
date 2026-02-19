'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Fetches the athlete's best 1RM (kg) per lift name.
 * Returns a map like { "Back Squat": 90, "Deadlift": 140 }.
 */
export function useAthleteLiftPRs(userId: string) {
  const [best1RMMap, setBest1RMMap] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!userId) return;

    async function fetch1RMs() {
      const { data, error } = await supabase
        .from('lift_records')
        .select('lift_name, weight_kg')
        .eq('user_id', userId)
        .eq('rep_max_type', '1RM');

      if (error || !data) return;

      // Group by lift_name, keep max weight_kg
      const map: Record<string, number> = {};
      for (const row of data) {
        const current = map[row.lift_name];
        if (current === undefined || row.weight_kg > current) {
          map[row.lift_name] = row.weight_kg;
        }
      }
      setBest1RMMap(map);
    }

    fetch1RMs();
  }, [userId]);

  return best1RMMap;
}

/** Round to nearest 0.5 kg (standard plate increments) */
export function roundToPlate(kg: number): number {
  return Math.round(kg * 2) / 2;
}
