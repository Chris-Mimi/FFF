/**
 * Sync local `subscriptions` rows with Stripe ground-truth.
 *
 * For each subscription row with a stripe_subscription_id, calls Stripe's
 * `subscriptions.retrieve(id)` and compares status, current_period_end,
 * cancel_at_period_end against local. Reports discrepancies.
 *
 * Status mapping mirrors app/api/stripe/webhook/route.ts handleSubscriptionUpdate:
 *   Stripe 'active'   → local 'active'
 *   Stripe 'trialing' → local 'trialing'
 *   Stripe 'past_due' → local 'past_due'
 *   anything else     → local 'cancelled'
 *
 * Defaults to dry-run. Pass --apply to commit the diff.
 *
 * Usage:
 *   npx tsx scripts/sync-subscriptions-from-stripe.ts
 *   npx tsx scripts/sync-subscriptions-from-stripe.ts --apply
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import Stripe from 'stripe';

dotenv.config({ path: '.env.local' });

const APPLY = process.argv.includes('--apply');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function mapStripeStatus(s: Stripe.Subscription.Status): string {
  if (s === 'active') return 'active';
  if (s === 'trialing') return 'trialing';
  if (s === 'past_due') return 'past_due';
  return 'cancelled';
}

interface LocalSub {
  id: string;
  member_id: string;
  status: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  stripe_subscription_id: string | null;
}

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY (will UPDATE local rows)' : 'DRY-RUN (no changes)'}`);
  console.log('='.repeat(80));

  const { data: subs, error } = await supabase
    .from('subscriptions')
    .select('id, member_id, status, current_period_end, cancel_at_period_end, stripe_subscription_id')
    .not('stripe_subscription_id', 'is', null)
    .order('created_at', { ascending: true });
  if (error) { console.error(error.message); process.exit(1); }

  const memberIds = [...new Set((subs ?? []).map(s => s.member_id))];
  const { data: members } = await supabase
    .from('members')
    .select('id, name, display_name')
    .in('id', memberIds);
  const nameById = new Map((members ?? []).map(m => [m.id, m.display_name || m.name || '?']));

  const drift: {
    localId: string;
    name: string;
    stripeSubId: string;
    field: string;
    local: string;
    stripe: string;
  }[] = [];
  const updates: { localId: string; status: string; current_period_end: string; cancel_at_period_end: boolean; name: string }[] = [];
  const errors: { localId: string; name: string; reason: string }[] = [];

  for (const s of (subs ?? []) as LocalSub[]) {
    const name = nameById.get(s.member_id) ?? '?';
    if (!s.stripe_subscription_id) continue;

    let stripeSub: Stripe.Subscription;
    try {
      stripeSub = await stripe.subscriptions.retrieve(s.stripe_subscription_id);
    } catch (e: unknown) {
      const msg = (e as { message?: string }).message ?? String(e);
      errors.push({ localId: s.id, name, reason: msg });
      continue;
    }

    const stripeStatus = mapStripeStatus(stripeSub.status);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stripePeriodEndSec = (stripeSub as any).current_period_end as number | undefined;
    const stripePeriodEnd = stripePeriodEndSec
      ? new Date(stripePeriodEndSec * 1000).toISOString()
      : s.current_period_end;
    const stripeCancelAtEnd = stripeSub.cancel_at_period_end;

    let rowChanged = false;
    if (s.status !== stripeStatus) {
      drift.push({ localId: s.id, name, stripeSubId: s.stripe_subscription_id, field: 'status', local: s.status, stripe: stripeStatus });
      rowChanged = true;
    }
    if (new Date(s.current_period_end).getTime() !== new Date(stripePeriodEnd).getTime()) {
      drift.push({ localId: s.id, name, stripeSubId: s.stripe_subscription_id, field: 'current_period_end', local: s.current_period_end.slice(0, 19), stripe: stripePeriodEnd.slice(0, 19) });
      rowChanged = true;
    }
    if (s.cancel_at_period_end !== stripeCancelAtEnd) {
      drift.push({ localId: s.id, name, stripeSubId: s.stripe_subscription_id, field: 'cancel_at_period_end', local: String(s.cancel_at_period_end), stripe: String(stripeCancelAtEnd) });
      rowChanged = true;
    }

    if (rowChanged) {
      updates.push({
        localId: s.id,
        status: stripeStatus,
        current_period_end: stripePeriodEnd,
        cancel_at_period_end: stripeCancelAtEnd,
        name,
      });
    }
  }

  console.log(`\nLocal rows checked:        ${subs?.length ?? 0}`);
  console.log(`Rows in drift:             ${updates.length}`);
  console.log(`Total field discrepancies: ${drift.length}`);
  console.log(`Stripe API errors:         ${errors.length}`);

  if (drift.length > 0) {
    console.log('\n--- Diff (local → stripe) ---');
    const byRow = new Map<string, typeof drift>();
    for (const d of drift) {
      if (!byRow.has(d.localId)) byRow.set(d.localId, []);
      byRow.get(d.localId)!.push(d);
    }
    for (const [, fields] of byRow) {
      const first = fields[0];
      console.log(`\n  ${first.name}  (sub ${first.stripeSubId})`);
      for (const f of fields) {
        console.log(`    ${f.field.padEnd(22)}  ${f.local}  →  ${f.stripe}`);
      }
    }
  }

  if (errors.length > 0) {
    console.log('\n--- Stripe API errors ---');
    for (const e of errors) {
      console.log(`  ${e.name}  (row ${e.localId.slice(0, 8)}): ${e.reason}`);
    }
  }

  if (APPLY && updates.length > 0) {
    console.log(`\nApplying ${updates.length} UPDATE(s)...`);
    let done = 0;
    for (const u of updates) {
      const { error: updErr } = await supabase
        .from('subscriptions')
        .update({
          status: u.status,
          current_period_end: u.current_period_end,
          cancel_at_period_end: u.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        })
        .eq('id', u.localId);
      if (updErr) {
        console.error(`  ${u.name} (${u.localId.slice(0, 8)}) UPDATE failed: ${updErr.message}`);
        continue;
      }
      done++;
    }
    console.log(`  Updated ${done}/${updates.length}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log(APPLY ? 'DONE — local rows reconciled with Stripe.' : 'DRY-RUN complete. Re-run with --apply to commit.');
}

main().catch(err => { console.error(err); process.exit(1); });
