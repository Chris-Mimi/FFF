import { confirm } from '@/lib/confirm';
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { authFetch } from '@/lib/auth-fetch';
import { calculateConfirmedCount, canAddToSession } from '@/lib/coach/bookingHelpers';
import { Booking, Member } from './useSessionDetails';

interface UseBookingManagementProps {
  sessionId: string;
  bookings: Booking[];
  availableMembers: Member[];
  capacity: number;
  trialNames: string[];
  onRefresh: () => Promise<void>;
  onSessionUpdated: () => void;
}

interface UseBookingManagementResult {
  selectedMemberId: string;
  addingMember: boolean;
  setSelectedMemberId: (id: string) => void;
  handleManualBooking: () => Promise<void>;
  handleAddTrialAthlete: () => Promise<void>;
  handleRemoveTrialAthlete: (name: string) => Promise<void>;
  handleMarkNoShow: (bookingId: string, memberName: string) => Promise<void>;
  handleUndoNoShow: (bookingId: string, memberName: string) => Promise<void>;
  handleLateCancel: (bookingId: string, memberName: string) => Promise<void>;
  handleUndoLateCancel: (bookingId: string, memberName: string) => Promise<void>;
  handleCancelBooking: (bookingId: string, memberName: string, memberId: string) => Promise<void>;
}

export function useBookingManagement({
  sessionId,
  bookings,
  availableMembers,
  capacity,
  trialNames,
  onRefresh,
  onSessionUpdated,
}: UseBookingManagementProps): UseBookingManagementResult {
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  const handleManualBooking = async () => {
    if (!selectedMemberId) {
      toast.warning('Please select a member');
      return;
    }

    setAddingMember(true);
    try {
      const selectedMember = availableMembers.find(m => m.id === selectedMemberId);
      if (!selectedMember) {
        throw new Error('Member not found');
      }

      // Determine booking status based on capacity (trials count toward capacity)
      const confirmedCount = calculateConfirmedCount(bookings);
      const bookingStatus = canAddToSession(confirmedCount + trialNames.length, capacity)
        ? 'confirmed'
        : 'waitlist';

      // Create booking
      const { error: bookingError } = await supabase
        .from('bookings')
        .insert({
          session_id: sessionId,
          member_id: selectedMemberId,
          status: bookingStatus,
          booked_at: new Date().toISOString(),
        });

      if (bookingError) throw bookingError;

      // Increment 10-card sessions used if member has 10-card and booking is confirmed
      if (
        bookingStatus === 'confirmed' &&
        selectedMember.membership_types?.includes('ten_card')
      ) {
        const { error: updateError } = await supabase
          .from('members')
          .update({
            ten_card_sessions_used: selectedMember.ten_card_sessions_used + 1,
          })
          .eq('id', selectedMemberId);

        if (updateError) {
          console.error('Failed to increment 10-card sessions:', updateError);
          // Don't fail the booking for this
        }
      }

      // Notify member (fire-and-forget)
      authFetch('/api/notifications/coach-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, memberId: selectedMemberId, action: 'added', status: bookingStatus }),
      }).catch((err) => console.error('Coach booking notification failed:', err));

      await onRefresh();
      onSessionUpdated();

      const statusMessage =
        bookingStatus === 'confirmed'
          ? `${selectedMember.name} booked successfully`
          : `${selectedMember.name} added to waitlist (session full)`;
      toast.success(statusMessage);
    } catch (error) {
      console.error('Error booking member:', error);
      toast.error('Failed to book member');
    } finally {
      setAddingMember(false);
    }
  };

  const handleAddTrialAthlete = async () => {
    const raw = window.prompt('Trial athlete name (will appear at top of Score Entry as a whiteboard name):');
    if (raw === null) return;
    const name = raw.trim();
    if (!name) return;
    if (trialNames.some(n => n.toLowerCase() === name.toLowerCase())) {
      toast.warning('That name is already in the trial list');
      return;
    }
    try {
      const { error } = await supabase
        .from('weekly_sessions')
        .update({ trial_names: [...trialNames, name] })
        .eq('id', sessionId);
      if (error) throw error;
      await onRefresh();
      onSessionUpdated();
      toast.success(`${name} added as trial athlete`);
    } catch (error) {
      console.error('Error adding trial athlete:', error);
      toast.error('Failed to add trial athlete');
    }
  };

  const handleRemoveTrialAthlete = async (name: string) => {
    if (!await confirm({
      title: 'Remove Trial Athlete',
      message: `Remove ${name} from the trial list?`,
      confirmText: 'Remove',
      variant: 'danger',
    })) return;
    try {
      const { error } = await supabase
        .from('weekly_sessions')
        .update({ trial_names: trialNames.filter(n => n !== name) })
        .eq('id', sessionId);
      if (error) throw error;
      await onRefresh();
      onSessionUpdated();
      toast.success(`${name} removed`);
    } catch (error) {
      console.error('Error removing trial athlete:', error);
      toast.error('Failed to remove trial athlete');
    }
  };

  const handleMarkNoShow = async (bookingId: string, memberName: string) => {
    if (
      !await confirm({
        title: 'Mark No-Show',
        message: `Mark ${memberName} as no-show?\n\nIf they have a 10-card, this will still count toward their usage. They won't count toward attendance statistics.`,
        confirmText: 'Mark No-Show',
        variant: 'danger',
      })
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'no_show' })
        .eq('id', bookingId);

      if (error) throw error;

      await onRefresh();
      onSessionUpdated();
    } catch (error) {
      console.error('Error marking no-show:', error);
      toast.error('Failed to mark as no-show');
    }
  };

  const handleUndoNoShow = async (bookingId: string, memberName: string) => {
    if (!await confirm({ title: 'Undo No-Show', message: `Mark ${memberName} as attended (undo no-show)?`, confirmText: 'Undo', variant: 'default' })) {
      return;
    }

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId);

      if (error) throw error;

      await onRefresh();
      onSessionUpdated();
    } catch (error) {
      console.error('Error undoing no-show:', error);
      toast.error('Failed to undo no-show');
    }
  };

  const handleLateCancel = async (bookingId: string, memberName: string) => {
    if (
      !await confirm({
        title: 'Late Cancellation',
        message: `Mark ${memberName} as late cancellation?\n\nThis will count toward their 10-card usage but NOT toward attendance statistics.`,
        confirmText: 'Mark Late Cancel',
        variant: 'danger',
      })
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'late_cancel' })
        .eq('id', bookingId);

      if (error) throw error;

      await onRefresh();
      onSessionUpdated();
    } catch (error) {
      console.error('Error marking late cancellation:', error);
      toast.error('Failed to mark as late cancellation');
    }
  };

  const handleUndoLateCancel = async (bookingId: string, memberName: string) => {
    if (!await confirm({ title: 'Undo Late Cancel', message: `Mark ${memberName} as attended (undo late cancellation)?`, confirmText: 'Undo', variant: 'default' })) {
      return;
    }

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId);

      if (error) throw error;

      await onRefresh();
      onSessionUpdated();
    } catch (error) {
      console.error('Error undoing late cancellation:', error);
      toast.error('Failed to undo late cancellation');
    }
  };

  const handleCancelBooking = async (bookingId: string, memberName: string, memberId: string) => {
    if (
      !await confirm({
        title: 'Remove Booking',
        message: `Remove ${memberName}'s booking?\n\nThis is for bookings made in error. The 10-card session will be refunded if applicable.`,
        confirmText: 'Remove Booking',
        variant: 'danger',
      })
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'coach_cancelled' })
        .eq('id', bookingId);

      if (error) throw error;

      // Always refund 10-card if applicable
      const { data: member } = await supabase
        .from('members')
        .select('membership_types, ten_card_sessions_used')
        .eq('id', memberId)
        .single();

      if (member?.membership_types?.includes('ten_card') && member.ten_card_sessions_used > 0) {
        await supabase
          .from('members')
          .update({ ten_card_sessions_used: member.ten_card_sessions_used - 1 })
          .eq('id', memberId);
      }

      // Clean up scores for this member on this session's workout
      const { data: session } = await supabase
        .from('weekly_sessions')
        .select('workout_id')
        .eq('id', sessionId)
        .single();

      if (session?.workout_id) {
        // Capture user_ids from wod_section_results before deletion — lift_records
        // only has user_id (auth.users.id), which can differ from members.id.
        const { data: existingResults } = await supabase
          .from('wod_section_results')
          .select('user_id')
          .eq('wod_id', session.workout_id)
          .or(`member_id.eq.${memberId},user_id.eq.${memberId}`);

        const userIds = [...new Set((existingResults || []).map(r => r.user_id).filter(Boolean))];

        // Delete wod_section_results by member_id (coach-entered) and user_id (athlete self-entered)
        await supabase
          .from('wod_section_results')
          .delete()
          .eq('wod_id', session.workout_id)
          .or(`member_id.eq.${memberId},user_id.eq.${memberId}`);

        if (userIds.length > 0) {
          await supabase
            .from('lift_records')
            .delete()
            .eq('wod_id', session.workout_id)
            .in('user_id', userIds);
        }
      }

      // Notify member (fire-and-forget)
      authFetch('/api/notifications/coach-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, memberId, action: 'removed' }),
      }).catch((err) => console.error('Coach removal notification failed:', err));

      await onRefresh();
      onSessionUpdated();
      toast.success(`${memberName}'s booking removed`);
    } catch (error) {
      console.error('Error removing booking:', error);
      toast.error('Failed to remove booking');
    }
  };

  return {
    selectedMemberId,
    addingMember,
    setSelectedMemberId,
    handleManualBooking,
    handleAddTrialAthlete,
    handleRemoveTrialAthlete,
    handleMarkNoShow,
    handleUndoNoShow,
    handleLateCancel,
    handleUndoLateCancel,
    handleCancelBooking,
  };
}
