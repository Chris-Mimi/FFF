'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Cash members get a 4-day grace past their subscription end before access is
// cut, plus a reminder starting 2 days before the end date (Chris, S388).
const GRACE_DAYS = 4;
const LEAD_DAYS = 2;
const MS_DAY = 24 * 60 * 60 * 1000;

interface PaymentDueBannerProps {
  /** Primary member id (the paying account). Family members inherit it. */
  memberId: string;
  /** Resolved athlete subscription status for the paying account. */
  status: string | null;
  /** Resolved athlete_subscription_end (ISO) for the paying account. */
  subscriptionEnd: string | null;
}

/**
 * Cash-only "please pay" reminder. Shows from LEAD_DAYS before the subscription
 * end date through the GRACE_DAYS grace window after it. Hidden for Stripe
 * (auto-renewing) members — they have a row in `subscriptions` and must never be
 * nagged (S380: nagging auto-renew members only prompts churn). Dismissable once
 * per day.
 */
export default function PaymentDueBanner({ memberId, status, subscriptionEnd }: PaymentDueBannerProps) {
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  const dismissKey = `paydue-dismiss-${memberId}-${new Date().toISOString().slice(0, 10)}`;

  useEffect(() => {
    let cancelled = false;
    // Only cash subs that still have access (status 'active'); trials/expired excluded.
    if (status !== 'active' || !subscriptionEnd || !memberId) { setDaysLeft(null); return; }

    const dLeft = Math.ceil((new Date(subscriptionEnd).getTime() - Date.now()) / MS_DAY);
    // Window: from LEAD_DAYS before the end through the GRACE_DAYS grace after it.
    if (dLeft > LEAD_DAYS || dLeft < -GRACE_DAYS) { setDaysLeft(null); return; }

    if (typeof window !== 'undefined' && localStorage.getItem(dismissKey)) { setDaysLeft(null); return; }

    // Exclude Stripe (auto-renewing) members — they have an active subscriptions row.
    supabase
      .from('subscriptions')
      .select('id')
      .eq('member_id', memberId)
      .in('status', ['active', 'trialing'])
      .limit(1)
      .then(({ data }) => {
        if (cancelled) return;
        if (data && data.length > 0) { setDaysLeft(null); return; } // Stripe — never nag
        setDaysLeft(dLeft);
      });

    return () => { cancelled = true; };
  }, [memberId, status, subscriptionEnd, dismissKey]);

  if (daysLeft === null) return null;

  const inGrace = daysLeft <= 0;
  const graceRemaining = GRACE_DAYS + daysLeft; // access days still left during grace
  const message = inGrace
    ? `Deine Mitgliedschaft ist fällig. Bitte zahle bar, um deinen Zugang zu behalten — noch ${graceRemaining} ${graceRemaining === 1 ? 'Tag' : 'Tage'}.`
    : `Deine Mitgliedschaft läuft in ${daysLeft} ${daysLeft === 1 ? 'Tag' : 'Tagen'} ab. Bitte denke an deine Barzahlung.`;

  const handleDismiss = () => {
    if (typeof window !== 'undefined') localStorage.setItem(dismissKey, '1');
    setDaysLeft(null);
  };

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/40 text-amber-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{message}</p>
        <button
          onClick={handleDismiss}
          aria-label="Schließen"
          className="text-amber-300 hover:text-amber-100 flex-shrink-0"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
