'use client';

import { WODFormData } from '@/components/coach/WODModal';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/utils/date-utils';

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

    try {
      if (editingWOD && editingWOD.id) {
        const hasContent = wodData.sections && wodData.sections.length > 0;

        const { error } = await supabase
          .from('wods')
          .update({
            title: wodData.title,
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
          await supabase
            .from('weekly_sessions')
            .update({
              workout_id: editingWOD.id,
              capacity: wodData.maxCapacity,
            })
            .in('id', wodData.selectedSessionIds);
        }
      } else {
        const hasContent = wodData.sections && wodData.sections.length > 0;

        const { data: newWOD, error } = await supabase
          .from('wods')
          .insert([
            {
              title: wodData.title,
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
            await supabase.from('weekly_sessions').insert({
              date: dateKey,
              time: time,
              workout_id: newWOD.id,
              capacity: wodData.maxCapacity,
              status: 'published'
            });
          }
        } else if (wodData.selectedSessionIds && wodData.selectedSessionIds.length > 0 && newWOD) {
          await supabase
            .from('weekly_sessions')
            .update({
              workout_id: newWOD.id,
              capacity: wodData.maxCapacity,
            })
            .in('id', wodData.selectedSessionIds);
        }
      }

      await fetchWODs();
      await fetchTracksAndCounts();
    } catch (error) {
      console.error('Error saving WOD:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error saving WOD: ${errorMessage}\n\nPlease check the console for details.`);
    }
  };

  const handleDeleteWOD = async (dateKey: string, wodId: string) => {
    if (wodId.startsWith('session-')) {
      alert('Cannot delete empty sessions. Click to add workout content instead.');
      return;
    }

    if (!confirm('Are you sure you want to delete this WOD?')) return;

    try {
      const { error } = await supabase.from('wods').delete().eq('id', wodId);

      if (error) throw error;

      await fetchWODs();
      await fetchTracksAndCounts();
    } catch (error) {
      console.error('Error deleting WOD:', error);
      alert('Error deleting WOD. Please try again.');
    }
  };

  const handleCopyWOD = async (wod: WODFormData, targetDate: Date, targetSessionId?: string) => {
    const dateKey = formatDate(targetDate);

    try {
      // If classTimes is empty, fetch the session time(s) from the source workout
      let timesToCreate = wod.classTimes && wod.classTimes.length > 0 ? wod.classTimes : [];

      if (timesToCreate.length === 0 && wod.id && !wod.id.startsWith('session-')) {
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

      const { data: newWorkout, error: workoutError } = await supabase
        .from('wods')
        .insert([
          {
            title: wod.title,
            track_id: wod.track_id || null,
            workout_type_id: wod.workout_type_id || null,
            class_times: timesToCreate,
            max_capacity: wod.maxCapacity,
            date: dateKey,
            sections: wod.sections,
            workout_publish_status: wod.workout_publish_status || 'draft',
            is_published: wod.is_published || false,
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
        // No target session - create new sessions at the same times as source workout
        for (const time of timesToCreate) {
          await supabase.from('weekly_sessions').insert({
            date: dateKey,
            time: time,
            workout_id: newWorkout.id,
            capacity: wod.maxCapacity,
            status: 'published'
          });
        }
      }

      await fetchWODs();
      await fetchTracksAndCounts();
    } catch (error) {
      console.error('Error copying WOD:', error);
      alert('Error copying WOD. Please try again.');
    }
  };

  return {
    handleSaveWOD,
    handleDeleteWOD,
    handleCopyWOD,
  };
};
