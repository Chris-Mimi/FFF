/**
 * Audit Stripe products + prices: which are referenced by env-configured price
 * IDs, and how many subscriptions exist per price (active vs. other states).
 *
 * Use this before archiving a Stripe product/price — confirms it isn't currently
 * wired up in app env vars AND no live subscriptions are still billing against
 * it. Archive (don't delete) any price that shows `0 active` and is unreferenced.
 *
 * Usage:
 *   npx tsx scripts/audit-stripe-products.ts
 */
import * as dotenv from 'dotenv';
import Stripe from 'stripe';

dotenv.config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Mirror lib/stripe.ts — keep in sync if new price env vars are added.
const ENV_PRICE_IDS: Record<string, string | undefined> = {
  STRIPE_PRICE_MEMBER_MONTHLY_ID: process.env.STRIPE_PRICE_MEMBER_MONTHLY_ID,
  STRIPE_PRICE_MEMBER_YEARLY_ID: process.env.STRIPE_PRICE_MEMBER_YEARLY_ID,
  STRIPE_PRICE_WELLPASS_MONTHLY_ID: process.env.STRIPE_PRICE_WELLPASS_MONTHLY_ID,
  STRIPE_PRICE_WELLPASS_YEARLY_ID: process.env.STRIPE_PRICE_WELLPASS_YEARLY_ID,
  STRIPE_PRICE_10CARD_ID: process.env.STRIPE_PRICE_10CARD_ID,
};

const envByPriceId = new Map<string, string>();
for (const [envName, priceId] of Object.entries(ENV_PRICE_IDS)) {
  if (priceId) envByPriceId.set(priceId, envName);
}

function formatAmount(unitAmount: number | null, currency: string): string {
  if (unitAmount == null) return '—';
  const amount = unitAmount / 100;
  return `${amount.toFixed(2)} ${currency.toUpperCase()}`;
}

function formatInterval(recurring: Stripe.Price.Recurring | null): string {
  if (!recurring) return 'one-time';
  const { interval, interval_count } = recurring;
  return interval_count === 1 ? `/${interval}` : `/${interval_count} ${interval}s`;
}

async function countSubscriptionsForPrice(price: Stripe.Price): Promise<{
  active: number;
  trialing: number;
  past_due: number;
  cancelled: number;
  other: number;
  total: number;
} | null> {
  // Stripe rejects subscriptions.list filter for non-recurring prices. Return
  // null so the caller can render "n/a" for one-time prices (e.g. the 10-card).
  if (!price.recurring) return null;

  const counts = { active: 0, trialing: 0, past_due: 0, cancelled: 0, other: 0, total: 0 };
  for await (const sub of stripe.subscriptions.list({
    price: price.id,
    status: 'all',
    limit: 100,
  })) {
    counts.total++;
    if (sub.status === 'active') counts.active++;
    else if (sub.status === 'trialing') counts.trialing++;
    else if (sub.status === 'past_due') counts.past_due++;
    else if (sub.status === 'canceled') counts.cancelled++;
    else counts.other++;
  }
  return counts;
}

async function main() {
  const secretKey = process.env.STRIPE_SECRET_KEY || '';
  const mode = secretKey.startsWith('sk_live_')
    ? 'LIVE'
    : secretKey.startsWith('sk_test_')
      ? 'TEST'
      : 'UNKNOWN';
  console.log(`Auditing Stripe products + prices… (mode: ${mode})\n`);
  if (mode === 'TEST') {
    console.log('⚠️  TEST mode — these are NOT the live products Vercel sees.');
    console.log('   To audit live: export STRIPE_SECRET_KEY=sk_live_xxx && npx tsx scripts/audit-stripe-products.ts\n');
  }
  console.log('Env-configured price IDs:');
  for (const [envName, priceId] of Object.entries(ENV_PRICE_IDS)) {
    console.log(`  ${envName.padEnd(36)} = ${priceId || '(unset)'}`);
  }
  console.log('');

  const products: Stripe.Product[] = [];
  for await (const product of stripe.products.list({ active: undefined, limit: 100 })) {
    products.push(product);
  }
  products.sort((a, b) => a.name.localeCompare(b.name));

  for (const product of products) {
    const statusTag = product.active ? '✅ active' : '🗄 archived';
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`${product.name}  [${statusTag}]`);
    console.log(`  product id: ${product.id}`);
    if (product.description) console.log(`  description: ${product.description}`);

    const prices: Stripe.Price[] = [];
    for await (const price of stripe.prices.list({ product: product.id, limit: 100 })) {
      prices.push(price);
    }
    if (prices.length === 0) {
      console.log('  (no prices)');
      continue;
    }

    for (const price of prices) {
      const priceLine = `${formatAmount(price.unit_amount, price.currency)}${formatInterval(price.recurring)}`;
      const priceStatus = price.active ? 'active' : 'archived';
      const envRef = envByPriceId.get(price.id);
      const refTag = envRef ? `✓ IN USE via ${envRef}` : '— unreferenced in env';

      const counts = await countSubscriptionsForPrice(price);
      const subSummary = counts === null
        ? 'one-time price — subscription count n/a'
        : counts.total === 0
          ? '0 subs'
          : `${counts.total} subs (active:${counts.active} trial:${counts.trialing} past_due:${counts.past_due} cancelled:${counts.cancelled}${counts.other ? ` other:${counts.other}` : ''})`;

      console.log('');
      console.log(`  • ${priceLine}  [${priceStatus}]`);
      console.log(`    price id: ${price.id}`);
      console.log(`    ${refTag}`);
      console.log(`    ${subSummary}`);

      const liveSubs = counts ? counts.active + counts.trialing + counts.past_due : 0;
      const safeToArchive = !envRef && liveSubs === 0;
      if (safeToArchive && price.active) {
        console.log('    → SAFE TO ARCHIVE (no env ref, no live subs)');
      } else if (envRef) {
        console.log('    → KEEP (referenced by env var)');
      } else if (liveSubs > 0) {
        console.log('    → LIVE SUBS billing against this price — investigate before archiving');
      }
    }
    console.log('');
  }
}

main().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
