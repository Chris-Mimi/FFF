# Session 294 — Booking Rules Admin UI

**Date:** 2026-04-19
**Model:** Opus 4.7

---

## Context

All athlete booking limitations were hardcoded constants inside
`app/api/bookings/create/route.ts` and `app/api/bookings/cancel/route.ts`:

- 10-card refund grace period: `GRACE_PERIOD_HOURS = 12`
- Auto-lock behavior: `session.is_locked === null && sessionDateTime < new Date()` — locked at start, no lead time
- No per-day cap, no per-week cap, no advance-booking horizon cap

Chris wanted a coach-admin panel to expose these so rules can be tuned
without redeploying. Class-type restrictions (#5 on the original list)
were deferred — they're a policy matrix, not a numeric setting, and
need separate UX + coach input on age/sessions thresholds for Kids and
Foundations.

## What shipped

### 1. Single-row settings table

`supabase/migrations/20260419000000_add_booking_rules.sql`

```sql
CREATE TABLE IF NOT EXISTS booking_rules (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  ten_card_refund_hours INT NOT NULL DEFAULT 12,
  auto_lock_lead_minutes INT NOT NULL DEFAULT 0,
  max_bookings_per_day INT,
  max_bookings_per_week INT,
  advance_booking_days INT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO booking_rules (id) VALUES (1) ON CONFLICT DO NOTHING;
```

`CHECK (id = 1)` enforces single-row semantics. Defaults match the
previously hardcoded values so zero behavior change until a coach edits
them.

### 2. Helper + admin API

- `lib/bookingRules.ts` — `getBookingRules()` + `updateBookingRules()`
  using service role key (bypasses RLS). `BookingRules` TypeScript type
  exported. Fallback to `DEFAULT_BOOKING_RULES` on read error so the
  booking routes never fail because of a missing/broken row.
- `app/api/admin/booking-rules/route.ts` — `GET` + `PUT`, gated by
  `requireCoach`. PUT validates each field (integer, min bounds,
  nullability) before calling `updateBookingRules`.

### 3. Coach subpage

`app/coach/admin/booking-rules/page.tsx` — new subpage at
`/coach/admin/booking-rules` rather than inline on the admin page
(admin page already has two tabs + multiple cards; a dedicated subpage
keeps focus). Form with 5 numeric inputs, helper text under each,
save button with inline success/error message. Nullable fields (per-day,
per-week, advance-booking) accept blank input meaning "unlimited."

Linked from `app/coach/admin/page.tsx` as a new card (Settings icon)
alongside "Create New Coach Account."

### 4. Wired into booking routes

**Create route** (`app/api/bookings/create/route.ts`):
- Replaced hardcoded lock check with `lockThreshold = sessionDateTime - auto_lock_lead_minutes` — `auto_lock_lead_minutes=0` reproduces current "lock at start" behavior.
- Added advance-booking horizon check — compares `session.date` to `today + advance_booking_days`.
- Added per-day cap — queries athlete's confirmed+waitlisted bookings with `weekly_sessions.date = session.date` and compares count.
- Added per-week cap — calculates Monday–Sunday boundaries of the session's week (`(dayOfWeek + 6) % 7` to get Monday) and queries count within that range.

**Cancel route** (`app/api/bookings/cancel/route.ts`):
- Pulled rules, used `ten_card_refund_hours` in place of the hardcoded 12.
- Updated the "not refunded" message to use the same variable so it stays accurate if the rule changes.

## Logic decisions

- **Single-row vs key/value:** single-row wins because every rule has a
  known, typed shape. Key/value requires runtime validation and text
  parsing for what are simple integers. Five scalars → five columns.
- **Service role for reads:** picked service role in `getBookingRules`
  rather than piggy-backing the user's auth context. Rules need to be
  readable from all booking routes regardless of whether the caller
  is an authenticated user or a coach — service role is the cleanest
  and avoids RLS complications on a table that's effectively public-read
  anyway.
- **Fallback to defaults on error:** `getBookingRules()` returns
  `DEFAULT_BOOKING_RULES` on any error so a broken/missing table row
  never takes booking down. Defaults match original hardcoded values.
- **Week boundary = Monday–Sunday of session date:** not "7 days from
  now," not ISO week, but the calendar week containing the session.
  Matches how athletes think about gym weeks.

## Follow-up candidates (NOT in this session)

- Class-type restrictions (#5) — needs policy matrix + UX for mapping
  `members.class_types[]` → `weekly_sessions.workout_type`. Kids gating
  needs age-from-DOB logic; Foundations gating likely needs a
  "sessions-completed" threshold. Separate session, with Chris input
  on policy.
- Cached/memoized rule reads. Each create/cancel call hits the DB for
  rules. Fine at current volume; worth revisiting if call rate spikes.
- Admin audit log — who changed a rule, when, from/to. Not needed
  unless the gym has multiple coaches making competing edits.

## Carryover (still open from previous sessions)

- Mac Chrome hang (system-level, dedicated session)
- Athlete subscription bug (Stefan Glocker + webhook ordering)
- Whiteboard duplicate entries (S251 uncommitted changes)
- Score-entry API filter (`app/api/score-entry/[sessionId]/route.ts:48-56`)
- Test endpoint 410 cleanup (`app/api/notifications/test/route.ts`)

## Lessons

- **Defaults that match hardcoded values = zero-risk rollout.** The
  migration creates the row with exactly the values the old code used,
  so on deploy nothing changes until a coach actively edits. This is
  the right pattern for converting hardcoded → configurable — don't
  let the migration itself change behavior.
- **`CHECK (id = 1)` is the simplest single-row enforcement.** No
  triggers, no RLS, no application logic needed. The PK + check makes
  a second row physically impossible.
- **Subpage over inline panel** for admin sections with multiple
  independent settings. Keeps the main admin page scannable and each
  settings area focused.
