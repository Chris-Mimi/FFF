/**
 * Bulk reconcile members.ten_card_sessions_used to Recalc's truth value.
 *
 * Truth model: COUNT of bookings WHERE
 *   status IN ('confirmed','no_show','late_cancel') AND is_trial=false
 *   AND member_id IN (holder + shared kids paying ten_card)
 *   AND session.date >= ten_card_purchase_date
 *
 * Same logic as TenCardModal.recalculateSessionsUsed — applied gym-wide.
 *
 * Service-role.
 *
 * Usage:
 *   npx tsx scripts/reconcile-ten-card-counters.ts --dry-run    # show diffs
 *   npx tsx scripts/reconcile-ten-card-counters.ts --apply      # write changes
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const mode = process.argv[2];
if (mode !== '--dry-run' && mode !== '--apply') {
  console.error('Usage: npx tsx scripts/reconcile-ten-card-counters.ts --dry-run | --apply');
  process.exit(1);
}

type Holder = {
  id: string;
  name: string | null;
  display_name: string | null;
  email: string | null;
  ten_card_purchase_date: string | null;
  ten_card_sessions_used: number | null;
  ten_card_total: number | null;
  primary_payment_method: string | null;
  membership_types: string[] | null;
};

async function main() {
  const { data: holders, error } = await supabase
    .from('members')
    .select('id, name, display_name, email, ten_card_purchase_date, ten_card_sessions_used, ten_card_total, primary_payment_method, membership_types')
    .is('ten_card_holder_id', null)
    .not('ten_card_purchase_date', 'is', null);

  if (error) {
    console.error('Holders fetch failed:', error);
    process.exit(1);
  }

  type Drift = { holder: Holder; counter: number; recalc: number; diff: number };
  const drifters: Drift[] = [];

  for (const h of (holders || []) as Holder[]) {
    const effective = h.primary_payment_method || h.membership_types?.[0];
    if (effective !== 'ten_card') continue;

    const purchaseDateStr = h.ten_card_purchase_date ? h.ten_card_purchase_date.split('T')[0] : null;
    if (!purchaseDateStr) continue;

    // debit members = holder + sharers paying ten_card
    const { data: candidates } = await supabase
      .from('members')
      .select('id, primary_payment_method, membership_types')
      .or(`id.eq.${h.id},ten_card_holder_id.eq.${h.id}`);
    const debitIds = (candidates || [])
      .filter(c => (c.primary_payment_method || (c.membership_types as string[] | null)?.[0]) === 'ten_card')
      .map(c => c.id);
    if (debitIds.length === 0) continue;

    const { data: rows } = await supabase
      .from('bookings')
      .select('id, weekly_sessions!inner(date)')
      .in('member_id', debitIds)
      .in('status', ['confirmed', 'no_show', 'late_cancel'])
      .eq('is_trial', false)
      .gte('weekly_sessions.date', purchaseDateStr);

    const recalc = (rows || []).length;
    const counter = h.ten_card_sessions_used ?? 0;
    const diff = counter - recalc;
    if (diff !== 0) drifters.push({ holder: h, counter, recalc, diff });
  }

  drifters.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  console.log(`\n=== Ten-card counter reconciliation (${mode}) ===`);
  console.log(`  Scanned: ${(holders || []).length} holders`);
  console.log(`  Drifters: ${drifters.length}\n`);

  if (drifters.length === 0) {
    console.log('  ✅ No drift — nothing to do.');
    return;
  }

  drifters.forEach(d => {
    const name = d.holder.display_name || d.holder.name || '(unnamed)';
    const sign = d.diff > 0 ? '+' : '';
    console.log(`  ${sign}${d.diff}  ${name.padEnd(30)}  ${d.counter} → ${d.recalc}    <${d.holder.email ?? 'no email'}>`);
  });

  if (mode === '--dry-run') {
    console.log(`\n(dry-run — nothing changed. Run with --apply to update.)`);
    return;
  }

  console.log(`\nApplying changes...`);
  let updated = 0;
  let failed = 0;
  for (const d of drifters) {
    const { error: updErr } = await supabase
      .from('members')
      .update({ ten_card_sessions_used: d.recalc })
      .eq('id', d.holder.id);
    if (updErr) {
      console.error(`  ✗ ${d.holder.display_name || d.holder.name}: ${updErr.message}`);
      failed++;
    } else {
      updated++;
    }
  }
  console.log(`\n✅ Updated: ${updated}    Failed: ${failed}`);
}

main().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
