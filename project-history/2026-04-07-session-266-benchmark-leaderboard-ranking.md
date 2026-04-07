# Session 266 — Benchmark Leaderboard Ranking Fix (2026-04-07)

**Model:** Claude Opus 4.6
**Focus:** Fix Tabata This leaderboard showing wrong ranking, "Time Cap" label, and empty-score athletes
**Status:** Partial — fixes applied but not yet verified working

---

## Problem

Tabata This workout (20 Feb) leaderboard had three bugs:
1. **Wrong ranking** — TobiasG (42 reps, Rx) ranked 5th; Jenny (no scores) ranked 2nd
2. **"Time Cap" display** — All entries showed "Time Cap X reps" instead of just "X reps"
3. **Empty scores included** — Athletes with all-zero/null results appeared in ranking

## Root Cause

The WOD JSON stores benchmark type as a snapshot from when it was added. This workout's benchmark was stored as `"type": "Other"` — later changed to "Tabata" in the benchmark modal, but the WOD JSON was never updated.

- `rankBenchmarkResults` checks type string for "time"/"rep"/"amrap" to determine sort direction
- `"Other"` matched none → fell through to weight-based sorting (everyone has 0 weight = random order)
- `formatBenchmarkResult` assumed "no time + has reps = Time Cap" for all types
- No validity filter existed to exclude all-zero entries

## Changes Made

### 1. `utils/leaderboard-utils.ts`

**Tabata type recognition (line 348):**
- Added `tabata` to reps-based check: `typeLower.includes('tabata')`

**Data-based fallback for unrecognised types (lines 350-357):**
- When type is neither time-based nor reps-based (e.g. "Other"), infer from actual data:
  - Has time results → time-based sorting
  - Has reps/rounds but no weight → reps-based sorting
  - Otherwise → weight-based (existing default)

**Validity filter (lines 360-365):**
- Added filter before deduplication: excludes entries where ALL result fields are 0/null
- Matches existing pattern in `rankSectionResults` (which already had this)

**formatBenchmarkResult signature (line 565):**
- Added optional `benchmarkType` parameter
- "Time Cap" prefix now only shown when benchmark type includes "time"

### 2. `components/athlete/LeaderboardView.tsx`

- Updated all 4 call sites of `formatBenchmarkResult` to pass benchmark type
- Lines 1064, 1121 (weekly leaderboard): pass `selectedItem?.benchmarkType`
- Lines 1458, 1502 (records page): pass `selectedBenchmark?.type`

---

## Key Decisions

- Fallback inference from data is safe — only activates for unrecognised types
- Existing "For Time", "For Reps", "AMRAP", "For Load" benchmarks unaffected
- Stale WOD JSON snapshot issue deferred — needs separate decision on approach

---

## Next Steps

- Verify fix works on Tabata This leaderboard
- If still not working, investigate further in next session
- Decide approach for stale benchmark type snapshots in WOD JSON
