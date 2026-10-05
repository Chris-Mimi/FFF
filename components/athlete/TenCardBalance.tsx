'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Ticket } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { TenCardStatus } from '@/lib/tenCardStatus';

interface TenCardBalanceProps {
  loggedInMemberId: string | null;
  /** Any value that changes after a booking/cancel, so the balance re-fetches. */
  refreshKey: unknown;
}

const formatDate = (ymd: string) => {
  const [y, m, d] = ymd.split('-');
  return `${d}.${m}.${y}`;
};

/**
 * 10-card balance(s) for the logged-in household — own card, the kids' cards,
 * or a card shared with another member. Hidden when nobody books on a card.
 */
export default function TenCardBalance({ loggedInMemberId, refreshKey }: TenCardBalanceProps) {
  const [cards, setCards] = useState<TenCardStatus[]>([]);

  useEffect(() => {
    if (!loggedInMemberId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch('/api/bookings/ten-card-status', {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setCards(data.cards || []);
      } catch (err) {
        console.error('Error fetching 10-card status:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [loggedInMemberId, refreshKey]);

  if (cards.length === 0) return null;

  // Over-limit segments beyond the card's total, capped so the pill stays small.
  const MAX_SEGMENTS = 15;

  const warnings = cards.flatMap(card => {
    const own = card.holderId === loggedInMemberId;
    const whose = own ? 'Your 10-card' : `${card.holderName.split(' ')[0]}'s 10-card`;
    const over = Math.max(0, -card.remaining);
    let text: string | null = null;
    let tone: 'red' | 'yellow' = 'red';
    if (card.expired) text = `${whose} has expired — please buy a new 10-card.`;
    else if (over > 0) text = `${whose} is ${over} over — please buy a new 10-card. The extra session${over > 1 ? 's' : ''} move${over > 1 ? '' : 's'} onto the new card.`;
    else if (card.remaining === 0) text = card.upcoming > 0
      ? `${whose} is full with the sessions already booked — please buy a new 10-card.`
      : `${whose} is full — please buy a new 10-card.`;
    else if (card.remaining <= 2) { text = `${whose}: only ${card.remaining} session${card.remaining > 1 ? 's' : ''} left.`; tone = 'yellow'; }
    return text ? [{ key: card.holderId, text, tone, own }] : [];
  });

  return (
    <div className="mb-4">
      <div className="flex flex-wrap gap-2">
        {cards.map(card => {
          // Compact pill: own card → "10-card", someone else's → their first name.
          const label = card.holderId === loggedInMemberId ? '10-card' : card.holderName.split(' ')[0];
          const pastUsed = Math.max(0, card.used - card.upcoming);
          const over = Math.max(0, -card.remaining);
          const full = card.remaining <= 0;
          const tone = card.expired || full
            ? 'border-red-700 bg-red-900/30 text-red-300'
            : card.remaining <= 2
              ? 'border-yellow-700 bg-yellow-900/30 text-yellow-200'
              : 'border-gray-700 bg-gray-800 text-gray-200';
          const shared = [...(card.sharedWithViewer ? ['you'] : []), ...card.sharedBy];
          const details = [
            `${card.holderName}'s 10-card`,
            shared.length > 0 ? `shared with ${shared.join(', ')}` : null,
            `${pastUsed} used`,
            card.upcoming > 0 ? `${card.upcoming} booked ahead` : null,
            card.expiryDate ? `${card.expired ? 'expired' : 'valid until'} ${formatDate(card.expiryDate)}` : null,
          ].filter(Boolean).join(' · ');

          return (
            <div
              key={card.holderId}
              title={details}
              className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs ${tone}`}
            >
              <Ticket size={14} className="text-purple-400 flex-shrink-0" />
              <span className="font-medium">{label}</span>
              {/* One segment per session: purple = used, light purple = booked ahead,
                  red = a session that fills the card or goes over it, grey = free */}
              <span className="flex gap-0.5" aria-hidden="true">
                {Array.from({ length: Math.min(Math.max(card.total, card.used), MAX_SEGMENTS) }, (_, i) => (
                  <span
                    key={i}
                    className={`h-2.5 w-1.5 rounded-[1px] ${
                      i < pastUsed
                        ? i >= card.total ? 'bg-red-500' : 'bg-purple-500'
                        : i < card.used
                          ? full ? 'bg-red-500' : 'bg-purple-300'
                          : 'bg-gray-600'
                    }`}
                  />
                ))}
              </span>
              <span className="font-semibold whitespace-nowrap">
                {card.expired ? 'expired' : over > 0 ? `+${over} over` : full ? 'full' : `${card.remaining}/${card.total} left`}
              </span>
            </div>
          );
        })}
      </div>
      {warnings.map(w => (
        <p key={w.key} className={`mt-2 text-xs ${w.tone === 'red' ? 'text-red-300' : 'text-yellow-200'}`}>
          {w.text}
          {/* The in-app purchase buys a card for the logged-in member only. */}
          {w.own && (
            <> <Link href="/athlete?tab=payment" className="underline font-semibold">Buy a 10-card</Link></>
          )}
        </p>
      ))}
    </div>
  );
}
