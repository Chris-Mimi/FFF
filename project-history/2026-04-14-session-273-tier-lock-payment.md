# Session 273 — Tier-Lock Payment Flow + Remove PT

**Date:** 2026-04-14
**Model:** Opus 4.6

---

## What Was Done

### 1. Removed "Pt" (Probetraining) Membership Type
- Removed `'trial'` from `MembershipType` union, `MEMBERSHIP_TYPE_LABELS`, `MEMBERSHIP_TYPE_COLORS`, and `getMembershipTypeCounts()`.
- Reason: Probetraining is a one-time event before signup, not an ongoing membership type.

### 2. Tier-Locked Athlete Payment Page
- Athletes now only see pricing cards matching their coach-assigned `membership_types`:
  - `wellpass` in membership_types → Wellpass pricing (€10/mo, €100/yr)
  - `member` in membership_types → Forge Members pricing (€8/mo, €80/yr)
  - Neither set → amber "contact your coach" message
- Wellpass members can no longer choose the cheaper Forge Members tier.

### 3. Server-Side Tier Validation (Checkout API)
- `create-checkout/route.ts` now fetches member's `membership_types` and validates:
  - If no `member`/`wellpass` type assigned → 403 error
  - If requested tier doesn't match assigned type → 403 error
- Prevents API-level bypass even if frontend is manipulated.

### 4. Coach Activate Button Gated
- "Activate" button on MemberCard is now disabled unless `Mb` or `Wp` membership type is set.
- Amber hint text: "Set Mb or Wp first to activate"
- Prevents coach from activating an athlete without assigning their tier.

---

## Files Changed
1. `types/member.ts` — Removed `'trial'` from type, labels, colors
2. `components/athlete/AthletePagePaymentTab.tsx` — Conditional tier rendering based on membership_types
3. `app/api/stripe/create-checkout/route.ts` — Server-side tier validation
4. `components/coach/members/MemberCard.tsx` — Activate button gate + hint
5. `hooks/coach/useMemberData.ts` — Removed `trial` from membership type counts

## Key Decisions
- Used `membership_types[]` (coach-assigned) as source of truth for tier, not `subscription_tier` (Stripe-derived)
- Wellpass takes priority: if member has both `wellpass` and `member` types, they see Wellpass pricing
- "Pt" removed entirely rather than renamed — Probetraining is pre-signup, not a membership category

## Next Steps
- Deploy and test live checkout flows
- Assign Mb/Wp to all existing active members
- Clean up any members with stale `trial` in their `membership_types` array
