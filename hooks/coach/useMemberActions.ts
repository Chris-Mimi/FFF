import { confirm } from '@/lib/confirm';
import { useState } from 'react';
import { toast } from 'sonner';
import { authFetch } from '@/lib/auth-fetch';
import { supabase } from '@/lib/supabase';
import { MembershipType, ClassType, Member, MEMBERSHIP_TYPE_LABELS } from '@/types/member';

export function useMemberActions(
  refreshData: () => Promise<void>,
  refreshPendingCount: () => Promise<void>,
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>,
  refreshWhiteboardNames?: () => Promise<void>
) {
  const [processingMemberId, setProcessingMemberId] = useState<string | null>(null);

  const handleApprove = async (memberId: string, whiteboardName?: string) => {
    setProcessingMemberId(memberId);
    try {
      const response = await authFetch('/api/members/approve', {
        method: 'POST',
        body: JSON.stringify({ memberId, whiteboardName: whiteboardName || null })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve member');
      }

      const linkedMsg = data.linkedScores ? ` (${data.linkedScores} scores linked)` : '';
      toast.success((data.message || 'Member approved successfully') + linkedMsg);
      await refreshData();
      await refreshPendingCount();
      if (refreshWhiteboardNames) await refreshWhiteboardNames();
    } catch (error) {
      console.error('Error approving member:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to approve member. Please try again.');
    } finally {
      setProcessingMemberId(null);
    }
  };

  const handleBlock = async (memberId: string) => {
    if (!await confirm({ title: 'Block Member', message: 'Are you sure you want to block this member? They will lose access to their account.', confirmText: 'Block', variant: 'danger' })) {
      return;
    }

    setProcessingMemberId(memberId);
    try {
      const response = await authFetch('/api/members/block', {
        method: 'POST',
        body: JSON.stringify({ memberId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to block member');
      }

      toast.success(data.message || 'Member blocked successfully');
      await refreshData();
      await refreshPendingCount();
    } catch (error) {
      console.error('Error blocking member:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to block member. Please try again.');
    } finally {
      setProcessingMemberId(null);
    }
  };

  const handleReject = async (memberId: string, memberName: string) => {
    if (!await confirm({
      title: 'Reject Pending Member',
      message: `Permanently delete ${memberName}'s registration? Their account and email will be removed and they can re-register from scratch. This cannot be undone.`,
      confirmText: 'Reject & Delete',
      variant: 'danger'
    })) {
      return;
    }

    setProcessingMemberId(memberId);
    try {
      const response = await authFetch('/api/members/reject', {
        method: 'POST',
        body: JSON.stringify({ memberId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject member');
      }

      toast.success(data.message || 'Member rejected');
      await refreshData();
      await refreshPendingCount();
    } catch (error) {
      console.error('Error rejecting member:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reject member. Please try again.');
    } finally {
      setProcessingMemberId(null);
    }
  };

  const handleUnapprove = async (memberId: string) => {
    if (!await confirm({ title: 'Unapprove Member', message: 'Move this member back to pending status? This will clear their trial period.', confirmText: 'Unapprove', variant: 'danger' })) {
      return;
    }

    setProcessingMemberId(memberId);
    try {
      const response = await authFetch('/api/members/unapprove', {
        method: 'POST',
        body: JSON.stringify({ memberId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unapprove member');
      }

      toast.info(data.message || 'Member moved back to pending status');
      await refreshData();
      await refreshPendingCount();
    } catch (error) {
      console.error('Error unapproving member:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to unapprove member. Please try again.');
    } finally {
      setProcessingMemberId(null);
    }
  };

  const handlePark = async (memberId: string) => {
    if (!await confirm({ title: 'Park Member', message: 'Park this member? They\'ll be hidden from the Active, At-Risk, Subscriptions and 10-Card lists until you Restart them. Booking access is unchanged.', confirmText: 'Park', variant: 'default' })) {
      return;
    }

    setProcessingMemberId(memberId);
    try {
      const response = await authFetch('/api/members/park', {
        method: 'POST',
        body: JSON.stringify({ memberId, parked: true })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to park member');
      }

      toast.success(data.message || 'Member parked');
      await refreshData();
    } catch (error) {
      console.error('Error parking member:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to park member. Please try again.');
    } finally {
      setProcessingMemberId(null);
    }
  };

  const handleRestart = async (memberId: string) => {
    setProcessingMemberId(memberId);
    try {
      const response = await authFetch('/api/members/park', {
        method: 'POST',
        body: JSON.stringify({ memberId, parked: false })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to restart member');
      }

      toast.success(data.message || 'Member restarted');
      await refreshData();
    } catch (error) {
      console.error('Error restarting member:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to restart member. Please try again.');
    } finally {
      setProcessingMemberId(null);
    }
  };

  const handleUnblock = async (memberId: string) => {
    if (!await confirm({ title: 'Unblock Member', message: 'Unblock this member? They will be moved to pending status and need re-approval.', confirmText: 'Unblock', variant: 'default' })) {
      return;
    }

    setProcessingMemberId(memberId);
    try {
      const response = await authFetch('/api/members/unblock', {
        method: 'POST',
        body: JSON.stringify({ memberId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unblock member');
      }

      toast.success(data.message || 'Member unblocked and moved to pending status');
      await refreshData();
      await refreshPendingCount();
    } catch (error) {
      console.error('Error unblocking member:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to unblock member. Please try again.');
    } finally {
      setProcessingMemberId(null);
    }
  };

  const handleStartTrial = async (memberId: string, days: number = 30) => {
    if (!await confirm({ title: 'Start Trial', message: `Start ${days}-day athlete trial for this member?`, confirmText: 'Start Trial', variant: 'default' })) {
      return;
    }

    setProcessingMemberId(memberId);
    try {
      const response = await authFetch('/api/members/athlete-subscription', {
        method: 'POST',
        body: JSON.stringify({ memberId, action: 'start_trial', days })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start trial');
      }

      toast.success(data.message || `${days}-day trial started`);
      await refreshData();
    } catch (error) {
      console.error('Error starting trial:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start trial. Please try again.');
    } finally {
      setProcessingMemberId(null);
    }
  };

  const handleExtendTrial = async (memberId: string, days: number = 30) => {
    if (!await confirm({ title: 'Extend Trial', message: `Extend trial by ${days} days?`, confirmText: 'Extend', variant: 'default' })) {
      return;
    }

    setProcessingMemberId(memberId);
    try {
      const response = await authFetch('/api/members/athlete-subscription', {
        method: 'POST',
        body: JSON.stringify({ memberId, action: 'extend_trial', days })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extend trial');
      }

      toast.success(data.message || `Trial extended by ${days} days`);
      await refreshData();
    } catch (error) {
      console.error('Error extending trial:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to extend trial. Please try again.');
    } finally {
      setProcessingMemberId(null);
    }
  };

  const handleActivateSubscription = async (memberId: string) => {
    if (!await confirm({ title: 'Activate 1 Year', message: 'Activate subscription for 1 year? (e.g. cash payment)', confirmText: 'Activate', variant: 'default' })) {
      return;
    }

    setProcessingMemberId(memberId);
    try {
      const response = await authFetch('/api/members/athlete-subscription', {
        method: 'POST',
        body: JSON.stringify({ memberId, action: 'activate' })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to activate subscription');
      }

      toast.success(data.message || '1-year subscription activated');
      await refreshData();
    } catch (error) {
      console.error('Error activating subscription:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to activate subscription. Please try again.');
    } finally {
      setProcessingMemberId(null);
    }
  };

  const handleActivateMonthly = async (memberId: string) => {
    if (!await confirm({ title: 'Activate 30 Days', message: 'Activate subscription for 30 days? (e.g. cash payment, monthly billing)', confirmText: 'Activate', variant: 'default' })) {
      return;
    }

    setProcessingMemberId(memberId);
    try {
      const response = await authFetch('/api/members/athlete-subscription', {
        method: 'POST',
        body: JSON.stringify({ memberId, action: 'activate_monthly' })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to activate subscription');
      }

      toast.success(data.message || '30-day subscription activated');
      await refreshData();
    } catch (error) {
      console.error('Error activating monthly subscription:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to activate subscription. Please try again.');
    } finally {
      setProcessingMemberId(null);
    }
  };

  const handleActivatePermanent = async (memberId: string) => {
    if (!await confirm({ title: 'Activate Permanent', message: 'Activate permanent subscription with no expiry date?', confirmText: 'Activate', variant: 'default' })) {
      return;
    }

    setProcessingMemberId(memberId);
    try {
      const response = await authFetch('/api/members/athlete-subscription', {
        method: 'POST',
        body: JSON.stringify({ memberId, action: 'activate_permanent' })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to activate subscription');
      }

      toast.success(data.message || 'Permanent subscription activated');
      await refreshData();
    } catch (error) {
      console.error('Error activating permanent subscription:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to activate subscription. Please try again.');
    } finally {
      setProcessingMemberId(null);
    }
  };

  const handleCancelSubscription = async (memberId: string) => {
    if (!await confirm({ title: 'Cancel Subscription', message: 'Cancel this athlete\'s subscription? They will lose access to the athlete app.', confirmText: 'Cancel Sub', variant: 'danger' })) {
      return;
    }

    setProcessingMemberId(memberId);
    try {
      const response = await authFetch('/api/members/athlete-subscription', {
        method: 'POST',
        body: JSON.stringify({ memberId, action: 'expire' })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      toast.success('Subscription cancelled');
      await refreshData();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to cancel subscription. Please try again.');
    } finally {
      setProcessingMemberId(null);
    }
  };

  const handleToggleMembershipType = async (memberId: string, type: MembershipType, currentTypes: MembershipType[]) => {
    // Guardrail: once a membership type is set (i.e. member has been approved with one), confirm any change.
    // Prevents accidental clicks while a filter is on. No prompt on the very first selection.
    if (currentTypes.length > 0) {
      const isRemoving = currentTypes.includes(type);
      const label = MEMBERSHIP_TYPE_LABELS[type];
      const ok = await confirm({
        title: 'Change membership type?',
        message: isRemoving
          ? `Remove "${label}" from this member?`
          : `Add "${label}" to this member?`,
        confirmText: isRemoving ? 'Remove' : 'Add',
        variant: 'danger',
      });
      if (!ok) return;
    }

    try {
      const newTypes = currentTypes.includes(type)
        ? currentTypes.filter(t => t !== type)
        : [...currentTypes, type];

      const { error } = await supabase
        .from('members')
        .update({ membership_types: newTypes })
        .eq('id', memberId);

      if (error) throw error;

      setMembers(prevMembers =>
        prevMembers.map(m =>
          m.id === memberId ? { ...m, membership_types: newTypes } : m
        )
      );
    } catch (error) {
      console.error('Error updating membership types:', error);
      toast.error('Failed to update membership type');
    }
  };

  const handleToggleClassType = async (memberId: string, type: ClassType, currentClassTypes: ClassType[]) => {
    try {
      const newClassTypes = currentClassTypes.includes(type)
        ? currentClassTypes.filter(t => t !== type)
        : [...currentClassTypes, type];

      const { error } = await supabase
        .from('members')
        .update({ class_types: newClassTypes })
        .eq('id', memberId);

      if (error) throw error;

      setMembers(prevMembers =>
        prevMembers.map(m =>
          m.id === memberId ? { ...m, class_types: newClassTypes } : m
        )
      );
    } catch (error) {
      console.error('Error updating class types:', error);
      toast.error('Failed to update class types');
    }
  };

  const handleSetGender = async (memberId: string, gender: 'M' | 'F' | null) => {
    try {
      const { error } = await supabase
        .from('members')
        .update({ gender })
        .eq('id', memberId);

      if (error) throw error;

      setMembers(prevMembers =>
        prevMembers.map(m =>
          m.id === memberId ? { ...m, gender } : m
        )
      );
    } catch (error) {
      console.error('Error updating gender:', error);
      toast.error('Failed to update gender');
    }
  };

  const handleSetPaymentMethod = async (memberId: string, method: MembershipType | null) => {
    try {
      const { error } = await supabase
        .from('members')
        .update({ primary_payment_method: method })
        .eq('id', memberId);

      if (error) throw error;

      setMembers(prevMembers =>
        prevMembers.map(m =>
          m.id === memberId ? { ...m, primary_payment_method: method } : m
        )
      );
    } catch (error) {
      console.error('Error updating primary payment method:', error);
      toast.error('Failed to update payment method');
    }
  };

  const handleSetTenCardHolder = async (memberId: string, holderId: string | null) => {
    try {
      const { error } = await supabase
        .from('members')
        .update({ ten_card_holder_id: holderId })
        .eq('id', memberId);

      if (error) throw error;

      setMembers(prevMembers =>
        prevMembers.map(m =>
          m.id === memberId ? { ...m, ten_card_holder_id: holderId } : m
        )
      );
    } catch (error) {
      console.error('Error updating 10-card holder:', error);
      toast.error('Failed to update 10-card holder');
    }
  };

  const handleToggleGuardianOnly = async (memberId: string, guardianOnly: boolean) => {
    try {
      const { error } = await supabase
        .from('members')
        .update({ guardian_only: guardianOnly })
        .eq('id', memberId);

      if (error) throw error;

      setMembers(prevMembers =>
        prevMembers.map(m =>
          m.id === memberId ? { ...m, guardian_only: guardianOnly } : m
        )
      );

      if (guardianOnly) {
        await refreshData();
      }
    } catch (error) {
      console.error('Error updating guardian_only:', error);
      toast.error('Failed to update guardian status');
    }
  };

  return {
    processingMemberId,
    handleApprove,
    handleReject,
    handleBlock,
    handleUnapprove,
    handleUnblock,
    handlePark,
    handleRestart,
    handleStartTrial,
    handleExtendTrial,
    handleActivateSubscription,
    handleActivateMonthly,
    handleActivatePermanent,
    handleCancelSubscription,
    handleToggleMembershipType,
    handleToggleClassType,
    handleSetGender,
    handleToggleGuardianOnly,
    handleSetPaymentMethod,
    handleSetTenCardHolder,
  };
}
