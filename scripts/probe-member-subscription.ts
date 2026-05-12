/**
 * Diagnostic: print a member's subscription state so we can figure out
 * why the Payment tab does/doesn't render the Subscribe buttons.
 *
 * Service-role (anon would be blocked by RLS for cross-user reads).
 *
 * Usage:
 *   npx tsx scripts/probe-member-subscription.ts <email>
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const [, , emailArg] = process.argv;
if (!emailArg) {
  console.error('Usage: npx tsx scripts/probe-member-subscription.ts <email>');
  process.exit(1);
}
const email = emailArg.trim().toLowerCase();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface MemberRow {
  id: string;
  email: string;
  name: string | null;
  status: string | null;
  account_type: string | null;
  membership_types: string[] | null;
  athlete_subscription_status: 'active' | 'trial' | 'past_due' | 'expired' | null;
  athlete_subscription_start: string | null;
  athlete_subscription_end: string | null;
  subscription_tier: string | null;
  stripe_customer_id: string | null;
  ten_card_total: number | null;
  ten_card_sessions_used: number | null;
  ten_card_expiry_date: string | null;
  ten_card_purchase_date: string | null;
  primary_payment_method: string | null;
}

async function main() {
  const { data, error } = await supabase
    .from('members')
    .select(
      'id, email, name, status, account_type, membership_types, ' +
      'athlete_subscription_status, athlete_subscription_start, athlete_subscription_end, ' +
      'subscription_tier, stripe_customer_id, ' +
      'ten_card_total, ten_card_sessions_used, ten_card_expiry_date, ten_card_purchase_date, ' +
      'primary_payment_method'
    )
    .ilike('email', email)
    .maybeSingle();

  if (error) {
    console.error('members lookup error:', error.message);
    process.exit(1);
  }
  if (!data) {
    console.error(`No member found for ${email}`);
    process.exit(1);
  }

  const member = data as unknown as MemberRow;

  console.log('\n=== members row ===');
  console.log(JSON.stringify(member, null, 2));

  const { data: subs, error: subsError } = await supabase
    .from('subscriptions')
    .select('id, member_id, plan_type, status, current_period_start, current_period_end, stripe_subscription_id, stripe_customer_id, created_at, updated_at')
    .eq('member_id', member.id)
    .order('created_at', { ascending: false });

  if (subsError) {
    console.error('subscriptions lookup error:', subsError.message);
  } else {
    console.log(`\n=== subscriptions rows (${subs?.length ?? 0}) ===`);
    console.log(JSON.stringify(subs, null, 2));
  }

  // What the Payment tab would compute:
  const hasActiveSubscription = member.athlete_subscription_status === 'active';
  const hasTrial =
    member.athlete_subscription_status === 'trial' &&
    member.athlete_subscription_end &&
    new Date(member.athlete_subscription_end) > new Date();
  const isMember = (member.membership_types ?? []).includes('member');

  console.log('\n=== Payment tab would render ===');
  console.log(`hasActiveSubscription: ${hasActiveSubscription}`);
  console.log(`hasTrial: ${hasTrial}`);
  console.log(`isMember tier: ${isMember} (so isWellpass: ${!isMember})`);
  console.log(`Buttons disabled (hasActiveSubscription)? ${hasActiveSubscription}`);
  console.log(`Trial badge shown? ${!hasActiveSubscription && !hasTrial}`);
  console.log(`wantsTrial on subscribe click? ${!hasActiveSubscription && !hasTrial}`);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
