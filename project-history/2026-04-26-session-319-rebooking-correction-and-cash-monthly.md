# Session 319 — Rebooking Constraint Correction + Cash-Monthly Activation Path

**Date:** 2026-04-26
**Model:** Claude Opus 4.7
**Previous:** Session 318 (multi-fix: change-password, search, TZ, subscription gate, reorg)

---

## Context

Two intertwined threads. First, a correction to a migration that was drafted in S318 but turned out to be over-broad — Chris realised mid-session that the system was already working correctly, so the migration needed reworking before it caused a duplicate-row problem. Second, a real product gap: the codebase had no proper activation path for athletes paying cash on a monthly basis (e.g. Nikolina Vlasalija). Coaches were forced to use the trial flow, which left these members in `status='trial'` with all the wrong display logic and notification gating.

## Work shipped

### 1. Rebooking unique-index — corrected v2

**Where we started:** S318 left a draft migration that broadened the partial unique index on `bookings(session_id, member_id)` from `WHERE status != 'cancelled'` to `WHERE status NOT IN ('cancelled', 'late_cancel', 'coach_cancelled')`. The premise was that Carole Schultz couldn't be re-booked because her late_cancel row blocked a new INSERT.

**The realisation:** Chris ran the migration, then noticed the system actually had an **Undo button** on late_cancel rows — `handleUndoLateCancel` in [hooks/coach/useBookingManagement.ts](hooks/coach/useBookingManagement.ts) at line 248. Clicking Undo flips the existing row's status back to `confirmed`. No new INSERT is needed for late_cancel. The original constraint was correctly preventing **duplicate rows**.

**The corrected rule:**

| Status | Undo button? | Index should exclude? |
|---|---|---|
| `late_cancel` | ✅ Yes (`handleUndoLateCancel`) | ❌ No — Undo flips status, no new row needed |
| `coach_cancelled` | ❌ No — set-only, no handler | ✅ Yes — re-add requires new INSERT |
| `cancelled` | n/a | ✅ Yes (existing) |

**Fix:** Wrote [database/fix-rebooking-constraint-v2.sql](database/fix-rebooking-constraint-v2.sql):

```sql
DROP INDEX IF EXISTS unique_active_bookings;
CREATE UNIQUE INDEX unique_active_bookings
  ON bookings(session_id, member_id)
  WHERE status NOT IN ('cancelled', 'coach_cancelled');
```

Chris ran it. Carole was already re-booked successfully via the Undo button before we got to the migration question, so no further DB cleanup was needed.

**Lesson:** the diagnostic step that should have come first — confirming whether an Undo path exists for the blocking status — would have caught this. Don't over-broaden a uniqueness constraint without first auditing every "set" path against its corresponding "undo" or "re-add" path.

### 2. Cash-Monthly activation path

**The complaint:** Chris gave Nikolina Vlasalija a month of athlete app access (paying cash, not a free trial). On the Members tab her card showed "30 days left" with no start date, while Andreas Keip (1yr cash) showed "Subscribed: today" + "Active (1yr)". On the Athletes coach tab both showed "No active subscriptions". And no renewal reminder would fire for her.

**Diagnosis:** The codebase has only two activation paths via [app/api/members/athlete-subscription/route.ts](app/api/members/athlete-subscription/route.ts):
- `start_trial` → `status='trial'`, end=now+30d, intended for free trials
- `activate` (1yr) and `activate_permanent` (∞) → `status='active'`

There's no path for paying-cash-monthly. Chris was forced to use `start_trial` for a paid customer, so:
- [types/member.ts:90-94](types/member.ts#L90-L94) `getTrialStatus` returned "X days left" — generic trial wording, not "active subscriber"
- [components/coach/members/MemberCard.tsx:142](components/coach/members/MemberCard.tsx#L142) gates "Subscribed: <date>" to `status === 'active'`, so trials don't show a start date
- [hooks/coach/useMemberData.ts:319+](hooks/coach/useMemberData.ts#L319) filters expiring-soon notifications to `status === 'active'` only — trials excluded

**Fix (5 files):**

1. **[app/api/members/athlete-subscription/route.ts](app/api/members/athlete-subscription/route.ts)** — new `activate_monthly` action mirroring `activate` but with end=now+30d.
2. **[hooks/coach/useMemberActions.ts](hooks/coach/useMemberActions.ts)** — new `handleActivateMonthly` handler with confirm dialog "Activate subscription for 30 days? (e.g. cash payment, monthly billing)".
3. **[components/coach/members/MemberCard.tsx](components/coach/members/MemberCard.tsx)** — new "30d" lime-coloured button alongside the existing 1yr / ∞ buttons.
4. **[app/coach/members/page.tsx](app/coach/members/page.tsx)** — wires `onActivateMonthly={handleActivateMonthly}` prop.
5. **[types/member.ts](types/member.ts)** — `getTrialStatus` now distinguishes Cash Monthly from Cash Yearly via the `end - start ≤ 45 days` heuristic. Returns "Active — Cash Monthly (Xd left)" for monthly; falls back to existing "Active (1yr)" / "Active (Xd left)" for yearly.

**Why a heuristic instead of a `subscription_plan_type='cash_monthly'` DB column:** the existing `subscription_plan_type` field on the Member type isn't a real column — it's computed at fetch time from the Stripe `subscriptions` table via `planTypeMap` in useMemberData. Adding a real column would mean a schema migration and write-paths in 4+ places. The duration heuristic is robust because the only other paths produce span ≈ 365d (1yr) or null end (∞).

**Reminder behavior:** once Nikolina is moved to `status='active'` via the new button, she falls into the existing 14-day expiring-soon notification flow — no extra code needed. The flow already filters on `status='active'` + `athlete_subscription_end` set + 0 < daysLeft <= 14.

### 3. Athletes tab subscription clarity

[components/coach/athletes/PaymentsSection.tsx](components/coach/athletes/PaymentsSection.tsx) only queried the Stripe `subscriptions` table — coach-activated members appeared as "No active subscriptions" even when their Members card said "Active — Cash Monthly".

**Fix:** extended the SELECT to include `athlete_subscription_status/start/end`. When no Stripe row exists but the member has athlete subscription `'active'` or `'trial'`, render a coach-managed card with: title (Trial / Active — Cash Monthly / Active — Cash 1 year / Active — Permanent), Started/Ends dates, days-left, and a small grey note "Coach-managed access (no Stripe subscription on file)". Empty-state copy clarified for the genuinely-no-access case.

## Carry-overs

- Chris must click the new "30d" button on Nikolina's card to migrate her from `'trial'` to `'active'`. The button is visible because her current status is `'trial'` (the button shows for `trial`/`expired`).
- The `subscription_plan_type` field is still computed from Stripe only. If we ever want a "Cash Monthly" badge equivalent to the Stripe Monthly badge, we'd need a real DB column. For now the textual label in `getTrialStatus` carries the distinction.

## Files changed

### App code (6 files)
- `app/api/members/athlete-subscription/route.ts` — new `activate_monthly` action
- `hooks/coach/useMemberActions.ts` — `handleActivateMonthly` handler
- `components/coach/members/MemberCard.tsx` — "30d" button + new prop
- `app/coach/members/page.tsx` — prop wiring
- `types/member.ts` — `getTrialStatus` distinguishes cash-monthly via 45-day heuristic
- `components/coach/athletes/PaymentsSection.tsx` — coach-managed access card + clarified empty-state

### Database
- New `database/fix-rebooking-constraint-v2.sql` — corrected partial unique index

### Memory bank
- `memory-bank/memory-bank-activeContext.md` — v179.0 → 180.0

## Commits

1. `523c1266` — fix(db): correct unique_active_bookings to keep late_cancel covered
2. `50590328` — feat(coach): add 30d cash-monthly activation path for athlete app
3. `6df9e45a` — fix(coach): show coach-activated subscription state on Athletes tab
4. (this session-close commit)

## Process lessons

- **Confirm undo paths before broadening a unique constraint.** A partial unique index is a contract; loosening it has subtle blast radius (duplicate-row scenarios that surface only later in attendance/score reports).
- **Heuristic-from-existing-data > new schema column** when the distinction can be reliably computed from already-stored fields. Saved a migration + multi-file write coordination.
- **The "No active subscriptions" empty state was misleading because it was actually true (Stripe-wise).** When two views read from different sources of truth, the copy needs to call that out.
