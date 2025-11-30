import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface WorkoutLogEntry {
  result: string;
  notes: string;
  date: string;
}

interface UseWorkoutLoggingProps {
  userId: string;
  workoutLogs: Record<string, WorkoutLogEntry>;
}

interface UseWorkoutLoggingReturn {
  saveWorkoutLog: (wodId: string) => Promise<void>;
  isSaving: boolean;
}

export function useWorkoutLogging({
  userId,
  workoutLogs,
}: UseWorkoutLoggingProps): UseWorkoutLoggingReturn {
  const [isSaving, setIsSaving] = useState(false);

  const saveWorkoutLog = async (wodId: string) => {
    const log = workoutLogs[wodId];
    if (!log || (!log.result && !log.notes)) return;

    setIsSaving(true);
    try {
      const dateStr = log.date;

      // Check if a log already exists for this WOD and user
      const { data: existingLogs, error: fetchError } = await supabase
        .from('workout_logs')
        .select('id')
        .eq('wod_id', wodId)
        .eq('workout_date', dateStr)
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is fine
        throw fetchError;
      }

      if (existingLogs) {
        // Update existing log
        const { error } = await supabase
          .from('workout_logs')
          .update({
            result: log.result || null,
            notes: log.notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingLogs.id);

        if (error) throw error;
      } else {
        // Insert new log
        const { error } = await supabase.from('workout_logs').insert({
          user_id: userId,
          wod_id: wodId,
          workout_date: dateStr,
          result: log.result || null,
          notes: log.notes || null,
        });

        if (error) throw error;
      }

      alert('Workout log saved successfully!');
    } catch (error) {
      console.error('Error saving workout log:', error);
      alert('Failed to save workout log. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return {
    saveWorkoutLog,
    isSaving,
  };
}
