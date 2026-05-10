/**
 * Probe: dump the subscription state for 4 specific members to explain
 * why the SubscriptionsDueBanner shows them as cash-managed vs Stripe-managed.
 *
 * Read-only.
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const TARGETS = ['Tobias Baumstark', 'Stefan G', 'Justine Baumstark', 'Thomas Graf'];

async function main() {
  const { data: members, error } = await supabase
    .from('members')
    .select('id, name, display_name, email, primary_member_id, athlete_subscription_status, athlete_subscription_start, athlete_subscription_end, subscription_tier, account_type');
  if (error) { console.error(error.message); process.exit(1); }

  for (const target of TARGETS) {
    const matches = (members ?? []).filter(m => {
      const full = (m.display_name || m.name || '').toLowerCase();
      return full.startsWith(target.toLowerCase());
    });

    console.log(`\n=== ${target} (${matches.length} match${matches.length === 1 ? '' : 'es'}) ===`);
    for (const m of matches) {
      console.log(`  ID:                  ${m.id}`);
      console.log(`  name:                ${m.display_name || m.name}`);
      console.log(`  email:               ${m.email}`);
      console.log(`  account_type:        ${m.account_type}`);
      console.log(`  primary_member_id:   ${m.primary_member_id ?? '(none)'}`);
      console.log(`  subscription_tier:   ${m.subscription_tier ?? '(none)'}`);
      console.log(`  athlete_sub_status:  ${m.athlete_subscription_status ?? '(none)'}`);
      console.log(`  athlete_sub_start:   ${m.athlete_subscription_start ?? '(none)'}`);
      console.log(`  athlete_sub_end:     ${m.athlete_subscription_end ?? '(none)'}`);

      // Resolve who pays — own subs OR primary's subs (family_member)
      const payerId = m.account_type === 'family_member' && m.primary_member_id
        ? m.primary_member_id : m.id;

      const { data: subs } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('member_id', payerId)
        .order('created_at', { ascending: false });

      console.log(`  Subscriptions table rows: ${subs?.length ?? 0}`);
      for (const s of subs ?? []) {
        console.log(`     row id:                 ${s.id}`);
        console.log(`       status:               ${s.status}`);
        console.log(`       plan_type:            ${s.plan_type}`);
        console.log(`       current_period_end:   ${s.current_period_end}`);
        console.log(`       cancel_at_period_end: ${s.cancel_at_period_end}`);
        console.log(`       stripe_sub_id:        ${s.stripe_subscription_id ?? '(NULL)'}`);
        console.log(`       stripe_customer_id:   ${s.stripe_customer_id ?? '(NULL)'}`);
        console.log(`       created_at:           ${s.created_at}`);
        console.log(`       updated_at:           ${s.updated_at}`);
        console.log(`       all keys:             ${Object.keys(s).join(', ')}`);
      }
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
