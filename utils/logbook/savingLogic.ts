import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface SectionResult {
  time_result?: string;
  reps_result?: string;
  weight_result?: string;
  weight_result_2?: string;
  scaling_level?: 'Rx' | 'Sc1' | 'Sc2' | 'Sc3' | '';
  rounds_result?: string;
  calories_result?: string;
  metres_result?: string;
  task_completed?: boolean;
}

/**
 * Save section result to database (atomic upsert using unique constraint)
 */
export async function saveSectionResult(
  userId: string,
  wodId: string,
  sectionId: string,
  result: SectionResult,
  workoutDate: string
): Promise<void> {
  // Don't save if all fields are empty
  if (!result.time_result && !result.reps_result && !result.weight_result && !result.weight_result_2 &&
      !result.scaling_level && !result.rounds_result && !result.calories_result &&
      !result.metres_result && result.task_completed === undefined) {
    return;
  }

  try {
    // Refresh auth token before write to prevent stale JWT RLS failures
    await supabase.auth.getUser();

    // Validate realistic ranges
    const parsedReps = result.reps_result ? parseInt(result.reps_result) : null;
    const parsedWeight = result.weight_result ? parseFloat(result.weight_result) : null;
    const parsedWeight2 = result.weight_result_2 ? parseFloat(result.weight_result_2) : null;
    const parsedRounds = result.rounds_result ? parseInt(result.rounds_result) : null;
    const parsedCalories = result.calories_result ? parseInt(result.calories_result) : null;
    const parsedMetres = result.metres_result ? parseFloat(result.metres_result) : null;

    if (parsedReps !== null && (parsedReps < 0 || parsedReps > 10000)) throw new Error('Reps must be between 0 and 10,000');
    if (parsedWeight !== null && (parsedWeight < 0 || parsedWeight > 500)) throw new Error('Weight must be between 0 and 500 kg');
    if (parsedWeight2 !== null && (parsedWeight2 < 0 || parsedWeight2 > 500)) throw new Error('Weight 2 must be between 0 and 500 kg');
    if (parsedRounds !== null && (parsedRounds < 0 || parsedRounds > 1000)) throw new Error('Rounds must be between 0 and 1,000');
    if (parsedCalories !== null && (parsedCalories < 0 || parsedCalories > 10000)) throw new Error('Calories must be between 0 and 10,000');
    if (parsedMetres !== null && (parsedMetres < 0 || parsedMetres > 100000)) throw new Error('Metres must be between 0 and 100,000');

    // Block self-entry if coach has already recorded a score for this athlete
    const { data: coachScore } = await supabase
      .from('wod_section_results')
      .select('id')
      .eq('member_id', userId)
      .eq('wod_id', wodId)
      .eq('section_id', sectionId)
      .eq('workout_date', workoutDate)
      .not('member_id', 'is', null)
      .maybeSingle();

    if (coachScore) {
      throw new Error('Your coach has already recorded your score for this section. Use "Query Score" if you believe it\'s incorrect.');
    }

    // Atomic upsert — relies on unique index (user_id, wod_id, section_id, workout_date)
    const { error } = await supabase
      .from('wod_section_results')
      .upsert({
        user_id: userId,
        wod_id: wodId,
        section_id: sectionId,
        workout_date: workoutDate,
        time_result: result.time_result || null,
        reps_result: parsedReps,
        weight_result: parsedWeight,
        weight_result_2: parsedWeight2,
        scaling_level: result.scaling_level || null,
        rounds_result: parsedRounds,
        calories_result: parsedCalories,
        metres_result: parsedMetres,
        task_completed: result.task_completed || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,wod_id,section_id,workout_date',
      });

    if (error) {
      console.error('Error saving section result:', error.message, error.code, error.details, error.hint);
      throw new Error(error.message || 'Save failed');
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : JSON.stringify(error);
    if (!msg.includes('coach has already recorded')) {
      console.error('Error saving section result:', error);
      toast.error(`Failed to save section result: ${msg}`);
    }
    throw error;
  }
}
