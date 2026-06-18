import { confirm } from '@/lib/confirm';
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { authFetch } from '@/lib/auth-fetch';
import { calculateConfirmedCount, canAddToSession } from '@/lib/coach/bookingHelpers';
import { getEffectivePaymentMethod } from '@/types/member';
import { Booking, Member } from './useSessionDetails';

interface UseBookingManagementProps {
  sessionId: string;
  bookings: Booking[];
  availableMembers: Member[];
  capacity: number;
  trialNames: string[];
  dropInNames: string[];
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
  handleAddDropIn: () => Promise<void>;
  handleRemoveDropIn: (name: string) => Promise<void>;
  handleLinkTrialToMember: (trialName: string, memberId: string) => Promise<void>;
  handleMarkNoShow: (bookingId: string, memberName: string) => Promise<void>;
  handleUndoNoShow: (bookingId: string, memberName: string) => Promise<void>;
  handleLateCancel: (bookingId: string, memberName: string) => Promise<void>;
  handleUndoLateCancel: (bookingId: string, memberName: string) => Promise<void>;
  handleCancelBooking: (bookingId: string, memberName: string, memberId: string) => Promise<void>;
  handleToggleOg: (bookingId: string, memberName: string, isOg: boolean) => Promise<void>;
  handlePromoteWaitlist: (bookingId: string, memberName: string) => Promise<void>;
}

export function useBookingManagement({
  sessionId,
  bookings,
  availableMembers,
  capacity,
  trialNames,
  dropInNames,
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
      const bookingStatus = canAddToSession(confirmedCount + trialNames.length + dropInNames.length, capacity)
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

      // Increment 10-card sessions used on the holder's card (walk to ten_card_holder_id
      // for family-shared cards, e.g. Miriam's kids debit Miriam's card).
      const effectiveMethod = getEffectivePaymentMethod({
        primary_payment_method: selectedMember.primary_payment_method as never,
        membership_types: selectedMember.membership_types as never,
      });
      if (bookingStatus === 'confirmed' && effectiveMethod === 'ten_card') {
        const holderId = selectedMember.ten_card_holder_id || selectedMember.id;
        let holderUsed = selectedMember.ten_card_sessions_used || 0;
        if (holderId !== selectedMember.id) {
          const { data: holder } = await supabase
            .from('members')
            .select('ten_card_sessions_used')
            .eq('id', holderId)
            .single();
          holderUsed = holder?.ten_card_sessions_used || 0;
        }
        const { error: updateError } = await supabase
          .from('members')
          .update({ ten_card_sessions_used: holderUsed + 1 })
          .eq('id', holderId);

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
      const errObj = (error ?? {}) as { message?: string; code?: string; details?: string; hint?: string };
      const raw = errObj.message || errObj.details || errObj.hint || JSON.stringify(error);
      const code = errObj.code;
      const isDuplicate = code === '23505' || /unique_active_bookings|duplicate key/i.test(raw);
      toast.error(
        isDuplicate
          ? 'Member already has an active booking for this session (confirmed, waitlist, no-show, or late-cancel). Cancel the existing booking first.'
          : `Failed to book member: ${raw}${code ? ` (code ${code})` : ''}`
      );
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

  const handleAddDropIn = async () => {
    const raw = window.prompt('Drop-in name (one-time visitor — will appear at top of Score Entry as a whiteboard name):');
    if (raw === null) return;
    const name = raw.trim();
    if (!name) return;
    if (dropInNames.some(n => n.toLowerCase() === name.toLowerCase())) {
      toast.warning('That name is already in the drop-in list');
      return;
    }
    try {
      const { error } = await supabase
        .from('weekly_sessions')
        .update({ drop_in_names: [...dropInNames, name] })
        .eq('id', sessionId);
      if (error) throw error;
      await onRefresh();
      onSessionUpdated();
      toast.success(`${name} added as drop-in`);
    } catch (error) {
      console.error('Error adding drop-in:', error);
      toast.error('Failed to add drop-in');
    }
  };

  const handleRemoveDropIn = async (name: string) => {
    if (!await confirm({
      title: 'Remove Drop-in',
      message: `Remove ${name} from the drop-in list?`,
      confirmText: 'Remove',
      variant: 'danger',
    })) return;
    try {
      const { error } = await supabase
        .from('weekly_sessions')
        .update({ drop_in_names: dropInNames.filter(n => n !== name) })
        .eq('id', sessionId);
      if (error) throw error;
      await onRefresh();
      onSessionUpdated();
      toast.success(`${name} removed`);
    } catch (error) {
      console.error('Error removing drop-in:', error);
      toast.error('Failed to remove drop-in');
    }
  };

  const handleLinkTrialToMember = async (trialName: string, memberId: string) => {
    const member = availableMembers.find(m => m.id === memberId);
    const memberName = member?.name || 'this member';
    if (!await confirm({
      title: 'Link Trial to Member',
      message: `Link ${trialName}'s trial to ${memberName}'s account?\n\nThis creates a confirmed booking for ${memberName} on this session. The 10-card is NOT debited.`,
      confirmText: 'Link',
      variant: 'default',
    })) return;
    try {
      const res = await authFetch('/api/coach/link-trial-to-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, trialName, memberId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to link trial');
      await onRefresh();
      onSessionUpdated();
      toast.success(`Linked ${trialName} to ${memberName}`);
    } catch (error) {
      console.error('Error linking trial to member:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to link trial');
    }
  };

  const handleMarkNoShow = async (bookingId: string, memberName: string) => {
    if (
      !await confirm({
        title: 'Mark No-Show',
        message: `Mark ${memberName} as no-show?\n\nIf they have a 10-card, this will still count toward their usage. They won't count toward attendance statistics. Any scores already entered for ${memberName} on this class will be removed.`,
        confirmText: 'Mark No-Show',
        variant: 'danger',
      })
    ) {
      return;
    }

    try {
      const res = await authFetch('/api/coach/mark-no-show', {
        method: 'POST',
        body: JSON.stringify({ bookingId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to mark as no-show');
      }
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
        message: `Mark ${memberName} as late cancellation?\n\nThis will count toward their 10-card usage but NOT toward attendance statistics. Any scores already entered for ${memberName} on this class will be removed.`,
        confirmText: 'Mark Late Cancel',
        variant: 'danger',
      })
    ) {
      return;
    }

    try {
      const res = await authFetch('/api/coach/mark-late-cancel', {
        method: 'POST',
        body: JSON.stringify({ bookingId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to mark as late cancellation');
      }
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
        message: `Remove ${memberName}'s booking?\n\nThis is for bookings made in error. The 10-card session will be refunded if applicable. Any scores already entered for ${memberName} on this class will be removed.`,
        confirmText: 'Remove Booking',
        variant: 'danger',
      })
    ) {
      return;
    }

    try {
      // Server endpoint runs the booking-status update + 10-card refund + score
      // cleanup with a service-role client. The previous browser-side path used
      // the coach's auth, but RLS on wod_section_results / lift_records hid the
      // athlete's rows from the coach → cleanup silently skipped.
      const res = await authFetch('/api/coach/cancel-member-booking', {
        method: 'POST',
        body: JSON.stringify({ bookingId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'cancel failed');
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

  const handlePromoteWaitlist = async (bookingId: string, memberName: string) => {
    if (
      !await confirm({
        title: 'Promote from Waitlist',
        message: `Promote ${memberName} into the class?\n\nUse this when a slot has freed up (e.g. a no-show). If they have a 10-card, the session will count toward their usage.`,
        confirmText: 'Promote',
        variant: 'default',
      })
    ) {
      return;
    }

    try {
      const res = await authFetch('/api/coach/promote-waitlist', {
        method: 'POST',
        body: JSON.stringify({ bookingId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'promote failed');
      }

      await onRefresh();
      onSessionUpdated();
      toast.success(`${memberName} promoted to confirmed`);
    } catch (error) {
      console.error('Error promoting waitlist athlete:', error);
      toast.error('Failed to promote waitlist athlete');
    }
  };

  const handleToggleOg = async (bookingId: string, memberName: string, isOg: boolean) => {
    try {
      const res = await authFetch('/api/bookings/toggle-og', {
        method: 'POST',
        body: JSON.stringify({ bookingId, isOg }),
      });
      if (!res.ok) throw new Error('toggle failed');
      const result = (await res.json()) as { promotedMemberId: string | null };

      await onRefresh();
      onSessionUpdated();
      const baseMsg = isOg ? `${memberName} marked as Open Gym` : `${memberName} no longer Open Gym`;
      toast.success(result.promotedMemberId ? `${baseMsg} — first waitlist athlete promoted` : baseMsg);
    } catch (error) {
      console.error('Error toggling OG flag:', error);
      toast.error('Failed to update Open Gym flag');
    }
  };

  return {
    selectedMemberId,
    addingMember,
    setSelectedMemberId,
    handleManualBooking,
    handleAddTrialAthlete,
    handleRemoveTrialAthlete,
    handleAddDropIn,
    handleRemoveDropIn,
    handleLinkTrialToMember,
    handleMarkNoShow,
    handleUndoNoShow,
    handleLateCancel,
    handleUndoLateCancel,
    handleCancelBooking,
    handleToggleOg,
    handlePromoteWaitlist,
  };
}
