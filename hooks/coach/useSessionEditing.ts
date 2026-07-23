import { confirm } from '@/lib/confirm';
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { authFetch } from '@/lib/auth-fetch';
import {
  validateCapacity,
  promoteWaitlistMembers,
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
  handleRestoreSession: () => Promise<void>;
  handleToggleLock: () => Promise<void>;
  isEffectivelyLocked: boolean;
  handleToggleAthleteVisibility: () => Promise<void>;
  isHiddenFromAthletes: boolean;
  handleTogglePrivate: () => Promise<void>;
  isPrivate: boolean;
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

      // Auto-promote waitlist members if capacity increased
      const spotsOpened = newCapacity - confirmedCount;
      const promotedMemberIds = await promoteWaitlistMembers(supabase, sessionId, spotsOpened);

      // Notify promoted members (fire-and-forget)
      if (promotedMemberIds.length > 0) {
        authFetch('/api/notifications/coach-booking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, action: 'waitlist_promoted', promotedMemberIds }),
        }).catch((err) => console.error('Waitlist promotion notification failed:', err));
      }

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

  // Compute effective lock state: locked if is_locked=true, or is_locked=null and session start time has passed
  const isEffectivelyLocked = (() => {
    if (!session) return false;
    if (session.is_locked === true) return true;
    if (session.is_locked === false) return false;
    // is_locked is null → auto mode: locked if session start time has passed
    const sessionDateTime = new Date(`${session.date}T${session.time}`);
    return sessionDateTime < new Date();
  })();

  const handleToggleLock = async () => {
    if (!session) return;

    // If currently effectively locked, unlock (set is_locked=false)
    // If currently unlocked, lock (set is_locked=true)
    const newLockState = isEffectivelyLocked ? false : true;

    try {
      const { error } = await supabase
        .from('weekly_sessions')
        .update({ is_locked: newLockState })
        .eq('id', sessionId);

      if (error) throw error;

      await onRefresh();
      onSessionUpdated();
      toast.success(newLockState ? 'Session locked' : 'Session unlocked');
    } catch (error) {
      console.error('Error toggling session lock:', error);
      toast.error('Failed to update session lock');
    }
  };

  // Hidden = session exists but isn't bookable/visible to athletes (status 'draft').
  // Used for interim copies that shouldn't reach the athlete app. Toggles published↔draft.
  const isHiddenFromAthletes = session?.status === 'draft';

  const handleToggleAthleteVisibility = async () => {
    if (!session) return;
    const newStatus = isHiddenFromAthletes ? 'published' : 'draft';
    try {
      const { error } = await supabase
        .from('weekly_sessions')
        .update({ status: newStatus })
        .eq('id', sessionId);

      if (error) throw error;

      await onRefresh();
      onSessionUpdated();
      toast.success(newStatus === 'draft' ? 'Hidden from athletes' : 'Visible to athletes');
    } catch (error) {
      console.error('Error toggling athlete visibility:', error);
      toast.error('Failed to update visibility');
    }
  };

  // Private event: hidden from athletes AND its exercises excluded from search /
  // Planner / movement analytics. One combined switch — sets is_private and forces
  // status to draft (turning Private off restores the session to published/visible).
  const isPrivate = session?.is_private === true;

  const handleTogglePrivate = async () => {
    if (!session) return;
    const makePrivate = !isPrivate;
    try {
      const { error } = await supabase
        .from('weekly_sessions')
        .update({ is_private: makePrivate, status: makePrivate ? 'draft' : 'published' })
        .eq('id', sessionId);

      if (error) throw error;

      await onRefresh();
      onSessionUpdated();
      toast.success(makePrivate ? 'Private event — hidden from athletes & analytics' : 'No longer private');
    } catch (error) {
      console.error('Error toggling private event:', error);
      toast.error('Failed to update private setting');
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
      // Remember the session's prior status so Restore can reopen it to exactly
      // what it was (published, or draft for a hidden/private session).
      const priorSessionStatus = session?.status ?? 'published';
      const { error } = await supabase
        .from('weekly_sessions')
        .update({ status: 'cancelled', pre_cancel_status: priorSessionStatus })
        .eq('id', sessionId);

      if (error) throw error;

      // Cancel all bookings, tagging each with its prior status so Restore can put
      // it back exactly — and so Restore never touches a booking an athlete
      // cancelled themselves (those keep a NULL pre_cancel_status).
      await supabase
        .from('bookings')
        .update({ status: 'cancelled', pre_cancel_status: 'confirmed' })
        .eq('session_id', sessionId)
        .eq('status', 'confirmed');
      await supabase
        .from('bookings')
        .update({ status: 'cancelled', pre_cancel_status: 'waitlist' })
        .eq('session_id', sessionId)
        .eq('status', 'waitlist');

      // Notify affected members (fire-and-forget)
      authFetch('/api/notifications/session-cancelled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      }).catch((err) => console.error('Session cancel notification failed:', err));

      toast.success('Session cancelled — members have been notified.');
      onSessionUpdated();
    } catch (error) {
      console.error('Error cancelling session:', error);
      toast.error('Failed to cancel session');
    }
  };

  // Undo an accidental session cancel. Reopens the session to its prior status and
  // restores only the bookings THIS cancel flipped (tagged with pre_cancel_status),
  // back to their exact prior status — athlete self-cancels are left untouched.
  const handleRestoreSession = async () => {
    if (
      !await confirm({
        title: 'Restore Session',
        message: 'Reopen this session and restore its bookings? Athletes who cancelled themselves stay cancelled.',
        confirmText: 'Restore Session',
      })
    ) {
      return;
    }

    try {
      const restoreStatus = session?.pre_cancel_status ?? 'published';
      const { error } = await supabase
        .from('weekly_sessions')
        .update({ status: restoreStatus, pre_cancel_status: null })
        .eq('id', sessionId);

      if (error) throw error;

      await supabase
        .from('bookings')
        .update({ status: 'confirmed', pre_cancel_status: null })
        .eq('session_id', sessionId)
        .eq('pre_cancel_status', 'confirmed');
      await supabase
        .from('bookings')
        .update({ status: 'waitlist', pre_cancel_status: null })
        .eq('session_id', sessionId)
        .eq('pre_cancel_status', 'waitlist');

      toast.success('Session restored.');
      await onRefresh();
      onSessionUpdated();
    } catch (error) {
      console.error('Error restoring session:', error);
      toast.error('Failed to restore session');
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
    handleRestoreSession,
    handleToggleLock,
    isEffectivelyLocked,
    handleToggleAthleteVisibility,
    isHiddenFromAthletes,
    handleTogglePrivate,
    isPrivate,
  };
}
