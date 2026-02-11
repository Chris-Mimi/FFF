# Session 108: Multi-Source WOD Leaderboard

**Date:** 2026-02-11
**Model:** Opus 4.6
**Duration:** ~1 session

---

## Summary

Fixed the leaderboard 0 results bug from Session 107. Root cause: the WOD leaderboard only queried `wod_section_results`, but Strength sections save athlete data to `lift_records` and benchmark sections save to `benchmark_results`. Additionally, content section IDs were stored as `${sectionId}-content-0` but the query used the raw section ID.

## Root Cause Analysis

1. **Strength sections** — Athletes log lifts into `lift_records` table (not `wod_section_results`). The leaderboard was only querying `wod_section_results`, so Strength workout results never appeared.
2. **Benchmark sections** — Athletes log benchmark results into `benchmark_results` table. Same issue.
3. **Content section ID mismatch** — When athletes log WOD content results, the `section_id` stored is `${sectionId}-content-0`, but the leaderboard was querying with just `${sectionId}`.

## Changes

### `utils/leaderboard-utils.ts` (+45 lines)
- Added `RawLiftResult` interface
- Added `bestLiftPerUser()` — deduplicates lift records to best (heaviest) per user
- Added `rankLiftResults()` — ranks lift results by weight descending

### `components/athlete/LeaderboardView.tsx` (+413/-156 lines)
- **New `WodSection` interface** — expanded with `lifts[]`, `benchmarks[]`, `forge_benchmarks[]` arrays
- **New `LeaderboardItem` type** — union type for lift/benchmark/forge_benchmark/content items
- **New `extractLeaderboardItems()`** — enumerates every scoreable item from a WOD's sections
- **Item picker pills** — replace old section tabs. Shows items like "OH Press 1RM", "Push Press 3RM", "WOD - For Time"
- **`loadResults` branching by type:**
  - `lift` → queries `lift_records` by `lift_name` + dates, filters by `rep_max_type` or `rep_scheme`
  - `benchmark`/`forge_benchmark` → queries `benchmark_results` by `benchmark_name` + dates
  - `content` → queries `wod_section_results` with fixed `section_id` format (`${id}-content-0`)
- **Scaling filter** hidden for lift items (lifts don't have scaling)
- **FistBumpButton targetType** dynamic per item type (lift_record/benchmark_result/wod_section_result)
- **±30 day grouping** works across all 3 data sources

## Architecture

```
WOD Sections (JSON)
├── lifts[] → query lift_records (by lift_name + date range)
├── benchmarks[] → query benchmark_results (by benchmark_name + date range)
├── forge_benchmarks[] → query benchmark_results (by benchmark_name + date range)
└── scoring_fields → query wod_section_results (by section_id-content-0 + wod_id)
```

## Testing Status

**Not yet tested live.** Needs verification:
- Navigate to a date with a Strength workout
- Verify lift pills appear (e.g., "OH Press 1RM")
- Verify results load from `lift_records`
- Test benchmark items load from `benchmark_results`
- Test content items still work with fixed section_id format

## Files Changed

| File | Lines Changed |
|:---|:---|
| `components/athlete/LeaderboardView.tsx` | +413/-156 |
| `utils/leaderboard-utils.ts` | +45 |
