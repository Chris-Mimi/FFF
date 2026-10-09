'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Counts {
  monthly8: number;
  monthly10: number;
  yearly: number;
  // of which paid cash / PayPal (coach-activated, no Stripe subscription)
  cashMonthly8: number;
  cashMonthly10: number;
  cashYearly: number;
  trial: number;
  pastDue: number;
  cancelling: number;
}

/**
 * Athlete App subscriber totals for the Members → Subscriptions tab (S418):
 * Stripe's Dashboard has no quick monthly-vs-yearly count. Reads the app's
 * `subscriptions` table, which the Stripe webhook keeps in sync.
 * Monthly is split by price: members.subscription_tier 'member' = €8,
 * 'wellpass' = €10 (set by the webhook from the price bought).
 * Cash/PayPal payers (S418) = athlete_subscription_status 'active' with an end
 * date and no Stripe subscription; ≤ 62 days = monthly. Price: gym members
 * ('member' membership) €8, everyone else €10 — same split as Stripe. Coaches /
 * permanent activations (no end date) aren't counted.
 */
export default function SubscriptionCounts() {
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('member_id, plan_type, status, cancel_at_period_end')
        .in('status', ['active', 'trialing', 'past_due'])
        .range(0, 999);
      if (error) {
        console.error('Subscription counts failed:', error);
        return;
      }
      const memberIds = [...new Set((data || []).map(s => s.member_id).filter(Boolean))];
      const tierOf = new Map<string, string | null>();
      if (memberIds.length > 0) {
        const { data: mem, error: memErr } = await supabase
          .from('members')
          .select('id, subscription_tier')
          .in('id', memberIds);
        if (memErr) {
          console.error('Subscription tiers failed:', memErr);
          return;
        }
        for (const m of mem || []) tierOf.set(m.id, m.subscription_tier);
      }
      const c: Counts = {
        monthly8: 0, monthly10: 0, yearly: 0, cashMonthly8: 0, cashMonthly10: 0, cashYearly: 0,
        trial: 0, pastDue: 0, cancelling: 0,
      };

      const stripeMemberIds = new Set((data || []).map(s => s.member_id));
      const { data: cashRows, error: cashErr } = await supabase
        .from('members')
        .select('id, account_type, membership_types, athlete_subscription_start, athlete_subscription_end')
        .eq('athlete_subscription_status', 'active')
        .not('athlete_subscription_end', 'is', null)
        .range(0, 999);
      if (cashErr) {
        console.error('Cash subscription counts failed:', cashErr);
        return;
      }
      for (const m of cashRows || []) {
        if (stripeMemberIds.has(m.id) || m.account_type === 'family_member') continue;
        const start = m.athlete_subscription_start ? Date.parse(m.athlete_subscription_start) : NaN;
        const days = (Date.parse(m.athlete_subscription_end as string) - start) / 864e5;
        if (!Number.isNaN(days) && days > 62) {
          c.yearly++; c.cashYearly++;
        } else if ((m.membership_types as string[] | null)?.includes('member')) {
          c.monthly8++; c.cashMonthly8++;
        } else {
          c.monthly10++; c.cashMonthly10++;
        }
      }
      for (const s of data || []) {
        if (s.status === 'trialing') c.trial++;
        else if (s.status === 'past_due') c.pastDue++;
        else if (s.plan_type === 'yearly') c.yearly++;
        else if (tierOf.get(s.member_id) === 'wellpass') c.monthly10++;
        else c.monthly8++;
        if (s.cancel_at_period_end) c.cancelling++;
      }
      setCounts(c);
    })();
  }, []);

  if (!counts) return null;

  const cashLabel = (n: number) => (n > 0 ? ` (${n} cash)` : '');

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-gray-400">Athlete App:</span>
      <span className="px-2.5 py-1 rounded bg-blue-500/20 text-blue-300 font-medium">
        {counts.monthly8} monthly €8{cashLabel(counts.cashMonthly8)}
      </span>
      <span className="px-2.5 py-1 rounded bg-blue-500/20 text-blue-300 font-medium">
        {counts.monthly10} monthly €10{cashLabel(counts.cashMonthly10)}
      </span>
      <span className="px-2.5 py-1 rounded bg-green-500/20 text-green-300 font-medium">
        {counts.yearly} yearly{cashLabel(counts.cashYearly)}
      </span>
      {counts.trial > 0 && (
        <span className="px-2.5 py-1 rounded bg-gray-700 text-gray-300">{counts.trial} in trial</span>
      )}
      {counts.pastDue > 0 && (
        <span className="px-2.5 py-1 rounded bg-red-500/20 text-red-300">{counts.pastDue} payment failed</span>
      )}
      {counts.cancelling > 0 && (
        <span className="text-xs text-amber-300">({counts.cancelling} cancelling at period end)</span>
      )}
    </div>
  );
}
