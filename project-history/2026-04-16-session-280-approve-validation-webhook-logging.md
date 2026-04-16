# Session 280 — Approve Validation + Webhook Logging + Trialing Subs

**Date:** 2026-04-16
**Model:** Opus 4.6

## Changes

### 1. Approve Button Validation
- **File:** `components/coach/members/MemberCard.tsx`
- Disabled Approve button on pending members until at least one membership type (Mb/Wp/10-Card) is selected
- Added amber warning text when no type selected

### 2. Webhook Error Logging
- **File:** `app/api/stripe/webhook/route.ts`
- Added error checking to both `handleCheckoutCompleted` and `handleSubscriptionUpdate` member update calls
- Previously these failures were completely silent

### 3. Trialing Subscription Query
- **File:** `hooks/coach/useMemberData.ts`
- Changed subscriptions query from `.eq('status', 'active')` to `.in('status', ['active', 'trialing'])`
- Stripe trial subscriptions now populate `subscription_plan_type`

## Critical Bug Found (NOT RESOLVED)

An athlete subscribed to the monthly plan (with 30-day trial):
- `subscriptions` table shows `status: 'trialing'`
- `members.athlete_subscription_status` stayed `'expired'`
- `athlete_subscription_end` was set to **2026-04-16 (today!)** instead of 30 days from now

**Root cause theory:** `autoExpireSubscriptions` in `useMemberData.ts` (line 264-294) expired the member immediately because the end date was set to NOW. The `handleSubscriptionUpdate` webhook may have overwritten the checkout handler's 30-day end date with Stripe's `current_period_end` (for trials, this = trial end date).

**Immediate fix needed:** SQL update to set correct end date for the affected member.

**Systemic fix needed:** Either:
1. Fix webhook to not overwrite end date incorrectly
2. Make `autoExpireSubscriptions` check `subscriptions.status` before expiring
3. Both

## Other Issues
- **Stefan Glocker** — Approved without membership type (now prevented). Needs DB fix.
- **Christian Muller** — Whiteboard name "ChristianM" confirmed set via SQL by Chris.

## Commits
- `f4e424f8` fix(stripe): add webhook error logging + include trialing subscriptions in query
- `df9294d1` fix(members): require membership type before approving pending members
