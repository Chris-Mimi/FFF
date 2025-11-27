import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export interface UserFavorite {
  id: string;
  user_id: string;
  exercise_id: string;
  created_at: string;
}

export interface ExerciseWithFavorite {
  id: string;
  name: string;
  display_name?: string;
  category: string;
  subcategory?: string;
  description: string | null;
  video_url: string | null;
  tags: string[] | null;
  equipment?: string[] | null;
  body_parts?: string[] | null;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  is_warmup?: boolean;
  is_stretch?: boolean;
  search_terms?: string;
  is_favorited?: boolean;
  favorited_at?: string;
}

/**
 * Get all favorites for current user
 */
export async function getUserFavorites(): Promise<UserFavorite[]> {
  const { data, error } = await supabase
    .from('user_exercise_favorites')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user favorites:', error);
    return [];
  }

  return data || [];
}

/**
 * Get favorite exercises with full exercise data
 */
export async function getFavoriteExercises(): Promise<ExerciseWithFavorite[]> {
  const { data, error } = await supabase
    .from('user_exercise_favorites')
    .select(`
      id,
      created_at,
      exercise_id,
      exercises (*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching favorite exercises:', error);
    return [];
  }

  // Transform the data to include favorited_at
  return (data || []).map((fav: any) => ({
    ...fav.exercises,
    is_favorited: true,
    favorited_at: fav.created_at,
  }));
}

/**
 * Check if an exercise is favorited by current user
 */
export async function isExerciseFavorited(exerciseId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_exercise_favorites')
    .select('id')
    .eq('exercise_id', exerciseId)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    console.error('Error checking favorite status:', error);
  }

  return !!data;
}

/**
 * Add exercise to favorites
 */
export async function addFavorite(exerciseId: string): Promise<{ success: boolean; error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not authenticated' };
  }

  const { error } = await supabase.from('user_exercise_favorites').insert({
    user_id: user.id,
    exercise_id: exerciseId,
  });

  if (error) {
    // Check if already favorited (unique constraint violation)
    if (error.code === '23505') {
      return { success: true }; // Already favorited, treat as success
    }
    console.error('Error adding favorite:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Remove exercise from favorites
 */
export async function removeFavorite(exerciseId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('user_exercise_favorites')
    .delete()
    .eq('exercise_id', exerciseId);

  if (error) {
    console.error('Error removing favorite:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Toggle favorite status for an exercise
 */
export async function toggleFavorite(
  exerciseId: string,
  currentlyFavorited: boolean
): Promise<{ success: boolean; newStatus: boolean; error?: string }> {
  if (currentlyFavorited) {
    const result = await removeFavorite(exerciseId);
    return { ...result, newStatus: false };
  } else {
    const result = await addFavorite(exerciseId);
    return { ...result, newStatus: true };
  }
}

/**
 * React hook for managing user favorites
 */
export function useUserFavorites() {
  const [favorites, setFavorites] = useState<ExerciseWithFavorite[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load favorites on mount
  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    setLoading(true);
    setError(null);

    const data = await getFavoriteExercises();
    setFavorites(data);
    setFavoriteIds(new Set(data.map((ex) => ex.id)));
    setLoading(false);
  };

  const toggleFavoriteOptimistic = async (exerciseId: string) => {
    const isFavorited = favoriteIds.has(exerciseId);

    // Optimistic update
    const newFavoriteIds = new Set(favoriteIds);
    if (isFavorited) {
      newFavoriteIds.delete(exerciseId);
      setFavorites((prev) => prev.filter((ex) => ex.id !== exerciseId));
    } else {
      newFavoriteIds.add(exerciseId);
      // Note: We don't add to favorites array here since we don't have full exercise data
      // It will be added on next refresh
    }
    setFavoriteIds(newFavoriteIds);

    // Perform actual database operation
    const result = await toggleFavorite(exerciseId, isFavorited);

    if (!result.success) {
      // Revert optimistic update on error
      setError(result.error || 'Failed to update favorite');
      setFavoriteIds(favoriteIds);
      if (!isFavorited) {
        setFavorites((prev) => prev.filter((ex) => ex.id !== exerciseId));
      }
      // Reload to ensure consistency
      loadFavorites();
    } else if (!isFavorited) {
      // Refresh favorites to get full data for newly added favorite
      loadFavorites();
    }

    return result;
  };

  return {
    favorites,
    favoriteIds,
    loading,
    error,
    isFavorited: (exerciseId: string) => favoriteIds.has(exerciseId),
    toggleFavorite: toggleFavoriteOptimistic,
    refreshFavorites: loadFavorites,
  };
}
