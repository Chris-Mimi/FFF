'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { authFetch } from '@/lib/auth-fetch';
import { toast } from 'sonner';
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
  const [buying, setBuying] = useState<string | null>(null);

  // Parent buying for a child: straight to Stripe checkout tied to the child, so the
  // webhook renews the child's card (the payment tab only buys for the logged-in member).
  const buyFor = async (card: TenCardStatus) => {
    if (!card.buyProduct) return;
    setBuying(card.holderId);
    try {
      const res = await authFetch('/api/stripe/create-checkout', {
        method: 'POST',
        body: JSON.stringify({ productType: card.buyProduct, memberId: card.holderId }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'checkout failed');
      window.location.href = data.url;
    } catch (err) {
      console.error('10-card checkout error:', err);
      toast.error('Kauf konnte nicht gestartet werden. Bitte versuche es erneut.');
      setBuying(null);
    }
  };

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

  // German copy (athlete-facing). Own card → "deine", someone else's → "von <Vorname>".
  const warnings = cards.flatMap(card => {
    const own = card.holderId === loggedInMemberId;
    const first = card.holderName.split(' ')[0];
    const whoseCard = own ? 'deine 10er-Karte' : `die 10er-Karte von ${first}`;
    const WhoseCard = own ? 'Deine 10er-Karte' : `Die 10er-Karte von ${first}`;
    const onCard = own ? 'deiner 10er-Karte' : `der 10er-Karte von ${first}`;
    const over = Math.max(0, -card.remaining);
    let text: string | null = null;
    let tone: 'red' | 'yellow' = 'red';
    if (card.expired) text = `${WhoseCard} ist abgelaufen – bitte kaufe eine neue 10er-Karte.`;
    else if (over > 0) text = over === 1
      ? `${WhoseCard} ist um 1 Session überzogen – bitte kaufe eine neue 10er-Karte. Die zusätzliche Session wird auf die neue Karte übertragen.`
      : `${WhoseCard} ist um ${over} Sessions überzogen – bitte kaufe eine neue 10er-Karte. Die zusätzlichen Sessions werden auf die neue Karte übertragen.`;
    else if (card.remaining === 0) text = card.upcoming > 0
      ? `Inklusive der bereits gebuchten Sessions wird ${whoseCard} voll sein – bitte kaufe eine neue.`
      : `${WhoseCard} ist voll – bitte kaufe eine neue 10er-Karte.`;
    else if (card.remaining <= 2) {
      text = card.remaining === 1
        ? `Auf ${onCard} ist nur noch 1 Session frei.`
        : `Auf ${onCard} sind nur noch ${card.remaining} Sessions frei.`;
      tone = 'yellow';
    }
    return text ? [{ key: card.holderId, text, tone, own, card }] : [];
  });

  return (
    <div className="mb-4">
      <div className="flex flex-wrap gap-2">
        {cards.map(card => {
          // Same format + colours as the coach Members-page chip: past+upcoming/total,
          // red from one-before-full.
          const own = card.holderId === loggedInMemberId;
          const label = own ? '10er-Karte' : card.holderName.split(' ')[0];
          const past = Math.max(0, card.used - card.upcoming);
          const over = Math.max(0, -card.remaining);
          const display = card.upcoming > 0 ? `${past}+${card.upcoming}/${card.total}` : `${card.used}/${card.total}`;
          const red = card.expired || card.used >= card.total - 1;
          const shared = [...(card.sharedWithViewer ? ['dir'] : []), ...card.sharedBy];
          const details = [
            `10er-Karte von ${card.holderName}`,
            shared.length > 0 ? `geteilt mit ${shared.join(', ')}` : null,
            `${past} genutzt`,
            card.upcoming > 0 ? `${card.upcoming} gebucht` : null,
            card.expiryDate ? `${card.expired ? 'abgelaufen am' : 'gültig bis'} ${formatDate(card.expiryDate)}` : null,
          ].filter(Boolean).join(' · ');

          return (
            <span
              key={card.holderId}
              title={details}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-white ${red ? 'bg-red-600' : 'bg-purple-600'}`}
            >
              <span>{label}</span>
              <span>{display}</span>
              {card.expired
                ? <span className="font-bold">· abgelaufen</span>
                : over > 0 && <span className="font-bold">· +{over} überzogen</span>}
            </span>
          );
        })}
      </div>
      {warnings.map(w => (
        <p key={w.key} className={`mt-2 text-xs ${w.tone === 'red' ? 'text-red-300' : 'text-yellow-200'}`}>
          {w.text}
          {/* Own card → payment tab; own child's card → direct checkout for the child. */}
          {w.own ? (
            <> <Link href="/athlete?tab=payment" className="underline font-semibold">10er-Karte kaufen</Link></>
          ) : w.card.buyProduct && (
            <>
              {' '}
              <button
                onClick={() => buyFor(w.card)}
                disabled={buying !== null}
                className="underline font-semibold disabled:opacity-50"
              >
                {buying === w.card.holderId ? 'Wird geöffnet…' : `10er-Karte für ${w.card.holderName.split(' ')[0]} kaufen`}
              </button>
            </>
          )}
        </p>
      ))}
    </div>
  );
}
