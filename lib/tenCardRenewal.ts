import type { SupabaseClient } from '@supabase/supabase-js';

// Server-only (pass a service-role client). Shared by the coach "Close & Issue New"
// route and the Stripe 10-card purchase webhook so both renew a card the same way.
//
// Carry-over (S415, Aline von Rüden): athletes keep booking after their card is
// full and pay late. Sessions past the card's total belong on the NEXT card. The
// old card is archived with only its first `total` sessions; the new card starts
// on the date of the first overflow session, so the S351 trigger
// (used = offset + COUNT(consumed bookings since purchase_date)) counts them.

export type BookingSnapshot = {
  booking_id: string;
  date: string;
  time: string;
  status: 'confirmed' | 'no_show' | 'late_cancel';
  booker_name: string;
  is_self: boolean;
};

type CardBooking = BookingSnapshot & { member_id: string; consumed: boolean };

export type CarryOverPlan = {
  carried: { date: string; time: string }[];
  carryStart: string | null; // YYYY-MM-DD of the first overflow session
};

export type RenewOptions = {
  paidOn: string;             // YYYY-MM-DD the new card was paid
  newPurchaseDate?: string;   // coach override; default = carryStart ?? paidOn
  newExpiryDate?: string;     // default = paidOn + 12 months
  newTotal?: number;          // default = current card's total
  newSessionsUsed?: number;   // coach override of the starting count
  newNotes?: string;
};

const dateOnly = (d: string) => (d.includes('T') ? d.split('T')[0] : d);
const fmtDe = (d: string) => {
  const [y, m, day] = d.split('-');
  return `${day}.${m}.${y.slice(2)}`;
};
const plusOneYear = (d: string) => {
  const [y, m, day] = d.split('-').map(Number);
  const dt = new Date(y + 1, m - 1, day);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

async function loadCard(db: SupabaseClient, memberId: string) {
  const { data: member, error } = await db
    .from('members')
    .select('id, name, display_name, ten_card_holder_id, ten_card_total, ten_card_sessions_used, ten_card_sessions_used_offset, ten_card_purchase_date, ten_card_notes')
    .eq('id', memberId)
    .single();
  if (error || !member) throw new Error('Member not found');

  // Debit set: the holder (only if her effective method is ten_card — Miriam has
  // WP + ten_card and her own bookings shouldn't burn the kids' card) + sharers.
  const { data: candidates, error: cErr } = await db
    .from('members')
    .select('id, primary_payment_method, membership_types, ten_card_holder_id')
    .or(`id.eq.${memberId},ten_card_holder_id.eq.${memberId}`);
  if (cErr) throw new Error(`debit set: ${cErr.message}`);
  const debitMemberIds = (candidates || [])
    .filter(c => (c.primary_payment_method || (c.membership_types as string[] | null)?.[0] || null) === 'ten_card')
    .map(c => c.id as string);

  const purchaseDate = member.ten_card_purchase_date ? dateOnly(member.ten_card_purchase_date) : null;
  let bookings: CardBooking[] = [];
  if (purchaseDate && debitMemberIds.length > 0) {
    const { data, error: bErr } = await db
      .from('bookings')
      .select('id, status, member_id, ten_card_consumed, weekly_sessions!inner(date, time), members!inner(id, name, display_name)')
      .in('member_id', debitMemberIds)
      .in('status', ['confirmed', 'no_show', 'late_cancel'])
      .gte('weekly_sessions.date', purchaseDate);
    if (bErr) throw new Error(`bookings: ${bErr.message}`);
    type Row = {
      id: string;
      status: BookingSnapshot['status'];
      member_id: string;
      ten_card_consumed: boolean | null;
      weekly_sessions: { date: string; time: string } | { date: string; time: string }[];
      members: { name: string; display_name: string | null } | { name: string; display_name: string | null }[];
    };
    bookings = ((data as Row[]) || [])
      .map(r => {
        const ws = Array.isArray(r.weekly_sessions) ? r.weekly_sessions[0] : r.weekly_sessions;
        const mb = Array.isArray(r.members) ? r.members[0] : r.members;
        return {
          booking_id: r.id,
          date: ws?.date || '',
          time: ws?.time || '',
          status: r.status,
          booker_name: mb?.display_name || mb?.name || '—',
          is_self: r.member_id === memberId,
          member_id: r.member_id,
          consumed: r.ten_card_consumed === true,
        };
      })
      .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  }
  return { member, purchaseDate, bookings };
}

function splitOverflow(bookings: CardBooking[], total: number, offset: number) {
  const consumed = bookings.filter(b => b.consumed);
  const slots = Math.max(0, total - offset); // offset = pre-app sessions already on the card
  const carried = consumed.slice(slots);
  return { carried, carriedIds: new Set(carried.map(b => b.booking_id)) };
}

export async function planTenCardCarryOver(db: SupabaseClient, memberId: string): Promise<CarryOverPlan> {
  const { member, bookings } = await loadCard(db, memberId);
  const { carried } = splitOverflow(bookings, member.ten_card_total ?? 10, member.ten_card_sessions_used_offset || 0);
  return {
    carried: carried.map(b => ({ date: b.date, time: b.time })),
    carryStart: carried[0]?.date ?? null,
  };
}

/**
 * Archive the holder's current card and issue a new one, carrying any sessions
 * attended past the old card's total onto the new card. Throws on failure.
 */
export async function renewTenCard(db: SupabaseClient, memberId: string, opts: RenewOptions) {
  const { member, purchaseDate, bookings } = await loadCard(db, memberId);
  if (member.ten_card_holder_id) throw new Error('SHARER');
  if (!purchaseDate) throw new Error('NO_CARD');

  const total: number = member.ten_card_total ?? 10;
  const used: number = member.ten_card_sessions_used ?? 0;
  const { carried, carriedIds } = splitOverflow(bookings, total, member.ten_card_sessions_used_offset || 0);
  const carryStart = carried[0]?.date ?? null;

  const carryNote = carried.length
    ? `${carried.length} session${carried.length === 1 ? '' : 's'} attended after this card was full carried to the next card (${carried.map(b => fmtDe(b.date)).join(', ')}).`
    : null;

  const { error: archiveError } = await db.from('ten_card_archive').insert({
    member_id: memberId,
    total,
    sessions_used: carried.length ? Math.min(used, total) : used,
    purchase_date: purchaseDate,
    bookings_snapshot: bookings
      .filter(b => !carriedIds.has(b.booking_id))
      .map(({ member_id: _m, consumed: _c, ...snap }) => snap),
    notes: [member.ten_card_notes, carryNote].filter(Boolean).join('\n') || null,
  });
  if (archiveError) throw new Error(`archive: ${archiveError.message}`);

  const purchase = opts.newPurchaseDate || carryStart || opts.paidOn;
  const expiry = opts.newExpiryDate || plusOneYear(opts.paidOn);
  const finalTotal = typeof opts.newTotal === 'number' ? opts.newTotal : total;

  // Bookings the trigger will count on the new card. If the last old-card session
  // shares a date with the first carried one, it falls inside the new window too.
  const inNewWindow = bookings.filter(b => b.consumed && b.date >= purchase).length;
  const isCarry = carried.length > 0 && purchase === carryStart;
  const sessionsUsed = typeof opts.newSessionsUsed === 'number'
    ? opts.newSessionsUsed
    : isCarry ? carried.length : inNewWindow;
  // Trigger formula: used = offset + COUNT(consumed bookings since purchase).
  const offset = sessionsUsed - inNewWindow;

  const autoNote = isCarry
    ? `Paid ${fmtDe(opts.paidOn)}. Started ${fmtDe(purchase)} to carry over ${carried.length} session${carried.length === 1 ? '' : 's'} from the previous card (${carried.map(b => fmtDe(b.date)).join(', ')}).`
    : null;

  const { error: resetError } = await db
    .from('members')
    .update({
      ten_card_purchase_date: purchase,
      ten_card_expiry_date: expiry,
      ten_card_sessions_used: sessionsUsed,
      ten_card_sessions_used_offset: offset,
      ten_card_total: finalTotal,
      ten_card_notes: [autoNote, opts.newNotes].filter(Boolean).join('\n') || null,
    })
    .eq('id', memberId);
  if (resetError) throw new Error(`RESET_FAILED: ${resetError.message}`);

  return { purchase_date: purchase, expiry_date: expiry, sessions_used: sessionsUsed, total: finalTotal, carried: carried.length };
}
