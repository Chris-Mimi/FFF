'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { authFetch } from '@/lib/auth-fetch';
import { confirm } from '@/lib/confirm';
import { toast } from 'sonner';

type RowKind =
  | 'cash'
  | 'stripe-auto'
  | 'stripe-trial'
  | 'stripe-cancelling'
  | 'cash-lapsed'
  | 'stripe-lapsed-cancelled'
  | 'stripe-lapsed-failed';

interface DueRow {
  memberId: string;
  name: string;
  daysLeft: number;     // signed: positive = days until due, negative = days since lapsed
  endDate: string;
  kind: RowKind;
  planLabel?: string | null;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
const COLLAPSED_KEY = 'subscriptionsDueBanner:collapsed';

const LAPSED_STRIPE_STATUSES = ['cancelled', 'past_due', 'unpaid', 'incomplete_expired'];
const FAILED_PAYMENT_STATUSES = ['past_due', 'unpaid'];

export default function SubscriptionsDueBanner() {
  const [rows, setRows] = useState<DueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(COLLAPSED_KEY) === '1';
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try { window.localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0'); } catch {}
      return next;
    });
  };

  useEffect(() => {
    fetchDueRows();
  }, []);

  const fetchDueRows = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const sevenDaysOut = new Date(now.getTime() + SEVEN_DAYS_MS);
      const fourteenDaysBack = new Date(now.getTime() - FOURTEEN_DAYS_MS);
      const nowIso = now.toISOString();
      const sevenIso = sevenDaysOut.toISOString();
      const fourteenBackIso = fourteenDaysBack.toISOString();

      // Upcoming Stripe (next 7 days, still active/trialing)
      const { data: stripeUpcoming } = await supabase
        .from('subscriptions')
        .select('member_id, current_period_end, cancel_at_period_end, plan_type, status')
        .in('status', ['active', 'trialing'])
        .not('current_period_end', 'is', null)
        .gte('current_period_end', nowIso)
        .lte('current_period_end', sevenIso);

      // Lapsed Stripe (period_end in past 14 days, status no longer active)
      const { data: stripeLapsed } = await supabase
        .from('subscriptions')
        .select('member_id, current_period_end, cancel_at_period_end, plan_type, status')
        .in('status', LAPSED_STRIPE_STATUSES)
        .not('current_period_end', 'is', null)
        .gte('current_period_end', fourteenBackIso)
        .lt('current_period_end', nowIso);

      const allStripeSubs = [...(stripeUpcoming ?? []), ...(stripeLapsed ?? [])];
      const stripeMemberIds = new Set(allStripeSubs.map(s => s.member_id));

      // Dedupe key for cash queries: any member with ANY Stripe subscription row should
      // never appear as cash. Without this, members with an active Stripe sub renewing
      // outside the 7-day window false-positive as "cash-lapsed" because the Stripe
      // webhook updates subscriptions.current_period_end on renewal but does NOT touch
      // members.athlete_subscription_end (which stays frozen at the trial-end date).
      const { data: allStripeMembers } = await supabase
        .from('subscriptions')
        .select('member_id');
      const anyStripeMemberIds = new Set((allStripeMembers ?? []).map(s => s.member_id));

      const stripeMembersById = new Map<string, { name: string | null; display_name: string | null; lapsed_banner_dismissed_at: string | null }>();
      if (stripeMemberIds.size > 0) {
        const { data: stripeMembers } = await supabase
          .from('members')
          .select('id, name, display_name, lapsed_banner_dismissed_at')
          .in('id', Array.from(stripeMemberIds));
        (stripeMembers ?? []).forEach(m => stripeMembersById.set(m.id, {
          name: m.name,
          display_name: m.display_name,
          lapsed_banner_dismissed_at: m.lapsed_banner_dismissed_at,
        }));
      }

      // Upcoming cash (next 7 days)
      const { data: cashUpcoming } = await supabase
        .from('members')
        .select('id, name, display_name, athlete_subscription_end')
        .in('athlete_subscription_status', ['active', 'trial'])
        .neq('account_type', 'family_member')
        .not('athlete_subscription_end', 'is', null)
        .gte('athlete_subscription_end', nowIso)
        .lte('athlete_subscription_end', sevenIso);

      // Lapsed cash (past 14 days, includes already-expired-status to surface auto-flips)
      const { data: cashLapsed } = await supabase
        .from('members')
        .select('id, name, display_name, athlete_subscription_end, athlete_subscription_status, lapsed_banner_dismissed_at')
        .in('athlete_subscription_status', ['active', 'trial', 'expired', 'past_due'])
        .neq('account_type', 'family_member')
        .not('athlete_subscription_end', 'is', null)
        .gte('athlete_subscription_end', fourteenBackIso)
        .lt('athlete_subscription_end', nowIso);

      const daysBetween = (end: Date) =>
        Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      const cashRowsUpcoming: DueRow[] = (cashUpcoming ?? [])
        .filter(m => !anyStripeMemberIds.has(m.id))
        .map(m => ({
          memberId: m.id,
          name: m.display_name || m.name || 'Unknown',
          daysLeft: Math.max(0, daysBetween(new Date(m.athlete_subscription_end!))),
          endDate: m.athlete_subscription_end!,
          kind: 'cash' as RowKind,
        }));

      const cashRowsLapsed: DueRow[] = (cashLapsed ?? [])
        .filter(m => !anyStripeMemberIds.has(m.id))
        .filter(m => {
          const dismissedAt = m.lapsed_banner_dismissed_at;
          if (!dismissedAt) return true;
          return new Date(dismissedAt) <= new Date(m.athlete_subscription_end!);
        })
        .map(m => ({
          memberId: m.id,
          name: m.display_name || m.name || 'Unknown',
          daysLeft: daysBetween(new Date(m.athlete_subscription_end!)),
          endDate: m.athlete_subscription_end!,
          kind: 'cash-lapsed' as RowKind,
        }));

      const stripeRowsUpcoming: DueRow[] = (stripeUpcoming ?? []).map(s => {
        const member = stripeMembersById.get(s.member_id);
        const end = new Date(s.current_period_end!);
        const kind: RowKind = s.cancel_at_period_end
          ? 'stripe-cancelling'
          : s.status === 'trialing'
          ? 'stripe-trial'
          : 'stripe-auto';
        return {
          memberId: s.member_id,
          name: member?.display_name || member?.name || 'Unknown',
          daysLeft: Math.max(0, daysBetween(end)),
          endDate: s.current_period_end!,
          kind,
          planLabel: s.plan_type,
        };
      });

      const stripeRowsLapsed: DueRow[] = (stripeLapsed ?? [])
        .filter(s => {
          const member = stripeMembersById.get(s.member_id);
          const dismissedAt = member?.lapsed_banner_dismissed_at;
          if (!dismissedAt) return true;
          return new Date(dismissedAt) <= new Date(s.current_period_end!);
        })
        .map(s => {
          const member = stripeMembersById.get(s.member_id);
          const end = new Date(s.current_period_end!);
          const kind: RowKind = FAILED_PAYMENT_STATUSES.includes(s.status as string)
            ? 'stripe-lapsed-failed'
            : 'stripe-lapsed-cancelled';
          return {
            memberId: s.member_id,
            name: member?.display_name || member?.name || 'Unknown',
            daysLeft: daysBetween(end),
            endDate: s.current_period_end!,
            kind,
            planLabel: s.plan_type,
          };
        });

      // Sort: lapsed first (most recent first), then upcoming (soonest first).
      const all = [...cashRowsLapsed, ...stripeRowsLapsed, ...cashRowsUpcoming, ...stripeRowsUpcoming]
        .sort((a, b) => {
          const aLapsed = a.daysLeft < 0;
          const bLapsed = b.daysLeft < 0;
          if (aLapsed && !bLapsed) return -1;
          if (!aLapsed && bLapsed) return 1;
          if (aLapsed && bLapsed) return b.daysLeft - a.daysLeft; // most recent lapse first
          return a.daysLeft - b.daysLeft; // soonest upcoming first
        });
      setRows(all);
    } catch (err) {
      console.error('SubscriptionsDueBanner fetch failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (memberId: string, kind: RowKind) => {
    setActingId(memberId);
    // Optimistic removal — remove ONLY the dismissed row, not every row for this
    // member. A member can have a lapsed row AND a separate upcoming row (e.g.
    // Claudia: an old cancelled sub + her new sub due in 4 days). Filtering by
    // memberId alone wiped both from the live view until a refresh.
    setRows(prev => prev.filter(r => !(r.memberId === memberId && r.kind === kind)));
    try {
      const res = await authFetch('/api/coach/dismiss-lapsed-banner', {
        method: 'POST',
        body: JSON.stringify({ memberId }),
      });
      if (!res.ok) throw new Error('Dismiss failed');
      toast.success('Dismissed — reappears on re-lapse');
    } catch (err) {
      console.error('Dismiss failed', err);
      toast.error('Failed to dismiss. Refreshing.');
      await fetchDueRows();
    } finally {
      setActingId(null);
    }
  };

  const handleRenew = async (memberId: string, name: string, action: 'activate_monthly' | 'activate') => {
    // Confirm first — this grants a free month/year of access instantly with no
    // payment, and the buttons sit right next to Dismiss. A misclick once silently
    // gave a friend a full year (S380), so require an explicit confirmation.
    const label = action === 'activate_monthly' ? '1 month' : '1 year';
    if (!await confirm({
      title: `Renew ${name}?`,
      message: `Mark ${name} as paid for ${label}? This sets their access end date accordingly — no payment is collected. Only do this once they've actually paid.`,
      confirmText: `Renew ${label}`,
    })) return;

    setActingId(memberId);
    try {
      // Route through close-subscription so the outgoing month/year gets archived into
      // subscription_archive — gives a complete history for cash-monthly athletes who
      // pay 12+ times a year. The legacy /api/members/athlete-subscription activate path
      // overwrote start/end in place with no archive.
      const todayDate = new Date();
      const endDate = new Date(todayDate);
      if (action === 'activate_monthly') {
        endDate.setDate(endDate.getDate() + 30);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }
      const fmt = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const res = await authFetch('/api/coach/close-subscription', {
        method: 'POST',
        body: JSON.stringify({
          memberId,
          newStatus: 'active',
          newStartDate: fmt(todayDate),
          newEndDate: fmt(endDate),
          newNotes: '',
        }),
      });
      if (!res.ok) throw new Error('Renew failed');
      toast.success(action === 'activate_monthly' ? 'Renewed 1 month' : 'Renewed 1 year');
      await fetchDueRows();
    } catch (err) {
      console.error('Renew failed', err);
      toast.error('Failed to renew. Please try again.');
    } finally {
      setActingId(null);
    }
  };

  if (loading || rows.length === 0) return null;

  const isLapsed = (r: DueRow) => r.daysLeft < 0;

  const rowClass = (r: DueRow) => {
    if (isLapsed(r)) return 'bg-red-50 border-red-400';
    if (r.daysLeft <= 3) return 'bg-red-50 border-red-300';
    if (r.daysLeft <= 7) return 'bg-amber-50 border-amber-300';
    return 'bg-gray-50 border-gray-300';
  };

  const dotClass = (r: DueRow) => {
    if (isLapsed(r)) return 'bg-red-600';
    if (r.daysLeft <= 3) return 'bg-red-500';
    if (r.daysLeft <= 7) return 'bg-amber-500';
    return 'bg-gray-400';
  };

  const timeLabel = (r: DueRow) => {
    if (isLapsed(r)) {
      const days = Math.abs(r.daysLeft);
      return days === 0 ? 'lapsed today' : days === 1 ? 'lapsed 1 day ago' : `lapsed ${days} days ago`;
    }
    if (r.daysLeft === 0) return 'today';
    if (r.daysLeft === 1) return '1 day left';
    return `${r.daysLeft} days left`;
  };

  const showRenewButtons = (kind: RowKind) => kind === 'cash' || kind === 'cash-lapsed';

  const lapsedCount = rows.filter(isLapsed).length;
  const headerLabel = lapsedCount > 0
    ? `Subscriptions Due (${rows.length}, ${lapsedCount} lapsed)`
    : `Subscriptions Due (${rows.length})`;

  return (
    <div className='bg-white border-b border-gray-200 px-3 md:px-4 py-2 md:py-3'>
      <div className='max-w-7xl mx-auto'>
        <button
          onClick={toggleCollapsed}
          className='flex items-center gap-1.5 text-xs md:text-sm font-semibold text-gray-700 mb-2 hover:text-gray-900 transition'
          aria-expanded={!collapsed}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          {headerLabel}
        </button>
        {!collapsed && (
        <div className='space-y-1.5'>
          {rows.map(r => (
            <div
              key={`${r.kind}-${r.memberId}`}
              className={`flex items-center gap-2 md:gap-3 px-2.5 py-1.5 rounded border ${rowClass(r)}`}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass(r)}`} />
              <span className='font-medium text-sm text-gray-900 flex-1 truncate'>{r.name}</span>
              <span className={`text-xs whitespace-nowrap ${isLapsed(r) ? 'text-red-700 font-semibold' : 'text-gray-700'}`}>
                {timeLabel(r)}
              </span>
              {showRenewButtons(r.kind) && (
                <div className='flex gap-1.5 flex-shrink-0'>
                  <button
                    onClick={() => handleRenew(r.memberId, r.name, 'activate_monthly')}
                    disabled={actingId === r.memberId}
                    className='px-2 py-1 text-xs font-medium bg-white hover:bg-gray-50 border border-gray-300 rounded transition disabled:opacity-50'
                  >
                    Renew 1 Month
                  </button>
                  <button
                    onClick={() => handleRenew(r.memberId, r.name, 'activate')}
                    disabled={actingId === r.memberId}
                    className='px-2 py-1 text-xs font-medium bg-white hover:bg-gray-50 border border-gray-300 rounded transition disabled:opacity-50'
                  >
                    Renew 1 Year
                  </button>
                </div>
              )}
              {r.kind === 'stripe-auto' && (
                <span className='px-2 py-0.5 text-xs font-medium rounded bg-green-100 text-green-700 flex-shrink-0'>
                  Auto-renew{r.planLabel ? ` · ${r.planLabel}` : ''}
                </span>
              )}
              {r.kind === 'stripe-trial' && (
                <span className='px-2 py-0.5 text-xs font-medium rounded bg-green-100 text-green-700 flex-shrink-0'>
                  Trial{r.planLabel ? ` · ${r.planLabel}` : ''}
                </span>
              )}
              {r.kind === 'stripe-cancelling' && (
                <span className='px-2 py-0.5 text-xs font-medium rounded bg-red-100 text-red-700 flex-shrink-0'>
                  Cancelling at period end
                </span>
              )}
              {r.kind === 'stripe-lapsed-cancelled' && (
                <span className='px-2 py-0.5 text-xs font-medium rounded bg-red-100 text-red-800 flex-shrink-0'>
                  Cancelled{r.planLabel ? ` · ${r.planLabel}` : ''}
                </span>
              )}
              {r.kind === 'stripe-lapsed-failed' && (
                <span className='px-2 py-0.5 text-xs font-medium rounded bg-red-100 text-red-800 flex-shrink-0'>
                  Payment failed{r.planLabel ? ` · ${r.planLabel}` : ''}
                </span>
              )}
              {isLapsed(r) && (
                <button
                  onClick={() => handleDismiss(r.memberId, r.kind)}
                  disabled={actingId === r.memberId}
                  title='Dismiss (reappears on re-lapse)'
                  aria-label='Dismiss'
                  className='ml-0.5 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50 flex-shrink-0'
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}
