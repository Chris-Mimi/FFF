/**
 * Diagnose +1 drift between ten_card_sessions_used (stored counter) and
 * Recalc (live booking query). Prints every booking row that could explain
 * the gap.
 *
 * Recalc counts bookings WHERE
 *   status IN ('confirmed','no_show','late_cancel') AND is_trial=false
 *   AND session.date >= ten_card_purchase_date
 *
 * Anything outside that filter that previously DID bump the counter is a
 * drift culprit:
 *   - status='cancelled'        (refund only fired if within grace period)
 *   - status='coach_cancelled'  (refund only fired in some paths)
 *   - booking missing entirely  (DELETE bypasses the refund path)
 *
 * Service-role (anon would be RLS-blocked).
 *
 * Usage:
 *   npx tsx scripts/probe-ten-card-drift.ts <email-or-name-substring>   # one member
 *   npx tsx scripts/probe-ten-card-drift.ts --all                       # gym-wide scan
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const RECALC_STATUSES = new Set(['confirmed', 'no_show', 'late_cancel']);

type MemberRow = {
  id: string;
  name: string | null;
  display_name: string | null;
  email: string;
  ten_card_purchase_date: string | null;
  ten_card_sessions_used: number | null;
  ten_card_total: number | null;
  ten_card_holder_id: string | null;
  primary_payment_method: string | null;
  membership_types: string[] | null;
};

async function scanAll() {
  // Only holders (not shared-card kids — they share the holder's counter).
  // The counter lives on the holder row.
  const { data: holders, error } = await supabase
    .from('members')
    .select('id, name, display_name, email, ten_card_purchase_date, ten_card_sessions_used, ten_card_total, ten_card_holder_id, primary_payment_method, membership_types')
    .is('ten_card_holder_id', null)
    .not('ten_card_purchase_date', 'is', null);

  if (error) {
    console.error('Holders fetch failed:', error);
    process.exit(1);
  }

  const drifters: Array<{ member: MemberRow; counter: number; recalc: number; drift: number }> = [];
  for (const h of (holders || []) as MemberRow[]) {
    const effective = h.primary_payment_method || h.membership_types?.[0];
    if (effective !== 'ten_card') continue;

    const purchaseDateStr = h.ten_card_purchase_date ? h.ten_card_purchase_date.split('T')[0] : null;
    if (!purchaseDateStr) continue;

    // Resolve debit members (holder + sharers)
    const { data: candidates } = await supabase
      .from('members')
      .select('id, primary_payment_method, membership_types, ten_card_holder_id')
      .or(`id.eq.${h.id},ten_card_holder_id.eq.${h.id}`);
    const debitIds = (candidates || [])
      .filter(c => (c.primary_payment_method || (c.membership_types as string[] | null)?.[0]) === 'ten_card')
      .map(c => c.id);

    const { data: rows } = await supabase
      .from('bookings')
      .select('id, status, is_trial, weekly_sessions!inner(date)')
      .in('member_id', debitIds)
      .in('status', ['confirmed', 'no_show', 'late_cancel'])
      .eq('is_trial', false)
      .gte('weekly_sessions.date', purchaseDateStr);
    const recalcCount = (rows || []).length;
    const counter = h.ten_card_sessions_used ?? 0;
    const drift = counter - recalcCount;
    if (drift !== 0) {
      drifters.push({ member: h, counter, recalc: recalcCount, drift });
    }
  }

  drifters.sort((a, b) => b.drift - a.drift);

  console.log(`\n=== 10-card drift scan ===`);
  console.log(`  Scanned ${(holders || []).length} holders with purchase_date set`);
  console.log(`  Drifters: ${drifters.length}\n`);
  if (drifters.length === 0) {
    console.log('  ✅ No drift detected.');
    return;
  }
  drifters.forEach(d => {
    const name = d.member.display_name || d.member.name;
    const sign = d.drift > 0 ? '+' : '';
    console.log(`  ${sign}${d.drift}  ${name?.padEnd(30)} counter=${d.counter}  recalc=${d.recalc}  <${d.member.email}>`);
  });
  console.log(`\n  Run \`npx tsx scripts/probe-ten-card-drift.ts <email>\` on any of the above to see per-booking detail.`);
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: npx tsx scripts/probe-ten-card-drift.ts <email-or-name-substring>  OR  --all');
    process.exit(1);
  }
  if (arg === '--all') {
    await scanAll();
    return;
  }

  const query = arg;

  // Find the member
  const { data: members, error: mErr } = await supabase
    .from('members')
    .select('id, name, display_name, email, ten_card_purchase_date, ten_card_sessions_used, ten_card_total, ten_card_holder_id, primary_payment_method, membership_types')
    .or(`email.ilike.%${query}%,name.ilike.%${query}%,display_name.ilike.%${query}%`);

  if (mErr) {
    console.error('Member lookup failed:', mErr);
    process.exit(1);
  }

  if (!members || members.length === 0) {
    console.error(`No member found matching "${query}"`);
    process.exit(1);
  }
  if (members.length > 1) {
    console.log(`Multiple matches — pick one:\n${members.map(m => `  - ${m.display_name || m.name} <${m.email}>`).join('\n')}`);
    process.exit(1);
  }

  const member = members[0];
  const effectiveMethod = member.primary_payment_method || (member.membership_types as string[] | null)?.[0];

  console.log(`\n=== ${member.display_name || member.name} <${member.email}> ===`);
  console.log(`  effective payment: ${effectiveMethod}`);
  console.log(`  counter stored:    ${member.ten_card_sessions_used}/${member.ten_card_total ?? 10}`);
  console.log(`  purchase date:     ${member.ten_card_purchase_date}`);
  console.log(`  shared-card holder id: ${member.ten_card_holder_id ?? '(self)'}`);

  // Resolve who debits this card (self + any sharers)
  const holderId = member.ten_card_holder_id || member.id;
  const { data: candidates } = await supabase
    .from('members')
    .select('id, name, display_name, primary_payment_method, membership_types, ten_card_holder_id')
    .or(`id.eq.${holderId},ten_card_holder_id.eq.${holderId}`);

  const debitMembers = (candidates || []).filter(c => {
    const eff = c.primary_payment_method || (c.membership_types as string[] | null)?.[0];
    return eff === 'ten_card';
  });
  const debitMemberIds = debitMembers.map(c => c.id);

  console.log(`\n  Members debiting this card (${debitMembers.length}):`);
  debitMembers.forEach(c => console.log(`    - ${c.display_name || c.name} (${c.id})`));

  const purchaseDateStr = member.ten_card_purchase_date
    ? (member.ten_card_purchase_date as string).split('T')[0]
    : null;
  if (!purchaseDateStr) {
    console.log('\n(no purchase_date set — cannot compute drift)');
    return;
  }

  // Fetch ALL bookings for these members on/after purchase_date — any status,
  // any is_trial. The Recalc filter is applied in JS so we can show what's IN
  // and what's OUT.
  const { data: rows, error: bErr } = await supabase
    .from('bookings')
    .select('id, member_id, status, is_trial, linked_trial_name, booked_at, updated_at, weekly_sessions!inner(date, time)')
    .in('member_id', debitMemberIds)
    .gte('weekly_sessions.date', purchaseDateStr)
    .order('booked_at', { ascending: true });

  if (bErr) {
    console.error('Booking fetch failed:', bErr);
    process.exit(1);
  }

  type Row = {
    id: string;
    member_id: string;
    status: string;
    is_trial: boolean | null;
    linked_trial_name: string | null;
    booked_at: string;
    updated_at: string | null;
    weekly_sessions: { date: string; time: string } | { date: string; time: string }[];
  };
  const bookings = (rows as Row[]) || [];

  const memberById = new Map(debitMembers.map(m => [m.id, m.display_name || m.name]));

  let recalcCount = 0;
  console.log(`\n  All bookings since purchase date (${bookings.length}):`);
  bookings.forEach(b => {
    const ws = Array.isArray(b.weekly_sessions) ? b.weekly_sessions[0] : b.weekly_sessions;
    const countsTowardRecalc = RECALC_STATUSES.has(b.status) && !b.is_trial;
    if (countsTowardRecalc) recalcCount++;
    const tag = countsTowardRecalc ? '✓ counted' : '✗ NOT counted by Recalc';
    const reason = b.is_trial
      ? '(is_trial)'
      : !RECALC_STATUSES.has(b.status)
        ? `(status=${b.status})`
        : '';
    console.log(`    ${ws?.date} ${ws?.time?.slice(0, 5)} · ${memberById.get(b.member_id)} · status=${b.status}${b.is_trial ? ' [TRIAL]' : ''}${b.linked_trial_name ? ` ↳ "${b.linked_trial_name}"` : ''} · ${tag} ${reason}`);
  });

  console.log(`\n  Recalc count:  ${recalcCount}`);
  console.log(`  Counter says:  ${member.ten_card_sessions_used}`);
  const drift = (member.ten_card_sessions_used ?? 0) - recalcCount;
  if (drift === 0) {
    console.log(`  ✅ NO DRIFT — counter matches Recalc.`);
  } else if (drift > 0) {
    console.log(`  ⚠ DRIFT: counter is +${drift} above Recalc.`);
    const culprits = bookings.filter(b => !(RECALC_STATUSES.has(b.status) && !b.is_trial));
    if (culprits.length > 0) {
      console.log(`     Likely culprits (non-Recalc bookings that may have once bumped the counter):`);
      culprits.forEach(b => {
        const ws = Array.isArray(b.weekly_sessions) ? b.weekly_sessions[0] : b.weekly_sessions;
        console.log(`       - ${ws?.date} ${ws?.time?.slice(0, 5)} status=${b.status} booked=${b.booked_at} updated=${b.updated_at}`);
      });
    } else {
      console.log(`     (no non-Recalc bookings found — drift was caused by something DELETED outright, or a manual edit)`);
    }
  } else {
    console.log(`  ⚠ NEGATIVE DRIFT: counter is ${drift} below Recalc. (counter undercounts — unusual)`);
  }
}

main().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
