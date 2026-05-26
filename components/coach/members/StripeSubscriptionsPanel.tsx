'use client';

import { useState, useEffect } from 'react';
import { confirm } from '@/lib/confirm';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Subscription {
  id: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  plan_type: 'monthly' | 'yearly' | null;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  updated_at: string | null;
}

interface StripeSubscriptionsPanelProps {
  memberId: string;
}

/**
 * Stripe-side subscription detail. Renders the list of Stripe `subscriptions`
 * rows for this member — active, cancelled, payment-failed — with a Cancel
 * action on still-active subs.
 *
 * Source of truth for the data this panel shows is the Stripe `subscriptions`
 * table (NOT the `members.athlete_subscription_*` columns, which the Stripe
 * webhook only updates at signup and lapse — never on renewal).
 */
export default function StripeSubscriptionsPanel({ memberId }: StripeSubscriptionsPanelProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const stripeCustomerId = subscriptions[0]?.stripe_customer_id ?? null;

  useEffect(() => {
    if (!memberId) return;
    fetchSubscriptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('id, stripe_subscription_id, stripe_customer_id, plan_type, status, current_period_start, current_period_end, cancel_at_period_end, updated_at')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSubscriptions(data || []);
    } catch (err) {
      console.error('Failed to load Stripe subscriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (subscriptionId: string) => {
    if (!await confirm({ title: 'Cancel Subscription', message: 'Cancel this Stripe subscription? It will remain active until the end of the current period.', confirmText: 'Cancel', variant: 'danger' })) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'cancelled', cancel_at_period_end: true })
        .eq('id', subscriptionId);
      if (error) throw error;
      toast.success('Subscription cancelled');
      fetchSubscriptions();
    } catch (err) {
      console.error('Cancel failed:', err);
      toast.error('Failed to cancel. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const fmt = (s: string | null) =>
    s ? new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';

  if (loading) {
    return <p className='text-xs text-gray-500'>Loading Stripe subscriptions…</p>;
  }

  if (subscriptions.length === 0) {
    return (
      <div className='space-y-2'>
        <p className='text-xs text-gray-500'>No Stripe subscriptions on file. Coach-managed plans appear below.</p>
        {stripeCustomerId && (
          <p className='text-[10px] text-gray-400 font-mono break-all'>Stripe customer: {stripeCustomerId}</p>
        )}
      </div>
    );
  }

  return (
    <div className='space-y-2'>
      {subscriptions.map(sub => {
        const isCancelled = sub.status === 'cancelled';
        const isPaymentFailed = sub.status === 'past_due' || sub.status === 'unpaid';
        const isScheduledCancel = sub.status === 'active' && sub.cancel_at_period_end;
        const cardBorder = isCancelled || isPaymentFailed
          ? 'border-red-300 bg-red-50/40'
          : isScheduledCancel
          ? 'border-amber-300 bg-amber-50/40'
          : 'border-gray-200';
        const cancelledAt = isCancelled && sub.updated_at ? new Date(sub.updated_at) : null;
        const cancelledDaysAgo = cancelledAt
          ? Math.max(0, Math.floor((Date.now() - cancelledAt.getTime()) / (1000 * 60 * 60 * 24)))
          : null;
        return (
          <div key={sub.id} className={`bg-white rounded-lg p-2.5 md:p-3 border ${cardBorder}`}>
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
                    : isCancelled
                    ? 'bg-red-100 text-red-800'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {isCancelled ? 'Actively cancelled' : sub.status}
              </span>
            </div>
            {sub.current_period_end && (
              <p className='text-xs text-gray-600 mb-2'>
                {isCancelled ? 'Period ended: ' : 'Ends: '}
                {fmt(sub.current_period_end)}
              </p>
            )}
            {isCancelled && cancelledAt && (
              <p className='text-xs text-red-700 font-medium mb-2'>
                Cancelled {fmt(sub.updated_at)}
                {cancelledDaysAgo !== null && cancelledDaysAgo <= 60 && (
                  <> · {cancelledDaysAgo === 0 ? 'today' : cancelledDaysAgo === 1 ? '1 day ago' : `${cancelledDaysAgo} days ago`}</>
                )}
              </p>
            )}
            {isPaymentFailed && (
              <p className='text-xs text-red-700 font-medium mb-2'>
                Payment failed — check Stripe
              </p>
            )}
            {sub.status === 'active' && !sub.cancel_at_period_end && (
              <button
                onClick={() => handleCancel(sub.id)}
                disabled={saving}
                className='w-full md:w-auto px-3 py-2 md:py-1.5 text-xs md:text-sm text-red-600 hover:text-white hover:bg-red-600 font-medium border border-red-600 rounded transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-red-600'
              >
                Cancel
              </button>
            )}
            {sub.cancel_at_period_end && (
              <p className='text-xs text-amber-700 font-medium'>Will cancel at period end</p>
            )}
          </div>
        );
      })}
      {stripeCustomerId && (
        <p className='text-[10px] text-gray-400 font-mono break-all pt-1'>Stripe customer: {stripeCustomerId}</p>
      )}
    </div>
  );
}
