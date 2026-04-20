# Session 296 — Athlete Timer Intervals Mode

**Date:** 2026-04-20
**Model:** Opus 4.7
**Persona:** Athlete feature
**Status:** Shipped (untested live at session close — Chris to test on deployed app)

---

## Goal

Add a 6th Timer mode to the athlete app that supports fully editable multi-round intervals with variable work/rest per round. Chris's primary use case: standard warm-up format "12 rounds of 50s work / 10s rest", but also descending-work sessions (Rd 1: 50/10 → Rd 2: 40/20 → Rd 3: 30/30…).

The existing Tabata mode only supports a single `{workTime, restTime, rounds}` triplet — no per-round customization.

---

## What shipped

### `hooks/useWorkoutTimer.ts`

- `TimerMode` now includes `'intervals'` (6th mode).
- New exported type `IntervalSpec { work: number; rest: number }`.
- `TimerConfig.intervals: IntervalSpec[]` added; default = `12 × {work: 50, rest: 10}` (matches Chris's standard warm-up).
- `getTotalDuration()` sums the array for `intervals` mode.
- `tick()` walks the intervals array on each tick:
  - At `elapsed === t + work` (work→rest boundary): fire short beep **only if `rest > 0`** (skips when round has no rest, to avoid a double-beep overlap with the next round start).
  - At `elapsed === t + work + rest` (end of round, start of next): fire short beep + speak "Round N" or "Last round!" for the incoming round. Skipped for the final round (timer finish handles that).
- Derived state (`currentRound` / `isWorkPhase` / `phaseRemaining`) computed by iterating the array and accumulating elapsed offsets until the current position is found. Idle state shows first round's work time so the display isn't blank.

### `components/athlete/WorkoutTimer.tsx`

- Added `'Intervals'` chip to `MODE_LABELS` between Tabata and Hold.
- `displayTime`, `displayColor`, Round indicator, Phase indicator, Total-elapsed secondary display all now include `'intervals'` (reuses the existing Tabata-style green/red WORK/REST rendering).
- New `IntervalsEditor` sub-component (shown when idle, mode = intervals):
  - **Quick Fill panel (top):** Rounds / Work / Rest spinners + Apply button — replaces the entire array with N copies of `{work, rest}`. Covers the 12×50/10 warm-up in two taps.
  - **Rounds list (scrollable, max-h-72):** each row shows `Rd N | W [− xx +] | R [− yy +] | ✕`. Compact 7x7 spinner buttons for tight mobile layout. Per-row delete (disabled when only 1 row remains).
  - **Footer actions:** "+ Add round" (appends a copy of last) and "Duplicate last" (same effect — two labels for discoverability).
  - **Live total duration** in header (`Total MM:SS`).
- Two small helper sub-components: `QuickFillRow` (larger 9x9 buttons for the fill panel) and `IntervalRow` (compact row for the list).

---

## Decisions

1. **Kept Tabata as its own mode** rather than retiring it in favour of Intervals. Reason: Tabata has a well-known 20/10×8 default and one-tap start; users who just want classic Tabata don't need to edit a list.
2. **Default to 12×50/10** rather than an empty list. Chris explicitly called this out as his most common warm-up format — a sensible default means the mode is usable with zero setup.
3. **Voice announcements match Tabata pattern** ("Round N" / "Last round!") for consistency. No per-round custom labels (out of scope).
4. **Skipped localStorage persistence.** The existing config isn't persisted for any other mode either; adding it for just Intervals would be inconsistent. Can be added in a follow-up session if Chris asks.
5. **Skipped reordering (drag-and-drop).** For <20 rounds, users can delete and re-add. Drag-and-drop adds complexity (`@dnd-kit` or similar) for a low-frequency action.
6. **Rest can go to 0** (continuous work rounds — useful for EMOM-style). Work minimum 5s (matches Tabata min).

---

## Edge cases handled

- `rest: 0` → work→rest beep suppressed (the round-start beep from the next round fires on the same tick, so suppressing avoids a double-beep).
- Last round → no "Round N+1" beep (terminates cleanly via existing `total > 0 && newElapsed >= total` finish handler which plays the long complete beep and speaks "Time!").
- Single-round array → delete button disabled (prevents empty array).
- Idle state → display shows first round's work time instead of 00:00.

---

## Files changed

- `hooks/useWorkoutTimer.ts` — mode type, config shape, getTotalDuration, tick beeps, derived state
- `components/athlete/WorkoutTimer.tsx` — mode chip, display branches, IntervalsEditor + sub-components
- `Chris Notes/Forge app documentation/Forge-Feature-Overview.md` — updated Timer bullet (5-mode → 6-mode with Intervals callout)

---

## Outstanding

- **Live testing** — Chris testing on deployed app after session close. Watch for: timing drift on long intervals, voice cue overlap on rapid transitions, mobile scroll behavior when list exceeds viewport.
- **Persistence (optional follow-up)** — if Chris wants custom interval presets to survive page refresh, add localStorage serialization to `useWorkoutTimer` covering the whole `config` object.
- **Potential follow-ups if requested:** saved named presets ("Warm-up 1"), drag-to-reorder rounds, per-round custom labels.
