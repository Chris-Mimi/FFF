/**
 * Inspect a member's subscription state across members + subscriptions + archive tables.
 * Usage: npx tsx scripts/inspect-member.ts <email>
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const [, , emailArg] = process.argv;
if (!emailArg) {
  console.error('Usage: npx tsx scripts/inspect-member.ts <email>');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data: member, error: mErr } = await supabase
    .from('members')
    .select('*')
    .ilike('email', emailArg.trim())
    .maybeSingle();

  if (mErr || !member) {
    console.error('Member not found:', mErr?.message || 'no row');
    process.exit(1);
  }

  console.log('\n=== MEMBER ROW ===');
  const m = member as Record<string, unknown>;
  ['id','name','display_name','email','account_type','subscription_tier','athlete_subscription_status','athlete_subscription_start','athlete_subscription_end','stripe_customer_id','primary_payment_method','subscription_notes','wellpass_booking_restricted'].forEach(k => {
    if (m[k] !== undefined) console.log(`  ${k}:`, m[k]);
  });

  console.log('\n=== SUBSCRIPTIONS (Stripe-linked) ===');
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('member_id', member.id)
    .order('created_at', { ascending: false });
  if (!subs || subs.length === 0) {
    console.log('  (none)');
  } else {
    subs.forEach((s: Record<string, unknown>, i: number) => {
      console.log(`  [${i}]`, JSON.stringify(s, null, 2));
    });
  }

  console.log('\n=== SUBSCRIPTION ARCHIVE ===');
  const { data: arch } = await supabase
    .from('subscription_archive')
    .select('*')
    .eq('member_id', member.id)
    .order('archived_at', { ascending: false });
  if (!arch || arch.length === 0) {
    console.log('  (none)');
  } else {
    arch.forEach((a: Record<string, unknown>, i: number) => {
      console.log(`  [${i}]`, JSON.stringify(a, null, 2));
    });
  }
}

main().catch(e => { console.error(e); process.exit(1); });
