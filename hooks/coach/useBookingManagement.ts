import { confirm } from '@/lib/confirm';
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { calculateConfirmedCount, canAddToSession } from '@/lib/coach/bookingHelpers';
import { Booking, Member } from './useSessionDetails';

interface UseBookingManagementProps {
  sessionId: string;
  bookings: Booking[];
  availableMembers: Member[];
  capacity: number;
  onRefresh: () => Promise<void>;
  onSessionUpdated: () => void;
}

interface UseBookingManagementResult {
  selectedMemberId: string;
  addingMember: boolean;
  setSelectedMemberId: (id: string) => void;
  handleManualBooking: () => Promise<void>;
  handleMarkNoShow: (bookingId: string, memberName: string) => Promise<void>;
  handleUndoNoShow: (bookingId: string, memberName: string) => Promise<void>;
  handleLateCancel: (bookingId: string, memberName: string) => Promise<void>;
  handleUndoLateCancel: (bookingId: string, memberName: string) => Promise<void>;
}

export function useBookingManagement({
  sessionId,
  bookings,
  availableMembers,
  capacity,
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

      // Determine booking status based on capacity
      const confirmedCount = calculateConfirmedCount(bookings);
      const bookingStatus = canAddToSession(confirmedCount, capacity)
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

  return {
    selectedMemberId,
    addingMember,
    setSelectedMemberId,
    handleManualBooking,
    handleMarkNoShow,
    handleUndoNoShow,
    handleLateCancel,
    handleUndoLateCancel,
  };
}
