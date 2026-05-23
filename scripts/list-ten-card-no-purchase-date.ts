/**
 * List active 10-card holders with no `ten_card_purchase_date` set.
 *
 * Output is sorted by name. Use as a worklist for the paper-card sync (S351
 * carry): for each holder, open their card in the modal, set the actual paper
 * purchase date, then click Recalc + Save. The S362 self-healing Recalc now
 * backfills the consumed flags so it's a one-click fix per holder.
 *
 * Usage:
 *   npx tsx scripts/list-ten-card-no-purchase-date.ts
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  // Holders identified by membership_types containing 'ten_card' OR
  // primary_payment_method = 'ten_card'. Match the membership/payment logic the
  // rest of the app uses for "is on a 10-card".
  const { data, error } = await supabase
    .from('members')
    .select('id, name, display_name, ten_card_purchase_date, ten_card_sessions_used, ten_card_total, ten_card_holder_id, status, membership_types, primary_payment_method, guardian_only')
    .eq('status', 'active')
    .eq('guardian_only', false) // guardian-only accounts don't attend, shouldn't be on a card
    .is('ten_card_purchase_date', null)
    .is('ten_card_holder_id', null) // exclude sharers — only show primary holders
    .order('name');

  if (error) {
    console.error('Query failed:', error);
    process.exit(1);
  }

  const holders = (data || []).filter(m => {
    const onCard =
      (m.membership_types || []).includes('ten_card') ||
      m.primary_payment_method === 'ten_card';
    return onCard;
  });

  console.log(`Active 10-card holders with NO purchase_date set: ${holders.length}\n`);
  if (holders.length === 0) {
    console.log('Nothing to sync. All active holders have a purchase_date.');
    return;
  }
  for (const m of holders) {
    const display = m.display_name || m.name;
    const used = m.ten_card_sessions_used ?? 0;
    const total = m.ten_card_total ?? 10;
    console.log(`  • ${display}  (${used}/${total})  — id ${m.id}`);
  }
  console.log('\nWorkflow per holder: open card in /coach/members → set purchase date → Recalc → Save.');
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
