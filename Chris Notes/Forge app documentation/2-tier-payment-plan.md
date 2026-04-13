# 2-Tier Payment System Plan

**Status:** ON HOLD (bug fix first)
**Created:** 2026-04-13

---

## Overview

Replace single pricing tier (€7.50/€75) with two tiers:

| Tier | Monthly | Yearly | Savings |
|:---|:---|:---|:---|
| **Members** | €8.00 | €85.00 | €11/yr |
| **Wellpass** | €10.00 | €100.00 | €20/yr |

Both tiers get identical feature access for now. Future: Members get early session booking access.

---

## Step 1: Create Stripe Products & Prices (Chris — in Stripe Dashboard)

Go to: https://dashboard.stripe.com → **Products**

### Create Product 1: "Forge Athlete App — Members"
1. Click **+ Add product**
2. Name: `Forge Athlete App — Members`
3. Description: `Athlete app access for gym members`
4. **Add price 1 (Monthly):**
   - Price: **€8.00**
   - Currency: EUR
   - Billing period: **Monthly**
   - Click **Add price**
5. **Add price 2 (Yearly):**
   - Price: **€85.00**
   - Currency: EUR
   - Billing period: **Yearly**
   - Click **Add price**
6. Click **Save product**
7. **Copy both Price IDs** (they start with `price_...`) — you'll need them later

### Create Product 2: "Forge Athlete App — Wellpass"
1. Click **+ Add product**
2. Name: `Forge Athlete App — Wellpass`
3. Description: `Athlete app access for Wellpass members`
4. **Add price 1 (Monthly):**
   - Price: **€10.00**
   - Currency: EUR
   - Billing period: **Monthly**
   - Click **Add price**
5. **Add price 2 (Yearly):**
   - Price: **€100.00**
   - Currency: EUR
   - Billing period: **Yearly**
   - Click **Add price**
6. Click **Save product**
7. **Copy both Price IDs**

### What to do with old product
- **Don't delete** the old €7.50/€75 product — any existing subscribers stay on it
- It will phase out naturally as subscriptions renew onto new prices

### Price IDs you'll have (4 total):
```
STRIPE_PRICE_MEMBER_MONTHLY_ID=price_xxx   (€8.00/mo)
STRIPE_PRICE_MEMBER_YEARLY_ID=price_xxx    (€85.00/yr)
STRIPE_PRICE_WELLPASS_MONTHLY_ID=price_xxx  (€10.00/mo)
STRIPE_PRICE_WELLPASS_YEARLY_ID=price_xxx   (€100.00/yr)
```

---

## Step 2: Update Environment Variables

### Local (.env.local)
Replace existing price IDs:
```bash
# OLD (remove these)
STRIPE_PRICE_MONTHLY_ID=price_...
STRIPE_PRICE_YEARLY_ID=price_...

# NEW (add these)
STRIPE_PRICE_MEMBER_MONTHLY_ID=price_xxx
STRIPE_PRICE_MEMBER_YEARLY_ID=price_xxx
STRIPE_PRICE_WELLPASS_MONTHLY_ID=price_xxx
STRIPE_PRICE_WELLPASS_YEARLY_ID=price_xxx
```

### Vercel (Production)
Same 4 new env vars in Vercel Dashboard → Settings → Environment Variables.
**Remember:** `NEXT_PUBLIC_*` vars need a redeploy. These are server-side only so just adding them works.

---

## Step 3: Code Changes (Claude will implement)

### Files to modify:

1. **`lib/stripe.ts`** — Update `STRIPE_PRICE_IDS` map and `ProductType` to include tier
2. **`types/member.ts`** — Add `subscription_tier: 'member' | 'wellpass' | null` to Member type
3. **`app/api/stripe/create-checkout/route.ts`** — Accept tier + billing period, resolve to correct price ID
4. **`app/api/stripe/webhook/route.ts`** — Map 4 price IDs to tier + plan type, store tier on member record
5. **`components/athlete/AthletePagePaymentTab.tsx`** — Two-tier pricing UI (Members vs Wellpass cards)
6. **`components/athlete/UpgradePrompt.tsx`** — Update pricing text
7. **`components/coach/athletes/PaymentsSection.tsx`** — Show tier in coach view
8. **`.env.example`** — Update template

### Database change needed:
```sql
ALTER TABLE members ADD COLUMN subscription_tier TEXT
  CHECK (subscription_tier IN ('member', 'wellpass'));
```

---

## Step 4: Testing Checklist

- [ ] Members monthly checkout → correct Stripe price
- [ ] Members yearly checkout → correct Stripe price
- [ ] Wellpass monthly checkout → correct Stripe price
- [ ] Wellpass yearly checkout → correct Stripe price
- [ ] Webhook correctly stores tier on member record
- [ ] Coach view shows correct tier
- [ ] Existing subscribers unaffected
- [ ] Trial flow still works
- [ ] 10-card flow unaffected

---

## Future Enhancement (not in this implementation)
- Members/app users get early session booking access (before Wellpass)
- Tier-based feature gating infrastructure
