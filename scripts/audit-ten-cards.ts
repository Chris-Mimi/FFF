/**
 * Read-only audit of every 10-card. Flags:
 *   PRE-START  consumed bookings dated before the card's start date that no archived
 *              card covers (Stefanie Neumann S416: kids attended 23.09/30.09, card
 *              started 01.10 → sessions counted nowhere)
 *   UNFLAGGED  card users' attended bookings since the start date with
 *              ten_card_consumed=false (S415 coach-add class)
 *   DRIFT      counter ≠ offset + consumed bookings since start (trigger out of sync)
 *   EXPIRED    card expired but card users still have upcoming bookings
 *   NO-START   card holder with no purchase date (counter can't be recomputed)
 *   SHARER     sharer whose effective pay-with isn't ten_card (their bookings don't debit)
 *   PAY-WITH   effective pay-with ten_card but no card of their own and no holder link
 *
 * Usage: npx tsx scripts/audit-ten-cards.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

type M = {
  id: string; name: string | null; display_name: string | null; status: string | null; parked: boolean | null;
  membership_types: string[] | null; primary_payment_method: string | null; ten_card_holder_id: string | null;
  ten_card_total: number | null; ten_card_sessions_used: number | null; ten_card_sessions_used_offset: number | null;
  ten_card_purchase_date: string | null; ten_card_expiry_date: string | null; guardian_only: boolean | null;
};
type B = {
  id: string; member_id: string; status: string; ten_card_consumed: boolean | null; is_og: boolean | null;
  is_trial: boolean | null; weekly_sessions: { date: string; time: string };
};

const nm = (m: M) => m.display_name || m.name || m.id.slice(0, 8);
const eff = (m: M) => m.primary_payment_method || m.membership_types?.[0] || null;
const ymd = (s: string | null) => (s ? s.split('T')[0] : null);
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date());

async function all<T>(build: (from: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < 1000) return out;
  }
}

async function main() {
  const members = await all<M>(from => db.from('members')
    .select('id, name, display_name, status, parked, membership_types, primary_payment_method, ten_card_holder_id, ten_card_total, ten_card_sessions_used, ten_card_sessions_used_offset, ten_card_purchase_date, ten_card_expiry_date, guardian_only')
    .order('id').range(from, from + 999));
  const byId = new Map(members.map(m => [m.id, m]));

  const holders = members.filter(m => !m.ten_card_holder_id && (m.membership_types || []).includes('ten_card'));
  const sharers = members.filter(m => m.ten_card_holder_id);
  const holderIds = new Set(holders.map(h => h.id));
  sharers.forEach(s => holderIds.add(s.ten_card_holder_id!));

  // Everyone whose bookings can touch a card.
  const userIds = [...new Set([...holderIds, ...sharers.map(s => s.id)])];
  const bookings: B[] = [];
  for (let i = 0; i < userIds.length; i += 50) {
    const chunk = userIds.slice(i, i + 50);
    bookings.push(...await all<B>(from => db.from('bookings')
      .select('id, member_id, status, ten_card_consumed, is_og, is_trial, weekly_sessions!inner(date, time)')
      .in('member_id', chunk).order('id').range(from, from + 999)));
  }

  const archives = await all<{ member_id: string; purchase_date: string | null; closed_at: string | null; bookings_snapshot: { booking_id: string }[] | null }>(
    from => db.from('ten_card_archive').select('member_id, purchase_date, closed_at, bookings_snapshot').order('id').range(from, from + 999));
  const archivedIds = new Set(archives.flatMap(a => (a.bookings_snapshot || []).map(b => b.booking_id)));
  const archiveWindows = (holderId: string) => archives.filter(a => a.member_id === holderId)
    .map(a => [ymd(a.purchase_date) || '0000-00-00', ymd(a.closed_at) || '9999-12-31'] as const);

  const findings: Record<string, string[]> = { 'PRE-START': [], UNFLAGGED: [], DRIFT: [], EXPIRED: [], 'NO-START': [], SHARER: [], 'PAY-WITH': [] };
  const holderOf = (m: M) => m.ten_card_holder_id || m.id;

  for (const hid of holderIds) {
    const h = byId.get(hid);
    if (!h) { findings.SHARER.push(`holder ${hid} missing — sharers point at a deleted member`); continue; }
    if (h.status !== 'active' || h.parked) continue;
    const users = members.filter(m => holderOf(m) === hid);
    const cardBookings = bookings.filter(b => users.some(u => u.id === b.member_id));
    const start = ymd(h.ten_card_purchase_date);
    const label = `${nm(h)}${users.length > 1 ? ` (+ ${users.filter(u => u.id !== hid).map(nm).join(', ')})` : ''}`;

    if (!start) {
      findings['NO-START'].push(`${label}: counter ${h.ten_card_sessions_used ?? 0}/${h.ten_card_total ?? 10}`);
      continue;
    }

    // DRIFT — same formula as recompute_ten_card_for_holder.
    const consumedSince = cardBookings.filter(b => b.ten_card_consumed && b.weekly_sessions.date >= start).length;
    const expected = (h.ten_card_sessions_used_offset || 0) + consumedSince;
    if ((h.ten_card_sessions_used ?? 0) !== expected) {
      findings.DRIFT.push(`${label}: counter ${h.ten_card_sessions_used} vs expected ${expected} (offset ${h.ten_card_sessions_used_offset || 0} + ${consumedSince})`);
    }

    // UNFLAGGED — debiting users, attended (or no-show/late-cancel), since start, past or future.
    const unflagged = cardBookings.filter(b => {
      const u = byId.get(b.member_id)!;
      return eff(u) === 'ten_card' && !u.guardian_only && !b.ten_card_consumed && !b.is_og && !b.is_trial
        && ['confirmed', 'no_show', 'late_cancel'].includes(b.status) && b.weekly_sessions.date >= start;
    });
    if (unflagged.length) {
      findings.UNFLAGGED.push(`${label}: ${unflagged.length} — ${unflagged.map(b => `${b.weekly_sessions.date} ${nm(byId.get(b.member_id)!)} (${b.status})`).sort().join('; ')}`);
    }

    // PRE-START — consumed before start, not in any archive snapshot or archive window.
    const windows = archiveWindows(hid);
    const pre = cardBookings.filter(b => b.ten_card_consumed && b.weekly_sessions.date < start
      && !archivedIds.has(b.id) && !windows.some(([from, to]) => b.weekly_sessions.date >= from && b.weekly_sessions.date <= to));
    if (pre.length) {
      const recent = pre.filter(b => b.weekly_sessions.date >= addDays(start, -60));
      findings['PRE-START'].push(`${label}: start ${start}, ${pre.length} uncovered (${recent.length} in the 60 days before start)${recent.length ? ' — ' + recent.map(b => `${b.weekly_sessions.date} ${nm(byId.get(b.member_id)!)}`).sort().join('; ') : ''}`);
    }

    // EXPIRED with upcoming bookings.
    const exp = ymd(h.ten_card_expiry_date);
    if (exp && exp < today) {
      const upcoming = cardBookings.filter(b => b.status === 'confirmed' && b.weekly_sessions.date >= today);
      if (upcoming.length) findings.EXPIRED.push(`${label}: expired ${exp}, ${upcoming.length} upcoming booking(s)`);
    }
  }

  for (const s of sharers) {
    if (s.status !== 'active' || s.parked) continue;
    if (eff(s) !== 'ten_card') findings.SHARER.push(`${nm(s)} → ${nm(byId.get(s.ten_card_holder_id!) || s)}: pay-with is ${eff(s)}`);
  }
  for (const m of members) {
    if (m.status !== 'active' || m.parked || m.ten_card_holder_id || holderIds.has(m.id)) continue;
    if (eff(m) === 'ten_card' && !m.guardian_only) findings['PAY-WITH'].push(`${nm(m)}: pay-with ten_card, types ${JSON.stringify(m.membership_types)}`);
  }

  console.log(`Audited ${holderIds.size} cards, ${sharers.length} sharers, ${bookings.length} bookings, ${archives.length} archives (today ${today}).`);
  for (const [k, v] of Object.entries(findings)) {
    console.log(`\n== ${k} (${v.length})`);
    v.sort().forEach(line => console.log('  ' + line));
  }
}

function addDays(d: string, n: number) {
  const [y, m, dd] = d.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, dd + n));
  return t.toISOString().slice(0, 10);
}

main().catch(err => { console.error(err); process.exit(1); });
