# Session 274 — Auto-Expire Trials (2026-04-14)

## Problem
Trial athletes showed "Expired" in the coach UI (via `getTrialStatus` date check) but the `athlete_subscription_status` column in the database remained `'trial'`. The display was cosmetic only — no DB update happened when a trial expired.

## Changes

### 1. Auto-expire in `useMemberData` hook
- When coach loads Members page, any member with `status='trial'` past their `athlete_subscription_end` date is automatically expired via the existing `/api/members/athlete-subscription` endpoint (action: `expire`).
- Uses a `ref` to track already-expired IDs to avoid duplicate API calls.
- Local state updates immediately so the UI reflects the change.

### 2. Explicit "Expired" in `getTrialStatus`
- Added `'expired'` case to `getTrialStatus()` in `types/member.ts` — returns "Expired" instead of falling through to "No access".

### 3. Color-coded status in MemberCard
- `active` = green, `trial` = teal, `past_due` = amber, `expired` = red (was gray).

## Files Changed
- `hooks/coach/useMemberData.ts` — auto-expire logic
- `types/member.ts` — explicit expired status text
- `components/coach/members/MemberCard.tsx` — status colors

## Manual SQL (for existing stale trials)
```sql
UPDATE members 
SET athlete_subscription_status = 'expired',
    athlete_subscription_end = COALESCE(athlete_subscription_end, NOW()),
    updated_at = NOW()
WHERE athlete_subscription_status = 'trial' 
  AND athlete_subscription_end < NOW();
```
