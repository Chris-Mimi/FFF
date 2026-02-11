import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface SectionResult {
  time_result?: string;
  reps_result?: string;
  weight_result?: string;
  scaling_level?: 'Rx' | 'Sc1' | 'Sc2' | 'Sc3' | '';
  rounds_result?: string;
  calories_result?: string;
  metres_result?: string;
  task_completed?: boolean;
}

/**
 * Save section result to database (upsert: update if exists, insert if new)
 */
export async function saveSectionResult(
  userId: string,
  wodId: string,
  sectionId: string,
  result: SectionResult,
  workoutDate: string
): Promise<void> {
  // Don't save if all fields are empty
  if (!result.time_result && !result.reps_result && !result.weight_result &&
      !result.scaling_level && !result.rounds_result && !result.calories_result &&
      !result.metres_result && result.task_completed === undefined) {
    return;
  }

  try {
    // First check if record exists
    const { data: existing } = await supabase
      .from('wod_section_results')
      .select('id')
      .eq('user_id', userId)
      .eq('wod_id', wodId)
      .eq('section_id', sectionId)
      .eq('workout_date', workoutDate)
      .maybeSingle();

    const payload = {
      time_result: result.time_result || null,
      reps_result: result.reps_result ? parseInt(result.reps_result) : null,
      weight_result: result.weight_result ? parseFloat(result.weight_result) : null,
      scaling_level: result.scaling_level || null,
      rounds_result: result.rounds_result ? parseInt(result.rounds_result) : null,
      calories_result: result.calories_result ? parseInt(result.calories_result) : null,
      metres_result: result.metres_result ? parseFloat(result.metres_result) : null,
      task_completed: result.task_completed || null,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from('wod_section_results')
        .update(payload)
        .eq('id', existing.id);

      if (error) {
        console.error('Error updating section result:', error);
        throw error;
      }
    } else {
      // Insert new record
      const { error } = await supabase
        .from('wod_section_results')
        .insert({
          ...payload,
          user_id: userId,
          wod_id: wodId,
          section_id: sectionId,
          workout_date: workoutDate,
        });

      if (error) {
        console.error('Error inserting section result:', error);
        throw error;
      }
    }
  } catch (error) {
    console.error('Error saving section result:', error);
    toast.error(`Failed to save section result: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
    throw error;
  }
}
