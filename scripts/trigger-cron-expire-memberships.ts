/**
 * Manually triggers the gym_memberships expiry cron against production.
 * Same code path Vercel hits at 06:00 UTC daily — useful for same-session
 * testing instead of waiting until tomorrow.
 *
 * Requires CRON_SECRET in .env.local (copy the value from Vercel project
 * → Settings → Environment Variables → CRON_SECRET).
 *
 * Usage:
 *   npx tsx scripts/trigger-cron-expire-memberships.ts
 */

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const PROD_URL = 'https://app.the-forge-functional-fitness.de/api/cron/expire-memberships';

const secret = process.env.CRON_SECRET;
if (!secret) {
  console.error('Missing CRON_SECRET in .env.local. Copy it from Vercel → Settings → Environment Variables.');
  process.exit(1);
}

async function main() {
  console.log(`Pinging ${PROD_URL} ...`);
  const res = await fetch(PROD_URL, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const body = await res.json();
  console.log(`HTTP ${res.status}`);
  console.log(JSON.stringify(body, null, 2));

  if (res.status === 200) {
    console.log(`\n✅ Cron ran. Flipped ${body.expired ?? 0} row(s) from active → expired.`);
  } else {
    console.log('\n❌ Cron failed. See response above.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Script error:', err);
  process.exit(1);
});
