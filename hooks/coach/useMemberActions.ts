import { useState } from 'react';
import { toast } from 'sonner';
import { authFetch } from '@/lib/auth-fetch';
import { supabase } from '@/lib/supabase';
import { MembershipType, ClassType, Member } from '@/types/member';

export function useMemberActions(
  refreshData: () => Promise<void>,
  refreshPendingCount: () => Promise<void>,
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>
) {
  const [processingMemberId, setProcessingMemberId] = useState<string | null>(null);

  const handleApprove = async (memberId: string) => {
    setProcessingMemberId(memberId);
    try {
      const response = await authFetch('/api/members/approve', {
        method: 'POST',
        body: JSON.stringify({ memberId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve member');
      }

      toast.success(data.message || 'Member approved successfully');
      await refreshData();
      await refreshPendingCount();
    } catch (error) {
      console.error('Error approving member:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to approve member. Please try again.');
    } finally {
      setProcessingMemberId(null);
    }
  };

  const handleBlock = async (memberId: string) => {
    if (!confirm('Are you sure you want to block this member? They will lose access to their account.')) {
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

  const handleUnapprove = async (memberId: string) => {
    if (!confirm('Move this member back to pending status? This will clear their trial period.')) {
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

  const handleUnblock = async (memberId: string) => {
    if (!confirm('Unblock this member? They will be moved to pending status and need re-approval.')) {
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
    if (!confirm(`Start ${days}-day athlete trial for this member?`)) {
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
    if (!confirm(`Extend trial by ${days} days?`)) {
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
    if (!confirm('Activate full subscription? This will remove the trial end date.')) {
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

      toast.success(data.message || 'Subscription activated successfully');
      await refreshData();
    } catch (error) {
      console.error('Error activating subscription:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to activate subscription. Please try again.');
    } finally {
      setProcessingMemberId(null);
    }
  };

  const handleToggleMembershipType = async (memberId: string, type: MembershipType, currentTypes: MembershipType[]) => {
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

  return {
    processingMemberId,
    handleApprove,
    handleBlock,
    handleUnapprove,
    handleUnblock,
    handleStartTrial,
    handleExtendTrial,
    handleActivateSubscription,
    handleToggleMembershipType,
    handleToggleClassType,
  };
}
