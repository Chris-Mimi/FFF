import { confirm } from '@/lib/confirm';
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
  validateCapacity,
  promoteWaitlistMembers,
  updateWorkoutCapacity,
} from '@/lib/coach/sessionCapacityHelpers';
import { calculateConfirmedCount } from '@/lib/coach/bookingHelpers';
import { SessionDetails, Booking } from './useSessionDetails';

interface UseSessionEditingProps {
  sessionId: string;
  session: SessionDetails | null;
  bookings: Booking[];
  newCapacity: number;
  newTime: string;
  onRefresh: () => Promise<void>;
  onSessionUpdated: () => void;
}

interface UseSessionEditingResult {
  editingCapacity: boolean;
  editingTime: boolean;
  setEditingCapacity: (editing: boolean) => void;
  setEditingTime: (editing: boolean) => void;
  handleUpdateCapacity: () => Promise<void>;
  handleUpdateTime: () => Promise<void>;
  handleCancelSession: () => Promise<void>;
}

export function useSessionEditing({
  sessionId,
  session,
  bookings,
  newCapacity,
  newTime,
  onRefresh,
  onSessionUpdated,
}: UseSessionEditingProps): UseSessionEditingResult {
  const [editingCapacity, setEditingCapacity] = useState(false);
  const [editingTime, setEditingTime] = useState(false);

  const handleUpdateCapacity = async () => {
    const confirmedCount = calculateConfirmedCount(bookings);
    const validation = validateCapacity(newCapacity, confirmedCount);

    if (!validation.valid) {
      toast.warning(validation.message);
      return;
    }

    try {
      // Update session capacity
      const { error } = await supabase
        .from('weekly_sessions')
        .update({ capacity: newCapacity })
        .eq('id', sessionId);

      if (error) throw error;

      // Update WOD capacity if exists
      await updateWorkoutCapacity(supabase, session?.workout_id || null, newCapacity);

      // Auto-promote waitlist members if capacity increased
      const spotsOpened = newCapacity - confirmedCount;
      await promoteWaitlistMembers(supabase, sessionId, spotsOpened);

      setEditingCapacity(false);
      await onRefresh();
      onSessionUpdated();
      toast.success('Capacity updated successfully');
    } catch (error) {
      console.error('Error updating capacity:', error);
      toast.error('Failed to update capacity');
    }
  };

  const handleUpdateTime = async () => {
    if (!newTime) {
      toast.warning('Please enter a valid time');
      return;
    }

    try {
      const { error } = await supabase
        .from('weekly_sessions')
        .update({ time: newTime })
        .eq('id', sessionId);

      if (error) throw error;

      // Update the WOD's class_times array and publish_time
      if (session?.workout_id) {
        const { data: allSessions } = await supabase
          .from('weekly_sessions')
          .select('time')
          .eq('workout_id', session.workout_id)
          .order('time', { ascending: true });

        if (allSessions) {
          const classTimes = allSessions.map(s => s.time);
          await supabase
            .from('wods')
            .update({
              class_times: classTimes,
              publish_time: newTime, // Update publish_time for Athlete page
            })
            .eq('id', session.workout_id);
        }
      }

      setEditingTime(false);
      await onRefresh();
      onSessionUpdated();
    } catch (error) {
      console.error('Error updating time:', error);
      toast.error('Failed to update time');
    }
  };

  const handleCancelSession = async () => {
    if (
      !await confirm({
        title: 'Cancel Session',
        message: 'Cancel this session? All bookings will be cancelled and members should be notified.',
        confirmText: 'Cancel Session',
        variant: 'danger',
      })
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from('weekly_sessions')
        .update({ status: 'cancelled' })
        .eq('id', sessionId);

      if (error) throw error;

      // Cancel all bookings
      await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('session_id', sessionId)
        .in('status', ['confirmed', 'waitlist']);

      toast.success('Session cancelled successfully. Please notify affected members.');
      onSessionUpdated();
    } catch (error) {
      console.error('Error cancelling session:', error);
      toast.error('Failed to cancel session');
    }
  };

  return {
    editingCapacity,
    editingTime,
    setEditingCapacity,
    setEditingTime,
    handleUpdateCapacity,
    handleUpdateTime,
    handleCancelSession,
  };
}
