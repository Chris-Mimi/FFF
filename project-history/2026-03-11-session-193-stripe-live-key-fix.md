# Session 193 — Stripe Live Mode Key Fix (2026-03-11)

## Problem
Stripe checkout was showing "Sandbox" badge despite user confirming keys matched between Stripe and Vercel. Mimi's earlier payment attempts failed silently (redirected back to app, nothing in Stripe).

## Root Cause
`STRIPE_SECRET_KEY` in Vercel was a test/sandbox key (`sk_test_...`) even though the prefix/suffix appeared to match the live key. Stripe's new sandbox environments can have keys that look similar to live keys.

## Diagnosis Steps
1. Added temp debug log to `create-checkout/route.ts` to print key prefix/suffix at runtime
2. Debug log revealed `sk_test_` prefix — confirmed wrong key in Vercel
3. Also discovered `STRIPE_WEBHOOK_SECRET` was from test mode
4. Price IDs also needed updating to live mode versions

## Fixes Applied
1. **`STRIPE_SECRET_KEY`** — Created new live secret key in Stripe, updated in Vercel
2. **`STRIPE_WEBHOOK_SECRET`** — Copied signing secret from live webhook endpoint, updated in Vercel
3. **`STRIPE_PRICE_*` IDs** — Updated all 3 price IDs to live mode versions
4. **`stripe_customer_id`** — Cleared sandbox customer IDs from members table (sandbox customers don't exist in live mode)
5. **MemberCard label** — Changed "Athlete Trial:" to "Athlete App:" in coach Members page

## Result
- First live payment processed successfully (Chris's athlete account, monthly subscription)
- Subscription shows "Active (monthly)" in athlete app
- Webhook receives events and updates database correctly

## Lesson Learned
- **Stripe sandbox vs live keys can look deceptively similar** — always verify with a debug log when in doubt
- When switching from test to live mode, ALL Stripe env vars need updating: secret key, webhook secret, AND price IDs
- Stripe only shows secret keys once at creation — if you lose it, create a new one
