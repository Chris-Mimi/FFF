/**
 * localStorage utility for recently used exercises
 * Stores last 10 exercises used by coach for quick access
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

/**
 * React hook for managing recent exercises
 */
import { useEffect, useState } from 'react';

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
