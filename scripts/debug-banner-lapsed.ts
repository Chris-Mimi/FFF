import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const now = new Date();
const fourteenDaysBack = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
const nowIso = now.toISOString();
const fourteenBackIso = fourteenDaysBack.toISOString();

async function main() {
  // Cash-lapsed candidates (mirror banner query exactly)
  const { data: cashLapsed } = await supabase
    .from('members')
    .select('id, name, athlete_subscription_end, athlete_subscription_status, account_type')
    .in('athlete_subscription_status', ['active', 'trial', 'expired', 'past_due'])
    .neq('account_type', 'family_member')
    .not('athlete_subscription_end', 'is', null)
    .gte('athlete_subscription_end', fourteenBackIso)
    .lt('athlete_subscription_end', nowIso);

  console.log(`Cash-lapsed candidates in 14-day window: ${cashLapsed?.length ?? 0}\n`);
  if (!cashLapsed) return;

  for (const m of cashLapsed) {
    // Check whether they have ANY Stripe subscription row (active or not)
    const { data: allSubs } = await supabase
      .from('subscriptions')
      .select('status, current_period_end, plan_type')
      .eq('member_id', m.id)
      .order('current_period_end', { ascending: false });

    const active = (allSubs ?? []).filter(s => s.status === 'active' || s.status === 'trialing');
    console.log(`${m.name}:`);
    console.log(`  athlete_subscription_status: ${m.athlete_subscription_status}`);
    console.log(`  athlete_subscription_end: ${m.athlete_subscription_end?.slice(0,10)}`);
    console.log(`  Stripe subs total: ${allSubs?.length ?? 0} (active/trialing: ${active.length})`);
    if (allSubs && allSubs.length > 0) {
      allSubs.slice(0, 3).forEach(s => {
        console.log(`    - ${s.status} (${s.plan_type}) ends ${s.current_period_end?.slice(0,10)}`);
      });
    }
    console.log('');
  }
}
main().catch(e => { console.error(e); process.exit(1); });
