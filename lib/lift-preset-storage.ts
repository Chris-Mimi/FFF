/**
 * Supabase-backed named rep-scheme presets, scoped per barbell lift.
 * Mirrors useSessionTypeGroups in lib/session-type-storage.ts. Syncs across the
 * coach's machines/profiles. A preset stores the full sets/reps configuration
 * (constant, variable, or RM test) so it can be re-applied in one click when
 * programming that lift again — e.g. Bench Press "3RM" or "Build 5x5 @80%".
 */

import { supabase } from '@/lib/supabase';
import { useEffect, useState, useCallback } from 'react';
import type { VariableSet } from '@/types/movements';

export interface LiftPresetConfig {
  rep_type: 'constant' | 'variable';
  sets?: number;
  reps?: number;
  percentage_1rm?: number;
  variable_sets?: VariableSet[];
  rm_test?: '1RM' | '3RM' | '5RM' | '10RM';
}

export interface LiftPreset {
  id: string;
  lift_id: string;
  name: string;
  config: LiftPresetConfig;
}

export function useLiftPresets() {
  const [presets, setPresets] = useState<LiftPreset[]>([]);

  const loadPresets = useCallback(async () => {
    const { data, error } = await supabase
      .from('lift_rep_scheme_presets')
      .select('id, lift_id, name, config')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading lift presets:', error);
      return;
    }

    setPresets(data || []);
  }, []);

  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  const savePreset = useCallback(async (liftId: string, name: string, config: LiftPresetConfig) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Upsert on (user_id, lift_id, name) so re-saving the same name updates it
    // rather than erroring on the unique constraint.
    const { error } = await supabase
      .from('lift_rep_scheme_presets')
      .upsert(
        { user_id: user.id, lift_id: liftId, name, config },
        { onConflict: 'user_id,lift_id,name' }
      );

    if (error) {
      console.error('Error saving lift preset:', error);
      throw error;
    }

    await loadPresets();
  }, [loadPresets]);

  const deletePreset = useCallback(async (presetId: string) => {
    setPresets(prev => prev.filter(p => p.id !== presetId));

    const { error } = await supabase
      .from('lift_rep_scheme_presets')
      .delete()
      .eq('id', presetId);

    if (error) {
      console.error('Error deleting lift preset:', error);
      loadPresets();
    }
  }, [loadPresets]);

  return { presets, savePreset, deletePreset };
}
