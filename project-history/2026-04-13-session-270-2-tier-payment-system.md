# Session 270: 2-Tier Payment System (2026-04-13)

## What Was Done
Replaced single-tier pricing (€7.50/€75) with 2-tier system:
- **Members:** €8/mo, €85/yr (gym members)
- **Wellpass:** €10/mo, €100/yr (Wellpass members)

Both tiers get identical feature access. No existing subscribers (beta testing period).

## Files Changed (11)
1. `lib/stripe.ts` — New `ProductType` union (`member_monthly`, `member_yearly`, `wellpass_monthly`, `wellpass_yearly`, `10card`), `SubscriptionTier` type, helper functions: `getTier()`, `getBillingPeriod()`, `getTierFromPriceId()`, `getPlanTypeFromPriceId()`
2. `types/member.ts` — Added `subscription_tier: 'member' | 'wellpass' | null` to Member interface, updated `getTrialStatus()` to show tier label
3. `hooks/coach/useMemberData.ts` — Added `subscription_tier` to members select query
4. `app/api/stripe/create-checkout/route.ts` — Passes `subscription_tier` and `billing_period` in Stripe checkout metadata
5. `app/api/stripe/webhook/route.ts` — Reads tier from checkout metadata, stores on member. Subscription update uses price ID reverse lookup for tier/plan type
6. `components/athlete/AthletePagePaymentTab.tsx` — 2-tier UI: "Gym Members" (blue/teal) and "Wellpass Members" (orange) sections, shared feature list
7. `components/athlete/UpgradePrompt.tsx` — "From €7.50/month" → "From €8/month"
8. `components/coach/athletes/PaymentsSection.tsx` — Tier badge (Member/Wellpass) in subscription header
9. `.env.local` — 4 new price IDs replacing 2 old ones
10. `.env.example` — Updated template
11. `supabase/migrations/20260413000001_add_subscription_tier.sql` — New column

## Stripe Products Created (Live Dashboard)
- Product 1: "Forge Athlete App — Members" with 2 prices
- Product 2: "Forge Athlete App — Wellpass" with 2 prices
- Old product left (can be archived)

## Pending Deploy Steps
1. Run migration in Supabase SQL Editor
2. Add 4 new env vars in Vercel, remove 2 old ones
3. Redeploy
4. Test all 4 checkout flows

## Key Decisions
- Used compound ProductType (`member_monthly` etc.) rather than separate tier+period params — simpler API shape
- Tier stored on `members.subscription_tier` column (set by webhook), not derived at query time
- No backwards compatibility needed — no existing subscribers (beta period)
- Old Stripe product left in place (harmless), can be archived
