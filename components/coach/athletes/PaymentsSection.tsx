'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface MemberData {
  id: string;
  email: string;
  stripe_customer_id: string | null;
  ten_card_sessions_used: number | null;
  ten_card_total: number | null;
  ten_card_expiry_date: string | null;
  membership_types: string[] | null;
}

interface Subscription {
  id: string;
  stripe_subscription_id: string | null;
  plan_type: 'monthly' | 'yearly' | null;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export default function PaymentsSection({ memberId }: { memberId?: string }) {
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actualMemberId, setActualMemberId] = useState<string | null>(null);

  // 10-card form state
  const [tenCardTotal, setTenCardTotal] = useState('10');
  const [tenCardUsed, setTenCardUsed] = useState('0');
  const [tenCardExpiry, setTenCardExpiry] = useState('');

  useEffect(() => {
    if (memberId) {
      fetchPaymentData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  const fetchPaymentData = async () => {
    if (!memberId) return;
    setLoading(true);
    try {
      // First try to get member data directly by ID (works for family members who have no email)
      let member = null;
      const { data: memberById, error: memberByIdError } = await supabase
        .from('members')
        .select('id, email, stripe_customer_id, ten_card_sessions_used, ten_card_total, ten_card_expiry_date, membership_types')
        .eq('id', memberId)
        .single();

      if (memberById) {
        member = memberById;
      } else {
        // Fall back to email lookup for cases where athlete_profiles.user_id ≠ members.id
        const { data: athlete, error: athleteError } = await supabase
          .from('athlete_profiles')
          .select('email')
          .eq('user_id', memberId)
          .single();

        if (athleteError || !athlete?.email) {
          setLoading(false);
          return;
        }

        const { data: memberByEmail, error: memberByEmailError } = await supabase
          .from('members')
          .select('id, email, stripe_customer_id, ten_card_sessions_used, ten_card_total, ten_card_expiry_date, membership_types')
          .eq('email', athlete.email)
          .single();

        if (memberByEmailError) throw memberByEmailError;
        member = memberByEmail;
      }

      if (!member) return;
      setMemberData(member);
      setActualMemberId(member.id); // Store actual member ID for updates

      // Set form values
      if (member) {
        setTenCardTotal(String(member.ten_card_total || 10));
        setTenCardUsed(String(member.ten_card_sessions_used || 0));
        setTenCardExpiry(member.ten_card_expiry_date ? member.ten_card_expiry_date.split('T')[0] : '');
      }

      // Fetch subscriptions using actual member.id
      const { data: subs, error: subsError } = await supabase
        .from('subscriptions')
        .select('id, stripe_subscription_id, plan_type, status, current_period_start, current_period_end, cancel_at_period_end')
        .eq('member_id', member.id)
        .order('created_at', { ascending: false });

      if (subsError) throw subsError;
      setSubscriptions(subs || []);
    } catch (error) {
      console.error('Error fetching payment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave10Card = async () => {
    if (!actualMemberId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('members')
        .update({
          ten_card_total: parseInt(tenCardTotal) || 10,
          ten_card_sessions_used: parseInt(tenCardUsed) || 0,
          ten_card_expiry_date: tenCardExpiry || null,
        })
        .eq('id', actualMemberId);

      if (error) throw error;
      toast.success('10-card updated successfully!');
      fetchPaymentData();
    } catch (error) {
      console.error('Error updating 10-card:', error);
      toast.error('Failed to update 10-card. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset10Card = async () => {
    if (!actualMemberId) return;
    if (!confirm('Reset 10-card to 0 sessions used?')) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('members')
        .update({
          ten_card_sessions_used: 0,
        })
        .eq('id', actualMemberId);

      if (error) throw error;
      toast.success('10-card reset successfully!');
      fetchPaymentData();
    } catch (error) {
      console.error('Error resetting 10-card:', error);
      toast.error('Failed to reset 10-card. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!confirm('Cancel this subscription? It will remain active until the end of the current period.')) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          cancel_at_period_end: true,
        })
        .eq('id', subscriptionId);

      if (error) throw error;
      toast.success('Subscription cancelled successfully!');
      fetchPaymentData();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast.error('Failed to cancel subscription. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className='text-gray-500 text-center py-8'>Loading payment data...</p>;
  }

  const sessionsRemaining = (memberData?.ten_card_total || 10) - (memberData?.ten_card_sessions_used || 0);
  const isExpired = memberData?.ten_card_expiry_date && new Date(memberData.ten_card_expiry_date) < new Date();

  return (
    <div className='space-y-4 md:space-y-6'>
      <h3 className='text-base md:text-lg font-bold text-gray-900'>Payment Management</h3>

      {/* Subscriptions */}
      <div className='bg-gray-50 rounded-lg p-3 md:p-4'>
        <h4 className='font-semibold text-gray-900 mb-2 md:mb-3 text-sm md:text-base'>Subscriptions</h4>
        {subscriptions.length === 0 ? (
          <p className='text-xs md:text-sm text-gray-600'>No active subscriptions</p>
        ) : (
          <div className='space-y-2 md:space-y-3'>
            {subscriptions.map(sub => (
              <div key={sub.id} className='bg-white rounded-lg p-2.5 md:p-3 border border-gray-200'>
                <div className='flex items-start justify-between gap-2 mb-2'>
                  <div className='min-w-0'>
                    <p className={`font-semibold capitalize text-sm md:text-base ${
                      sub.plan_type === 'monthly' ? 'text-blue-600' :
                      sub.plan_type === 'yearly' ? 'text-green-600' :
                      'text-gray-900'
                    }`}>
                      {sub.plan_type || 'Unknown'} Plan
                    </p>
                    <p className='text-xs md:text-sm text-gray-600'>Status: {sub.status}</p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded flex-shrink-0 ${
                      sub.status === 'active' && sub.plan_type === 'monthly'
                        ? 'bg-blue-100 text-blue-700'
                        : sub.status === 'active' && sub.plan_type === 'yearly'
                        ? 'bg-green-100 text-green-700'
                        : sub.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : sub.status === 'cancelled'
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {sub.status}
                  </span>
                </div>
                {sub.current_period_end && (
                  <p className='text-xs text-gray-600 mb-2'>
                    Ends: {new Date(sub.current_period_end).toLocaleDateString()}
                  </p>
                )}
                {sub.status === 'active' && !sub.cancel_at_period_end && (
                  <button
                    onClick={() => handleCancelSubscription(sub.id)}
                    disabled={saving}
                    className='w-full md:w-auto px-3 py-2 md:py-1.5 text-xs md:text-sm text-red-600 hover:text-white hover:bg-red-600 font-medium border border-red-600 rounded transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-red-600'
                  >
                    Cancel
                  </button>
                )}
                {sub.cancel_at_period_end && (
                  <p className='text-xs text-amber-600'>Will cancel at period end</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 10-Card Management - Only show if member has ten_card membership */}
      {memberData?.membership_types?.includes('ten_card') && (
        <div className='bg-gray-50 rounded-lg p-3 md:p-4'>
          <h4 className='font-semibold text-purple-600 mb-2 md:mb-3 text-sm md:text-base'>10-Card Sessions</h4>

          {/* Current Status */}
          <div className='bg-white rounded-lg p-2.5 md:p-3 border border-gray-200 mb-3 md:mb-4'>
            <div className='flex items-center justify-between mb-1 md:mb-2'>
              <p className='text-xs md:text-sm text-gray-600'>Sessions Remaining</p>
              <p className={`text-xl md:text-2xl font-bold ${sessionsRemaining <= 2 ? 'text-red-600' : 'text-purple-600'}`}>
                {sessionsRemaining} / {memberData?.ten_card_total || 10}
              </p>
            </div>
            {memberData?.ten_card_expiry_date && (
              <p className={`text-xs ${isExpired ? 'text-red-600' : 'text-gray-600'}`}>
                {isExpired ? 'Expired: ' : 'Expires: '}
                {new Date(memberData.ten_card_expiry_date).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Edit Form */}
          <div className='space-y-2 md:space-y-3'>
            <div className='grid grid-cols-2 gap-2 md:gap-3'>
              <div>
                <label className='block text-xs md:text-sm font-medium text-gray-700 mb-1'>Total</label>
                <input
                  type='number'
                  value={tenCardTotal}
                  onChange={e => setTenCardTotal(e.target.value)}
                  className='w-full px-2 md:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 text-sm md:text-base'
                />
              </div>
              <div>
                <label className='block text-xs md:text-sm font-medium text-gray-700 mb-1'>Used</label>
                <input
                  type='number'
                  value={tenCardUsed}
                  onChange={e => setTenCardUsed(e.target.value)}
                  className='w-full px-2 md:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 text-sm md:text-base'
                />
              </div>
            </div>

            <div>
              <label className='block text-xs md:text-sm font-medium text-gray-700 mb-1'>Expiry (optional)</label>
              <input
                type='date'
                value={tenCardExpiry}
                onChange={e => setTenCardExpiry(e.target.value)}
                className='w-full px-2 md:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 text-sm md:text-base'
              />
            </div>

            <div className='flex gap-2'>
              <button
                onClick={handleSave10Card}
                disabled={saving}
                className='flex-1 px-3 md:px-4 py-2.5 md:py-2 bg-[#208479] hover:bg-[#1a6b62] text-white font-medium rounded-lg transition disabled:opacity-50 text-sm md:text-base'
              >
                Save
              </button>
              <button
                onClick={handleReset10Card}
                disabled={saving}
                className='px-3 md:px-4 py-2.5 md:py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition disabled:opacity-50 text-sm md:text-base'
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stripe Customer Info */}
      {memberData?.stripe_customer_id && (
        <div className='bg-gray-50 rounded-lg p-3 md:p-4'>
          <h4 className='font-semibold text-gray-900 mb-1 md:mb-2 text-sm md:text-base'>Stripe Info</h4>
          <p className='text-xs text-gray-600 font-mono break-all'>{memberData.stripe_customer_id}</p>
        </div>
      )}
    </div>
  );
}
