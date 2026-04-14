# Session 272 — Launch Prep & Pricing Changes

**Date:** 2026-04-14
**Model:** Opus 4.6

---

## What Was Done

### 1. Verified Session 271 Deploy (Payment Failed Flow)
- Confirmed UpgradePrompt shows amber "Payment Failed" screen when `past_due` (not generic subscribe prompt)
- Confirmed `getTrialStatus()` returns "Payment Failed" for coach Members page
- Confirmed `notifyPaymentFailed()` exists in `lib/notifications.ts`
- Tested webhook via Stripe CLI — all events returned 200. Expected "No member found" for fake test customer.

### 2. Stripe CLI Updated
- v1.35.1 → v1.40.5 via `brew upgrade`

### 3. Renamed "Gym Members" → "Forge Members"
- File: `components/athlete/AthletePagePaymentTab.tsx`

### 4. No Free Trial on Yearly Subscriptions
- **Backend:** `app/api/stripe/create-checkout/route.ts` — trial only added when `getBillingPeriod(productType) === 'monthly'`
- **Frontend:** `AthletePagePaymentTab.tsx` — yearly cards: removed "1 month free" badge, button says "Subscribe Now" instead of "Start Free Trial"

### 5. Member Yearly Price €85 → €80
- Updated UI: price display, equivalent (€6.67/mo), save badge (€16)
- New Stripe price created in dashboard, `STRIPE_PRICE_MEMBER_YEARLY_ID` updated in Vercel

---

## Files Changed
1. `components/athlete/AthletePagePaymentTab.tsx` — Forge Members rename, yearly trial removal, price update
2. `app/api/stripe/create-checkout/route.ts` — Monthly-only trial logic

## Key Decisions
- Free trial only for monthly plans (yearly already discounted)
- "Forge Members" branding (not "Gym Members")
- €80/yr member pricing (was €85)
