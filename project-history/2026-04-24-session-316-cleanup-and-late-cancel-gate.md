# Session 316 — Cleanup + Late-Cancel Gate

**Date:** 2026-04-24
**Model:** Claude Opus 4.7
**Type:** Small feature + housekeeping
**App code changed:** Yes — 2 files

---

## Part 1 — Next-Steps Cleanup

Reviewed activeContext Next Immediate Steps with Chris and closed five:

| # | Item | Outcome |
|---|---|---|
| 1 | Historical lift records not showing in athlete app | **No bug.** Imported records surface under the athlete **Records** tab, not the **Lifts** tab. Chris was looking in the wrong place. |
| 2 | Re-enter Sonja Hujo's deleted score (S305) | **Closed.** S305 didn't log the exact slot; cross-referencing her bookings vs scored sessions didn't uniquely identify it. Not worth chasing. |
| 3 | Live-test Open Gym "OG" chip (S308) | **Working.** |
| 3b | Live-test Trial Athletes flow end-to-end (S310) | **Working.** |
| 6 | Live-test Intervals timer mode (S296) | **Working.** |

## Part 2 — Late-Cancel Gate (Feature)

### Need
Chris noticed in his session notes that athletes who cancelled very late on a Friday did not show as late cancellations — they were recorded as plain `cancelled`. The `late_cancel` enum has existed for ages (coach-side UI already renders it in BookingListItem, SessionManagementModal, and the Admin attendance rollup), but the athlete-initiated cancel route always wrote `cancelled` regardless of how close to the class start the cancel happened. The only timing-sensitive behavior was the 10-card refund grace period (`ten_card_refund_hours`), which decides whether a 10-card gets reimbursed — not the booking status itself.

### Design
Three options considered:

- **A. Hard block** — return 403 past the lock threshold. Rejected: athletes still need a way to free the slot for waitlisters if something genuinely comes up.
- **B. Late-cancel flag** — cancellation still succeeds, but status is set to `late_cancel` instead of `cancelled`. Waitlist promotion, 10-card math, and score cleanup all still run. This is what `late_cancel` was always for; the coach-side audit UI was already built. **Chosen.**
- **C. Soft pre-warn dialog** — same as B, plus a client-side confirm modal warning the athlete. Rejected for v1: would require exposing per-session-type lead minutes to the client. The server toast is sufficient signal.

The trigger mirrors the `/api/bookings/create` lock check exactly:
```
isLocked = session.is_locked === true
        || (session.is_locked === null && now >= sessionStart - leadMinutes)
```
Per-session-type `auto_lock_lead_minutes` override wins over the global default (same as for bookings). Manually locked sessions (`is_locked=true`) also count. Only applies when `booking.status === 'confirmed'` — waitlist cancels are always plain `cancelled` (no penalty for dropping a waitlist).

### Files

**1. `app/api/bookings/cancel/route.ts`**
- Imported `getLockLeadMinutesForSessionType` from `lib/bookingRules`.
- Moved the session fetch up — previously it happened *after* the UPDATE. Added `workout_type` and `is_locked` to the select list so the lock decision can run before deciding the status.
- Computed `newStatus: 'cancelled' | 'late_cancel'` and fed that into the UPDATE instead of the hardcoded `'cancelled'`.
- Added `status: newStatus` to the JSON response so the client can toast correctly.
- Everything else (10-card refund, score cleanup, waitlist auto-promotion, `notifyWaitlistPromoted`) unchanged. A `late_cancel` still frees the slot for waitlisters — only the audit trail differs.

**2. `app/member/book/page.tsx`**
- Branched the cancel-handler toast on `data.status`. Late cancels get `toast.warning('Booking cancelled. This is past the lock time, so it is recorded as a late cancel.')`. Normal path unchanged.

No schema change. No migration. No new config — reuses existing `auto_lock_lead_minutes` from `booking_rules`.

### Test plan (for next session)
1. Set `auto_lock_lead_minutes` to a large value so a booked session's start is inside the lock window.
2. Cancel the booking from the athlete app → expect the warning toast.
3. Coach SessionManagementModal → booking appears under Late Cancel with purple chip.
4. Admin → Attendance rollup → counted in `lateCancel`.
5. Cancel a well-before-lock booking → expect plain *"Booking cancelled"* toast, status = `cancelled`.
6. Cancel a waitlist booking in any timing → always `cancelled`.

### Rejected alternatives (why not)
- **Unify `auto_lock_lead_minutes` with `ten_card_refund_hours`** — they serve different purposes. One governs cancel-status semantics; the other governs money. A gym might plausibly want *"you can late-cancel without being marked no-show, but the 10-card isn't refunded"* — keeping them independent preserves that flexibility.
- **Add a new per-session-type `late_cancel_lead_minutes` column** — premature. If Chris wants cancellation-specific windows later, trivial to add. For now, lock = cancel-cutoff = one setting.

---

## Files Changed
- `app/api/bookings/cancel/route.ts` — late-cancel status logic
- `app/member/book/page.tsx` — warning toast branch
- `memory-bank/memory-bank-activeContext.md` — v177, S316 entry, Next Steps pruned
- `Chris Notes/AA frequently used files/Notes for next session.md` — S316 handoff notes
- `project-history/2026-04-24-session-316-cleanup-and-late-cancel-gate.md` — this file
