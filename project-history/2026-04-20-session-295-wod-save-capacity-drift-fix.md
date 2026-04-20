# Session 295 — WOD Save Capacity Drift Fix

**Date:** 2026-04-20
**Model:** Opus 4.7
**Persona Focus:** Coach (session capacity integrity)

---

## Problem

Chris reported Monday 17:15 session displayed **10/12** (confirmed/capacity) after two self-cancellations that should have left it at **10/10**:

- Before: 10 confirmed + 2 waitlist (Claudia, Lukas)
- Michael Junkes cancelled (confirmed) → Lukas promoted → 10/10
- Claudia Hermann cancelled (waitlist, no promotion needed)
- Later view: **10/12** ← capacity had silently grown 10 → 12

Chris manually reset capacity to 10 via the coach modal's Edit Capacity button to stop further bookings.

## Root cause

Two parallel fields exist for capacity:

- `weekly_sessions.capacity` — the session's current capacity (10)
- `wods.max_capacity` — the workout's capacity (stale at 12, the default from
  `useWorkoutModal.ts:260`)

Whenever a coach saved a WOD, `hooks/coach/useWODOperations.ts` wrote
`wodData.maxCapacity` into `weekly_sessions.capacity` **without checking
whether the coach had actually changed it**. Seven UPDATE sites did this.

Chris confirmed he was editing (not publishing) the 17:15 WOD between the
cancellations and noticing 10/12. The save path silently overwrote
`weekly_sessions.capacity=10` with the stale `wods.max_capacity=12`.

The cancel flow itself was clean. The bug was elsewhere and the cancellations
were just when Chris happened to see the drift.

## Fix (Option 1 — diff-check)

Patched `hooks/coach/useWODOperations.ts::handleSaveWOD`:

```ts
const capacityChanged = !editingWOD || wodData.maxCapacity !== editingWOD.maxCapacity;
```

Wrapped each of the 7 `weekly_sessions.capacity` UPDATE sites (and the
accompanying `promoteWaitlistForWorkout` / `promoteWaitlistForSession` call)
with `if (capacityChanged)`. Capacity only propagates when the coach actually
changed the value in the modal — otherwise the session's `capacity` and
waitlist order stay put.

`INSERT`s for net-new sessions still write capacity unconditionally (they need
an initial value). `wods.max_capacity` writes untouched — the WOD record still
reflects whatever's in the form. `handleCopyWOD` untouched.

## Why not Option 2 (single source of truth)

Dropping `wods.max_capacity` would be the structurally clean fix but requires
a migration, refactoring every read site, and carries deploy risk on a live
system. Option 1 closes the class of bug Chris hit with a 50-line change to
one file and no DB work. Option 2 remains available later if capacity drift
keeps biting.

## Logic decisions

- **Guard value `!editingWOD || changed`** means fresh-creation flows (no
  `editingWOD`) still write capacity as before — no behavior change for new
  WODs. Only edits of existing WODs/session placeholders are protected.
- **Skip `promoteWaitlist*` too when unchanged** — if capacity didn't change,
  there are no newly-opened spots. Running promote with a stale value could
  over-promote based on the wrong capacity number.
- **Inline conditional update object** (ternary inside `.update()`) keeps the
  change surgical — no helper extraction for a 7-site fix.

## Files changed

- `hooks/coach/useWODOperations.ts` — +60/-39 lines, 7 guarded write sites +
  1 guard computation

## Follow-up candidates (NOT in this session)

- Option 2 (consolidate to one source of truth) if drift keeps occurring
- Audit `wods.max_capacity` across all WODs for drift vs linked session
  capacity (one-off query, not urgent)
- `app/api/google/publish-workout/route.ts:438` still has `capacity: 12`
  hardcoded for new-session creation — low risk (only fires when session
  doesn't exist yet) but worth replacing with `booking_rules` default
  someday

## Carryover (still open from previous sessions)

- Mac Chrome hang (system-level, dedicated session)
- Athlete subscription bug (Stefan Glocker + webhook ordering)
- Whiteboard duplicate entries (S251 uncommitted changes)
- Score-entry API filter (`app/api/score-entry/[sessionId]/route.ts:48-56`)
- Test endpoint 410 cleanup (`app/api/notifications/test/route.ts`)

## Lessons

- **Two parallel columns for the same concept are a bug waiting to happen.**
  `wods.max_capacity` and `weekly_sessions.capacity` were meant to stay in
  sync via `updateWorkoutCapacity`, but only the session-modal path used it.
  The WOD save path wrote from form state back to the session unconditionally,
  so any historical drift got reapplied on every edit.
- **Silent overwrites are the enemy.** The fix is essentially "don't touch
  this field unless the user changed it in this save" — same principle as
  form-dirty tracking. Applicable elsewhere in the codebase wherever two
  fields are expected to mirror but can drift.
- **Diff-check beats migration when the blast radius is scoped.** One file,
  one guard, reversible. DB refactors carry risk that's not worth it for a
  rare edge case.
