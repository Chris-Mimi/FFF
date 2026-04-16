# Session 279 — No Subscription Label + Migration Confirmed

**Date:** 2026-04-16
**AI:** Claude Opus 4.6

---

## Changes

### "No Subscription" Label
- **File:** `types/member.ts` — `getTrialStatus()` function
- **Change:** When `athlete_subscription_status === 'expired'`, now checks `athlete_subscription_start`:
  - If null (never subscribed) → shows "No Subscription"
  - If set (previously subscribed) → shows "Expired"
- **Why:** New athletes registering got `expired` status by default, but showing "Expired" on the coach members page was confusing since they never had a subscription.

### Migration Confirmed
- `20260416000000_add_subscription_start.sql` — column `athlete_subscription_start` already existed in database. Marked as applied in activeContext.

---

## Files Changed
1. `types/member.ts` — getTrialStatus() logic update (1 line)
2. `memory-bank/memory-bank-activeContext.md` — session status + migration confirmed
