# Session 351 — Trial-to-Member Linking + Path B Drift-Proof 10-Card Tracking

**Date:** 2026-05-15 (Opus 4.7)

Two interlocking pieces. First: a way to link a `weekly_sessions.trial_names` entry to a now-registered member's account so the trial counts as an attendance everywhere (sidebar, calendar filter, Movement Tracking) without debiting the 10-card. Second: a structural fix to 10-card counter drift, replacing the cached counter with a DB-trigger-maintained derivation from a new `bookings.ten_card_consumed` flag.

---

## 1. Trigger — Kim's missing trial appearance

Kim Salzgeber trialed 2026-04-12. She later became a member and attended 3 times. Searching "Kim" in the Workouts sidebar showed 3, not 4 — her trial was invisible because `trial_names` is plain text with no member.id link.

Worse: when filtering the calendar by her name OR opening Movement Tracking with her selected, the queries use `bookings.status='confirmed'` *exclusively*. So even tricking the sidebar count wouldn't surface the workout in her history.

## 2. Design — why "linking" instead of converting

Initial pass removed the trial_name from the array on link. Chris pushed back: he wants the `trial_names` history preserved over time as a measure of "trials done vs. trials converted." Revised model: KEEP the trial entry, ALSO create a parallel booking with `is_trial=true` + `linked_trial_name=<text>`. Capacity excludes `is_trial` everywhere so the slot doesn't double-count.

Resulting UI: trial chip shows green `linked` badge when matched; the matching booking row shows amber `Trial` badge.

## 3. Pre-S351 +1 drift discovery

While testing Kim's link, Chris noticed her chip was at 4/10 but the modal listed 3 attendances. Pre-existing drift, not caused by today's link. Ran `scripts/probe-ten-card-drift.ts --all`:

- 11 of 29 holders drifting (38% rate)
- Patterns: legacy renewal carryover (Silvia +7, Hannah +6, Cleo +6 — counter wasn't reset when `purchase_date` moved forward), cancellation outside grace (Frieda et al, +2-3), missed-bump (Daniel et al, −1)

Ran `scripts/reconcile-ten-card-counters.ts --apply` to bring all 11 counters in line with Recalc. Then started Path B as the structural fix.

## 4. Path B — `ten_card_consumed` + DB trigger

The cached counter is the bug. Any code path that touches a booking outside the well-instrumented API desyncs it (DELETE most commonly — counter never decrements).

**Architecture:**
- New `bookings.ten_card_consumed BOOLEAN` is the source of truth. App code sets it explicitly: `true` when the booking eats a card session, `false` otherwise.
- New `trg_bookings_recompute_ten_card` fires AFTER INSERT/UPDATE OF (status/is_trial/ten_card_consumed/member_id)/DELETE → recomputes `members.ten_card_sessions_used` for the affected holder from `COUNT(*) WHERE consumed=true AND date >= purchase_date`.
- Existing READ paths (chip, modal, hooks) keep reading `ten_card_sessions_used` — the trigger maintains it consistently.
- Drift via direct DB deletion is finally impossible.

**Refactored write paths** — replaced manual `+/- 1` counter logic with `ten_card_consumed` writes:
- `app/api/bookings/create/route.ts` — inserts with consumed=true if effective payment = ten_card
- `app/api/bookings/cancel/route.ts` — flips consumed=false only within grace period
- `app/api/coach/cancel-member-booking/route.ts` — always flips consumed=false (coach cancel = refund)
- `lib/coach/promoteFromWaitlist.ts` — sets consumed=true if 10-card payer

**Counter is now derived** (cache populated by trigger), not manually maintained. Recalc button still works — switched to count `consumed=true` instead of status filter — kept as manual force-sync.

## 5. Edge case — holders without `purchase_date`

The trigger bails if `purchase_date IS NULL`. ~10 ten-card holders fall in this bucket today (Chris doesn't have paper-card access; will fill in over next 2 days). Their counters stay where they are until he enters the date + clicks Recalc once. From that moment on, trigger takes over.

## 6. Migration order

Sequenced to avoid the migration ↔ code-deploy gap:
1. SQL migration ran in Supabase first (column + backfill + trigger + initial sync). Took seconds.
2. Counters unchanged visually (already reconciled earlier in the same session).
3. Code push happened second. Vercel deploys, new write paths come online.

## 7. Process notes

- The first trial-link implementation REMOVED the trial_names entry. Chris flagged this in <1 min — "I lose my historical record of trials." Reverted to keep both records and added a `linked_trial_name` column to bridge them visually.
- Initially scoped Path B to refactor every read site to compute live; switched to trigger approach because it's far less invasive (no read-site refactors, single SQL migration). Eventual full refactor to derived reads is open for later but not needed for drift-proofing.
- The `--no email` family-member kid holders showed the biggest legacy drift. Likely cause: kid accounts were renewed informally without resetting the counter. The auto-tracking system will catch this going forward.

## Files Modified

| File | Change |
|:---|:---|
| `database/20260515_session351_booking_is_trial.sql` | NEW (gitignored) — is_trial + linked_trial_name columns |
| `database/20260515_session351_ten_card_consumed.sql` | NEW (gitignored) — ten_card_consumed + trigger + backfill + initial sync |
| `app/api/coach/link-trial-to-member/route.ts` | NEW — link endpoint |
| `app/api/bookings/create/route.ts` | Set `ten_card_consumed`; capacity excludes is_trial |
| `app/api/bookings/cancel/route.ts` | Flip consumed=false only within grace |
| `app/api/coach/cancel-member-booking/route.ts` | Always flip consumed=false (coach cancel = refund) |
| `lib/coach/promoteFromWaitlist.ts` | Set consumed=true on 10-card promote |
| `components/coach/TenCardModal.tsx` | Recalc reads consumed=true |
| `components/coach/SessionManagementModal.tsx` | Trial chip + link icon + green linked badge + member picker |
| `components/coach/BookingListItem.tsx` | Amber Trial badge when is_trial=true |
| `hooks/coach/useBookingManagement.ts` | handleLinkTrialToMember |
| `hooks/coach/useSessionDetails.ts` | Booking interface + SELECT include is_trial + linked_trial_name |
| `hooks/coach/useMemberData.ts` | Past/upcoming chip attribution uses consumed=true |
| `lib/coach/bookingHelpers.ts` | calculateConfirmedCount excludes is_og + is_trial |
| `scripts/probe-ten-card-drift.ts` | NEW — diagnostic (--all + per-member) |
| `scripts/reconcile-ten-card-counters.ts` | NEW — bulk Recalc (--dry-run / --apply) |

## SQL Applied Manually (gitignored convention)

1. `ALTER TABLE bookings ADD COLUMN is_trial` + `linked_trial_name`
2. `ALTER TABLE bookings ADD COLUMN ten_card_consumed` + index + backfill + trigger function + trigger + initial sync
3. One-shot RESTORE for Kim's trial_names entry (removed by first link attempt)

## Carry-overs for next session

- After Vercel deploy, run `npx tsx scripts/probe-ten-card-drift.ts --all` — should show 0 drifters except holders without purchase_date.
- Once Chris has paper cards, fill in `purchase_date` for ~10 holders + click Recalc on each.
- S344 deletion-paths still skip wsr/lift_records/reactions cleanup (separate from 10-card hygiene, which Path B now handles).
