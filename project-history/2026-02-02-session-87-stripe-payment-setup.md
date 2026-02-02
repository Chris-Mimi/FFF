# Session 87 - Stripe Payment System Setup

**Date:** 2026-02-02
**Model:** Opus
**Duration:** Single session (continuation from previous)

---

## Summary

Completed Stripe payment integration for Athletes, including webhook setup with Stripe CLI for local development. Fixed critical webhook signature verification issue caused by duplicate environment variable key name.

---

## Changes Made

### 1. Stripe Payment System Implementation (Phases 1-6)

**Database Schema (Phase 1):**
- Created `subscriptions` table with:
  - stripe_subscription_id, stripe_customer_id, plan_type, status
  - current_period_start/end, cancel_at_period_end
  - RLS policies for coaches and users
- Added to `members` table:
  - stripe_customer_id
  - ten_card_expiry_date
  - ten_card_total
- Helper function: `check_member_payment_access()`

**Files Created:**
```
supabase/migrations/20260201_add_subscriptions_table.sql
lib/stripe.ts
app/api/stripe/create-checkout/route.ts
app/api/stripe/webhook/route.ts
app/api/stripe/customer-portal/route.ts
components/athlete/AthletePagePaymentTab.tsx
```

### 2. Stripe CLI Setup

**Installation:**
```bash
# Fixed Homebrew permissions
sudo chown -R chrishiles /opt/homebrew

# Installed Stripe CLI
brew install stripe/stripe-cli/stripe

# Login (opens browser)
stripe login

# Forward webhooks to localhost
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### 3. Webhook Signature Verification Fix

**Problem:** All webhook events returning 400 error
```
2026-02-02 14:30:45   --> checkout.session.completed [evt_...] [400]
2026-02-02 14:30:45   --> customer.subscription.created [evt_...] [400]
```

**Root Cause:** Duplicate key name in .env.local
```
# WRONG
STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET=whsec_...

# CORRECT
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Solution:** Removed duplicate key name, restarted dev server

### 4. UI Polish

Updated "Manage Subscription & Payment Methods" hover state:
```tsx
// Before
className="... hover:text-gray-900 ..."

// After
className="... hover:text-teal-600 hover:underline ..."
```

---

## Testing Results

| Feature | Status | Notes |
|---------|--------|-------|
| 10-card purchase | ✅ Working | Activates 10 sessions, 90-day expiry |
| Monthly subscription | ✅ Working | Creates active subscription |
| Yearly subscription | ✅ Working | Creates active subscription |
| Customer portal | ✅ Working | Opens Stripe-hosted portal |
| Webhook: checkout.session.completed | ✅ Working | Updates member record |
| Webhook: subscription.created/updated | ✅ Working | Updates subscription table |
| Webhook: subscription.deleted | ✅ Working | Marks subscription cancelled |
| Webhook: invoice.payment_failed | ✅ Working | Marks subscription past_due |

---

## Environment Variables

```bash
# Required for Stripe integration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_MONTHLY_ID=price_...
STRIPE_PRICE_YEARLY_ID=price_...
STRIPE_PRICE_10CARD_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...  # From `stripe listen` output
```

---

## Files Modified

1. `.env.local` - Fixed duplicate key name in STRIPE_WEBHOOK_SECRET
2. `components/athlete/AthletePagePaymentTab.tsx` - Updated hover styling

## Files Created

1. `supabase/migrations/20260201_add_subscriptions_table.sql`
2. `lib/stripe.ts`
3. `app/api/stripe/create-checkout/route.ts`
4. `app/api/stripe/webhook/route.ts`
5. `app/api/stripe/customer-portal/route.ts`
6. `components/athlete/AthletePagePaymentTab.tsx`

---

## Lessons Learned

1. **Stripe CLI is essential for local development** - Without it, webhooks can't reach localhost
2. **Check .env files carefully** - Duplicate key names cause silent failures
3. **Restart dev server after .env changes** - Changes not picked up automatically

---

## Next Steps

1. **Coach Admin Tools** - Add manual subscription/10-card management for coaches
2. **10-Card Auto-Decrement** - Reduce sessions when athlete books a class
3. **Low Session Warning** - Alert when 2 or fewer 10-card sessions remain
4. **Price Display** - Currently shows "Contact for pricing" - could fetch from Stripe
