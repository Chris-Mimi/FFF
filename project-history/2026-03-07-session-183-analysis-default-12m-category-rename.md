# Session 183 - Analysis Default 12m, Category Rename, Programming Planner Scaffolding (2026-03-07)

## Summary
Three parts: (1) set Analysis page default time scale to 12 months, (2) renamed exercise category "Warm-up & Mobility" to "Pre-Workout", (3) scaffolded Programming Planner feature (Phase 1-3) with patterns, gap analysis, and planning grid.

## Changes

### 1. Analysis Page Default Time Scale
- Changed `timeframePeriod` initial state from `1` (1 month) to `12` (12 months)
- File: `app/coach/analysis/page.tsx` line 108

### 2. Exercise Category Rename: "Warm-up & Mobility" → "Pre-Workout"
- Rationale: "Pre-Workout" is broader — covers warm-ups, mobility, activation drills, stretching without listing sub-types in the category name
- Updated 6 app code files with hardcoded category references
- Updated mobile abbreviation from "Warm-up" to "Pre-WO" in StatisticsSection
- **DB updated:** `UPDATE exercises SET category = 'Pre-Workout' WHERE category = 'Warm-up & Mobility';` — applied

### 3. Programming Planner Scaffolding (Phase 1-3)
- **DB migration:** 3 new tables (`movement_patterns`, `movement_pattern_exercises`, `programming_plan_items`) with RLS policies
- **TypeScript types:** Interfaces for patterns, plan items, gap analysis results
- **Pattern analytics:** Gap analysis + weekly coverage detection utilities
- **UI Components:** PatternManager (CRUD), PatternExercisePicker (modal), GapAnalysisPanel (color-coded staleness), PlanningGrid (weekly click-to-toggle), PlannerSection (main container)
- **Analysis page:** Added tab bar (Statistics/Planner) with PlannerSection import and activeTab state

## Files Created
- `supabase/migrations/20260307000001_add_programming_planner.sql` — 3 tables + RLS
- `types/planner.ts` — TypeScript interfaces
- `utils/pattern-analytics.ts` — Gap analysis + weekly coverage detection
- `components/coach/analysis/PatternManager.tsx` — CRUD for patterns
- `components/coach/analysis/PatternExercisePicker.tsx` — Exercise picker modal
- `components/coach/analysis/GapAnalysisPanel.tsx` — Color-coded staleness display
- `components/coach/analysis/PlanningGrid.tsx` — Weekly grid with click-to-toggle
- `components/coach/analysis/PlannerSection.tsx` — Main container wiring all components

## Files Modified
- `utils/movement-analytics.ts` — Exported `fetchPublishedWorkouts` + `PublishedWorkout` interface
- `app/coach/analysis/page.tsx` — Added tab bar (Statistics/Planner), PlannerSection import, activeTab state

## Status
- All files written, committed
- **NOT yet tested** (no `npm run dev` run) — may have TypeScript errors to fix
- **DB migration pending:** `20260307000001_add_programming_planner.sql` — apply in Supabase SQL Editor
- Next steps: Run `npm run dev`, fix TS errors, test planner tab, iterate on UI
