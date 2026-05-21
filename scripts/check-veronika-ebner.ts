import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: members } = await s
    .from('members')
    .select('*')
    .ilike('email', 'veronika.ebner@icloud.com');

  if (!members?.length) {
    console.log('No member with that email');
    return;
  }

  for (const m of members) {
    console.log(`=== ${m.name} ===`);
    console.log(`  member_id: ${m.id}`);
    console.log(`  stripe_customer_id: ${m.stripe_customer_id ?? 'NONE'}`);
    console.log(`  athlete_subscription_status: ${m.athlete_subscription_status}`);
    console.log(`  athlete_subscription_start: ${m.athlete_subscription_start}`);
    console.log(`  athlete_subscription_end: ${m.athlete_subscription_end}`);
    console.log(`  subscription_tier: ${m.subscription_tier}`);
    console.log(`  primary_payment_method: ${m.primary_payment_method}`);
    console.log(`  membership_types: ${JSON.stringify(m.membership_types)}`);

    const { data: subs } = await s
      .from('subscriptions')
      .select('*')
      .eq('member_id', m.id)
      .order('created_at', { ascending: false });

    console.log(`\n  subscriptions rows: ${subs?.length ?? 0}`);
    subs?.forEach((sub: any) => {
      console.log(`    stripe_subscription_id: ${sub.stripe_subscription_id}`);
      console.log(`      status: ${sub.status}`);
      console.log(`      current_period_start: ${sub.current_period_start}`);
      console.log(`      current_period_end: ${sub.current_period_end}`);
      console.log(`      cancel_at_period_end: ${sub.cancel_at_period_end}`);
      console.log(`      created_at: ${sub.created_at}`);
      console.log(`      updated_at: ${sub.updated_at}`);
      console.log('');
    });
  }
}

main();
