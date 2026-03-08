# Session 185 - display_name Matching Fix + Planner Exercise Grid (2026-03-08)

## Summary
Fixed the "Barbell Bench Press shows Never Programmed" bug by adding display_name matching to pattern-analytics. Added per-exercise last-programmed tracking, multi-column color-coded exercise grid in PatternManager.

## Changes

### 1. Bug Fix: display_name Matching in pattern-analytics.ts (3 spots)
- **Gap analysis `exerciseNamesLower`** — Now includes both `name` and `display_name` via `flatMap`
- **Original exercise lookup** — `pattern.exercises.find()` now checks `display_name` in addition to `name`
- **Weekly coverage `hasMatch`** — Now checks `display_name` alongside `name`
- **Root cause:** Extraction side already fed display_name into known names set, so "Barbell Bench Press" was found in workouts. But matching side only compared against `name` ("Bench Press"), so the match was never recognized.

### 2. Per-Exercise Last-Programmed Dates
- Added `exerciseLastDates: Record<string, string>` to `PatternGapResult` type
- `computePatternGaps` now tracks per-exercise dates during workout scanning (keyed by display_name or name)
- Early exit when all exercises have dates

### 3. Multi-Column Exercise Grid in PatternManager
- Expanded pattern exercises now display in responsive grid: 2 cols (mobile), 3 cols (md), 4 cols (lg)
- Each exercise card is color-coded using Movement Tracking thresholds: green ≤14d, yellow 15-28d, orange 29-60d, red 60+d, gray=never
- Inline color legend above the grid
- Sorted: most recently programmed first, never programmed last, alphabetical within same age
- Hover-to-reveal X button for removing exercises
- Tooltip shows "Last programmed: {date}"

## Files Modified
- `utils/pattern-analytics.ts` — display_name matching (3 spots) + per-exercise date tracking
- `types/planner.ts` — Added `exerciseLastDates` to `PatternGapResult`
- `components/coach/analysis/PatternManager.tsx` — Multi-column grid, color coding, sort order, legend
- `components/coach/analysis/PlannerSection.tsx` — Passes `gaps` prop to PatternManager

## Status
- All files committed and pushed
- No migrations needed
