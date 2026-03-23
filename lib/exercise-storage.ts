/**
 * localStorage utilities for coach exercise preferences
 * - Recently used exercises (last 10)
 * - Custom tracked movements (unlimited, persistent)
 */

const STORAGE_KEY = 'coach_recent_exercises';
const MAX_RECENT = 10;

export interface RecentExercise {
  id: string;
  name: string;
  display_name?: string;
  category: string;
  used_at: string; // ISO timestamp
}

/**
 * Get recently used exercises from localStorage
 */
export function getRecentExercises(): RecentExercise[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const recent: RecentExercise[] = JSON.parse(stored);
    return recent.sort((a, b) => new Date(b.used_at).getTime() - new Date(a.used_at).getTime());
  } catch (error) {
    console.error('Error loading recent exercises:', error);
    return [];
  }
}

/**
 * Add exercise to recently used list
 * Automatically maintains max size and removes duplicates
 */
export function addRecentExercise(exercise: {
  id: string;
  name: string;
  display_name?: string;
  category: string;
}): void {
  if (typeof window === 'undefined') return;

  try {
    const recent = getRecentExercises();

    // Remove existing entry if present (to avoid duplicates)
    const filtered = recent.filter((ex) => ex.id !== exercise.id);

    // Add new entry at the beginning
    const updated: RecentExercise[] = [
      {
        ...exercise,
        used_at: new Date().toISOString(),
      },
      ...filtered,
    ].slice(0, MAX_RECENT); // Keep only last MAX_RECENT

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error adding recent exercise:', error);
  }
}

/**
 * Clear all recently used exercises
 */
export function clearRecentExercises(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing recent exercises:', error);
  }
}

/**
 * Check if exercise is in recent list
 */
export function isRecentExercise(exerciseId: string): boolean {
  const recent = getRecentExercises();
  return recent.some((ex) => ex.id === exerciseId);
}

/**
 * Remove specific exercise from recent list
 */
export function removeRecentExercise(exerciseId: string): void {
  if (typeof window === 'undefined') return;

  try {
    const recent = getRecentExercises();
    const filtered = recent.filter((ex) => ex.id !== exerciseId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing recent exercise:', error);
  }
}

// --- Custom Tracked Movements (Supabase-backed, syncs across profiles/devices) ---

import { supabase } from '@/lib/supabase';
import { useEffect, useState, useCallback } from 'react';

export interface TrackedExercise {
  id: string;
  name: string;
  display_name?: string;
  category: string;
  active?: boolean;
}

/**
 * React hook for managing recent exercises
 */

export function useRecentExercises() {
  const [recentExercises, setRecentExercises] = useState<RecentExercise[]>([]);

  useEffect(() => {
    // Load on mount
    setRecentExercises(getRecentExercises());

    // Listen for storage changes (in case another tab updates it)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setRecentExercises(getRecentExercises());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const addRecent = (exercise: {
    id: string;
    name: string;
    display_name?: string;
    category: string;
  }) => {
    addRecentExercise(exercise);
    setRecentExercises(getRecentExercises());
  };

  const removeRecent = (exerciseId: string) => {
    removeRecentExercise(exerciseId);
    setRecentExercises(getRecentExercises());
  };

  const clearRecent = () => {
    clearRecentExercises();
    setRecentExercises([]);
  };

  return {
    recentExercises,
    addRecent,
    removeRecent,
    clearRecent,
  };
}

export function useTrackedExercises() {
  const [trackedExercises, setTrackedExercises] = useState<TrackedExercise[]>([]);

  const loadTracked = useCallback(async () => {
    const { data, error } = await supabase
      .from('coach_tracked_exercises')
      .select(`
        exercise_id,
        active,
        exercises (id, name, display_name, category)
      `)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading tracked exercises:', error);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exercises: TrackedExercise[] = (data || []).map((row: any) => ({
      id: row.exercises.id,
      name: row.exercises.name,
      display_name: row.exercises.display_name,
      category: row.exercises.category,
      active: row.active,
    }));
    exercises.sort((a, b) => (a.display_name || a.name).localeCompare(b.display_name || b.name));
    setTrackedExercises(exercises);
  }, []);

  useEffect(() => {
    loadTracked();
  }, [loadTracked]);

  const addTracked = useCallback(async (exercise: TrackedExercise) => {
    // Optimistic update
    setTrackedExercises(prev => {
      if (prev.some(ex => ex.id === exercise.id)) return prev;
      const next = [...prev, { ...exercise, active: true }];
      next.sort((a, b) => (a.display_name || a.name).localeCompare(b.display_name || b.name));
      return next;
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('coach_tracked_exercises')
      .upsert({ user_id: user.id, exercise_id: exercise.id, active: true }, { onConflict: 'user_id,exercise_id' });

    if (error) {
      console.error('Error adding tracked exercise:', error);
      loadTracked(); // Revert on error
    }
  }, [loadTracked]);

  const removeTracked = useCallback(async (exerciseId: string) => {
    // Optimistic update
    setTrackedExercises(prev => prev.filter(ex => ex.id !== exerciseId));

    const { error } = await supabase
      .from('coach_tracked_exercises')
      .delete()
      .eq('exercise_id', exerciseId);

    if (error) {
      console.error('Error removing tracked exercise:', error);
      loadTracked();
    }
  }, [loadTracked]);

  const toggleTracked = useCallback(async (exerciseId: string) => {
    // Optimistic update
    let newActive = true;
    setTrackedExercises(prev => prev.map(ex => {
      if (ex.id === exerciseId) {
        newActive = !ex.active;
        return { ...ex, active: newActive };
      }
      return ex;
    }));

    const { error } = await supabase
      .from('coach_tracked_exercises')
      .update({ active: newActive })
      .eq('exercise_id', exerciseId);

    if (error) {
      console.error('Error toggling tracked exercise:', error);
      loadTracked();
    }
  }, [loadTracked]);

  const batchSetActive = useCallback(async (exerciseIds: string[], active: boolean) => {
    if (exerciseIds.length === 0) return;

    // Optimistic update
    setTrackedExercises(prev => prev.map(ex =>
      exerciseIds.includes(ex.id) ? { ...ex, active } : ex
    ));

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('coach_tracked_exercises')
      .update({ active })
      .eq('user_id', user.id)
      .in('exercise_id', exerciseIds);

    if (error) {
      console.error('Error batch updating tracked exercises:', error);
      loadTracked();
    }
  }, [loadTracked]);

  const deactivateAll = useCallback(async () => {
    // Optimistic update
    setTrackedExercises(prev => prev.map(ex => ({ ...ex, active: false })));

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('coach_tracked_exercises')
      .update({ active: false })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deactivating tracked exercises:', error);
      loadTracked();
    }
  }, [loadTracked]);

  return { trackedExercises, addTracked, removeTracked, toggleTracked, batchSetActive, deactivateAll };
}

// --- Exercise Groups (Supabase-backed, named presets of tracked exercises) ---

export interface ExerciseGroup {
  id: string;
  name: string;
  exercise_ids: string[];
  active: boolean;
  display_order: number;
}

export function useExerciseGroups() {
  const [groups, setGroups] = useState<ExerciseGroup[]>([]);

  const loadGroups = useCallback(async () => {
    const { data, error } = await supabase
      .from('exercise_groups')
      .select('id, name, exercise_ids, active, display_order')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading exercise groups:', error);
      return;
    }

    setGroups(data || []);
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const createGroup = useCallback(async (name: string, exerciseIds: string[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newGroup: ExerciseGroup = {
      id: crypto.randomUUID(),
      name,
      exercise_ids: exerciseIds,
      active: false,
      display_order: groups.length,
    };

    // Optimistic update
    setGroups(prev => [...prev, newGroup]);

    const { error } = await supabase
      .from('exercise_groups')
      .insert({
        user_id: user.id,
        name,
        exercise_ids: exerciseIds,
        active: false,
        display_order: groups.length,
      });

    if (error) {
      console.error('Error creating exercise group:', error);
      loadGroups();
    }
  }, [groups.length, loadGroups]);

  const deleteGroup = useCallback(async (groupId: string) => {
    // Optimistic update
    setGroups(prev => prev.filter(g => g.id !== groupId));

    const { error } = await supabase
      .from('exercise_groups')
      .delete()
      .eq('id', groupId);

    if (error) {
      console.error('Error deleting exercise group:', error);
      loadGroups();
    }
  }, [loadGroups]);

  const renameGroup = useCallback(async (groupId: string, name: string) => {
    // Optimistic update
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, name } : g));

    const { error } = await supabase
      .from('exercise_groups')
      .update({ name })
      .eq('id', groupId);

    if (error) {
      console.error('Error renaming exercise group:', error);
      loadGroups();
    }
  }, [loadGroups]);

  const updateGroupExercises = useCallback(async (groupId: string, exerciseIds: string[]) => {
    // Optimistic update
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, exercise_ids: exerciseIds } : g));

    const { error } = await supabase
      .from('exercise_groups')
      .update({ exercise_ids: exerciseIds })
      .eq('id', groupId);

    if (error) {
      console.error('Error updating exercise group:', error);
      loadGroups();
    }
  }, [loadGroups]);

  const toggleGroupActive = useCallback(async (groupId: string) => {
    let newActive = true;
    setGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        newActive = !g.active;
        return { ...g, active: newActive };
      }
      return g;
    }));

    const { error } = await supabase
      .from('exercise_groups')
      .update({ active: newActive })
      .eq('id', groupId);

    if (error) {
      console.error('Error toggling exercise group:', error);
      loadGroups();
    }

    // Return the group info so caller can batch-activate/deactivate exercises
    const group = groups.find(g => g.id === groupId);
    return { exerciseIds: group?.exercise_ids || [], active: newActive };
  }, [groups, loadGroups]);

  const deactivateAllGroups = useCallback(async () => {
    // Optimistic update
    setGroups(prev => prev.map(g => ({ ...g, active: false })));

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('exercise_groups')
      .update({ active: false })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deactivating all groups:', error);
      loadGroups();
    }
  }, [loadGroups]);

  const removeExerciseFromAllGroups = useCallback(async (exerciseId: string) => {
    const affectedGroups = groups.filter(g => g.exercise_ids.includes(exerciseId));
    if (affectedGroups.length === 0) return;

    // Optimistic update
    setGroups(prev => prev.map(g => ({
      ...g,
      exercise_ids: g.exercise_ids.filter(id => id !== exerciseId),
    })));

    // Update each affected group in DB
    for (const group of affectedGroups) {
      const updatedIds = group.exercise_ids.filter(id => id !== exerciseId);
      await supabase
        .from('exercise_groups')
        .update({ exercise_ids: updatedIds })
        .eq('id', group.id);
    }
  }, [groups]);

  return {
    groups,
    createGroup,
    deleteGroup,
    renameGroup,
    updateGroupExercises,
    toggleGroupActive,
    deactivateAllGroups,
    removeExerciseFromAllGroups,
  };
}
