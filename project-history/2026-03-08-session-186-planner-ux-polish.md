# Session 186 - Planner UX Polish (2026-03-08)

## Summary
Multiple UX improvements to the Programming Planner: removed redundant Gap Analysis panel, improved exercise picker defaults, added pattern color editing, exercise staleness styling, and unassigned exercise indicators.

## Changes

### 1. Removed GapAnalysisPanel
- Deleted `GapAnalysisPanel.tsx` — redundant with per-exercise color-coded grid in PatternManager
- Removed import and usage from `PlannerSection.tsx`
- Underlying `computePatternGaps` still used for pattern card staleness + planning grid coverage

### 2. Exercise Picker Default Collapsed
- All categories now start collapsed when picker opens (via `useEffect` on `isOpen`)
- Selected exercises still visible within collapsed categories (existing partial-collapse logic)
- Search also resets on open

### 3. Clickable Pattern Color Dot
- Pattern color circle next to name is now a clickable button
- Cycles through `PATTERN_COLORS` array on click
- Added hover ring effect for discoverability
- Added 2 new colors: yellow (`#FACC15`) and brown (`#92400E`) — 12 total
- Replaced indigo with lime green (too similar to purple)

### 4. Exercise Staleness in Picker
- Fetches all exercise last-programmed dates via `getExerciseFrequency()` on planner load
- Non-selected exercises styled by staleness:
  - Normal (text-gray-700): programmed within 3 months
  - Dark grey (text-gray-400): 3-6 months since last programmed
  - Light grey + italic (text-gray-300): 6+ months or never programmed
- Selected exercises keep their teal highlight regardless

### 5. Unassigned Exercise Border
- Exercises not assigned to ANY pattern show `border border-gray-200`
- Computed via `allPatternExerciseIds` Set built from all patterns

### 6. Stale Migration Reference Cleanup
- Fixed `20260307000001_add_programming_planner.sql` reference in activeContext — marked as applied (tables created directly in SQL Editor, file never existed on disk)

## Files Modified
- `components/coach/analysis/PlannerSection.tsx` — Added exerciseLastDates fetch, allPatternExerciseIds, removed GapAnalysisPanel
- `components/coach/analysis/PatternExercisePicker.tsx` — Default collapsed, staleness styling, unassigned border
- `components/coach/analysis/PatternManager.tsx` — Clickable color dot, 12 colors
- `components/coach/analysis/GapAnalysisPanel.tsx` — DELETED
- `memory-bank/memory-bank-activeContext.md` — Updated

## Status
- No migrations needed
- No new dependencies
