'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Counts {
  monthly: number;
  yearly: number;
  trial: number;
  pastDue: number;
  cancelling: number;
}

/**
 * Athlete App subscriber totals for the Members → Subscriptions tab (S418):
 * Stripe's Dashboard has no quick monthly-vs-yearly count. Reads the app's
 * `subscriptions` table, which the Stripe webhook keeps in sync.
 */
export default function SubscriptionCounts() {
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('plan_type, status, cancel_at_period_end')
        .in('status', ['active', 'trialing', 'past_due'])
        .range(0, 999);
      if (error) {
        console.error('Subscription counts failed:', error);
        return;
      }
      const c: Counts = { monthly: 0, yearly: 0, trial: 0, pastDue: 0, cancelling: 0 };
      for (const s of data || []) {
        if (s.status === 'trialing') c.trial++;
        else if (s.status === 'past_due') c.pastDue++;
        else if (s.plan_type === 'yearly') c.yearly++;
        else c.monthly++;
        if (s.cancel_at_period_end) c.cancelling++;
      }
      setCounts(c);
    })();
  }, []);

  if (!counts) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-gray-400">Athlete App:</span>
      <span className="px-2.5 py-1 rounded bg-blue-500/20 text-blue-300 font-medium">{counts.monthly} monthly</span>
      <span className="px-2.5 py-1 rounded bg-green-500/20 text-green-300 font-medium">{counts.yearly} yearly</span>
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
