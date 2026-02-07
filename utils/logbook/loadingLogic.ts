import { supabase } from '@/lib/supabase';
import { getPublishedSections, type WOD } from '@/utils/logbook-utils';

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
 * Load section results for WOD sections from database
 */
export async function loadSectionResults(
  userId: string,
  workoutDate: string
): Promise<Record<string, SectionResult>> {
  try {
    const { data, error } = await supabase
      .from('wod_section_results')
      .select('section_id, wod_id, time_result, reps_result, weight_result, scaling_level, rounds_result, calories_result, metres_result, task_completed')
      .eq('user_id', userId)
      .eq('workout_date', workoutDate);

    if (error) {
      console.error('Error loading section results:', error);
      return {};
    }

    if (data) {
      const newSectionResults: Record<string, SectionResult> = {};
      data.forEach(result => {
        // Handle content items that have format: sectionId-content-N
        // Need to convert to triple-colon format: wodId:::sectionId:::content-N
        let key: string;
        if (result.section_id.includes('-content-')) {
          const parts = result.section_id.split('-content-');
          key = `${result.wod_id}:::${parts[0]}:::content-${parts[1]}`;
        } else {
          key = `${result.wod_id}:::${result.section_id}`;
        }

        newSectionResults[key] = {
          time_result: result.time_result || '',
          reps_result: result.reps_result?.toString() || '',
          weight_result: result.weight_result?.toString() || '',
          scaling_level: result.scaling_level || '',
          rounds_result: result.rounds_result?.toString() || '',
          calories_result: result.calories_result?.toString() || '',
          metres_result: result.metres_result?.toString() || '',
          task_completed: result.task_completed || false,
        };
      });
      return newSectionResults;
    }
  } catch (error) {
    console.error('Error loading section results:', error);
  }
  return {};
}

/**
 * Load benchmark results and convert to section result format
 */
export async function loadBenchmarkResultsToSection(
  userId: string,
  workoutDate: string,
  workouts: WOD[]
): Promise<Record<string, SectionResult>> {
  try {
    const { data, error } = await supabase
      .from('benchmark_results')
      .select('benchmark_name, benchmark_id, forge_benchmark_id, time_result, reps_result, weight_result, scaling_level')
      .eq('user_id', userId)
      .eq('result_date', workoutDate);

    if (error) {
      console.error('Error loading benchmark results:', error);
      return {};
    }

    if (data && workouts.length > 0) {
      const newResults: Record<string, SectionResult> = {};

      // Match benchmarks to workout sections
      workouts.forEach(wod => {
        const sections = getPublishedSections(wod);
        sections.forEach(section => {
          // Match regular benchmarks
          section.benchmarks?.forEach((benchmark, idx) => {
            const matchingResult = data.find(r =>
              r.benchmark_name === benchmark.name && r.benchmark_id === benchmark.id
            );
            if (matchingResult) {
              const key = `${wod.id}:::${section.id}:::benchmark-${idx}`;
              newResults[key] = {
                time_result: matchingResult.time_result || '',
                reps_result: matchingResult.reps_result?.toString() || '',
                weight_result: matchingResult.weight_result?.toString() || '',
                scaling_level: matchingResult.scaling_level || '',
                rounds_result: '',
                calories_result: '',
                metres_result: '',
                task_completed: false,
              };
            }
          });

          // Match forge benchmarks
          section.forge_benchmarks?.forEach((forge, idx) => {
            const matchingResult = data.find(r =>
              r.benchmark_name === forge.name && r.forge_benchmark_id === forge.id
            );
            if (matchingResult) {
              const key = `${wod.id}:::${section.id}:::forge-${idx}`;
              newResults[key] = {
                time_result: matchingResult.time_result || '',
                reps_result: matchingResult.reps_result?.toString() || '',
                weight_result: matchingResult.weight_result?.toString() || '',
                scaling_level: matchingResult.scaling_level || '',
                rounds_result: '',
                calories_result: '',
                metres_result: '',
                task_completed: false,
              };
            }
          });
        });
      });

      return newResults;
    }
  } catch (error) {
    console.error('Error loading benchmark results:', error);
  }
  return {};
}

/**
 * Load lift records and convert to section result format
 */
export async function loadLiftResultsToSection(
  userId: string,
  workoutDate: string,
  workouts: WOD[]
): Promise<Record<string, SectionResult>> {
  try {
    const { data, error } = await supabase
      .from('lift_records')
      .select('lift_name, rep_scheme, reps, weight_kg')
      .eq('user_id', userId)
      .eq('lift_date', workoutDate);

    if (error) {
      console.error('Error loading lift results:', error);
      return {};
    }

    if (data && workouts.length > 0) {
      const newResults: Record<string, SectionResult> = {};

      // Match lifts to workout sections
      workouts.forEach(wod => {
        if (wod.date !== workoutDate) return; // Only process workouts for this date

        const sections = getPublishedSections(wod);
        sections.forEach(section => {
          section.lifts?.forEach((lift, idx) => {
            const repScheme = lift.rep_type === 'constant'
              ? `${lift.sets || 1}x${lift.reps || 1}`
              : lift.variable_sets?.map(s => s.reps).join('-') || '1';

            const matchingResult = data.find(r =>
              r.lift_name === lift.name && r.rep_scheme === repScheme
            );

            const key = `${wod.id}:::${section.id}:::lift-${idx}`;

            if (matchingResult) {
              newResults[key] = {
                time_result: '',
                reps_result: matchingResult.reps?.toString() || '',
                weight_result: matchingResult.weight_kg?.toString() || '',
                scaling_level: '',
                rounds_result: '',
                calories_result: '',
                metres_result: '',
                task_completed: false,
              };
            }
          });
        });
      });

      return newResults;
    }
  } catch (error) {
    console.error('Error loading lift results:', error);
  }
  return {};
}
