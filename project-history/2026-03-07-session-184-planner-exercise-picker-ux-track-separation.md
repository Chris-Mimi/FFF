# Session 184 - Planner Exercise Picker UX, display_name Fix, Kids/Adults Track Separation (2026-03-07)

## Summary
Three improvements to the Programming Planner: (1) exercise picker UX with collapsible categories and selected-first sorting, (2) display_name fix for pattern analytics, (3) Adults/Kids track separation with track-scoped patterns and session type filtering.

## Changes

### 1. Exercise Picker UX (PatternExercisePicker)
- Collapsible categories in exercise picker modal
- Selected-first sorting — selected exercises appear at top of each category
- Partial collapse — when a category is collapsed, selected exercises within it remain visible
- Added missing X icon import in PatternManager

### 2. display_name Fix
- Added `display_name` to known names mapping in `pattern-analytics.ts`
- Ensures exercises with display_name (e.g., "Barbell Bench Press") are recognized in gap analysis

### 3. Adults/Kids Track Separation
- Added Adults/Kids toggle on PlannerSection
- Track-scoped pattern fetching — patterns filtered by track (adults/kids)
- Track-scoped pattern creation — new patterns created with track field
- Session type filtering: Adults excludes "Kids & Teens", Kids excludes all adult session types
- Added `excludeSessionTypes` to `DateRangeFilter` type and wired through gap/coverage functions

### 4. Database Migration
- `20260307000002_add_pattern_track.sql` — Adds `track` column (TEXT, default 'adults') to `movement_patterns` + updated unique constraint on (user_id, name, track)

## Files Modified
- `components/coach/analysis/PatternExercisePicker.tsx` — Collapsible categories, selected-first sorting, partial collapse
- `components/coach/analysis/PatternManager.tsx` — Added missing X icon import
- `components/coach/analysis/PlannerSection.tsx` — Adults/Kids toggle, track-scoped pattern fetching/creation
- `types/planner.ts` — Added track field to MovementPattern
- `utils/movement-analytics.ts` — Added excludeSessionTypes to DateRangeFilter + filtering in fetchPublishedWorkouts
- `utils/pattern-analytics.ts` — Added display_name to known names, wired excludeSessionTypes through gap/coverage functions

## Files Created
- `supabase/migrations/20260307000002_add_pattern_track.sql` — Track column + updated unique constraint

## Known Issue (Carry Forward)
- **Barbell Bench Press shows "Never Programmed"** despite display_name fix and migration applied. Root cause: lift name "Bench Press" should map to exercise "Barbell Bench Press" via `genericToCanonical`, but something in the matching chain is still failing.
- **Next session action:** Add console logging to `extractMovementsFromWod` for the lift extraction path to trace where the mapping breaks.

## Status
- All files committed and pushed
- Migration `20260307000002_add_pattern_track.sql` applied
