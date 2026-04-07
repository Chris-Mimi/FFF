# Session 267 — Null Scaling Ranking Fix (2026-04-07)

**Model:** Claude Opus 4.6
**Focus:** Fix leaderboard ranking when athletes have blank/null scaling levels
**Status:** Complete

---

## Problem

Athletes with missing scaling levels (e.g., didn't attempt a movement like Pull-up Strict) were incorrectly ranked above athletes who completed all movements at a scaled level.

**Example:** Tabata This leaderboard:
- Sandra: 29 reps, Rx + Rx + [blank] — ranked 8th (above MichaelJ)
- MichaelJ: 35 reps, Sc2 + Rx + Rx — ranked 9th (below Sandra)

## Root Cause

`aggregateScaling()` in `leaderboard-utils.ts` treated null/blank scaling as 0 (same as Rx). Sandra's score: `0 + 0 + 0 = 0`. MichaelJ's score: `2 + 0 + 0 = 2`. Lower = better, so Sandra ranked higher despite fewer reps and incomplete movements.

## Fix

Changed null/blank scaling penalty from 0 to 4 (worse than Sc3=3) in both:
- `rankSectionResults` (WOD leaderboard)
- `rankBenchmarkResults` (benchmark leaderboard)

**After fix:** Sandra = `0 + 0 + 4 = 4`, MichaelJ = `2 + 0 + 0 = 2`. MichaelJ correctly ranks higher.

**No impact on existing rankings** — for workouts where all athletes have the same null fields, the penalty is symmetric and cancels out in comparison.

## Files Changed

- `utils/leaderboard-utils.ts` — Two `aggregateScaling` functions updated (lines ~298-302 and ~407-411)
