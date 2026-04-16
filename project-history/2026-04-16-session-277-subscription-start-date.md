# Session 277 — Subscription Start Date

**Date:** 2026-04-16
**AI:** Claude Opus 4.6

---

## What Was Done

### Problem
When activating a cash-paying athlete, the "Registered" date on MemberCard showed the original member creation date (when they first signed up for booking), not when their paid athlete app subscription started. This was misleading for beta testers transitioning to paid.

### Solution
Added `athlete_subscription_start` column to track the actual subscription activation date, separate from `created_at` (booking registration date).

### Changes
1. **Migration:** `20260416000000_add_subscription_start.sql` — adds `athlete_subscription_start TIMESTAMPTZ` to members
2. **API:** `app/api/members/athlete-subscription/route.ts` — `activate` and `activate_permanent` actions now set `athlete_subscription_start` to current timestamp
3. **Stripe webhook:** `app/api/stripe/webhook/route.ts` — initial checkout sets `athlete_subscription_start` (renewals do not overwrite it)
4. **Type:** `types/member.ts` — added `athlete_subscription_start` field to `Member` interface
5. **Data fetch:** `hooks/coach/useMemberData.ts` — added column to select query
6. **UI:** `components/coach/members/MemberCard.tsx` — shows "Subscribed: [date]" in column 2 next to phone for active athletes

### Key Decision
- "Registered" stays as-is (booking system registration date)
- "Subscribed" is the new field showing when paid athlete app access began
- Stripe renewals don't overwrite the start date (preserves original subscription date)

---

## Migration (run in Supabase SQL Editor)

```sql
ALTER TABLE members ADD COLUMN athlete_subscription_start TIMESTAMP WITH TIME ZONE;
```

## Notes
- Members activated before this session won't have the date — re-activate or manually set in Supabase
