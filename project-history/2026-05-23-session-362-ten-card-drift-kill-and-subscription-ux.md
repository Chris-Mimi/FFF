# Session 362 — 10-card drift kill, max_capacity drop, subscription UX rewrite

**Date:** 2026-05-23 (Opus 4.7) — high-density single thread, six shipped changes.

---

## 1. Self-healing 10-card Recalc

**Why:** Annerose Streit bought a 10-card today, backdated purchase to 2026-03-31. Her card had 6 confirmed + 1 late-cancel + 1 no-show booking since that date, but Recalc showed 1/10. Same shape as Markus (S359) and Felix (S360) — **third confirmed victim of the same drift class**.

**Root cause** (corrected the stale S360 carry that pointed at the wrong fix): The S324 effective-method fallback in [app/api/bookings/create/route.ts:164](app/api/bookings/create/route.ts#L164) was already in place. The bug isn't booking-create — it's that **`ten_card_consumed` is set at INSERT time and never re-evaluated**. If an athlete books while `primary_payment_method=NULL` AND `membership_types=[]` (registered athletes who book before paying — the entire pre-payment workflow), the flag goes in as `false`. Buying a card later with a backdated purchase date doesn't retroactively flip it. Recalc just counted `consumed=true` rows → undercount.

**Fix:** New endpoint [app/api/coach/recalc-ten-card/route.ts](app/api/coach/recalc-ten-card/route.ts) — `requireCoach` + service-role. Loads holder's `ten_card_purchase_date`, builds the debit-set (same effective-method logic as close-ten-card lines 80-87), UPDATEs every in-window {confirmed, no_show, late_cancel} booking on the set to `ten_card_consumed=true`, returns `{count, updated}`. The existing S351 trigger then snaps the counter to truth.

**TenCardModal rewire:** [components/coach/TenCardModal.tsx:282](components/coach/TenCardModal.tsx#L282) Recalc button now calls the endpoint and toasts "Recalc: N bookings flagged, counter set to X/Y".

After ship, Annerose was fixed in one click. Future Markus/Felix/Annerose-shape victims self-heal the same way.

## 2. wods.max_capacity column DROPPED

**Why:** Stale code-review of the capacity refactor (S355) — I assumed it was fully decoupled. But [hooks/coach/useCoachData.ts:173](hooks/coach/useCoachData.ts#L173) still **read** `wods.max_capacity` into `WODFormData.maxCapacity`, and WOD save paths in [useWODOperations.ts](hooks/coach/useWODOperations.ts) **wrote** that value back to BOTH `wods.max_capacity` AND `weekly_sessions.capacity`. Any drift in `max_capacity` could backflow into the real source of truth on next save. Invisible until it bit.

**Fix:** Full cleanup pass.

- Removed `maxCapacity` field from `WODFormData` type (useWorkoutModal.ts)
- Removed `max_capacity` from both SELECT clauses in useCoachData.ts + the 3 hydration sites (calendar grid, empty-session card, search results)
- Removed all 6 `wods.max_capacity` writes from useWODOperations + useQuickEdit
- Replaced 3 INSERT writes of `weekly_sessions.capacity = wodData.maxCapacity` with hardcoded `12` (new session defaults)
- Removed the duplicate-WOD UPDATE write of capacity (existing sessions are no longer touched by WOD save paths)
- Deleted `updateWorkoutCapacity` helper in `lib/coach/sessionCapacityHelpers.ts` + its caller in `useSessionEditing.ts`
- Cleaned `maxCapacity:0` stubs from app/tv/[id], utils/movement-analytics, useMovementTracking
- Ran `ALTER TABLE wods DROP COLUMN max_capacity` after Vercel deploy completed

Sole capacity-edit surface is now `useSessionEditing.handleUpdateCapacity` writing only `weekly_sessions.capacity`. S355 capacity-backfill carry-over became obsolete.

## 3. Subscription activation UX rewritten

**Why:** Chris asked how he set up Nikolina/Lisa as cash-monthly originally — couldn't find a "monthly" option in the modal. Answer: there wasn't one. The single "Close & Renew" button was a 1-year preset, disabled when status='expired', so initial setup of a new cash athlete (Anfisa-shape case) required manually typing dates. Banner's "Renew 1 Month" only appeared in the 7-day expiry window.

**Fix:** Replaced the single button with side-by-side **"Activate 1 Month"** + **"Activate 1 Year"**, both always enabled. Both go through `/api/coach/close-subscription` (archives outgoing state, then activates). Confirm dialog handles the no-active-subscription case gracefully. Preview text + amber pending box rewritten to be duration-aware.

Workflow now: open Anfisa's modal → Subscription → Activate 1 Month → Save. Same for next month.

## 4. Banner Renew buttons now archive too

**Why:** Once #3 landed, Chris asked whether the Subscription History panel would show past paid months for cash-monthly athletes. Answer: only if he used the modal button. The Subscriptions Due banner's "Renew 1 Month" / "Renew 1 Year" buttons hit `/api/members/athlete-subscription` (action=`activate_monthly`/`activate`) which **overwrote start/end in place** with no archive row. So banner-driven renewals were invisible to history.

**Fix:** Routed both banner buttons through `/api/coach/close-subscription` instead. Both surfaces consistent; every monthly renewal becomes a row in subscription_archive.

## 5. Delete X on Subscription History rows

**Why:** Accidental Activate clicks could create unwanted archive rows. Mirror of the S360 ten_card_archive Delete UI Chris already trusts.

**Fix:** Added `DELETE /api/coach/subscription-archive` (`requireCoach` + service-role, hard delete on archive row only). Red "Delete" link in the expanded body of each Subscription History row, next to Edit/Add note. Confirm dialog with `variant: 'danger'`.

## 6. `ten_card_sessions_used_offset` schema migrated (UI half carries)

**Why:** Nico Enzmann bought a card pre-app and used 9/10 sessions before we had booking data — Recalc would compute 0, manual override would be silently overwritten by the trigger on next booking change. Chris wants a visual indicator when Sessions Used is manually set, AND the value to survive future bookings. Many similar legacy cards (kids who joined pre-app) are coming.

**Design chosen (Chris picked from 3 options):** offset column. Trigger formula becomes `ten_card_sessions_used = offset + COUNT(consumed bookings)`. Coach types desired total → save computes `new_offset = typed - bookings_count`. Recalc resets offset to 0 (treats bookings as only truth).

**Shipped this session:** Migration only — `database/20260523_session362_ten_card_offset.sql` (gitignored per project convention). Adds the column with default=0, replaces `recompute_ten_card_for_holder` to use the new formula, resyncs all existing 10-card holders. Currently a no-op for behavior (offset=0 everywhere).

**Carries to next session:** UI/code work — Recalc endpoint reset of offset, TenCardModal save offset computation, amber chip on Sessions Used + Members list, types/member.ts field, help text. Plan detail in activeContext First action.

## 7. Side cleanups

- ✅ **Martina Fenster 4 OG bookings created** (S361 carry).
- ✅ **Felix Buffler 10-card cleanup complete** — both booking-flag (manual S360) and 2 phantom archive rows (deleted via the S360 UI Chris already shipped). Card is correct.
- ✅ **Lenny Kleinert + Frieda Stromer DOBs** filled in app (S353 carry).
- ✅ **S345 Nico Enzmann whiteboard backfill** marked obsolete — no whiteboard entries to attribute.

## 8. Commits

- `9ca1668` — self-healing 10-card Recalc endpoint + button rewire
- `b117dbb` — drop wods.max_capacity from code (DROP COLUMN ran post-deploy)
- `c084041` — Activate 1 Month / 1 Year subscription presets
- `a84454d` — banner Renew buttons archive prior subscription
- `ca9831f` — Delete button on Subscription History rows

(plus the schema migration ran in Supabase SQL Editor — not in git per `.sql` gitignore rule).
