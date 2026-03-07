# Session 183 - Analysis Default 12m + Category Rename (2026-03-07)

## Summary
Two small changes: set Analysis page default time scale to 12 months, and renamed exercise category "Warm-up & Mobility" to "Pre-Workout".

## Changes

### 1. Analysis Page Default Time Scale
- Changed `timeframePeriod` initial state from `1` (1 month) to `12` (12 months)
- File: `app/coach/analysis/page.tsx` line 108

### 2. Exercise Category Rename: "Warm-up & Mobility" → "Pre-Workout"
- Rationale: "Pre-Workout" is broader — covers warm-ups, mobility, activation drills, stretching without listing sub-types in the category name
- Updated 6 app code files with hardcoded category references
- Updated mobile abbreviation from "Warm-up" to "Pre-WO" in StatisticsSection
- **DB migration needed:** `UPDATE exercises SET category = 'Pre-Workout' WHERE category = 'Warm-up & Mobility';`

## Files Changed
- `app/coach/analysis/page.tsx` — Default timeframePeriod 1→12, category rename
- `components/coach/analysis/ExerciseLibraryPanel.tsx` — Category rename in CATEGORY_ORDER
- `components/coach/analysis/StatisticsSection.tsx` — Category rename + mobile abbreviation
- `components/coach/MovementLibraryPopup.tsx` — Category rename in EXERCISE_CATEGORY_ORDER
- `components/coach/ExerciseFormModal.tsx` — Category rename in EXERCISE_CATEGORY_ORDER
- `components/coach/ExercisesTab.tsx` — Category rename in EXERCISE_CATEGORY_ORDER

## Status
- TypeScript compiles clean
- DB update pending (run SQL in Supabase SQL Editor)
