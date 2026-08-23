/**
 * Read-only probe: Koffler family 10-card state. Service-role.
 *   npx tsx scripts/probe-koffler.ts
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data, error } = await supabase
    .from('members')
    .select('id, name, display_name, account_type, primary_member_id, primary_payment_method, membership_types, ten_card_holder_id, ten_card_total, ten_card_sessions_used, ten_card_sessions_used_offset, ten_card_purchase_date, ten_card_expiry_date, ten_card_notes, athlete_subscription_status, subscription_tier')
    .ilike('name', '%Koffler%');
  if (error) { console.error(error); return; }
  console.log(JSON.stringify(data, null, 2));
}
main();
