'use client';

import { confirm } from '@/lib/confirm';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { RefreshCw, X, CreditCard, Calendar, Package } from 'lucide-react';
import { useState, useEffect } from 'react';
import { FocusTrap } from '@/components/ui/FocusTrap';

interface TenCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: {
    id: string;
    name: string;
    ten_card_purchase_date: string | null;
    ten_card_sessions_used: number;
    ten_card_total?: number;
    ten_card_expiry_date?: string | null;
    athlete_subscription_status?: 'trial' | 'active' | 'expired';
    athlete_subscription_end?: string | null;
  } | null;
  onUpdate: () => void;
}

export default function TenCardModal({
  isOpen,
  onClose,
  member,
  onUpdate,
}: TenCardModalProps) {
  const [activeSection, setActiveSection] = useState<'10card' | 'subscription'>('10card');

  // 10-card state
  const [purchaseDate, setPurchaseDate] = useState(() => {
    if (!member?.ten_card_purchase_date) return '';
    const dateStr = member.ten_card_purchase_date;
    return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
  });
  const [sessionsUsed, setSessionsUsed] = useState(member?.ten_card_sessions_used || 0);
  const [tenCardTotal, setTenCardTotal] = useState(member?.ten_card_total || 10);
  const [tenCardExpiry, setTenCardExpiry] = useState(() => {
    if (!member?.ten_card_expiry_date) return '';
    const dateStr = member.ten_card_expiry_date;
    return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
  });

  // Subscription state
  const [subscriptionStatus, setSubscriptionStatus] = useState<'trial' | 'active' | 'expired'>(
    member?.athlete_subscription_status || 'expired'
  );
  const [subscriptionEnd, setSubscriptionEnd] = useState(() => {
    if (!member?.athlete_subscription_end) return '';
    const dateStr = member.athlete_subscription_end;
    return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
  });

  const [loading, setLoading] = useState(false);

  // Update state when member prop changes (after refresh)
  useEffect(() => {
    if (member) {
      // 10-card fields
      let formattedDate = '';
      if (member.ten_card_purchase_date) {
        const dateStr = member.ten_card_purchase_date;
        formattedDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
      }
      setPurchaseDate(formattedDate);
      setSessionsUsed(member.ten_card_sessions_used || 0);
      setTenCardTotal(member.ten_card_total || 10);

      let formattedExpiry = '';
      if (member.ten_card_expiry_date) {
        const dateStr = member.ten_card_expiry_date;
        formattedExpiry = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
      }
      setTenCardExpiry(formattedExpiry);

      // Subscription fields
      setSubscriptionStatus(member.athlete_subscription_status || 'expired');
      let formattedSubEnd = '';
      if (member.athlete_subscription_end) {
        const dateStr = member.athlete_subscription_end;
        formattedSubEnd = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
      }
      setSubscriptionEnd(formattedSubEnd);
    }
  }, [member]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !member) return null;

  const recalculateSessionsUsed = async (purchaseDateStr: string) => {
    if (!purchaseDateStr || !member) return sessionsUsed;

    try {
      // Fetch all confirmed, no_show, AND late_cancel bookings for this member with session dates
      // All three count toward 10-card usage (they reserved a slot)
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('id, status, weekly_sessions!inner(date)')
        .eq('member_id', member.id)
        .in('status', ['confirmed', 'no_show', 'late_cancel'])
        .gte('weekly_sessions.date', purchaseDateStr);

      if (error) {
        console.error('Error fetching bookings for recalculation:', error);
        return sessionsUsed;
      }

      const count = bookings?.length || 0;
      return count;
    } catch (error) {
      console.error('Error recalculating sessions:', error);
      return sessionsUsed;
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Recalculate sessions_used based on confirmed bookings after purchase date
      const recalculatedSessions = activeSection === '10card'
        ? await recalculateSessionsUsed(purchaseDate)
        : sessionsUsed;

      const updateData: Record<string, unknown> = {};

      if (activeSection === '10card') {
        updateData.ten_card_purchase_date = purchaseDate || null;
        updateData.ten_card_sessions_used = recalculatedSessions;
        updateData.ten_card_total = tenCardTotal;
        updateData.ten_card_expiry_date = tenCardExpiry || null;
      } else {
        updateData.athlete_subscription_status = subscriptionStatus;
        updateData.athlete_subscription_end = subscriptionEnd || null;
      }

      const { error } = await supabase
        .from('members')
        .update(updateData)
        .eq('id', member.id);

      if (error) {
        throw error;
      }
      onUpdate();
      onClose();
    } catch (error) {
      console.error('❌ Error updating payment info:', error);
      toast.error('Failed to update payment information. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetCard = async () => {
    if (!await confirm({ title: 'Reset 10-Card', message: 'Reset this 10-card? Sessions used will be set to 0 and purchase date will be set to today.', confirmText: 'Reset', variant: 'default' })) {
      return;
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    setPurchaseDate(today);
    setSessionsUsed(0);
  };

  const sessionsRemaining = tenCardTotal - sessionsUsed;
  const isNearExpiry = sessionsUsed >= tenCardTotal - 1;

  return (
    <FocusTrap>
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#178da6] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard size={24} />
            <h2 className="text-xl font-bold">Payment Management</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded transition"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveSection('10card')}
            className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition ${
              activeSection === '10card'
                ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-500'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Package size={18} />
            10-Card
          </button>
          <button
            onClick={() => setActiveSection('subscription')}
            className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition ${
              activeSection === 'subscription'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Calendar size={18} />
            Subscription
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Member Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {member.name}
              </h3>
              {activeSection === '10card' ? (
                <div className={`text-sm font-medium px-3 py-1 rounded inline-block ${
                  isNearExpiry
                    ? 'bg-red-100 text-red-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {sessionsUsed}/{tenCardTotal} sessions used
                  {sessionsRemaining > 0 && ` • ${sessionsRemaining} remaining`}
                </div>
              ) : (
                <div className={`text-sm font-medium px-3 py-1 rounded inline-block ${
                  subscriptionStatus === 'active'
                    ? 'bg-green-100 text-green-800'
                    : subscriptionStatus === 'trial'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {subscriptionStatus === 'active' ? 'Active Subscription' :
                   subscriptionStatus === 'trial' ? 'Trial' : 'Expired'}
                </div>
              )}
              {activeSection === '10card' && isNearExpiry && (
                <p className="text-red-600 text-xs mt-2 font-medium">
                  ⚠️ Next session will complete this card
                </p>
              )}
            </div>

            {activeSection === '10card' ? (
              <>
                {/* Purchase Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    10-Card Purchase/Activation Date
                  </label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Sessions used counter starts from this date.
                  </p>
                </div>

                {/* Total Sessions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Sessions
                  </label>
                  <select
                    value={tenCardTotal}
                    onChange={(e) => setTenCardTotal(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900"
                  >
                    <option value={5}>5 sessions</option>
                    <option value={10}>10 sessions (standard)</option>
                    <option value={20}>20 sessions</option>
                  </select>
                </div>

                {/* Expiry Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry Date (optional)
                  </label>
                  <input
                    type="date"
                    value={tenCardExpiry}
                    onChange={(e) => setTenCardExpiry(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty for no expiry. Sessions cannot be used after this date.
                  </p>
                </div>

                {/* Sessions Used - Auto-calculated */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sessions Used (Auto-calculated)
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 px-3 py-2 border border-gray-300 bg-gray-50 rounded-md text-gray-700 font-medium">
                      {sessionsUsed}/{tenCardTotal}
                    </div>
                    <button
                      onClick={async () => {
                        const count = await recalculateSessionsUsed(purchaseDate);
                        setSessionsUsed(count);
                      }}
                      disabled={!purchaseDate}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm rounded-lg transition"
                    >
                      Preview
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Click Preview to see count based on current purchase date.
                  </p>
                </div>

                {/* Reset Button */}
                <div className="pt-4 border-t">
                  <button
                    onClick={handleResetCard}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
                  >
                    <RefreshCw size={18} />
                    Reset Card
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    This will set purchase date to today and reset sessions to 0.
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* Subscription Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subscription Status
                  </label>
                  <select
                    value={subscriptionStatus}
                    onChange={(e) => setSubscriptionStatus(e.target.value as 'trial' | 'active' | 'expired')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  >
                    <option value="expired">Expired / None</option>
                    <option value="trial">Trial</option>
                    <option value="active">Active (Paid)</option>
                  </select>
                </div>

                {/* Subscription End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {subscriptionStatus === 'trial' ? 'Trial End Date' : 'Subscription End Date'}
                  </label>
                  <input
                    type="date"
                    value={subscriptionEnd}
                    onChange={(e) => setSubscriptionEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {subscriptionStatus === 'active'
                      ? 'Leave empty for unlimited access. Otherwise, access expires on this date.'
                      : subscriptionStatus === 'trial'
                      ? 'Trial access ends on this date.'
                      : 'No active subscription.'}
                  </p>
                </div>

                {/* Quick Actions */}
                <div className="pt-4 border-t space-y-3">
                  <p className="text-sm font-medium text-gray-700">Quick Actions</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        const endDate = new Date();
                        endDate.setDate(endDate.getDate() + 30);
                        setSubscriptionStatus('trial');
                        setSubscriptionEnd(endDate.toISOString().split('T')[0]);
                      }}
                      className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm rounded-lg transition"
                    >
                      Grant 30-day Trial
                    </button>
                    <button
                      onClick={() => {
                        setSubscriptionStatus('active');
                        setSubscriptionEnd('');
                      }}
                      className="px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 text-sm rounded-lg transition"
                    >
                      Activate (Unlimited)
                    </button>
                    <button
                      onClick={() => {
                        setSubscriptionStatus('expired');
                        setSubscriptionEnd(new Date().toISOString().split('T')[0]);
                      }}
                      className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-sm rounded-lg transition"
                    >
                      Expire Now
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 disabled:text-gray-500 text-gray-700 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-[#178da6] hover:bg-[#14758c] disabled:bg-[#178da6]/50 text-white rounded-lg transition flex items-center gap-2"
          >
            {loading && <div className="animate-spin rounded-full h-4 w-4 border-b border-white"></div>}
            Save Changes
          </button>
        </div>
      </div>
    </div>
    </FocusTrap>
  );
}
