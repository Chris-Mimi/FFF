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
    display_name?: string | null;
    ten_card_purchase_date: string | null;
    ten_card_sessions_used: number;
    ten_card_total?: number;
    ten_card_expiry_date?: string | null;
    athlete_subscription_status?: 'trial' | 'active' | 'past_due' | 'expired';
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
  const [subscriptionStatus, setSubscriptionStatus] = useState<'trial' | 'active' | 'past_due' | 'expired'>(
    member?.athlete_subscription_status || 'expired'
  );
  const [subscriptionEnd, setSubscriptionEnd] = useState(() => {
    if (!member?.athlete_subscription_end) return '';
    const dateStr = member.athlete_subscription_end;
    return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
  });

  const [loading, setLoading] = useState(false);

  type CardBooking = {
    booking_id: string;
    date: string;
    time: string;
    status: 'confirmed' | 'no_show' | 'late_cancel';
    booker_name: string;
    is_self: boolean;
  };
  const [cardBookings, setCardBookings] = useState<CardBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

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

  // Load bookings that debit this card. Includes the holder's own bookings + any
  // family member whose ten_card_holder_id points at this holder. Filtered to
  // statuses that consume the card (confirmed, no_show, late_cancel) and to
  // sessions on/after the purchase date.
  useEffect(() => {
    if (!isOpen || activeSection !== '10card' || !member?.id) {
      setCardBookings([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setBookingsLoading(true);
      try {
        const { data: sharers } = await supabase
          .from('members')
          .select('id')
          .eq('ten_card_holder_id', member.id);
        const debitMemberIds = [member.id, ...(sharers || []).map(s => s.id)];

        let query = supabase
          .from('bookings')
          .select('id, status, member_id, weekly_sessions!inner(date, time), members!inner(id, name, display_name)')
          .in('member_id', debitMemberIds)
          .in('status', ['confirmed', 'no_show', 'late_cancel']);

        if (purchaseDate) {
          query = query.gte('weekly_sessions.date', purchaseDate);
        }

        const { data, error } = await query;
        if (error || cancelled) {
          if (error) console.error('Failed to load card bookings:', error);
          return;
        }

        type RawRow = {
          id: string;
          status: 'confirmed' | 'no_show' | 'late_cancel';
          member_id: string;
          weekly_sessions: { date: string; time: string } | { date: string; time: string }[];
          members: { id: string; name: string; display_name: string | null } | { id: string; name: string; display_name: string | null }[];
        };
        const rows: CardBooking[] = (data as RawRow[] || []).map(r => {
          const ws = Array.isArray(r.weekly_sessions) ? r.weekly_sessions[0] : r.weekly_sessions;
          const mb = Array.isArray(r.members) ? r.members[0] : r.members;
          return {
            booking_id: r.id,
            date: ws?.date || '',
            time: ws?.time || '',
            status: r.status,
            booker_name: mb?.display_name || mb?.name || '—',
            is_self: r.member_id === member.id,
          };
        }).sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));

        if (!cancelled) setCardBookings(rows);
      } finally {
        if (!cancelled) setBookingsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, activeSection, member?.id, purchaseDate]);

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
      const updateData: Record<string, unknown> = {};

      if (activeSection === '10card') {
        // Save the value currently in the input. Coaches use Recalc/Reset buttons to derive
        // values from bookings; the save itself trusts what's typed.
        updateData.ten_card_purchase_date = purchaseDate || null;
        updateData.ten_card_sessions_used = sessionsUsed;
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
    } catch (_error) {
      toast.error('Failed to update payment information. Please try again.');
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
  const isFull = sessionsUsed >= tenCardTotal;
  const isOneAwayFromFull = sessionsUsed === tenCardTotal - 1;
  const isNearExpiry = isFull || isOneAwayFromFull;

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
                {member.display_name || member.name}
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
              {activeSection === '10card' && isFull && (
                <p className="text-red-600 text-xs mt-2 font-medium">
                  ⚠️ Card is full — issue a new card before next booking
                </p>
              )}
              {activeSection === '10card' && isOneAwayFromFull && (
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

                {/* Sessions Used - Editable, with Recalc helper */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sessions Used
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={sessionsUsed}
                      onChange={(e) => setSessionsUsed(Number(e.target.value) || 0)}
                      min={0}
                      max={tenCardTotal}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#178da6] focus:border-transparent"
                    />
                    <span className="text-sm text-gray-500">/ {tenCardTotal}</span>
                    <button
                      onClick={async () => {
                        const count = await recalculateSessionsUsed(purchaseDate);
                        setSessionsUsed(count);
                      }}
                      disabled={!purchaseDate}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm rounded-lg transition"
                    >
                      Recalc
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Edit directly, or click Recalc to count confirmed bookings since the purchase date.
                  </p>
                </div>

                {/* Bookings list — sessions consumed/upcoming on this card */}
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Bookings on this card{purchaseDate ? ` (since ${purchaseDate})` : ''}
                  </h4>
                  {bookingsLoading ? (
                    <p className="text-xs text-gray-500">Loading…</p>
                  ) : cardBookings.length === 0 ? (
                    <p className="text-xs text-gray-500">No bookings found{purchaseDate ? ' since the purchase date' : ''}.</p>
                  ) : (() => {
                    const todayIso = new Date().toISOString().split('T')[0];
                    const past = cardBookings.filter(b => b.date < todayIso);
                    const upcoming = cardBookings.filter(b => b.date >= todayIso);
                    const statusBadge = (s: CardBooking['status']) => {
                      if (s === 'confirmed') return <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700">attended</span>;
                      if (s === 'no_show') return <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">no-show</span>;
                      return <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">late-cancel</span>;
                    };
                    const upcomingBadge = () => (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">upcoming</span>
                    );
                    const renderRow = (b: CardBooking, isUpcoming: boolean) => (
                      <div key={b.booking_id} className="flex items-center justify-between py-1 text-xs text-gray-700">
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{b.date}</span>
                          <span className="text-gray-500">{b.time?.slice(0, 5)}</span>
                          {!b.is_self && (
                            <span className="italic text-purple-700">{b.booker_name}</span>
                          )}
                        </div>
                        {isUpcoming ? upcomingBadge() : statusBadge(b.status)}
                      </div>
                    );
                    return (
                      <div className="space-y-3">
                        {past.length > 0 && (
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Consumed ({past.length})</p>
                            <div className="divide-y divide-gray-100 border border-gray-200 rounded">
                              {past.map(b => renderRow(b, false))}
                            </div>
                          </div>
                        )}
                        {upcoming.length > 0 && (
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Upcoming ({upcoming.length})</p>
                            <div className="divide-y divide-gray-100 border border-gray-200 rounded">
                              {upcoming.map(b => renderRow(b, true))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
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
                    onChange={(e) => setSubscriptionStatus(e.target.value as 'trial' | 'active' | 'past_due' | 'expired')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  >
                    <option value="expired">Expired / None</option>
                    <option value="trial">Trial</option>
                    <option value="active">Active (Paid)</option>
                    <option value="past_due">Payment Failed</option>
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
