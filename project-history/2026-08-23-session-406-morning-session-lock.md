# Session 406 — Morning-session auto-lock + coach lock visibility (+ 2 DB admin tasks)

**Date:** 2026-08-23 · **Model:** Opus 4.8
**Status:** All shipped, pushed to `main`, tsc+build clean, tested live by Chris.

---

## 1. Planner "Pre-Workout" group bulk-fill (DB-only)

Chris has a `movement_patterns` group named **"Pre-Workout"** and didn't want to
click each warm-up exercise in one at a time. The exercise library has a literal
`category = 'Pre-Workout'` (149 rows). Linked all of them to the group.

- Probed first: 59 already linked, 90 missing.
- [scripts/add-preworkout-group.ts](../scripts/add-preworkout-group.ts) — INSERT-only into
  `movement_pattern_exercises`, deduped against existing, `sort_order` appended. Result 59→149.
- Same shape as the in-app "Copy exercises" path in `PlannerSection.tsx`.

## 2. Koffler family 10-card (DB-only)

Irene Koffler pays her own way and now holds a 10-card for her two kids (Anton +
Viktoria). Viktoria originally held the card. Moved both kids onto Irene's card.

- [scripts/link-koffler-kids-to-card.ts](../scripts/link-koffler-kids-to-card.ts):
  each kid `ten_card_holder_id` → Irene, `primary_payment_method` → `ten_card`;
  Viktoria's stale own card cleared (`ten_card_purchase_date=null`, 0 used → nothing lost).
- **Key mechanic (the Miriam-Jacht pattern):** a booking debits the card iff the booker's
  *effective* payment method is `ten_card` (`primary_payment_method || membership_types[0]`),
  attributed to `ten_card_holder_id || id`. Irene's method is `member`, so her own
  bookings never burn the kids' card. Confirmed 0 prior consumed bookings before moving.
- Shared pool = 10 sessions for **both** kids combined (flagged to Chris; model is one card per holder).

## 3. 🔒 NEW FEATURE — morning-session auto-lock

**Need:** close booking for morning sessions the evening before, automatically.

**Why the existing tools didn't cover it:**
- Manual per-session Lock button → works but needs clicking every night.
- Per-session-type `auto_lock_lead_minutes` → applies to *all* sessions of a type, and
  morning/evening classes share types (WOD at 09:00 **and** 17:15; Endurance 09:00 **and** 18:00),
  so a big lead would wrongly lock the evening classes.

**Design (Chris chose via AskUserQuestion):** fixed wall-clock time the evening before,
applied to any session starting before a cutoff hour (robust — independent of session type).

**Implementation:**
- Migration `20260823000000_morning_lock_booking_rules.sql` — 3 cols on `booking_rules`:
  `morning_lock_enabled` (bool, default false), `morning_cutoff_time` (time, 12:00),
  `morning_lock_time` (time, 20:00). Chris ran it.
- Shared helper `sessionAutoLockInstant(date, time, leadMinutes, morning?)` in
  [lib/bookingRules.ts](../lib/bookingRules.ts): returns the UTC instant a session
  auto-locks = **min(** standard lead-time lock, morning lock **)**. A session is
  "morning" if `time < morning_cutoff_time`; it then locks at `morning_lock_time` on the
  **previous calendar day** (Berlin wall clock via existing `berlinWallTimeToUTC`).
  Prev-day computed at noon-UTC so a DST transition can't roll the date.
- **One helper, four call sites** — deliberately centralized so create/cancel/book-page/coach
  can't drift: booking [create](../app/api/bookings/create/route.ts),
  [cancel](../app/api/bookings/cancel/route.ts) (late-cancel timing), athlete
  [book page](../app/member/book/page.tsx) (display + countdown), and coach lock indicator.
- Admin [Booking Rules](../app/coach/admin/booking-rules/page.tsx) UI: enable toggle + cutoff/lock
  time pickers; validated + persisted via the admin API route + public config route.
- **Off by default** → inert until enabled; when disabled the helper reduces byte-for-byte to
  the old `start − leadMinutes` formula (verified). That's why merging was low-risk.

Verified the helper locally: 09:00 and 11:00 morning sessions both lock 20:00 the prior
evening (fixed cutoff, not lead-relative); 18:30 evening unaffected; morning wins when
earlier than the lead lock; DST-safe.

## 4. Coach lock visibility

Chris enabled the rule, saw the athlete app correctly lock tomorrow's 09:00 Diapers &
Dumbbells, but the **coach app showed no lock** — because the coach side had *no lock
indicator at all*, and the modal's indicator ignored auto-locks.

- **Calendar badge** ([useCoachData.ts](../hooks/coach/useCoachData.ts) +
  [CalendarGrid.tsx](../components/coach/CalendarGrid.tsx)): fetch public rules once, compute
  effective lock per session with the shared helper, expose `locked` + `locked_manually` on
  `booking_info`; render a gray 🔒 Locked badge. **Gated to future sessions** — a past session
  is trivially locked and would clutter the week. Tooltip distinguishes manual vs auto.
- **Modal indicator** ([useSessionEditing.ts](../hooks/coach/useSessionEditing.ts)): replaced the
  raw `new Date(\`${date}T${time}\`) < now` check (also an S335 TZ anti-pattern) with
  `sessionAutoLockInstant`. Now an auto-locked session reads as locked → button shows "Unlock"
  and the coach can force it open. Caveat: `workout_type` isn't on `SessionDetails`, so the
  per-type lead override isn't applied here (morning rule + global lead are exact).

---

## Process notes / learnings

- **Branch friction:** I branched `feat/morning-session-lock` per the on-`main` safety rule;
  Chris asked why. His workflow is trunk-based. Merged fast-forward → `main` after explaining
  the change is inert until enabled. For low-risk feature work, committing to `main` directly
  matches his norm.
- **"Locked in athlete app not coach app" was NOT a disagreement bug** — the athlete app is the
  real enforcement (working); the coach side just lacked the UI. Both now compute lock from the
  same public-rules helper, so they can't silently diverge.
- Two commits kept the one-off DB scripts separate from the feature.

## Carry-overs into S407

- S405 attendee-fix + mobile-Planner verifications still pending (not touched this session).
- Morning-lock tweak levers documented in activeContext Kickoff (past-session badge, per-type
  lead in modal, per-day-of-week times) — build only if asked.
