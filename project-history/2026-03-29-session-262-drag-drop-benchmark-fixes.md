# Session 262 — Drag-Drop Fix + Benchmark Ranking (2026-03-29)

**Model:** Claude Opus 4.6
**Duration:** Short session
**Focus:** Bug fixes — Coach drag-drop self-copy + Benchmark leaderboard weight ranking

---

## Changes Made

### 1. Coach Drag-Drop Self-Copy Bug

**Problem:** Dragging a published workout and dropping it on the same date (either on itself or empty area) created a duplicate workout in draft status, making the original appear to revert to draft.

**Root Cause:** No check to prevent copying a workout onto the same date.

**Fix:**
- Updated `useDragDrop.ts` to store source date with `copiedWOD` state
- Added same-date checks in `handleDrop` and `handlePasteFromClipboard` using consistent `formatDate()` (not UTC ISO format)
- Updated `CalendarGrid.tsx` to check same workout ID when dropping on card
- Updated type signatures in `CalendarGrid.tsx` and `CalendarNav.tsx` to match new `copiedWOD` structure

**Files Changed:**
- `hooks/coach/useDragDrop.ts` — Added source date tracking, same-date blocking
- `components/coach/CalendarGrid.tsx` — Added same-workout check on card drop, updated types
- `components/coach/CalendarNav.tsx` — Updated copiedWOD type
- `app/coach/page.tsx` — Updated handleCopyToClipboard call signature

**Technical Detail:** Initial fix used `toISOString().split('T')[0]` for date comparison, which mixed UTC and local time zones. Changed to `formatDate()` utility for consistent local date keys.

---

### 2. Benchmark Leaderboard Weight Ranking

**Problem:** Benchmarks (e.g., Nancy) ranked by rounds+reps before weight. Example: Athlete with 7.5kg and 4+40 ranked above athlete with 15kg and 3+45, both at Sc3/T1.

**Expected:** When scaling/track are equal, heavier weight should rank higher (matches CrossFit convention and existing WOD section logic).

**Root Cause:** `rankBenchmarkResults()` in `leaderboard-utils.ts` sorted by scaling → track → primary metric, skipping weight tiebreaker that was only implemented for WOD sections.

**Fix:**
- Added weight tiebreaker to benchmark sort logic (lines 400-407)
- Mirrors WOD section logic: weight checked after track but before primary metric
- Applies to time-based and reps-based benchmarks (not weight-based, where weight IS the primary)

**Files Changed:**
- `utils/leaderboard-utils.ts` — Added weight tiebreaker to benchmark ranking

**Result:** Nancy leaderboard now correctly ranks:
1. 15 kg, 4+40
2. 15 kg, 3+45
3. 7.5 kg, 4+40

---

## Testing

- ✅ Drag published workout to same date → drop ignored
- ✅ Drag published workout to different workout on same date → drop ignored
- ✅ Copy/paste workout to same date → paste ignored
- ✅ Benchmark leaderboard now ranks by weight before reps when scaling/track equal

---

## Known Issues

None introduced. Both fixes are isolated and don't affect other functionality.

---

## Next Steps

None required. Bug fixes complete.
