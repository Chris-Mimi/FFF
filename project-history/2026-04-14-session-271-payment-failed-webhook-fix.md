# Session 271: Payment Failed Webhook Fix + UI + Coach Notification (2026-04-14)

## What Was Done
1. Fixed bug where `invoice.payment_failed` Stripe webhook only updated the `subscriptions` table to `past_due` but never updated `members.athlete_subscription_status`. Athletes kept full app access after payment failure.
2. Added "Payment Failed" screen for athletes (amber warning, explains to check Stripe email, notes auto-restore on success).
3. Added coach push notification on payment failure.
4. Enabled Stripe revenue recovery emails + expiring card emails in Stripe Dashboard.
5. Updated DB CHECK constraint to allow `past_due` value.

## Root Cause
`handlePaymentFailed` in the webhook handler was incomplete — it set `subscriptions.status = 'past_due'` but didn't touch the `members` table. All other handlers (`handleCheckoutCompleted`, `handleSubscriptionUpdate`, `handleSubscriptionDeleted`) correctly updated both tables.

## Files Changed (7)
1. `app/api/stripe/webhook/route.ts` — Added `members` table update + import/call `notifyPaymentFailed()`
2. `types/member.ts` — Added `'past_due'` to union type + `getTrialStatus()` returns "Payment Failed"
3. `components/athlete/AthletePagePaymentTab.tsx` — Added `'past_due'` to `PaymentStatus` interface
4. `components/coach/TenCardModal.tsx` — Added `'past_due'` to all type references + dropdown option
5. `components/athlete/UpgradePrompt.tsx` — New `isPastDue` prop: amber warning screen with payment failed message
6. `app/athlete/page.tsx` — New `subscriptionStatus` state, passes `isPastDue` to UpgradePrompt
7. `lib/notifications.ts` — New `notifyPaymentFailed()` sends push to all coaches

## Stripe Dashboard Changes
- Revenue recovery: Smart Retries enabled, email on failed card payment → Stripe hosted page
- Expiring cards: email enabled → Stripe hosted page
- Final action after all retries fail: cancel subscription (triggers `customer.subscription.deleted` webhook)

## DB Change (applied manually in Supabase)
- Updated `members_athlete_subscription_status_check` constraint to include `past_due`
- Athlete Test 1 manually set to `past_due` for testing

## How the Full Flow Works
1. Payment fails → Stripe sends `invoice.payment_failed` webhook
2. Webhook sets member to `past_due` + notifies coaches via push
3. Athlete sees "Payment Failed" screen (not generic UpgradePrompt)
4. Stripe emails customer with link to update payment method
5. Stripe Smart Retries attempt payment at optimal times
6. If retry succeeds → `customer.subscription.updated` webhook → member back to `active`
7. If all retries fail → `customer.subscription.deleted` webhook → member set to `expired`

## Key Decisions
- `past_due` blocks app access immediately (no grace period) — coach can manually override via TenCardModal
- Stripe hosted page for payment updates (not custom) — simpler, consistent
