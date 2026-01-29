// AthletePageLogbookTab component
'use client';

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLogbookData } from '@/hooks/athlete/useLogbookData';
import { useWorkoutLogging } from '@/hooks/athlete/useWorkoutLogging';
import { formatLocalDate, getWeekDates, getMonthCalendarDays, getPublishedSections } from '@/utils/logbook-utils';
import type { ConfiguredLift, ConfiguredBenchmark, ConfiguredForgeBenchmark } from '@/types/movements';
import { supabase } from '@/lib/supabase';

interface LiftRecord {
  lift_name: string;
  weight_kg: string;
  reps: number;
  rep_scheme?: string;
}

interface BenchmarkResult {
  benchmark_name: string;
  benchmark_type: string;
  time_result?: string;
  reps_result?: string;
  weight_result?: string;
  scaling_level?: 'Rx' | 'Sc1' | 'Sc2' | 'Sc3';
  benchmark_id?: string;
  forge_benchmark_id?: string;
}

interface SectionResult {
  time_result?: string;
  reps_result?: string;
  weight_result?: string;
  scaling_level?: 'Rx' | 'Sc1' | 'Sc2' | 'Sc3' | '';
  // NEW: Configurable scoring fields
  rounds_result?: string;
  calories_result?: string;
  metres_result?: string;
  task_completed?: boolean;
}

interface WhiteboardPhoto {
  id: string;
  workout_week: string;
  photo_label: string;
  photo_url: string;
  caption?: string | null;
  display_order: number;
  created_at: string;
}

interface AthletePageLogbookTabProps {
  userId: string;
  initialDate?: Date;
  initialViewMode?: 'day' | 'week' | 'month';
  onDateChange?: (date: Date) => void;
}

// Format helper functions for structured movements
function formatLift(lift: ConfiguredLift): string {
  if (lift.rep_type === 'constant') {
    const base = `${lift.name} ${lift.sets}x${lift.reps}`;
    return lift.percentage_1rm ? `${base} @ ${lift.percentage_1rm}%` : base;
  } else {
    const reps = lift.variable_sets?.map(s => s.reps).join('-') || '';
    const percentages = lift.variable_sets?.map(s => s.percentage_1rm) || [];

    let base = `${lift.name} ${reps}`;

    // Only show percentages if ALL sets have them defined (no undefined/null values)
    const allHavePercentages = percentages.length > 0 && percentages.every(p => p !== undefined && p !== null);
    if (allHavePercentages) {
      // Show ALL percentages for each set: "40-40-50-50-50-50-50%"
      base += ` @ ${percentages.join('-')}%`;
    }

    return base;
  }
}

function formatBenchmark(benchmark: ConfiguredBenchmark): { name: string; description?: string; exercises?: string[] } {
  const scaling = benchmark.scaling_option ? ` (${benchmark.scaling_option})` : '';
  return {
    name: `${benchmark.name}${scaling}`,
    description: benchmark.description,
    exercises: benchmark.exercises
  };
}

function formatForgeBenchmark(forge: ConfiguredForgeBenchmark): { name: string; description?: string; exercises?: string[] } {
  const scaling = forge.scaling_option ? ` (${forge.scaling_option})` : '';
  return {
    name: `${forge.name}${scaling}`,
    description: forge.description,
    exercises: forge.exercises
  };
}

export default function AthletePageLogbookTab({ userId, initialDate, initialViewMode, onDateChange }: AthletePageLogbookTabProps) {
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>(initialViewMode || 'week');
  const [liftRecords, setLiftRecords] = useState<Record<string, LiftRecord>>({});
  const [benchmarkResults, setBenchmarkResults] = useState<Record<string, BenchmarkResult>>({});
  const [sectionResults, setSectionResults] = useState<Record<string, SectionResult>>({});

  // Whiteboard photos state
  const [whiteboardPhotos, setWhiteboardPhotos] = useState<WhiteboardPhoto[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<WhiteboardPhoto | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  // Use extracted hooks
  const { workouts, workoutLogs, loading, setWorkoutLogs } = useLogbookData({
    userId,
    selectedDate,
    viewMode,
  });

  const { saveWorkoutLog } = useWorkoutLogging({
    userId,
    workoutLogs,
  });

  // Save lift record to database (upsert: update if exists, insert if new)
  const saveLiftRecord = async (liftName: string, weightKg: string, reps: number, liftDate: string, repScheme?: string) => {
    if (!weightKg || parseFloat(weightKg) <= 0) {
      return; // Don't save if no weight entered
    }

    try {
      const weight = parseFloat(weightKg);

      // Check if a record already exists for this lift + date + user + rep_scheme
      const { data: existingRecord, error: checkError } = await supabase
        .from('lift_records')
        .select('id')
        .eq('user_id', userId)
        .eq('lift_name', liftName)
        .eq('lift_date', liftDate)
        .eq('rep_scheme', repScheme || null)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing lift record:', checkError);
        alert(`Failed to check lift record: ${checkError.message || JSON.stringify(checkError)}`);
        return;
      }

      if (existingRecord) {
        // Update existing record
        const { error } = await supabase
          .from('lift_records')
          .update({
            weight_kg: weight,
            reps: reps,
            rep_scheme: repScheme || null,
          })
          .eq('id', existingRecord.id);

        if (error) {
          console.error('Error updating lift record:', error);
          alert(`Failed to update lift record: ${error.message || JSON.stringify(error)}`);
          return;
        }
      } else {
        // Insert new record
        const { error } = await supabase
          .from('lift_records')
          .insert({
            user_id: userId,
            lift_name: liftName,
            weight_kg: weight,
            reps: reps,
            rep_scheme: repScheme || null,
            lift_date: liftDate,
          });

        if (error) {
          console.error('Error inserting lift record:', error);
          alert(`Failed to insert lift record: ${error.message || JSON.stringify(error)}`);
          return;
        }
      }
    } catch (error) {
      console.error('Error saving lift record (catch):', error);
      alert(`Failed to save lift record: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Save all lift records for a workout
  const saveAllLiftRecords = async (dateStr: string) => {
    const recordsToSave = Object.entries(liftRecords).filter(([_, record]) => record.weight_kg && parseFloat(record.weight_kg) > 0);

    if (recordsToSave.length === 0) {
      alert('No lift weights entered to save');
      return;
    }

    let errorCount = 0;
    for (const [_liftKey, record] of recordsToSave) {
      try {
        await saveLiftRecord(record.lift_name, record.weight_kg, record.reps, dateStr, record.rep_scheme);
      } catch (error) {
        errorCount++;
      }
    }

    if (errorCount === 0) {
      alert('Lift records saved successfully!');
      // Reload the lift records to show updated values
      await loadLiftRecords(dateStr);
    } else {
      alert(`Saved ${recordsToSave.length - errorCount} of ${recordsToSave.length} lift records. ${errorCount} failed.`);
    }
  };

  // Save benchmark result to database via API
  const saveBenchmarkResult = async (
    benchmarkName: string,
    benchmarkType: string,
    timeResult: string,
    repsResult: string,
    weightResult: string,
    resultDate: string,
    scalingLevel?: 'Rx' | 'Sc1' | 'Sc2' | 'Sc3',
    benchmarkId?: string,
    forgeBenchmarkId?: string
  ) => {
    // Don't save if all result fields are empty
    if (!timeResult && !repsResult && !weightResult) {
      return;
    }

    try {
      const response = await fetch('/api/benchmark-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          benchmarkId,
          forgeBenchmarkId,
          benchmarkName,
          benchmarkType,
          timeResult,
          repsResult,
          weightResult,
          scalingLevel,
          notes: null, // Add notes field
          resultDate
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save benchmark result');
      }

      console.log('Benchmark result saved:', data);
    } catch (error) {
      console.error('Error saving benchmark result:', error);
      alert(`Failed to save benchmark result: ${error instanceof Error ? error.message : String(error)}`);
      throw error; // Re-throw so unified save can count it as error
    }
  };

  // Save all benchmark results for a workout
  const saveAllBenchmarkResults = async (dateStr: string) => {
    console.log('=== SAVING BENCHMARK RESULTS ===');
    console.log('All benchmark results state:', benchmarkResults);

    const resultsToSave = Object.entries(benchmarkResults).filter(
      ([_, result]) => result.time_result || result.reps_result || result.weight_result
    );

    console.log('Filtered results to save:', resultsToSave);

    if (resultsToSave.length === 0) {
      alert('No benchmark results entered to save');
      return;
    }

    let errorCount = 0;
    const errors: Array<{ benchmark_name: string; error: string }> = [];
    for (const [key, result] of resultsToSave) {
      try {
        console.log(`Saving benchmark result [${key}]:`, {
          name: result.benchmark_name,
          type: result.benchmark_type,
          time: result.time_result,
          reps: result.reps_result,
          weight: result.weight_result,
          scaling: result.scaling_level
        });

        await saveBenchmarkResult(
          result.benchmark_name,
          result.benchmark_type,
          result.time_result || '',
          result.reps_result || '',
          result.weight_result || '',
          dateStr,
          result.scaling_level,
          result.benchmark_id,
          result.forge_benchmark_id
        );
        console.log(`✓ Successfully saved ${result.benchmark_name}`);
      } catch (error) {
        console.error(`✗ Failed to save ${result.benchmark_name}:`, error);
        errors.push({ benchmark_name: result.benchmark_name, error: error instanceof Error ? error.message : 'Unknown error' });
        errorCount++;
      }
    }

    if (errorCount === 0) {
      alert('Benchmark results saved successfully!');
      setBenchmarkResults({});
    } else {
      console.error('Errors during save:', errors);
      alert(`Saved ${resultsToSave.length - errorCount} of ${resultsToSave.length} benchmark results. ${errorCount} failed. Check console for details.`);
    }
  };

  // Load existing lift records for displayed workouts
  const loadLiftRecords = async (workoutDate: string) => {
    try {
      const { data, error } = await supabase
        .from('lift_records')
        .select('*')
        .eq('user_id', userId)
        .eq('lift_date', workoutDate)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading lift records:', error);
        return;
      }

      if (data) {
        // Find the workout for this date to build proper keys
        const dayWorkouts = workouts.filter(w => w.date === workoutDate);
        const newLiftRecords: Record<string, LiftRecord> = {};

        dayWorkouts.forEach(wod => {
          const sections = getPublishedSections(wod);
          sections.forEach(section => {
            if (section.lifts) {
              section.lifts.forEach((lift) => {
                // Calculate rep scheme for this lift
                const repScheme = lift.rep_type === 'constant'
                  ? `${lift.sets || 1}x${lift.reps || 1}`
                  : lift.variable_sets?.map(s => s.reps).join('-') || '1';

                const liftKey = `${wod.id}-${section.id}-${lift.name}-${repScheme}`;
                // Find the most recent record for this lift with matching rep_scheme
                const existingRecord = data.find(r =>
                  r.lift_name === lift.name && r.rep_scheme === repScheme
                );
                if (existingRecord) {
                  newLiftRecords[liftKey] = {
                    lift_name: existingRecord.lift_name,
                    weight_kg: existingRecord.weight_kg.toString(),
                    reps: existingRecord.reps,
                    rep_scheme: existingRecord.rep_scheme || undefined,
                  };
                }
              });
            }
          });
        });

        setLiftRecords(prev => ({ ...prev, ...newLiftRecords }));
      }
    } catch (error) {
      console.error('Error loading lift records:', error);
    }
  };

  // Load section results for WOD sections
  const loadSectionResults = async (workoutDate: string) => {
    try {
      const { data, error } = await supabase
        .from('wod_section_results')
        .select('*')
        .eq('user_id', userId)
        .eq('workout_date', workoutDate);

      if (error) {
        console.error('Error loading section results:', error);
        return;
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
            // NEW fields
            rounds_result: result.rounds_result?.toString() || '',
            calories_result: result.calories_result?.toString() || '',
            metres_result: result.metres_result?.toString() || '',
            task_completed: result.task_completed || false,
          };
        });
        console.log('[loadSectionResults] Setting results, keys:', Object.keys(newSectionResults));
        setSectionResults(prev => {
          const updated = { ...prev, ...newSectionResults };
          console.log('[loadSectionResults] Updated state keys:', Object.keys(updated));
          return updated;
        });
      }
    } catch (error) {
      console.error('Error loading section results:', error);
    }
  };

  // Save section result to database
  const saveSectionResult = async (wodId: string, sectionId: string, result: SectionResult, workoutDate: string) => {
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
        // NEW fields
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
      alert(`Failed to save section result: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
      throw error;
    }
  };

  // UNIFIED SAVE FUNCTION - Handles all scoring data (lifts, benchmarks, forge, content) and notes
  const saveAllResults = async (workoutDate: string) => {
    const resultsToSave = Object.entries(sectionResults).filter(([_, result]) =>
      result.time_result || result.reps_result || result.weight_result || result.scaling_level ||
      result.rounds_result || result.calories_result || result.metres_result || result.task_completed
    );

    // Find current workout to extract structured data
    const currentWorkout = workouts.find(w => formatLocalDate(new Date(w.date)) === workoutDate);
    if (!currentWorkout) {
      alert('Workout not found');
      return;
    }

    // Check if there are notes to save
    const hasNotes = workoutLogs[currentWorkout.id]?.notes?.trim();

    // If no results AND no notes, show error
    if (resultsToSave.length === 0 && !hasNotes) {
      alert('No results or notes to save');
      return;
    }

    let savedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const [key, result] of resultsToSave) {
      try {
        // Parse key: format is "wodId:::sectionId:::type-idx"
        const parts = key.split(':::');
        if (parts.length < 3) continue;

        const [wodId, sectionId, itemIdentifier] = parts;
        const section = getPublishedSections(currentWorkout).find(s => s.id === sectionId);
        if (!section) continue;

        // Determine item type
        if (itemIdentifier.startsWith('lift-')) {
          // Save as lift record
          const liftIdx = parseInt(itemIdentifier.replace('lift-', ''));
          const lift = section.lifts?.[liftIdx];
          if (lift && result.weight_result) {
            const repScheme = lift.rep_type === 'constant'
              ? `${lift.sets || 1}x${lift.reps || 1}`
              : lift.variable_sets?.map(s => s.reps).join('-') || '1';
            const reps = parseInt(result.reps_result || '0') || 0;

            await saveLiftRecord(lift.name, result.weight_result, reps, workoutDate, repScheme);
            savedCount++;
          }
        } else if (itemIdentifier.startsWith('benchmark-')) {
          // Save as benchmark result
          const bmIdx = parseInt(itemIdentifier.replace('benchmark-', ''));
          const benchmark = section.benchmarks?.[bmIdx];
          if (benchmark) {
            // Only combine rounds + reps if they have values (for when didn't finish in time cap)
            const hasRoundsOrReps = result.rounds_result || result.reps_result;
            const repsValue = hasRoundsOrReps
              ? `${result.rounds_result || '0'}+${result.reps_result || '0'}`
              : '';

            await saveBenchmarkResult(
              benchmark.name,
              benchmark.type,
              result.time_result || '',
              repsValue,
              result.weight_result || '',
              workoutDate,
              result.scaling_level || 'Rx',
              benchmark.id
            );
            savedCount++;
          }
        } else if (itemIdentifier.startsWith('forge-')) {
          // Save as forge benchmark result
          const forgeIdx = parseInt(itemIdentifier.replace('forge-', ''));
          const forge = section.forge_benchmarks?.[forgeIdx];
          if (forge) {
            // Only combine rounds + reps if they have values (for when didn't finish in time cap)
            const hasRoundsOrReps = result.rounds_result || result.reps_result;
            const repsValue = hasRoundsOrReps
              ? `${result.rounds_result || '0'}+${result.reps_result || '0'}`
              : '';

            await saveBenchmarkResult(
              forge.name,
              forge.type,
              result.time_result || '',
              repsValue,
              result.weight_result || '',
              workoutDate,
              result.scaling_level || 'Rx',
              undefined,
              forge.id
            );
            savedCount++;
          }
        } else if (itemIdentifier.startsWith('content-')) {
          // Save as general section result (free-form exercise)
          await saveSectionResult(wodId, `${sectionId}-${itemIdentifier}`, result, workoutDate);
          savedCount++;
        }
      } catch (error) {
        errorCount++;
        errors.push(error instanceof Error ? error.message : 'Unknown error');
      }
    }

    // Also save workout notes if present
    if (workoutLogs[currentWorkout.id]?.notes) {
      try {
        await saveWorkoutLog(currentWorkout.id);
      } catch (error) {
        errors.push('Failed to save notes');
      }
    }

    if (errorCount === 0) {
      alert(`Successfully saved ${savedCount} results!`);
      // Reload data to reflect changes
      loadLiftRecords(workoutDate);
      loadSectionResults(workoutDate);
      loadBenchmarkResultsToSection(workoutDate);
      loadLiftResultsToSection(workoutDate);
    } else {
      console.error('Save errors:', errors);
      alert(`Saved ${savedCount} of ${resultsToSave.length} results. ${errorCount} failed. Check console for details.`);
    }
  };

  // Load benchmark results and populate sectionResults
  const loadBenchmarkResultsToSection = async (workoutDate: string) => {
    try {
      const { data, error } = await supabase
        .from('benchmark_results')
        .select('*')
        .eq('user_id', userId)
        .eq('result_date', workoutDate);

      if (error) {
        console.error('Error loading benchmark results:', error);
        return;
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

        setSectionResults(prev => ({ ...prev, ...newResults }));
      }
    } catch (error) {
      console.error('Error loading benchmark results:', error);
    }
  };

  // Load lift records and populate sectionResults
  const loadLiftResultsToSection = async (workoutDate: string) => {
    try {
      console.log('[loadLiftResultsToSection] Starting load for date:', workoutDate, 'workouts.length:', workouts.length);

      const { data, error } = await supabase
        .from('lift_records')
        .select('*')
        .eq('user_id', userId)
        .eq('lift_date', workoutDate);

      if (error) {
        console.error('Error loading lift results:', error);
        return;
      }

      console.log('[loadLiftResultsToSection] Fetched records:', data?.length || 0);

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
                console.log('[loadLiftResultsToSection] Matched lift:', lift.name, 'reps:', matchingResult.reps, 'weight:', matchingResult.weight_kg, 'key:', key);
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

        console.log('[loadLiftResultsToSection] Setting results, keys:', Object.keys(newResults));
        setSectionResults(prev => {
          const updated = { ...prev, ...newResults };
          console.log('[loadLiftResultsToSection] Updated state keys:', Object.keys(updated));
          return updated;
        });
      } else {
        console.log('[loadLiftResultsToSection] Skipped - no data or no workouts');
      }
    } catch (error) {
      console.error('Error loading lift results:', error);
    }
  };

  // Load lift records when workouts or selected date change
  useEffect(() => {
    let cancelled = false;

    const loadAllData = async () => {
      if (workouts.length > 0 && selectedDate && userId && !cancelled) {
        const dateStr = formatLocalDate(selectedDate);
        console.log('[useEffect] Loading all data for date:', dateStr, 'workouts:', workouts.length);

        // Run sequentially to avoid race conditions with state updates
        if (!cancelled) await loadLiftRecords(dateStr);
        if (!cancelled) await loadSectionResults(dateStr);
        if (!cancelled) await loadBenchmarkResultsToSection(dateStr);
        if (!cancelled) await loadLiftResultsToSection(dateStr);

        if (!cancelled) console.log('[useEffect] All data loaded');
      }
    };

    loadAllData();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workouts, selectedDate, userId]);

  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate);
    }
  }, [initialDate]);

  // Notify parent when date changes so it can be persisted across tab switches
  useEffect(() => {
    if (onDateChange) {
      onDateChange(selectedDate);
    }
  }, [selectedDate, onDateChange]);

  // Navigation handlers
  const previousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const nextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const previousWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  const previousMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedDate(newDate);
  };

  const nextMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    setSelectedDate(today);
  };

  // Whiteboard photos helpers
  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  };

  const fetchWhiteboardPhotos = async () => {
    const weekNumber = getWeekNumber(selectedDate);
    const isoWeek = `${selectedDate.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;

    setPhotosLoading(true);
    try {
      const response = await fetch(`/api/whiteboard-photos?week=${isoWeek}`);
      if (!response.ok) throw new Error('Failed to fetch photos');
      const data = await response.json();
      setWhiteboardPhotos(data);
    } catch (error) {
      console.error('Error fetching whiteboard photos:', error);
      setWhiteboardPhotos([]);
    } finally {
      setPhotosLoading(false);
    }
  };

  // Fetch whiteboard photos when selected date changes
  useEffect(() => {
    fetchWhiteboardPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const handleViewPhoto = (photo: WhiteboardPhoto) => {
    setSelectedPhoto(photo);
    setShowPhotoModal(true);
  };

  const handleClosePhotoModal = () => {
    setShowPhotoModal(false);
    setSelectedPhoto(null);
  };

  const handlePreviousPhoto = () => {
    if (!selectedPhoto || whiteboardPhotos.length === 0) return;
    const currentIndex = whiteboardPhotos.findIndex(p => p.id === selectedPhoto.id);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : whiteboardPhotos.length - 1;
    setSelectedPhoto(whiteboardPhotos[prevIndex]);
  };

  const handleNextPhoto = () => {
    if (!selectedPhoto || whiteboardPhotos.length === 0) return;
    const currentIndex = whiteboardPhotos.findIndex(p => p.id === selectedPhoto.id);
    const nextIndex = currentIndex < whiteboardPhotos.length - 1 ? currentIndex + 1 : 0;
    setSelectedPhoto(whiteboardPhotos[nextIndex]);
  };

  return (
    <div className='bg-white rounded-lg shadow p-6'>
      <div className='flex items-center justify-between mb-6'>
        <h2 className='text-2xl font-bold text-gray-900'>Athlete Logbook</h2>

        {/* View Mode Toggle */}
        <div className='flex bg-gray-100 rounded-lg p-1'>
          {(['day', 'week', 'month'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                viewMode === mode
                  ? 'bg-[#208479] text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Day View */}
      {viewMode === 'day' && (
        <div>
          {/* Date Navigation */}
          <div className='flex items-center justify-between mb-6'>
            <button
              onClick={previousDay}
              className='p-2 hover:bg-gray-100 rounded-full transition text-gray-900'
              title='Previous Day'
            >
              <ChevronLeft size={24} />
            </button>

            <div className='flex items-center gap-2 md:gap-3'>
              <h3 className='text-sm md:text-lg font-semibold text-gray-900'>
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </h3>
              <button
                onClick={goToToday}
                className='px-2 md:px-3 py-1 bg-[#208479] hover:bg-[#1a6b62] text-white text-xs md:text-sm rounded-lg font-medium transition'
              >
                Today
              </button>
            </div>

            <button
              onClick={nextDay}
              className='p-2 hover:bg-gray-100 rounded-full transition text-gray-900'
              title='Next Day'
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Workouts */}
          {loading ? (
            <div className='text-center text-gray-500 py-8'>Loading workouts...</div>
          ) : workouts.length === 0 ? (
            <div className='text-center text-gray-500 py-8'>
              No workouts attended on this date
            </div>
          ) : (
            <div className='space-y-4'>
              {workouts.map(wod => (
                <div key={wod.id} className='border border-gray-200 rounded-lg p-4'>
                  <div className='flex items-center justify-between mb-3'>
                    <div className='flex items-center gap-3'>
                      {wod.tracks && (
                        <div
                          className='w-4 h-4 rounded-full'
                          style={{ backgroundColor: wod.tracks.color || '#208479' }}
                        />
                      )}
                      <h3 className='text-lg font-semibold text-gray-900'>
                        {wod.session_type || wod.title}
                        {(wod.workout_name || wod.tracks?.name) && (
                          <span className='text-gray-600'> - {wod.workout_name || wod.tracks?.name}</span>
                        )}
                      </h3>
                    </div>
                    {wod.time && (
                      <span className='text-sm text-gray-500'>
                        {wod.time.slice(0, 5)}
                      </span>
                    )}
                  </div>

                  {wod.booked ? (
                    // Future booked workout - show placeholder
                    <div className='text-center py-12'>
                      <div className='text-2xl font-bold text-[#208479] mb-2'>Booked</div>
                      <div className='text-sm text-gray-500'>Workout details available after class</div>
                    </div>
                  ) : (
                    <>
                      {/* Workout Sections */}
                      <div className='space-y-3 mb-4'>
                    {getPublishedSections(wod).map(section => (
                      <div key={section.id} className='bg-gray-50 rounded-lg p-3'>
                        <div className='flex items-center gap-3 flex-wrap mb-2'>
                          <span className='text-sm font-medium text-[#208479] uppercase'>
                            {section.type}
                          </span>
                          {(section.duration && Number(section.duration) > 0) && (
                            <span className='text-sm text-gray-500'>{section.duration} min</span>
                          )}

                          {/* Inline Scoring Inputs for free-form content sections */}
                          {(() => {
                            // Only show inline scoring for sections WITHOUT lifts/benchmarks/forge
                            const hasStructuredItems =
                              (section.lifts && section.lifts.length > 0) ||
                              (section.benchmarks && section.benchmarks.length > 0) ||
                              (section.forge_benchmarks && section.forge_benchmarks.length > 0);

                            if (hasStructuredItems) return null;

                            const scoringFields = section.scoring_fields || {};
                            const hasAnyEnabledField = Object.values(scoringFields).some(v => v === true);

                            if (!hasAnyEnabledField) return null;

                            const itemKey = `${wod.id}:::${section.id}:::content-0`;

                            return (
                              <div className='flex items-center gap-2 ml-auto flex-wrap'>
                                <span className='text-xs font-medium text-gray-600'>Result:</span>
                                {scoringFields.time && (
                                  <input type='text' placeholder='mm:ss'
                                    value={sectionResults[itemKey]?.time_result || ''}
                                    onChange={e => setSectionResults({...sectionResults, [itemKey]: {...(sectionResults[itemKey] || {}), time_result: e.target.value}})}
                                    className='w-16 px-2 py-1 text-xs text-center border border-gray-300 rounded focus:ring-2 focus:ring-[#208479] text-gray-900'
                                  />
                                )}
                                {scoringFields.rounds_reps && (
                                  <>
                                    <div className='flex items-center gap-1'>
                                      <input type='number' placeholder='Rounds'
                                        value={sectionResults[itemKey]?.rounds_result || ''}
                                        onChange={e => setSectionResults({...sectionResults, [itemKey]: {...(sectionResults[itemKey] || {}), rounds_result: e.target.value}})}
                                        className='w-14 px-2 py-1 text-xs text-center border border-gray-300 rounded focus:ring-2 focus:ring-[#208479] text-gray-900'
                                      />
                                      <span className='text-xs text-gray-600'>rds</span>
                                    </div>
                                    <span className='text-xs'>+</span>
                                  </>
                                )}
                                {(scoringFields.reps || scoringFields.rounds_reps) && (
                                  <div className='flex items-center gap-1'>
                                    <input type='number' placeholder='Reps'
                                      value={sectionResults[itemKey]?.reps_result || ''}
                                      onChange={e => setSectionResults({...sectionResults, [itemKey]: {...(sectionResults[itemKey] || {}), reps_result: e.target.value}})}
                                      className='w-16 px-2 py-1 text-xs text-center border border-gray-300 rounded focus:ring-2 focus:ring-[#208479] text-gray-900'
                                    />
                                    <span className='text-xs text-gray-600'>reps</span>
                                  </div>
                                )}
                                {scoringFields.load && (
                                  <div className='flex items-center gap-1'>
                                    <input type='number' step='0.5' placeholder='Load'
                                      value={sectionResults[itemKey]?.weight_result || ''}
                                      onChange={e => setSectionResults({...sectionResults, [itemKey]: {...(sectionResults[itemKey] || {}), weight_result: e.target.value}})}
                                      className='w-16 px-2 py-1 text-xs text-center border border-gray-300 rounded focus:ring-2 focus:ring-[#208479] text-gray-900'
                                    />
                                    <span className='text-xs text-gray-600'>kg</span>
                                  </div>
                                )}
                                {scoringFields.calories && (
                                  <div className='flex items-center gap-1'>
                                    <input type='number' placeholder='Cal'
                                      value={sectionResults[itemKey]?.calories_result || ''}
                                      onChange={e => setSectionResults({...sectionResults, [itemKey]: {...(sectionResults[itemKey] || {}), calories_result: e.target.value}})}
                                      className='w-16 px-2 py-1 text-xs text-center border border-gray-300 rounded focus:ring-2 focus:ring-[#208479] text-gray-900'
                                    />
                                    <span className='text-xs text-gray-600'>cal</span>
                                  </div>
                                )}
                                {scoringFields.metres && (
                                  <div className='flex items-center gap-1'>
                                    <input type='number' step='0.1' placeholder='Distance'
                                      value={sectionResults[itemKey]?.metres_result || ''}
                                      onChange={e => setSectionResults({...sectionResults, [itemKey]: {...(sectionResults[itemKey] || {}), metres_result: e.target.value}})}
                                      className='w-20 px-2 py-1 text-xs text-center border border-gray-300 rounded focus:ring-2 focus:ring-[#208479] text-gray-900'
                                    />
                                    <span className='text-xs text-gray-600'>m</span>
                                  </div>
                                )}
                                {scoringFields.checkbox && (
                                  <label className='flex items-center gap-1 text-xs'>
                                    <input type='checkbox'
                                      checked={sectionResults[itemKey]?.task_completed || false}
                                      onChange={e => setSectionResults({...sectionResults, [itemKey]: {...(sectionResults[itemKey] || {}), task_completed: e.target.checked}})}
                                      className='rounded border-gray-300'
                                    />
                                    <span>✓</span>
                                  </label>
                                )}
                                {scoringFields.scaling && (
                                  <select
                                    value={sectionResults[itemKey]?.scaling_level || ''}
                                    onChange={e => setSectionResults({...sectionResults, [itemKey]: {...(sectionResults[itemKey] || {}), scaling_level: e.target.value as 'Rx' | 'Sc1' | 'Sc2' | 'Sc3' | ''}})}
                                    className='w-14 px-1 py-0.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-[#208479] text-gray-900 bg-white'
                                  >
                                    <option value=''>-</option>
                                    <option value='Rx'>Rx</option>
                                    <option value='Sc1'>Sc1</option>
                                    <option value='Sc2'>Sc2</option>
                                    <option value='Sc3'>Sc3</option>
                                  </select>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Lifts (Blue Badges) + Configurable Scoring Fields */}
                        {section.lifts && section.lifts.length > 0 && (
                          <div className='space-y-2 mb-2'>
                            {section.lifts.map((lift, liftIdx) => {
                              const itemKey = `${wod.id}:::${section.id}:::lift-${liftIdx}`;
                              const scoringFields = section.scoring_fields || {};

                              return (
                                <div key={liftIdx} className='bg-blue-50 text-blue-900 rounded px-2 py-1'>
                                  <div className='flex items-center gap-2 flex-wrap'>
                                    {/* Lift Title */}
                                    <div className='font-semibold text-xs flex-shrink-0'>≡ {formatLift(lift)}</div>

                                    {/* Configurable Scoring Inputs */}
                                    <div className='flex items-center gap-2 ml-auto flex-wrap'>
                                      {scoringFields.time && (
                                        <input type='text' placeholder='mm:ss'
                                          value={sectionResults[itemKey]?.time_result || ''}
                                          onChange={e => setSectionResults({...sectionResults, [itemKey]: {...(sectionResults[itemKey] || {}), time_result: e.target.value}})}
                                          className='w-16 px-2 py-1 text-xs text-center border border-blue-300 rounded focus:ring-2 focus:ring-[#208479] text-gray-900'
                                        />
                                      )}
                                      {scoringFields.rounds_reps && (
                                        <>
                                          <div className='flex items-center gap-1'>
                                            <input type='number' placeholder='Rounds'
                                              value={sectionResults[itemKey]?.rounds_result || ''}
                                              onChange={e => setSectionResults({...sectionResults, [itemKey]: {...(sectionResults[itemKey] || {}), rounds_result: e.target.value}})}
                                              className='w-14 px-2 py-1 text-xs text-center border border-blue-300 rounded focus:ring-2 focus:ring-[#208479] text-gray-900'
                                            />
                                            <span className='text-xs text-blue-700'>rds</span>
                                          </div>
                                          <span className='text-xs'>+</span>
                                        </>
                                      )}
                                      {(scoringFields.reps || scoringFields.rounds_reps) && (
                                        <div className='flex items-center gap-1'>
                                          <input type='number' placeholder='Reps'
                                            value={sectionResults[itemKey]?.reps_result || ''}
                                            onChange={e => setSectionResults({...sectionResults, [itemKey]: {...(sectionResults[itemKey] || {}), reps_result: e.target.value}})}
                                            className='w-16 px-2 py-1 text-xs text-center border border-blue-300 rounded focus:ring-2 focus:ring-[#208479] text-gray-900'
                                          />
                                          <span className='text-xs text-blue-700'>reps</span>
                                        </div>
                                      )}
                                      {scoringFields.load && (
                                        <div className='flex items-center gap-1'>
                                          <input type='number' step='0.5' placeholder='Load'
                                            value={sectionResults[itemKey]?.weight_result || ''}
                                            onChange={e => setSectionResults({...sectionResults, [itemKey]: {...(sectionResults[itemKey] || {}), weight_result: e.target.value}})}
                                            className='w-16 px-2 py-1 text-xs text-center border border-blue-300 rounded focus:ring-2 focus:ring-[#208479] text-gray-900'
                                          />
                                          <span className='text-xs text-blue-700'>kg</span>
                                        </div>
                                      )}
                                      {scoringFields.calories && (
                                        <div className='flex items-center gap-1'>
                                          <input type='number' placeholder='Cal'
                                            value={sectionResults[itemKey]?.calories_result || ''}
                                            onChange={e => setSectionResults({...sectionResults, [itemKey]: {...(sectionResults[itemKey] || {}), calories_result: e.target.value}})}
                                            className='w-16 px-2 py-1 text-xs text-center border border-blue-300 rounded focus:ring-2 focus:ring-[#208479] text-gray-900'
                                          />
                                          <span className='text-xs text-blue-700'>cal</span>
                                        </div>
                                      )}
                                      {scoringFields.metres && (
                                        <div className='flex items-center gap-1'>
                                          <input type='number' step='0.1' placeholder='Distance'
                                            value={sectionResults[itemKey]?.metres_result || ''}
                                            onChange={e => setSectionResults({...sectionResults, [itemKey]: {...(sectionResults[itemKey] || {}), metres_result: e.target.value}})}
                                            className='w-20 px-2 py-1 text-xs text-center border border-blue-300 rounded focus:ring-2 focus:ring-[#208479] text-gray-900'
                                          />
                                          <span className='text-xs text-blue-700'>m</span>
                                        </div>
                                      )}
                                      {scoringFields.checkbox && (
                                        <label className='flex items-center gap-1 text-xs'>
                                          <input type='checkbox'
                                            checked={sectionResults[itemKey]?.task_completed || false}
                                            onChange={e => setSectionResults({...sectionResults, [itemKey]: {...(sectionResults[itemKey] || {}), task_completed: e.target.checked}})}
                                            className='rounded border-blue-300'
                                          />
                                          <span>✓</span>
                                        </label>
                                      )}
                                      {scoringFields.scaling && (
                                        <select
                                          value={sectionResults[itemKey]?.scaling_level || ''}
                                          onChange={e => setSectionResults({...sectionResults, [itemKey]: {...(sectionResults[itemKey] || {}), scaling_level: e.target.value as 'Rx' | 'Sc1' | 'Sc2' | 'Sc3' | ''}})}
                                          className='w-14 px-1 py-0.5 text-xs border border-blue-300 rounded focus:ring-2 focus:ring-[#208479] text-gray-900 bg-white'
                                        >
                                          <option value=''>-</option>
                                          <option value='Rx'>Rx</option>
                                          <option value='Sc1'>Sc1</option>
                                          <option value='Sc2'>Sc2</option>
                                          <option value='Sc3'>Sc3</option>
                                        </select>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Benchmarks (Teal Badges) + Configurable Scoring Fields */}
                        {section.benchmarks && section.benchmarks.length > 0 && (
                          <div className='space-y-2 mb-2'>
                            {section.benchmarks.map((benchmark, bmIdx) => {
                              const formatted = formatBenchmark(benchmark);
                              const itemKey = `${wod.id}:::${section.id}:::benchmark-${bmIdx}`;
                              const scoringFields = section.scoring_fields || {};

                              return (
                                <div key={bmIdx} className='bg-teal-50 text-teal-900 rounded px-2 py-1'>
                                  <div className='space-y-1'>
                                    {/* Benchmark Title */}
                                    <div className='font-semibold text-xs'>≡ {formatted.name}</div>

                                    {/* Description/Exercises */}
                                    {formatted.description && (
                                      <div className='text-teal-800 text-xs whitespace-pre-wrap'>{formatted.description}</div>
                                    )}
                                    {!formatted.description && formatted.exercises && formatted.exercises.length > 0 && (
                                      <div className='text-teal-800 text-xs'>{formatted.exercises.join(' • ')}</div>
                                    )}

                                    {/* Configurable Scoring Inputs */}
                                    <div className='flex items-center gap-2 flex-wrap'>
                                      {scoringFields.time && (
                                        <input type='text' placeholder='mm:ss'
                                          value={sectionResults[itemKey]?.time_result || ''}
                                          onChange={e => setSectionResults({...sectionResults, [itemKey]: {...(sectionResults[itemKey] || {}), time_result: e.target.value}})}
                                          className='w-16 px-2 py-1 text-xs text-center border border-teal-300 rounded focus:ring-2 focus:ring-[#208479] text-gray-900'
                                        />
                                      )}
                                      {scoringFields.rounds_reps && (
                                        <>
                                          <div className='flex items-center gap-1'>
                                            <input type='number' placeholder='Rounds'
                                              value={sectionResults[itemKey]?.rounds_result || ''}
                                              onChange={e => setSectionResults({...sectionResults, [itemKey]: {...(sectionResults[itemKey] || {}), rounds_result: e.target.value}})}
                                              className='w-14 px-2 py-1 text-xs text-center border border-teal-300 rounded focus:ring-2 focus:ring-[#208479] text-gray-900'
                                            />
                                            <span className='text-xs text-teal-700'>rds</span>
                                          </div>
                                          <span className='text-xs'>+</span>
                                        </>
                                      )}
                                      {(scoringFields.reps || scoringFields.rounds_reps) && (
                                        <div className='flex items-center gap-1'>
                                          <input type='number' placeholder='Reps'
                                            value={sectionResults[itemKey]?.reps_result || ''}
                                            onChange={e => setSectionResults({...sectionResults, [itemKey]: {...(sectionResults[itemKey] || {}), reps_result: e.target.value}})}
                                            className='w-16 px-2 py-1 text-xs text-center border border-teal-300 rounded focus:ring-2 focus:ring-[#208479] text-gray-900'
                                          />
                                          <span className='text-xs text-teal-700'>reps</span>
                                        </div>
                                      )}
                                      {scoringFields.load && (
                                        <div className='flex items-center gap-1'>
                                          <input type='number' step='0.5' placeholder='Load'
                                            value={sectionResults[itemKey]?.weight_result || ''}
                                            onChange={e => setSectionResults({...sectionResults, [itemKey]: {...(sectionResults[itemKey] || {}), weight_result: e.target.value}})}
                                            className='w-16 px-2 py-1 text-xs text-center border border-teal-300 rounded focus:ring-2 focus:ring-[#208479] text-gray-900'
                                          />
                                          <span className='text-xs text-teal-700'>kg</span>
                                        </div>
                                      )}
                                      {scoringFields.calories && (
                                        <div className='flex items-center gap-1'>
                                          <input type='number' placeholder='Cal'
                                            value={sectionResults[itemKey]?.calories_result || ''}
                                            onChange={e => setSectionResults({...sectionResults, [itemKey]: {...(sectionResults[itemKey] || {}), calories_result: e.target.value}})}
                                            className='w-16 px-2 py-1 text-xs text-center border border-teal-300 rounded focus:ring-2 focus:ring-[#208479] text-gray-900'
                                          />
                                          <span className='text-xs text-teal-700'>cal</span>
                                        </div>
                                      )}
                                      {scoringFields.metres && (
                                        <div className='flex items-center gap-1'>
                                          <input type='number' step='0.1' placeholder='Distance'
                                            value={sectionResults[itemKey]?.metres_result || ''}
                                            onChange={e => setSectionResults({...sectionResults, [itemKey]: {...(sectionResults[itemKey] || {}), metres_result: e.target.value}})}
                                            className='w-20 px-2 py-1 text-xs text-center border border-teal-300 rounded focus:ring-2 focus:ring-[#208479] text-gray-900'
                                          />
                                          <span className='text-xs text-teal-700'>m</span>
                                        </div>
                                      )}
                                      {scoringFields.checkbox && (
                                        <label className='flex items-center gap-1 text-xs'>
                                          <input type='checkbox'
                                            checked={sectionResults[itemKey]?.task_completed || false}
                                            onChange={e => setSectionResults({...sectionResults, [itemKey]: {...(sectionResults[itemKey] || {}), task_completed: e.target.checked}})}
                                            className='rounded border-teal-300'
                                          />
                                          <span>✓</span>
                                        </label>
                                      )}
                                      {scoringFields.scaling && (
                                        <select
                                          value={sectionResults[itemKey]?.scaling_level || ''}
                                          onChange={e => setSectionResults({...sectionResults, [itemKey]: {...(sectionResults[itemKey] || {}), scaling_level: e.target.value as 'Rx' | 'Sc1' | 'Sc2' | 'Sc3' | ''}})}
                                          className='w-14 px-1 py-0.5 text-xs border border-teal-300 rounded focus:ring-2 focus:ring-[#208479] text-gray-900 bg-white'
                                        >
                                          <option value=''>-</option>
                                          <option value='Rx'>Rx</option>
                                          <option value='Sc1'>Sc1</option>
                                          <option value='Sc2'>Sc2</option>
                                          <option value='Sc3'>Sc3</option>
                                        </select>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Forge Benchmarks (Cyan Badges) + Configurable Scoring Fields */}
                        {section.forge_benchmarks && section.forge_benchmarks.length > 0 && (
                          <div className='space-y-2 mb-2'>
                            {section.forge_benchmarks.map((forge, forgeIdx) => {
                              const formatted = formatForgeBenchmark(forge);
                              const itemKey = `${wod.id}:::${section.id}:::forge-${forgeIdx}`;
                              const scoringFields = section.scoring_fields || {};

                              return (
                                <div key={forgeIdx} className='bg-cyan-50 text-cyan-900 rounded px-2 py-1'>
                                  <div className='space-y-1'>
                                    {/* Forge Benchmark Title */}
                                    <div className='font-semibold text-xs'>≡ {formatted.name}</div>

                                    {/* Description/Exercises */}
                                    {formatted.description && (
                                      <div className='text-cyan-800 text-xs whitespace-pre-wrap'>{formatted.description}</div>
                                    )}
                                    {!formatted.description && formatted.exercises && formatted.exercises.length > 0 && (
                                      <div className='text-cyan-800 text-xs'>{formatted.exercises.join(' • ')}</div>
                                    )}

                                    {/* Configurable Scoring Inputs */}
                                    <div className='flex items-center gap-2 flex-wrap'>
                                      {scoringFields.time && (
                                        <input type='text' placeholder='mm:ss'
                                          value={sectionResults[itemKey]?.time_result || ''}
                                          onChange={e => setSectionResults({...sectionResults, [itemKey]: {...(sectionResults[itemKey] || {}), time_result: e.target.value}})}
                                          className='w-16 px-2 py-1 text-xs text-center border border-cyan-300 rounded focus:ring-2 focus:ring-[#208479] text-gray-900'
                                        />
                                      )}
                                      {scoringFields.rounds_reps && (
                                        <>
                                          <div className='flex items-center gap-1'>
                                            <input type='number' placeholder='Rounds'
                                              value={sectionResults[itemKey]?.rounds_result || ''}
                                              onChange={e => setSectionResults({...sectionResults, [itemKey]: {...(sectionResults[itemKey] || {}), rounds_result: e.target.value}})}
                                              className='w-14 px-2 py-1 text-xs text-center border border-cyan-300 rounded focus:ring-2 focus:ring-[#208479] text-gray-900'
                                            />
                                            <span className='text-xs text-cyan-700'>rds</span>
                                          </div>
                                          <span className='text-xs'>+</span>
                                        </>
                                      )}
                                      {(scoringFields.reps || scoringFields.rounds_reps) && (
                                        <div className='flex items-center gap-1'>
                                          <input type='number' placeholder='Reps'
                                            value={sectionResults[itemKey]?.reps_result || ''}
                                            onChange={e => setSectionResults({...sectionResults, [itemKey]: {...(sectionResults[itemKey] || {}), reps_result: e.target.value}})}
                                            className='w-16 px-2 py-1 text-xs text-center border border-cyan-300 rounded focus:ring-2 focus:ring-[#208479] text-gray-900'
                                          />
                                          <span className='text-xs text-cyan-700'>reps</span>
                                        </div>
                                      )}
                                      {scoringFields.load && (
                                        <div className='flex items-center gap-1'>
                                          <input type='number' step='0.5' placeholder='Load'
                                            value={sectionResults[itemKey]?.weight_result || ''}
                                            onChange={e => setSectionResults({...sectionResults, [itemKey]: {...(sectionResults[itemKey] || {}), weight_result: e.target.value}})}
                                            className='w-16 px-2 py-1 text-xs text-center border border-cyan-300 rounded focus:ring-2 focus:ring-[#208479] text-gray-900'
                                          />
                                          <span className='text-xs text-cyan-700'>kg</span>
                                        </div>
                                      )}
                                      {scoringFields.calories && (
                                        <div className='flex items-center gap-1'>
                                          <input type='number' placeholder='Cal'
                                            value={sectionResults[itemKey]?.calories_result || ''}
                                            onChange={e => setSectionResults({...sectionResults, [itemKey]: {...(sectionResults[itemKey] || {}), calories_result: e.target.value}})}
                                            className='w-16 px-2 py-1 text-xs text-center border border-cyan-300 rounded focus:ring-2 focus:ring-[#208479] text-gray-900'
                                          />
                                          <span className='text-xs text-cyan-700'>cal</span>
                                        </div>
                                      )}
                                      {scoringFields.metres && (
                                        <div className='flex items-center gap-1'>
                                          <input type='number' step='0.1' placeholder='Distance'
                                            value={sectionResults[itemKey]?.metres_result || ''}
                                            onChange={e => setSectionResults({...sectionResults, [itemKey]: {...(sectionResults[itemKey] || {}), metres_result: e.target.value}})}
                                            className='w-20 px-2 py-1 text-xs text-center border border-cyan-300 rounded focus:ring-2 focus:ring-[#208479] text-gray-900'
                                          />
                                          <span className='text-xs text-cyan-700'>m</span>
                                        </div>
                                      )}
                                      {scoringFields.checkbox && (
                                        <label className='flex items-center gap-1 text-xs'>
                                          <input type='checkbox'
                                            checked={sectionResults[itemKey]?.task_completed || false}
                                            onChange={e => setSectionResults({...sectionResults, [itemKey]: {...(sectionResults[itemKey] || {}), task_completed: e.target.checked}})}
                                            className='rounded border-cyan-300'
                                          />
                                          <span>✓</span>
                                        </label>
                                      )}
                                      {scoringFields.scaling && (
                                        <select
                                          value={sectionResults[itemKey]?.scaling_level || ''}
                                          onChange={e => setSectionResults({...sectionResults, [itemKey]: {...(sectionResults[itemKey] || {}), scaling_level: e.target.value as 'Rx' | 'Sc1' | 'Sc2' | 'Sc3' | ''}})}
                                          className='w-14 px-1 py-0.5 text-xs border border-cyan-300 rounded focus:ring-2 focus:ring-[#208479] text-gray-900 bg-white'
                                        >
                                          <option value=''>-</option>
                                          <option value='Rx'>Rx</option>
                                          <option value='Sc1'>Sc1</option>
                                          <option value='Sc2'>Sc2</option>
                                          <option value='Sc3'>Sc3</option>
                                        </select>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Section Content (Exercises and other free-form text) */}
                        {section.content && (() => {
                          // Only show scoring fields if section has NO structured items (lifts/benchmarks/forge)
                          // If it has structured items, content is just instructions/notes
                          const hasStructuredItems =
                            (section.lifts && section.lifts.length > 0) ||
                            (section.benchmarks && section.benchmarks.length > 0) ||
                            (section.forge_benchmarks && section.forge_benchmarks.length > 0);

                          if (hasStructuredItems) {
                            // Just display as instructions/notes (no scoring inputs)
                            return (
                              <div className='text-sm text-gray-700 whitespace-pre-wrap italic mt-2'>
                                {section.content}
                              </div>
                            );
                          }

                          // No structured items - check if scoring fields are enabled
                          const scoringFields = section.scoring_fields || {};
                          const hasAnyEnabledField = Object.values(scoringFields).some(v => v === true);

                          // If no scoring fields enabled, just show content as text
                          if (!hasAnyEnabledField) {
                            return (
                              <div className='text-sm text-gray-700 whitespace-pre-wrap mt-2'>
                                {section.content}
                              </div>
                            );
                          }

                          // Scoring fields enabled - show content only (scoring inputs now inline in header)
                          return (
                            <div className='text-sm text-gray-700 whitespace-pre-wrap mt-2'>
                              {section.content}
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>

                  {/* Workout Notes Section */}
                  <div className='mt-6 pt-6 border-t border-gray-200'>
                    <h4 className='font-semibold text-gray-900 mb-3'>My Notes/Scores</h4>

                    <div className='space-y-4'>
                      {/* Coach Instructions (Athlete Notes) */}
                      {(() => {
                        const allNotes: string[] = [];
                        const publishedSections = getPublishedSections(wod);
                        publishedSections.forEach(section => {
                          // Collect lift athlete notes
                          section.lifts?.forEach(lift => {
                            if (lift.athlete_notes) {
                              allNotes.push(`${lift.name}: ${lift.athlete_notes}`);
                            }
                          });
                          // Collect benchmark athlete notes
                          section.benchmarks?.forEach(benchmark => {
                            if (benchmark.athlete_notes) {
                              allNotes.push(`${benchmark.name}: ${benchmark.athlete_notes}`);
                            }
                          });
                          // Collect forge benchmark athlete notes
                          section.forge_benchmarks?.forEach(forge => {
                            if (forge.athlete_notes) {
                              allNotes.push(`${forge.name}: ${forge.athlete_notes}`);
                            }
                          });
                        });

                        return allNotes.length > 0 ? (
                          <div className='mb-4'>
                            <label className='block text-sm font-semibold text-gray-700 mb-2'>Coach Instructions</label>
                            <div className='bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1'>
                              {allNotes.map((note, idx) => (
                                <div key={idx} className='text-sm text-blue-900'>
                                  • {note}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null;
                      })()}

                      <div>
                        <label className='block text-sm font-medium text-gray-700 mb-2'>Notes</label>
                        <textarea
                          value={workoutLogs[wod.id]?.notes || ''}
                          onChange={e =>
                            setWorkoutLogs({
                              ...workoutLogs,
                              [wod.id]: {
                                result: '',
                                notes: e.target.value,
                                date: formatLocalDate(selectedDate),
                              },
                            })
                          }
                          placeholder='How did it feel? Any modifications?'
                          rows={4}
                          className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 resize-none'
                        />
                      </div>

                      <div className='flex justify-end'>
                        <button
                          onClick={() => saveAllResults(formatLocalDate(selectedDate))}
                          className='px-8 py-3 bg-[#208479] hover:bg-[#1a6b62] text-white font-semibold rounded-lg transition shadow-lg'
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Week View */}
      {viewMode === 'week' && (
        <div>
          {/* Week Navigation */}
          <div className='flex items-center justify-between mb-6'>
            <button
              onClick={previousWeek}
              className='p-2 hover:bg-gray-100 rounded-full transition text-gray-900'
              title='Previous Week'
            >
              <ChevronLeft size={24} />
            </button>

            <div className='flex items-center gap-2 md:gap-3'>
              <h3 className='text-sm md:text-lg font-semibold text-gray-900'>
                {getWeekDates(selectedDate)[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {' '}
                {getWeekDates(selectedDate)[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </h3>
              <button
                onClick={goToToday}
                className='px-2 md:px-3 py-1 bg-[#208479] hover:bg-[#1a6b62] text-white text-xs md:text-sm rounded-lg font-medium transition'
              >
                Today
              </button>
            </div>

            <button
              onClick={nextWeek}
              className='p-2 hover:bg-gray-100 rounded-full transition text-gray-900'
              title='Next Week'
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Week Grid */}
          {loading ? (
            <div className='text-center text-gray-500 py-8'>Loading workouts...</div>
          ) : (
            <div className='grid grid-cols-7 gap-4'>
              {getWeekDates(selectedDate).map((date, index) => {
                const dateStr = formatLocalDate(date);
                const dayWorkouts = workouts.filter(w => w.date === dateStr);
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

                return (
                  <div key={index} className='bg-gray-50 rounded-lg p-3 min-h-[200px]'>
                    <div className='text-center mb-3'>
                      <div className='text-sm font-semibold text-gray-900'>{dayName}</div>
                      <div className='text-sm text-gray-600'>
                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>

                    {dayWorkouts.length > 0 ? (
                      <div className='space-y-2'>
                        {dayWorkouts.map(wod => (
                          <button
                            key={wod.id}
                            onClick={() => {
                              setSelectedDate(date);
                              setViewMode('day');
                            }}
                            className={`w-full text-left p-2 rounded border hover:shadow-sm transition ${
                              wod.booked ? 'bg-[#7dd3c0] border-[#7dd3c0]' : 'bg-white'
                            }`}
                          >
                            {wod.booked ? (
                              <div className='text-xs font-bold text-gray-900 text-center'>Booked</div>
                            ) : (
                              <div className='flex items-center gap-2 mb-1'>
                                {wod.tracks && (
                                  <div
                                    className='w-2 h-2 rounded-full flex-shrink-0'
                                    style={{ backgroundColor: wod.tracks.color || '#208479' }}
                                  />
                                )}
                                <span className='text-xs font-medium text-gray-900 truncate'>
                                  {wod.session_type || wod.title}
                                  {(wod.workout_name || wod.tracks?.name) && (
                                    <span className='text-gray-600'> - {wod.workout_name || wod.tracks?.name}</span>
                                  )}
                                </span>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className='text-xs text-gray-400 text-center mt-8'>No workouts</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Month View */}
      {viewMode === 'month' && (
        <div>
          {/* Month Navigation */}
          <div className='flex items-center justify-between mb-6'>
            <button
              onClick={previousMonth}
              className='p-2 hover:bg-gray-100 rounded-full transition text-gray-900'
              title='Previous Month'
            >
              <ChevronLeft size={24} />
            </button>

            <div className='flex items-center gap-2 md:gap-3'>
              <h3 className='text-sm md:text-lg font-semibold text-gray-900'>
                {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
              <button
                onClick={goToToday}
                className='px-2 md:px-3 py-1 bg-[#208479] hover:bg-[#1a6b62] text-white text-xs md:text-sm rounded-lg font-medium transition'
              >
                Today
              </button>
            </div>

            <button
              onClick={nextMonth}
              className='p-2 hover:bg-gray-100 rounded-full transition text-gray-900'
              title='Next Month'
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Calendar Grid */}
          {loading ? (
            <div className='text-center text-gray-500 py-8'>Loading workouts...</div>
          ) : (
            <div>
              {/* Day headers */}
              <div className='grid grid-cols-7 gap-1 mb-2'>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <div key={day} className='p-2 text-center text-sm font-medium text-gray-500'>
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className='grid grid-cols-7 gap-1'>
                {getMonthCalendarDays(selectedDate).map((date, index) => {
                  const isCurrentMonth = date.getMonth() === selectedDate.getMonth();
                  const dateStr = formatLocalDate(date);
                  const dayWorkouts = workouts.filter(w => w.date === dateStr);
                  const hasWorkouts = dayWorkouts.length > 0;

                  return (
                    <div
                      key={index}
                      className={`min-h-[100px] p-2 border border-gray-200 ${
                        isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                      } ${hasWorkouts ? 'cursor-pointer hover:shadow-sm' : ''}`}
                      onClick={() => {
                        if (hasWorkouts) {
                          setSelectedDate(date);
                          setViewMode('day');
                        }
                      }}
                    >
                      <div className={`text-sm ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                        {date.getDate()}
                      </div>

                      {hasWorkouts && (
                        <div className='mt-1'>
                          {dayWorkouts.slice(0, 2).map(wod => (
                            <div
                              key={wod.id}
                              className={`text-xs rounded px-1 py-0.5 mb-1 truncate ${
                                wod.booked
                                  ? 'bg-[#7dd3c0] text-gray-900 font-bold'
                                  : 'bg-[#208479] text-white'
                              }`}
                            >
                              {wod.booked ? 'Booked' : `${wod.session_type || wod.title}${(wod.workout_name || wod.tracks?.name) ? ` - ${wod.workout_name || wod.tracks?.name}` : ''}`}
                            </div>
                          ))}
                          {dayWorkouts.length > 2 && (
                            <div className='text-xs text-gray-500'>+{dayWorkouts.length - 2} more</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Whiteboard Photos Section */}
      <div className='mt-8 pt-6 border-t border-gray-200'>
        <h3 className='text-xl font-bold text-gray-900 mb-4'>
          Whiteboard - Week {getWeekNumber(selectedDate)}
        </h3>

        {photosLoading ? (
          <div className='text-center text-gray-500 py-8'>Loading photos...</div>
        ) : whiteboardPhotos.length === 0 ? (
          <div className='text-center text-gray-500 py-8'>
            No whiteboard photos for this week
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {whiteboardPhotos.map((photo) => (
              <div
                key={photo.id}
                className='border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer'
                onClick={() => handleViewPhoto(photo)}
              >
                <div className='h-48 overflow-y-auto'>
                  <img
                    src={photo.photo_url}
                    alt={photo.photo_label}
                    className='w-full'
                  />
                </div>
                <div className='p-3 space-y-1'>
                  <p className='font-medium text-gray-900'>{photo.photo_label}</p>
                  {photo.caption && <p className='text-sm text-gray-600'>{photo.caption}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full-Screen Photo Modal */}
      {showPhotoModal && selectedPhoto && (
        <div
          className='fixed inset-0 bg-black bg-opacity-90 z-50 overflow-y-auto cursor-pointer'
          onClick={handleClosePhotoModal}
        >
          <div className='min-h-full flex items-center justify-center p-4'>
            {/* Previous Arrow */}
            {whiteboardPhotos.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); handlePreviousPhoto(); }}
                className='absolute left-4 top-1/2 -translate-y-1/2 bg-white text-gray-700 p-3 rounded-full hover:bg-gray-100 z-10 shadow-lg'
              >
                <ChevronLeft size={28} />
              </button>
            )}

            <div
              className='relative cursor-default'
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleClosePhotoModal}
                className='absolute -top-12 right-0 bg-white text-gray-700 p-2 rounded-full hover:bg-gray-100 z-10 shadow-lg'
              >
                <X size={24} />
              </button>
              <img
                src={selectedPhoto.photo_url}
                alt={selectedPhoto.photo_label}
                className='max-w-[90vw] max-h-[85vh] object-contain rounded-lg'
              />
              <div className='mt-2 bg-black bg-opacity-70 text-white p-3 rounded-lg'>
                <p className='font-medium'>{selectedPhoto.photo_label}</p>
                {selectedPhoto.caption && <p className='text-sm mt-1'>{selectedPhoto.caption}</p>}
                {whiteboardPhotos.length > 1 && (
                  <p className='text-xs text-gray-400 mt-1'>
                    {whiteboardPhotos.findIndex(p => p.id === selectedPhoto.id) + 1} / {whiteboardPhotos.length}
                  </p>
                )}
              </div>
            </div>

            {/* Next Arrow */}
            {whiteboardPhotos.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); handleNextPhoto(); }}
                className='absolute right-4 top-1/2 -translate-y-1/2 bg-white text-gray-700 p-3 rounded-full hover:bg-gray-100 z-10 shadow-lg'
              >
                <ChevronRight size={28} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
