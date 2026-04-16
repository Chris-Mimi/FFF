# Session 276 — 1yr Activate + Expiry Warnings (2026-04-16)

## Changes

### 1. Activate → 1-Year Subscription (Cash Payments)
- **Problem:** "Activate" gave unlimited access (no end date). Needed a way for cash-paying athletes to get a 1-year subscription.
- **Fix:** `activate` action now sets `athlete_subscription_end` to now + 365 days. Auto-expires when the year is up.
- Files: `app/api/members/athlete-subscription/route.ts`, `hooks/coach/useMemberActions.ts`

### 2. Permanent Activate (Owner/Family)
- **New:** `activate_permanent` action keeps the old behaviour (no end date, never expires).
- **UI:** New "∞" button next to "1yr" on MemberCard.
- Files: `app/api/members/athlete-subscription/route.ts`, `hooks/coach/useMemberActions.ts`, `components/coach/members/MemberCard.tsx`, `app/coach/members/page.tsx`

### 3. Auto-Expire Cash Subscriptions
- **Problem:** `autoExpireTrials` only expired trials. Cash-activated subs with end dates were not auto-expired.
- **Fix:** Renamed to `autoExpireSubscriptions`, now expires both `trial` and `active` subs past their end date.
- File: `hooks/coach/useMemberData.ts`

### 4. 14-Day Expiry Warning Notification
- **New endpoint:** `/api/notifications/subscription-expiring`
- Triggered when coach loads Members page and a cash-activated sub is within 14 days of expiry.
- Notifies **both** athlete ("expires in X days, contact your coach") and coach ("{name}'s subscription expires in X days").
- Deduplicated daily via `notification_log` table to prevent spam across page loads.
- Files: `app/api/notifications/subscription-expiring/route.ts` (new), `lib/notifications.ts`, `hooks/coach/useMemberData.ts`

### 5. Status Display Updates
- `getTrialStatus()` now shows distinct labels for cash/permanent subs:
  - `Active (1yr)` — cash-activated, more than 14 days remaining
  - `Active (14d left)` — cash-activated, within 14 days of expiry
  - `Active (∞)` — permanent, no end date
  - Stripe subs still show `Active — Member (Monthly)` etc.
- File: `types/member.ts`

### 6. Launch Message Draft
- English + German versions of WhatsApp launch message for athlete app.
- File: `Chris Notes/Forge app documentation/athlete-app-launch-message.md`

## Files Changed
- `app/api/members/athlete-subscription/route.ts` — added `activate_permanent` action, `activate` now sets 1yr end date
- `hooks/coach/useMemberActions.ts` — new `handleActivatePermanent`, updated confirm text
- `components/coach/members/MemberCard.tsx` — "1yr" + "∞" buttons, new `onActivatePermanent` prop
- `app/coach/members/page.tsx` — wired new prop
- `hooks/coach/useMemberData.ts` — `autoExpireSubscriptions` (was `autoExpireTrials`), `checkExpiringSubscriptions`
- `lib/notifications.ts` — `notifySubscriptionExpiring`, `notifySubscriptionExpiringCoach`
- `app/api/notifications/subscription-expiring/route.ts` — new endpoint
- `types/member.ts` — updated `getTrialStatus()` for cash/permanent labels
- `Chris Notes/Forge app documentation/athlete-app-launch-message.md` — new launch message draft
