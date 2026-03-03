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
    setTrackedExercises(exercises);
  }, []);

  useEffect(() => {
    loadTracked();
  }, [loadTracked]);

  const addTracked = useCallback(async (exercise: TrackedExercise) => {
    // Optimistic update
    setTrackedExercises(prev => {
      if (prev.some(ex => ex.id === exercise.id)) return prev;
      return [...prev, { ...exercise, active: true }];
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

  return { trackedExercises, addTracked, removeTracked, toggleTracked, deactivateAll };
}
