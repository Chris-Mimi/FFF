import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useWorkoutTypesCrud() {
  const [workoutTypes, setWorkoutTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingWorkoutTypes, setLoadingWorkoutTypes] = useState(true);

  const fetchWorkoutTypes = async () => {
    setLoadingWorkoutTypes(true);
    const { data, error } = await supabase
      .from('workout_types')
      .select('id, name')
      .order('name');

    if (error) {
      console.error('Error fetching workout types:', error);
    } else {
      setWorkoutTypes(data || []);
    }
    setLoadingWorkoutTypes(false);
  };

  return {
    workoutTypes,
    loadingWorkoutTypes,
    fetchWorkoutTypes,
  };
}
