'use client';

import { confirm } from '@/lib/confirm';
import { WODFormData } from '@/components/coach/WorkoutModal';
import { supabase } from '@/lib/supabase';
import { authFetch } from '@/lib/auth-fetch';
import { toast } from 'sonner';
import { formatDate, calculateWorkoutWeek } from '@/utils/date-utils';

interface UseWODOperationsProps {
  fetchWODs: () => Promise<void>;
  fetchTracksAndCounts: () => Promise<void>;
}

export const useWODOperations = ({ fetchWODs, fetchTracksAndCounts }: UseWODOperationsProps) => {
  const handleSaveWOD = async (
    wodData: WODFormData,
    editingWOD: WODFormData | null,
    modalDate: Date
  ) => {
    const dateKey = formatDate(modalDate);
    const workoutWeek = calculateWorkoutWeek(modalDate);

    try {
      // Check if we're editing a real workout (not an empty session with 'session-{uuid}' id)
      const isEditingRealWorkout = editingWOD && editingWOD.id && !editingWOD.id.startsWith('session-');

      if (isEditingRealWorkout) {
        const hasContent = wodData.sections && wodData.sections.length > 0;

        const { error } = await supabase
          .from('wods')
          .update({
            title: wodData.title,
            session_type: wodData.session_type || wodData.title,
            workout_name: wodData.workout_name || null,
            workout_week: workoutWeek,
            track_id: wodData.track_id || null,
            workout_type_id: wodData.workout_type_id || null,
            class_times: wodData.classTimes,
            max_capacity: wodData.maxCapacity,
            date: dateKey,
            sections: wodData.sections,
            coach_notes: wodData.coach_notes || null,
            workout_publish_status: hasContent ? (editingWOD.workout_publish_status || 'draft') : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingWOD.id);

        if (error) throw error;

        await supabase
          .from('weekly_sessions')
          .update({ capacity: wodData.maxCapacity })
          .eq('workout_id', editingWOD.id);

        if (editingWOD.booking_info?.session_id) {
          await supabase
            .from('weekly_sessions')
            .update({ status: 'published' })
            .eq('id', editingWOD.booking_info.session_id);
        }

        if (wodData.selectedSessionIds && wodData.selectedSessionIds.length > 0) {
          // Create independent workout copies for each selected session
          for (const sessionId of wodData.selectedSessionIds) {
            // Create a duplicate workout
            const { data: duplicateWOD, error: duplicateError } = await supabase
              .from('wods')
              .insert([
                {
                  title: wodData.title,
                  session_type: wodData.session_type || wodData.title,
                  workout_name: wodData.workout_name || null,
                  workout_week: workoutWeek,
                  track_id: wodData.track_id || null,
                  workout_type_id: wodData.workout_type_id || null,
                  class_times: wodData.classTimes,
                  max_capacity: wodData.maxCapacity,
                  date: dateKey,
                  sections: wodData.sections,
                  coach_notes: wodData.coach_notes || null,
                  workout_publish_status: hasContent ? (editingWOD.workout_publish_status || 'draft') : null,
                },
              ])
              .select()
              .single();

            if (duplicateError) throw duplicateError;

            // Link this session to its own workout copy
            await supabase
              .from('weekly_sessions')
              .update({
                workout_id: duplicateWOD.id,
                capacity: wodData.maxCapacity,
              })
              .eq('id', sessionId);
          }
        }
      } else {
        const hasContent = wodData.sections && wodData.sections.length > 0;

        const { data: newWOD, error } = await supabase
          .from('wods')
          .insert([
            {
              title: wodData.title,
              session_type: wodData.session_type || wodData.title,
              workout_name: wodData.workout_name || null,
              workout_week: workoutWeek,
              track_id: wodData.track_id || null,
              workout_type_id: wodData.workout_type_id || null,
              class_times: wodData.classTimes,
              max_capacity: wodData.maxCapacity,
              date: dateKey,
              sections: wodData.sections,
              coach_notes: wodData.coach_notes || null,
              workout_publish_status: hasContent ? 'draft' : null,
            },
          ])
          .select()
          .single();

        if (error) throw error;

        const { data: existingSessions } = await supabase
          .from('weekly_sessions')
          .select('id')
          .eq('date', dateKey);

        if (wodData.classTimes && wodData.classTimes.length > 0 && newWOD) {
          for (const time of wodData.classTimes) {
            // Check if session exists at this date/time
            const { data: existingSession } = await supabase
              .from('weekly_sessions')
              .select('id')
              .eq('date', dateKey)
              .eq('time', time)
              .maybeSingle();

            if (existingSession) {
              // Update existing session
              await supabase
                .from('weekly_sessions')
                .update({
                  workout_id: newWOD.id,
                  capacity: wodData.maxCapacity,
                  status: 'published'
                })
                .eq('id', existingSession.id);
            } else {
              // Create new session
              await supabase.from('weekly_sessions').insert({
                date: dateKey,
                time: time,
                workout_id: newWOD.id,
                capacity: wodData.maxCapacity,
                status: 'published'
              });
            }
          }
        } else if (wodData.selectedSessionIds && wodData.selectedSessionIds.length > 0 && newWOD) {
          // Create independent workout copies for each selected session
          for (const sessionId of wodData.selectedSessionIds) {
            // Create a duplicate workout
            const { data: duplicateWOD, error: duplicateError } = await supabase
              .from('wods')
              .insert([
                {
                  title: wodData.title,
                  session_type: wodData.session_type || wodData.title,
                  workout_name: wodData.workout_name || null,
                  workout_week: workoutWeek,
                  track_id: wodData.track_id || null,
                  workout_type_id: wodData.workout_type_id || null,
                  class_times: wodData.classTimes,
                  max_capacity: wodData.maxCapacity,
                  date: dateKey,
                  sections: wodData.sections,
                  coach_notes: wodData.coach_notes || null,
                  workout_publish_status: hasContent ? 'draft' : null,
                },
              ])
              .select()
              .single();

            if (duplicateError) throw duplicateError;

            // Link this session to its own workout copy
            await supabase
              .from('weekly_sessions')
              .update({
                workout_id: duplicateWOD.id,
                capacity: wodData.maxCapacity,
              })
              .eq('id', sessionId);
          }
        } else if (editingWOD?.booking_info?.session_id && newWOD) {
          // Editing an empty session - link the new workout to this session
          await supabase
            .from('weekly_sessions')
            .update({
              workout_id: newWOD.id,
              capacity: wodData.maxCapacity,
              status: 'published'
            })
            .eq('id', editingWOD.booking_info.session_id);
        }
      }

      await fetchWODs();
      await fetchTracksAndCounts();
    } catch (error) {
      console.error('Error saving WOD:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error saving WOD: ${errorMessage}`);
    }
  };

  // Return to empty state (session kept, workout removed)
  const handleDeleteWODToEmpty = async (wodId: string) => {
    try {
      // Set session workout_id to NULL (session returns to empty state)
      await supabase
        .from('weekly_sessions')
        .update({ workout_id: null })
        .eq('workout_id', wodId);

      // Delete the workout
      const { error } = await supabase.from('wods').delete().eq('id', wodId);
      if (error) throw error;

      await fetchWODs();
      await fetchTracksAndCounts();
    } catch (error) {
      console.error('Error deleting WOD:', error);
      toast.error('Error deleting WOD. Please try again.');
    }
  };

  // Permanent delete (completely removes workout from database)
  const handleDeleteWODPermanently = async (wodId: string) => {
    try {
      // Delete the workout (cascade should handle session references)
      const { error } = await supabase.from('wods').delete().eq('id', wodId);
      if (error) throw error;

      await fetchWODs();
      await fetchTracksAndCounts();
    } catch (error) {
      console.error('Error permanently deleting WOD:', error);
      toast.error('Error permanently deleting WOD. Please try again.');
    }
  };

  // Legacy function that returns callback data for modal
  const handleDeleteWOD = async (dateKey: string, wodId: string) => {
    if (wodId.startsWith('session-')) {
      toast.warning('Cannot delete empty sessions. Click to add workout content instead.');
      return null;
    }

    // Return wodId so the parent can open the modal
    return wodId;
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!await confirm({ title: 'Delete Session', message: 'Delete this session entirely? This will cancel all member bookings for this time slot.', confirmText: 'Delete', variant: 'danger' })) return;

    try {
      // Delete the session (bookings will cascade delete if FK is set up that way)
      const { error } = await supabase
        .from('weekly_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      await fetchWODs();
      await fetchTracksAndCounts();
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Error deleting session. Please try again.');
    }
  };

  const handleCopyWOD = async (wod: WODFormData, targetDate: Date, targetSessionId?: string) => {
    const dateKey = formatDate(targetDate);

    try {
      // ALWAYS fetch session times from the database (classTimes can be stale)
      let timesToCreate: string[] = [];

      if (wod.id && !wod.id.startsWith('session-')) {
        // Fetch session times for this workout from the database
        const { data: sourceSessions, error: sessionsFetchError } = await supabase
          .from('weekly_sessions')
          .select('time')
          .eq('workout_id', wod.id)
          .order('time', { ascending: true });

        if (!sessionsFetchError && sourceSessions && sourceSessions.length > 0) {
          timesToCreate = sourceSessions.map(s => s.time);
        }
      }

      // Fallback to classTimes only if DB fetch returned nothing
      if (timesToCreate.length === 0 && wod.classTimes && wod.classTimes.length > 0) {
        timesToCreate = wod.classTimes;
      }

      // Calculate workout_week for target date
      const targetWorkoutWeek = calculateWorkoutWeek(targetDate);

      // Collect old WOD IDs and clean up Calendar events before overwriting
      const oldWodIds: string[] = [];

      if (targetSessionId) {
        // Find the old workout linked to this session
        const { data: oldSession } = await supabase
          .from('weekly_sessions')
          .select('workout_id')
          .eq('id', targetSessionId)
          .single();

        if (oldSession?.workout_id) {
          oldWodIds.push(oldSession.workout_id);
          const { data: oldWod } = await supabase
            .from('wods')
            .select('google_event_id')
            .eq('id', oldSession.workout_id)
            .single();

          if (oldWod?.google_event_id) {
            try {
              await authFetch(`/api/google/publish-workout?workoutId=${oldSession.workout_id}`, {
                method: 'DELETE',
              });
            } catch {
              // Continue even if calendar cleanup fails
            }
          }
        }
      } else if (timesToCreate.length > 0) {
        // Find old workouts at matching date/time slots
        for (const time of timesToCreate) {
          const { data: oldSession } = await supabase
            .from('weekly_sessions')
            .select('workout_id')
            .eq('date', dateKey)
            .eq('time', time)
            .maybeSingle();

          if (oldSession?.workout_id) {
            oldWodIds.push(oldSession.workout_id);
            const { data: oldWod } = await supabase
              .from('wods')
              .select('google_event_id')
              .eq('id', oldSession.workout_id)
              .single();

            if (oldWod?.google_event_id) {
              try {
                await authFetch(`/api/google/publish-workout?workoutId=${oldSession.workout_id}`, {
                  method: 'DELETE',
                });
              } catch {
                // Continue even if calendar cleanup fails
              }
            }
          }
        }
      }

      const { data: newWorkout, error: workoutError } = await supabase
        .from('wods')
        .insert([
          {
            title: wod.title,
            session_type: wod.session_type || wod.title,
            workout_name: wod.workout_name || null,
            workout_week: targetWorkoutWeek,
            track_id: wod.track_id || null,
            workout_type_id: wod.workout_type_id || null,
            class_times: timesToCreate,
            max_capacity: wod.maxCapacity,
            date: dateKey,
            sections: wod.sections,
            workout_publish_status: 'draft',
            is_published: false,
          },
        ])
        .select()
        .single();

      if (workoutError) throw workoutError;

      if (targetSessionId && newWorkout) {
        // Update existing session with new workout
        const { error: sessionError } = await supabase
          .from('weekly_sessions')
          .update({ workout_id: newWorkout.id })
          .eq('id', targetSessionId);

        if (sessionError) throw sessionError;
      } else if (newWorkout && timesToCreate.length > 0) {
        // No target session - create or update sessions at the same times as source workout
        for (const time of timesToCreate) {
          // Check if session exists at this date/time
          const { data: existingSession } = await supabase
            .from('weekly_sessions')
            .select('id')
            .eq('date', dateKey)
            .eq('time', time)
            .maybeSingle();

          if (existingSession) {
            // Update existing session
            await supabase
              .from('weekly_sessions')
              .update({
                workout_id: newWorkout.id,
                capacity: wod.maxCapacity,
                status: 'published'
              })
              .eq('id', existingSession.id);
          } else {
            // Create new session
            await supabase.from('weekly_sessions').insert({
              date: dateKey,
              time: time,
              workout_id: newWorkout.id,
              capacity: wod.maxCapacity,
              status: 'published'
            });
          }
        }
      }

      // Unpublish old WODs so they don't appear as orphans on leaderboard
      if (oldWodIds.length > 0) {
        await supabase
          .from('wods')
          .update({ is_published: false, workout_publish_status: 'draft', google_event_id: null })
          .in('id', oldWodIds);
      }

      await fetchWODs();
      await fetchTracksAndCounts();
    } catch (error) {
      console.error('Error copying WOD:', error);
      toast.error('Error copying WOD. Please try again.');
    }
  };

  return {
    handleSaveWOD,
    handleDeleteWOD,
    handleDeleteWODToEmpty,
    handleDeleteWODPermanently,
    handleDeleteSession,
    handleCopyWOD,
  };
};
