'use client';

import { supabase } from '@/lib/supabase';
import { CreditCard, Calendar, Package, ExternalLink, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface PaymentStatus {
  subscriptionStatus: 'active' | 'trial' | 'expired' | null;
  subscriptionEnd: string | null;
  subscriptionPlanType: 'monthly' | 'yearly' | null;
  tenCardTotal: number;
  tenCardUsed: number;
  tenCardExpiry: string | null;
  stripeCustomerId: string | null;
}

interface AthletePagePaymentTabProps {
  userId: string;
}

export default function AthletePagePaymentTab({ userId }: AthletePagePaymentTabProps) {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPaymentStatus();
  }, [userId]);

  const fetchPaymentStatus = async () => {
    try {
      const { data: member, error } = await supabase
        .from('members')
        .select(`
          athlete_subscription_status,
          athlete_subscription_end,
          ten_card_total,
          ten_card_sessions_used,
          ten_card_expiry_date,
          stripe_customer_id
        `)
        .eq('id', userId)
        .single();

      if (error) throw error;

      // Fetch subscription plan type if active subscription
      let planType: 'monthly' | 'yearly' | null = null;
      if (member.athlete_subscription_status === 'active') {
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('plan_type')
          .eq('member_id', userId)
          .eq('status', 'active')
          .single();

        planType = subscription?.plan_type || null;
      }

      setPaymentStatus({
        subscriptionStatus: member.athlete_subscription_status,
        subscriptionEnd: member.athlete_subscription_end,
        subscriptionPlanType: planType,
        tenCardTotal: member.ten_card_total || 10,
        tenCardUsed: member.ten_card_sessions_used || 0,
        tenCardExpiry: member.ten_card_expiry_date,
        stripeCustomerId: member.stripe_customer_id,
      });
    } catch (err) {
      console.error('Error fetching payment status:', err);
      setError('Failed to load payment information');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (productType: 'monthly' | 'yearly' | '10card') => {
    setPurchasing(productType);
    setError(null);

    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productType, memberId: userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout (use URL directly)
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Purchase error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
    } finally {
      setPurchasing(null);
    }
  };

  const handleManageSubscription = async () => {
    setPurchasing('portal');
    setError(null);

    try {
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to open customer portal');
      }

      window.location.href = data.url;
    } catch (err) {
      console.error('Portal error:', err);
      setError(err instanceof Error ? err.message : 'Failed to open subscription management');
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="animate-spin text-gray-500" size={32} />
      </div>
    );
  }

  // Only calculate 10-card if one is actually activated (has expiry date)
  const has10Card = !!paymentStatus?.tenCardExpiry;
  const tenCardRemaining = has10Card ? (paymentStatus?.tenCardTotal || 10) - (paymentStatus?.tenCardUsed || 0) : 0;
  const tenCardExpired = has10Card && new Date(paymentStatus!.tenCardExpiry!) < new Date();
  const hasActiveSubscription = paymentStatus?.subscriptionStatus === 'active';
  const hasTrial = paymentStatus?.subscriptionStatus === 'trial' &&
    paymentStatus?.subscriptionEnd &&
    new Date(paymentStatus.subscriptionEnd) > new Date();

  return (
    <div className="space-y-8">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Current Status Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Current Status</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Subscription Status */}
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${
              hasActiveSubscription && paymentStatus?.subscriptionPlanType === 'monthly' ? 'bg-blue-100' :
              hasActiveSubscription && paymentStatus?.subscriptionPlanType === 'yearly' ? 'bg-teal-100' :
              hasTrial ? 'bg-blue-100' :
              'bg-gray-100'
            }`}>
              <Calendar className={
                hasActiveSubscription && paymentStatus?.subscriptionPlanType === 'monthly' ? 'text-blue-600' :
                hasActiveSubscription && paymentStatus?.subscriptionPlanType === 'yearly' ? 'text-teal-600' :
                hasTrial ? 'text-blue-600' :
                'text-gray-400'
              } size={24} />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Subscription</h3>
              {hasActiveSubscription ? (
                <p className={`flex items-center gap-1 ${
                  paymentStatus?.subscriptionPlanType === 'monthly' ? 'text-blue-600' :
                  paymentStatus?.subscriptionPlanType === 'yearly' ? 'text-teal-600' :
                  'text-green-600'
                }`}>
                  <CheckCircle size={16} /> Active
                </p>
              ) : hasTrial ? (
                <p className="text-blue-600">
                  Trial (ends {new Date(paymentStatus!.subscriptionEnd!).toLocaleDateString()})
                </p>
              ) : (
                <p className="text-gray-500">No active subscription</p>
              )}
            </div>
          </div>

          {/* 10-Card Status */}
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${has10Card && tenCardRemaining > 0 && !tenCardExpired ? 'bg-purple-100' : 'bg-gray-100'}`}>
              <Package className={has10Card && tenCardRemaining > 0 && !tenCardExpired ? 'text-purple-600' : 'text-gray-400'} size={24} />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">10-Card Sessions</h3>
              {!has10Card ? (
                <p className="text-gray-500">No 10-card purchased</p>
              ) : tenCardExpired ? (
                <p className="text-red-500">Expired</p>
              ) : tenCardRemaining > 0 ? (
                <p className="text-purple-600">
                  <span className="font-semibold">{tenCardRemaining}</span> sessions remaining
                </p>
              ) : (
                <p className="text-gray-500">No sessions available</p>
              )}
              {has10Card && !tenCardExpired && (
                <p className="text-xs text-gray-400 mt-1">
                  Expires: {new Date(paymentStatus!.tenCardExpiry!).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Manage Subscription Button */}
        {paymentStatus?.stripeCustomerId && (
          <div className="px-6 pb-6">
            <button
              onClick={handleManageSubscription}
              disabled={!!purchasing}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-teal-600 hover:underline transition-colors"
            >
              {purchasing === 'portal' ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <ExternalLink size={16} />
              )}
              Manage Subscription & Payment Methods
            </button>
          </div>
        )}
      </div>

      {/* Purchase Options */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Purchase Options</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Monthly Subscription */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            <div className="p-6 flex flex-col flex-grow">
              <div className="flex items-center gap-3 mb-4">
                <CreditCard className="text-blue-500" size={24} />
                <h3 className="font-semibold text-gray-900">Monthly</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                Contact
                <span className="text-sm font-normal text-gray-500 ml-2">for pricing</span>
              </p>
              <p className="text-gray-500 text-sm mb-6">Billed monthly. Cancel anytime.</p>
              <ul className="space-y-2 text-sm text-gray-600 mb-6 flex-grow">
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-500" /> Unlimited class bookings
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-500" /> Full athlete page access
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-500" /> Progress tracking
                </li>
              </ul>
              <button
                onClick={() => handlePurchase('monthly')}
                disabled={!!purchasing}
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {purchasing === 'monthly' ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  'Subscribe Monthly'
                )}
              </button>
            </div>
          </div>

          {/* Yearly Subscription */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-teal-500 overflow-hidden relative flex flex-col">
            <div className="absolute top-0 right-0 bg-teal-500 text-white text-xs font-semibold px-3 py-1 rounded-bl-lg">
              BEST VALUE
            </div>
            <div className="p-6 flex flex-col flex-grow">
              <div className="flex items-center gap-3 mb-4">
                <CreditCard className="text-teal-500" size={24} />
                <h3 className="font-semibold text-gray-900">Yearly</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                Contact
                <span className="text-sm font-normal text-gray-500 ml-2">for pricing</span>
              </p>
              <p className="text-gray-500 text-sm mb-6">Save with annual billing.</p>
              <ul className="space-y-2 text-sm text-gray-600 mb-6 flex-grow">
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-500" /> Unlimited class bookings
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-500" /> Full athlete page access
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-500" /> Progress tracking
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-teal-500" /> Best value option
                </li>
              </ul>
              <button
                onClick={() => handlePurchase('yearly')}
                disabled={!!purchasing}
                className="w-full py-3 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {purchasing === 'yearly' ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  'Subscribe Yearly'
                )}
              </button>
            </div>
          </div>

          {/* 10-Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            <div className="p-6 flex flex-col flex-grow">
              <div className="flex items-center gap-3 mb-4">
                <Package className="text-purple-500" size={24} />
                <h3 className="font-semibold text-gray-900">10-Card</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                Contact
                <span className="text-sm font-normal text-gray-500 ml-2">for pricing</span>
              </p>
              <p className="text-gray-500 text-sm mb-6">One-time purchase. Use at your pace.</p>
              <ul className="space-y-2 text-sm text-gray-600 mb-6 flex-grow">
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-500" /> 10 class sessions
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-500" /> Full athlete page access
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-500" /> 12-month validity
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-500" /> Perfect for drop-ins
                </li>
              </ul>
              <button
                onClick={() => handlePurchase('10card')}
                disabled={!!purchasing}
                className="w-full py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {purchasing === '10card' ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  'Buy 10-Card'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Info Note */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        <p>
          <strong>Note:</strong> Prices are configured by the gym. Contact us for current pricing information.
          Payments are securely processed through Stripe. Subscriptions can be cancelled at any time.
        </p>
      </div>
    </div>
  );
}
