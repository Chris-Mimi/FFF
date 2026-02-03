# Session 89: Access Tiers & Approval Flow Separation

**Date:** 2026-02-03
**Model:** Claude Opus 4.5
**Duration:** Full session

---

## Summary

Implemented tiered access control for the Athlete page, separating free features from paid features. Also separated the member approval workflow from trial grant - coaches now approve members for booking access only, with trial grant as a separate action.

---

## Changes Made

### 1. Access Tiers for Athlete Page

**New Component: `components/athlete/UpgradePrompt.tsx`**
- Displays when non-paying member clicks a restricted tab
- Shows subscription benefits and "View Subscription Options" button
- Navigates to Payment tab when button clicked

**Modified: `app/athlete/page.tsx`**
- Added `hasFullAccess` state based on subscription/trial status
- Added `requiresFullAccess` property to tabs array
- Tab classification:
  - FREE: Profile, Payment, Security
  - PAID: Workouts, Logbook, Benchmarks, Forge, Lifts, Records, Whiteboard
- Greyed-out styling for restricted tabs (opacity-60, text-gray-400, cursor-not-allowed)
- Shows UpgradePrompt instead of tab content when restricted tab selected without access

**Access Logic:**
```typescript
fullAccess = subscription_status === 'active' ||
  (subscription_status === 'trial' && trialEnd && trialEnd > now);
```

### 2. Separated Member Approval from Trial Grant

**Modified: `app/api/members/approve/route.ts`**
- Now ONLY sets `members.status = 'active'`
- No longer grants 30-day trial (was setting athlete_subscription_status to 'trial')
- Approved members get booking access only

**Modified: `app/api/members/athlete-subscription/route.ts`**
- Added `start_trial` action for coaches to grant athlete page access
- Accepts optional `days` parameter (default 30)
- Sets athlete_subscription_status to 'trial' with calculated end date

**Modified: `app/coach/members/page.tsx`**
- Added `handleStartTrial()` function
- Added "Start Trial" button for members without active subscription
- Button appears when `athlete_subscription_status` is null or 'expired'

### 3. Fixed 10-Card Display Bug

**Modified: `components/athlete/AthletePagePaymentTab.tsx`**
- Issue: Test account showed "10 sessions remaining" without purchasing
- Fix: Added `has10Card` check based on `ten_card_expiry_date` existence
- Only shows 10-card status if expiry date is set (indicates actual purchase)

### 4. Fixed Stripe Type Errors

**Modified: `app/api/stripe/webhook/route.ts`**
- Cast `subscription` and `invoice` to `any` for property access
- Stripe SDK types don't include all webhook event properties

**Modified: `lib/stripe.ts`**
- Removed explicit `apiVersion` parameter
- SDK now uses default version (was getting type mismatch error)

**Modified: `app/athlete/page.tsx`**
- Fixed boolean type error: changed `trialEnd` to `!!trialEnd` for explicit boolean

---

## Files Changed

| File | Changes |
|:---|:---|
| `components/athlete/UpgradePrompt.tsx` | NEW - Upgrade prompt component |
| `app/athlete/page.tsx` | Access tiers, hasFullAccess state, greyed tabs |
| `app/api/members/approve/route.ts` | Removed trial grant |
| `app/api/members/athlete-subscription/route.ts` | Added start_trial action |
| `app/coach/members/page.tsx` | Added Start Trial button |
| `components/athlete/AthletePagePaymentTab.tsx` | Fixed 10-card display |
| `app/api/stripe/webhook/route.ts` | Type fixes |
| `lib/stripe.ts` | Removed API version |

---

## Access Tier Matrix

| User Status | Book a Class | Profile/Payment/Security | Workouts/Logbook/etc |
|:---|:---|:---|:---|
| Active subscription | Yes | Yes | Yes |
| Trial (not expired) | Yes | Yes | Yes |
| 10-card (sessions remaining) | Yes | Yes | No (greyed) |
| No subscription/trial/10-card | Yes | Yes | No (greyed) |

---

## Testing Notes

- Hydration mismatch warning in console is pre-existing (localStorage check in useState)
- Does not affect functionality
- Build completes successfully with no errors

---

## Next Steps

1. Test access tiers with non-paying member account
2. Test Start Trial workflow from Coach Members page
3. Complete Stripe payment flow testing
4. Implement 10-card auto-decrement on class booking
