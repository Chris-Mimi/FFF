'use client';

import { Dispatch, SetStateAction } from 'react';
import { supabase } from '@/lib/supabase';
import { getPublishedSections, type WOD } from '@/utils/logbook-utils';

interface LiftRecord {
  lift_name: string;
  weight_kg: string;
  reps: number;
  rep_scheme?: string;
}

export interface LiftManagementHandlers {
  saveLiftRecord: (liftName: string, weightKg: string, reps: number, liftDate: string, repScheme?: string) => Promise<void>;
  saveAllLiftRecords: (dateStr: string) => Promise<void>;
  loadLiftRecords: (workoutDate: string) => Promise<void>;
}

export function useLiftManagement(
  userId: string,
  liftRecords: Record<string, LiftRecord>,
  setLiftRecords: Dispatch<SetStateAction<Record<string, LiftRecord>>>,
  workouts: WOD[]
): LiftManagementHandlers {
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

  return {
    saveLiftRecord,
    saveAllLiftRecords,
    loadLiftRecords,
  };
}
