'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { authFetch } from '@/lib/auth-fetch';
import { toast } from 'sonner';

type RowKind = 'cash' | 'stripe-auto' | 'stripe-cancelling';

interface DueRow {
  memberId: string;
  name: string;
  daysLeft: number;
  endDate: string;
  kind: RowKind;
  planLabel?: string | null;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default function SubscriptionsDueBanner() {
  const [rows, setRows] = useState<DueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDueRows();
  }, []);

  const fetchDueRows = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const sevenDaysOut = new Date(now.getTime() + SEVEN_DAYS_MS);
      const nowIso = now.toISOString();
      const sevenIso = sevenDaysOut.toISOString();

      const { data: stripeSubs } = await supabase
        .from('subscriptions')
        .select('member_id, current_period_end, cancel_at_period_end, plan_type, status')
        .eq('status', 'active')
        .not('current_period_end', 'is', null)
        .gte('current_period_end', nowIso)
        .lte('current_period_end', sevenIso);

      const stripeMemberIds = new Set((stripeSubs ?? []).map(s => s.member_id));

      const stripeMembersById = new Map<string, { name: string | null; display_name: string | null }>();
      if (stripeMemberIds.size > 0) {
        const { data: stripeMembers } = await supabase
          .from('members')
          .select('id, name, display_name')
          .in('id', Array.from(stripeMemberIds));
        (stripeMembers ?? []).forEach(m => stripeMembersById.set(m.id, { name: m.name, display_name: m.display_name }));
      }

      const { data: cashMembers } = await supabase
        .from('members')
        .select('id, name, display_name, athlete_subscription_end')
        .in('athlete_subscription_status', ['active', 'trial'])
        .neq('account_type', 'family_member')
        .not('athlete_subscription_end', 'is', null)
        .gte('athlete_subscription_end', nowIso)
        .lte('athlete_subscription_end', sevenIso);

      const cashRows: DueRow[] = (cashMembers ?? [])
        .filter(m => !stripeMemberIds.has(m.id))
        .map(m => {
          const end = new Date(m.athlete_subscription_end!);
          const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
          return {
            memberId: m.id,
            name: m.display_name || m.name || 'Unknown',
            daysLeft,
            endDate: m.athlete_subscription_end!,
            kind: 'cash' as RowKind,
          };
        });

      const stripeRows: DueRow[] = (stripeSubs ?? []).map(s => {
        const member = stripeMembersById.get(s.member_id);
        const end = new Date(s.current_period_end!);
        const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        return {
          memberId: s.member_id,
          name: member?.display_name || member?.name || 'Unknown',
          daysLeft,
          endDate: s.current_period_end!,
          kind: s.cancel_at_period_end ? 'stripe-cancelling' : 'stripe-auto',
          planLabel: s.plan_type,
        };
      });

      const all = [...cashRows, ...stripeRows].sort((a, b) => a.daysLeft - b.daysLeft);
      setRows(all);
    } catch (err) {
      console.error('SubscriptionsDueBanner fetch failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = async (memberId: string, action: 'activate_monthly' | 'activate') => {
    setActingId(memberId);
    try {
      const res = await authFetch('/api/members/athlete-subscription', {
        method: 'POST',
        body: JSON.stringify({ memberId, action }),
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

  const rowClass = (daysLeft: number) =>
    daysLeft <= 3
      ? 'bg-red-50 border-red-300'
      : daysLeft <= 7
      ? 'bg-amber-50 border-amber-300'
      : 'bg-gray-50 border-gray-300';

  const dotClass = (daysLeft: number) =>
    daysLeft <= 3 ? 'bg-red-500' : daysLeft <= 7 ? 'bg-amber-500' : 'bg-gray-400';

  return (
    <div className='bg-white border-b border-gray-200 px-3 md:px-4 py-2 md:py-3'>
      <div className='max-w-7xl mx-auto'>
        <h3 className='text-xs md:text-sm font-semibold text-gray-700 mb-2'>
          Subscriptions Due ({rows.length})
        </h3>
        <div className='space-y-1.5'>
          {rows.map(r => (
            <div
              key={`${r.kind}-${r.memberId}`}
              className={`flex items-center gap-2 md:gap-3 px-2.5 py-1.5 rounded border ${rowClass(r.daysLeft)}`}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass(r.daysLeft)}`} />
              <span className='font-medium text-sm text-gray-900 flex-1 truncate'>{r.name}</span>
              <span className='text-xs text-gray-700 whitespace-nowrap'>
                {r.daysLeft === 0 ? 'today' : r.daysLeft === 1 ? '1 day left' : `${r.daysLeft} days left`}
              </span>
              {r.kind === 'cash' && (
                <div className='flex gap-1.5 flex-shrink-0'>
                  <button
                    onClick={() => handleRenew(r.memberId, 'activate_monthly')}
                    disabled={actingId === r.memberId}
                    className='px-2 py-1 text-xs font-medium bg-white hover:bg-gray-50 border border-gray-300 rounded transition disabled:opacity-50'
                  >
                    Renew 1 Month
                  </button>
                  <button
                    onClick={() => handleRenew(r.memberId, 'activate')}
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
              {r.kind === 'stripe-cancelling' && (
                <span className='px-2 py-0.5 text-xs font-medium rounded bg-red-100 text-red-700 flex-shrink-0'>
                  Cancelling at period end
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
