import type { SupabaseClient } from '@supabase/supabase-js';
import { berlinToday, isMinor, sessionStartInstant } from '@/lib/bookingRules';

// Server-only (pass a service-role client). Athlete-facing 10-card balances for a
// logged-in household: own card, the kids' cards, or a card shared with another
// member. Service role because a sharer's card can belong to someone outside the
// household (Torben → Gloria), whose row RLS hides from the athlete.

type CardMember = {
  id: string;
  name: string | null;
  display_name: string | null;
  membership_types: string[] | null;
  primary_payment_method: string | null;
  ten_card_holder_id: string | null;
  ten_card_total: number | null;
  ten_card_sessions_used: number | null;
  ten_card_expiry_date: string | null;
  account_type: string | null;
  primary_member_id: string | null;
  date_of_birth: string | null;
  guardian_only: boolean | null;
};

export type TenCardStatus = {
  holderId: string;
  holderName: string;
  /** Other members booking on this card (the logged-in user excluded). */
  sharedBy: string[];
  /** The logged-in user books on someone else's card. */
  sharedWithViewer: boolean;
  total: number;
  used: number;
  remaining: number;
  upcoming: number;
  expiryDate: string | null;
  expired: boolean;
  /** Expired cards stay bookable until this date (expiry + 1 month), mirrors /api/bookings/create. */
  graceUntil: string | null;
  /** Stripe product the viewer can buy for this card's holder (self or own child); null = can't. */
  buyProduct: '10card' | '10card_kids' | null;
};

const CARD_COLS =
  'id, name, display_name, membership_types, primary_payment_method, ten_card_holder_id, ten_card_total, ten_card_sessions_used, ten_card_expiry_date, account_type, primary_member_id, date_of_birth, guardian_only';

const plusOneMonth = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10); // same roll-over as the booking route
};

const label = (m: CardMember) => m.display_name || m.name || '';
const debitsOwnCard = (m: CardMember) =>
  (m.primary_payment_method || m.membership_types?.[0] || null) === 'ten_card';

export async function getHouseholdTenCards(db: SupabaseClient, userId: string): Promise<TenCardStatus[]> {
  const { data: household, error: hhError } = await db
    .from('members')
    .select(CARD_COLS)
    .or(`id.eq.${userId},primary_member_id.eq.${userId}`);
  if (hhError) throw hhError;

  // Which card each household member books on: a holder link wins, else their own
  // card if they hold one (same rule as the coach chip in useMemberData).
  const holderIds = new Set<string>();
  for (const m of (household || []) as CardMember[]) {
    if (m.ten_card_holder_id) holderIds.add(m.ten_card_holder_id);
    else if ((m.membership_types || []).includes('ten_card')) holderIds.add(m.id);
  }
  if (holderIds.size === 0) return [];

  const ids = [...holderIds];
  const [holdersRes, sharersRes] = await Promise.all([
    db.from('members').select(CARD_COLS).in('id', ids),
    db.from('members').select(CARD_COLS).in('ten_card_holder_id', ids),
  ]);
  if (holdersRes.error) throw holdersRes.error;
  if (sharersRes.error) throw sharersRes.error;
  const holders = (holdersRes.data || []) as CardMember[];
  const sharers = (sharersRes.data || []) as CardMember[];

  // Upcoming bookings already debited — the counter includes them, so "used"
  // would otherwise surprise a parent whose kid has only been twice.
  const bookerById = new Map<string, CardMember>([...holders, ...sharers].map(m => [m.id, m]));
  const today = berlinToday();
  const { data: upcoming, error: bError } = await db
    .from('bookings')
    .select('member_id, weekly_sessions!inner(date, time)')
    .eq('ten_card_consumed', true)
    .eq('status', 'confirmed')
    .in('member_id', [...bookerById.keys()])
    .gte('weekly_sessions.date', today);
  if (bError) throw bError;

  const nowMs = Date.now();
  const upcomingByHolder: Record<string, number> = {};
  for (const row of (upcoming || []) as { member_id: string; weekly_sessions: { date: string; time: string } | { date: string; time: string }[] }[]) {
    const ws = Array.isArray(row.weekly_sessions) ? row.weekly_sessions[0] : row.weekly_sessions;
    const booker = bookerById.get(row.member_id);
    if (!ws?.date || !booker) continue;
    // Same debit rule as /api/bookings/create.
    if (!debitsOwnCard(booker)) continue;
    if (sessionStartInstant(ws.date, ws.time || '00:00:00').getTime() < nowMs) continue;
    const holderId = booker.ten_card_holder_id || booker.id;
    upcomingByHolder[holderId] = (upcomingByHolder[holderId] || 0) + 1;
  }

  return holders.map(h => {
    const cardSharers = sharers.filter(s => s.ten_card_holder_id === h.id);
    // Kids card when everyone booking on it is under 18 — Irene/Miriam hold a card
    // only their kids use (their own bookings go on member/Wellpass); a guardian-only
    // holder (Stefanie Neumann) doesn't train at all.
    const users = [...(debitsOwnCard(h) && !h.guardian_only ? [h] : []), ...cardSharers];
    const kidsOnly = users.length > 0 && users.every(u => isMinor(u.date_of_birth));
    const total = h.ten_card_total ?? 10;
    const used = h.ten_card_sessions_used ?? 0;
    const expiry = h.ten_card_expiry_date ? h.ten_card_expiry_date.split('T')[0] : null;
    return {
      holderId: h.id,
      holderName: label(h),
      sharedBy: cardSharers.filter(s => s.id !== userId).map(label),
      sharedWithViewer: cardSharers.some(s => s.id === userId),
      total,
      used,
      remaining: total - used,
      upcoming: upcomingByHolder[h.id] || 0,
      expiryDate: expiry,
      expired: !!expiry && expiry < today,
      graceUntil: expiry ? plusOneMonth(expiry) : null,
      // Mirrors the create-checkout ownership guard: self, or a family member you own.
      buyProduct: h.id === userId || (h.account_type === 'family_member' && h.primary_member_id === userId)
        ? (kidsOnly ? '10card_kids' : '10card')
        : null,
    };
  });
}
