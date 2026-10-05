'use client';

import { useEffect, useState } from 'react';
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

  return (
    <div className="space-y-2 mb-6">
      {cards.map(card => {
        const title = card.holderId === loggedInMemberId ? 'Your 10-card' : `${card.holderName}'s 10-card`;
        const others = card.sharedWithViewer ? ['you', ...card.sharedBy] : card.sharedBy;
        const pastUsed = Math.max(0, card.used - card.upcoming);
        const over = Math.max(0, -card.remaining);
        const tone = card.expired || card.remaining <= 0
          ? 'border-red-700 bg-red-900/30'
          : card.remaining <= 2
            ? 'border-yellow-700 bg-yellow-900/30'
            : 'border-gray-700 bg-gray-800';

        return (
          <div key={card.holderId} className={`rounded-lg border px-4 py-3 ${tone}`}>
            <div className="flex items-start gap-3">
              <Ticket size={20} className="text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="text-white font-semibold text-sm">
                    {title}
                    {others.length > 0 && (
                      <span className="text-gray-400 font-normal"> · shared with {others.join(', ')}</span>
                    )}
                  </p>
                  <p className="text-sm">
                    {card.expired ? (
                      <span className="text-red-300 font-semibold">Expired</span>
                    ) : over > 0 ? (
                      <span className="text-red-300 font-semibold">All {card.total} used · {over} over</span>
                    ) : (
                      <span className="text-white font-semibold">
                        {card.remaining} of {card.total} left
                      </span>
                    )}
                  </p>
                </div>

                {/* One pip per session: solid = used, outlined = booked ahead, empty = free */}
                <div className="flex gap-1 mt-2" aria-hidden="true">
                  {Array.from({ length: card.total }, (_, i) => (
                    <span
                      key={i}
                      className={`h-2 flex-1 rounded-sm ${
                        i < pastUsed
                          ? 'bg-purple-500'
                          : i < card.used
                            ? 'border border-purple-400 bg-purple-500/20'
                            : 'bg-gray-700'
                      }`}
                    />
                  ))}
                </div>

                <p className="text-gray-400 text-xs mt-2">
                  {pastUsed} used
                  {card.upcoming > 0 && <> · {card.upcoming} booked ahead</>}
                  {card.expiryDate && (
                    <> · {card.expired ? 'expired' : 'valid until'} {formatDate(card.expiryDate)}</>
                  )}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
