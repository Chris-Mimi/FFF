# Session 271: Payment Failed Webhook Fix (2026-04-14)

## What Was Done
Fixed bug where `invoice.payment_failed` Stripe webhook only updated the `subscriptions` table to `past_due` but never updated `members.athlete_subscription_status`. This meant athletes kept full app access even after payment failure.

## Root Cause
`handlePaymentFailed` in the webhook handler was incomplete — it set `subscriptions.status = 'past_due'` but didn't touch the `members` table. All other handlers (`handleCheckoutCompleted`, `handleSubscriptionUpdate`, `handleSubscriptionDeleted`) correctly updated both tables.

## Files Changed (4)
1. `app/api/stripe/webhook/route.ts` — Added `members` table update to `handlePaymentFailed`: sets `athlete_subscription_status = 'past_due'`
2. `types/member.ts` — Added `'past_due'` to `athlete_subscription_status` union type + `getTrialStatus()` returns "Payment Failed"
3. `components/athlete/AthletePagePaymentTab.tsx` — Added `'past_due'` to `PaymentStatus` interface
4. `components/coach/TenCardModal.tsx` — Added `'past_due'` to all type references + dropdown option "Payment Failed"

## How Access Gating Works
- `app/athlete/page.tsx` line 159: access granted only for `status === 'active'` or valid trial
- `past_due` status = no access = UpgradePrompt shown
- When Stripe retries and succeeds: `customer.subscription.updated` fires with `status: active` → access restored automatically

## Key Decisions
- `past_due` blocks app access immediately (not after grace period) — coach can manually override via TenCardModal if needed
- Added dropdown option in TenCardModal so coach can see/change `past_due` status
