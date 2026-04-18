# Session 287 — Waitlist Promotion + capacity=0 Fix

**Date:** 2026-04-18
**Model:** Claude Opus 4.7
**Persona Focus:** Coach / Athlete booking flow
**Scope:** 2 code bugs in booking/capacity logic + 1 DB row hotfix

---

## Problem

Chris reported: Sunday 2026-04-19, 10:30 session shows **1/10 confirmed + 1 on waitlist**. Nonsensical — 9 spots open, yet someone is on the waitlist.

SQL dump of bookings:

| name | status | booked_at |
|---|---|---|
| Justine Baumstark | confirmed | 2026-04-16 17:25 |
| Christian Tanner | cancelled | 2026-04-17 19:03 |
| Lukas Simnacher | **waitlist** | 2026-04-17 20:19 |
| Kathrin Mühlen | cancelled | 2026-04-18 06:54 |

Session history: originally two separate sessions at 10:00 and 11:00 → deleted → Saturday 10:00 copied to Sunday → time changed to 10:30 → capacity set to **0 ("unlimited" for team party)** → later changed back to **10 (normal WOD)**.

---

## Root Cause — Two Compounding Bugs

### Bug 1: `capacity === 0` booking logic inversion

`lib/coach/sessionCapacityHelpers.ts::validateCapacity` treats `0` as **"unlimited"** (skips confirmed-count check).

But everywhere else, booking status was computed as `confirmedCount < capacity ? 'confirmed' : 'waitlist'`. With `capacity = 0`, `0 < 0 = false`, so **every booking got `status = 'waitlist'`**. Same inversion in:
- `lib/coach/bookingHelpers.ts::canAddToSession` (line 52)
- `app/api/bookings/create/route.ts` (line 172)

### Bug 2: WOD save path never promotes waitlist

`hooks/coach/useWODOperations.ts` has **5 sites** that update `weekly_sessions.capacity` during a WOD save (edit-in-place, duplicate-guard, belt-and-braces, new-WOD-with-existing-session, etc.). **None of them called `promoteWaitlistMembers`**.

Only the session-modal's "Edit capacity" button (`useSessionEditing.ts::handleUpdateCapacity`) promoted. So any capacity change made by saving the WOD itself silently skipped waitlist rescue.

### Reconstructed timeline for the 10:30 session

1. Sunday session originally existed at capacity 10 → **Justine booked → confirmed**.
2. Chris flipped the session to capacity 0 (team party). Saved the WOD → `useWODOperations.ts` wrote `weekly_sessions.capacity = 0`.
3. **Christian, Lukas, Kathrin** each self-booked (2026-04-17 19:03 / 20:19 / 2026-04-18 06:54) → all got `status = 'waitlist'` due to Bug 1.
4. Chris changed the session back to a normal WOD with capacity 10. Saved the WOD → `useWODOperations.ts` wrote `weekly_sessions.capacity = 10`. **Bug 2**: no waitlist promotion. Lukas, Christian, Kathrin all stuck on waitlist.
5. Christian and Kathrin self-cancelled. `app/api/bookings/cancel/route.ts:183` only promotes if the cancelled booking was `'confirmed'` — waitlist-→-cancelled doesn't rescue anyone. Lukas still stuck.
6. End state: `1/10 + 1 waitlist`.

---

## Fix

### Part 1 — `capacity === 0` treated as unlimited everywhere

```ts
// lib/coach/bookingHelpers.ts:52
return capacity === 0 || confirmedCount < capacity;

// app/api/bookings/create/route.ts:172
const bookingStatus =
  session.capacity === 0 || confirmedCount < session.capacity
    ? 'confirmed'
    : 'waitlist';
```

### Part 2 — Waitlist promotion on WOD save

Added two helpers to `lib/coach/sessionCapacityHelpers.ts`:
- `promoteWaitlistForSession(supabase, sessionId, newCapacity)` — handles `capacity === 0` (promote every waitlist entry) and capped promotion for finite capacity.
- `promoteWaitlistForWorkout(supabase, workoutId, newCapacity)` — loops sessions linked to the workout and calls the per-session helper.

Wired into 5 sites in `hooks/coach/useWODOperations.ts`:
1. Line ~63 — edit-in-place workout update (workout-scoped promotion).
2. Line ~108 — selectedSessionIds loop in edit branch (session-scoped).
3. Line ~152 — duplicate-guard branch (workout-scoped).
4. Line ~214 — belt-and-braces orphan prevention (session-scoped, only when updating existing session; inserts skip).
5. Line ~278 — new WOD with pre-existing session (session-scoped, update branch only).
6. Line ~325 — selectedSessionIds loop in new-WOD branch (session-scoped).
7. Line ~344 — editing empty session → link to new WOD (session-scoped).

### Part 3 — DB hotfix for Lukas

```sql
UPDATE bookings
SET status = 'confirmed', updated_at = NOW()
WHERE id = 'ba829752-9746-423f-8bd5-055046070842';
```

---

## Files Changed

- `lib/coach/bookingHelpers.ts` — `canAddToSession` treats capacity=0 as unlimited.
- `app/api/bookings/create/route.ts` — booking status ternary treats capacity=0 as unlimited.
- `lib/coach/sessionCapacityHelpers.ts` — added `promoteWaitlistForSession` + `promoteWaitlistForWorkout`.
- `hooks/coach/useWODOperations.ts` — imports new helpers; calls promotion after every `weekly_sessions.capacity` update (5 sites covering 7 call-points).
- Supabase DB — Lukas Simnacher's booking promoted.

---

## Carryover / Deferred

- **`app/member/book/page.tsx:540-564`** — UI code doesn't handle `capacity === 0`. `getCapacityColor` divides by zero (NaN %). `getCapacityBadge` computes `spotsLeft = 0 - confirmed_count` → negative → renders "Full". Cosmetic only; bookings still work. Low priority.
- The coach `handleCancelBooking` path in `useBookingManagement.ts` already uses `coach_cancelled` status but **also doesn't promote waitlist**. Noted in early Session 287 diagnosis; not fixed yet (not the cause of today's bug). Worth a follow-up: coach removing a confirmed member should rescue the next waitlist entry.

---

## Key Learnings

1. **"Capacity = 0 means unlimited" was only enforced in one helper** (`validateCapacity`). Every other consumer treated 0 literally. If a sentinel value encodes a semantic meaning, it has to be interpreted consistently everywhere — or the sentinel should be replaced with `null`/a boolean flag.
2. **Multiple write-paths touch the same state** (`weekly_sessions.capacity` is updated from at least: `useSessionEditing.ts`, `useWODOperations.ts` x5, and potentially direct Supabase edits). Only one of those paths had waitlist rescue logic. When a mutation has a required side-effect (waitlist promotion), centralize the mutation.
3. **Reconstruction required the user's narrative** — the schema + bookings alone couldn't reveal the capacity=0 → 10 flip; that only surfaced when Chris described editing the WOD from party mode to normal. History matters.
