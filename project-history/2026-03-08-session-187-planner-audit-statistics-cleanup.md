# Session 187 - Planner Audit + Statistics Cleanup (2026-03-08)

## Summary
Architecture audit of the Programming Planner for long-term sustainability, followed by cleanup of the Statistics tab to remove redundant features now covered by the Planner.

## Changes

### 1. Planner Architecture Audit
- Full audit of planner components, utils, types, DB tables
- Architecture graded A- overall, no critical issues
- Two preventive fixes identified and applied

### 2. Exercise Frequency 12-Month Lookback
- `PlannerSection.tsx` line 138: `getExerciseFrequency()` now passes `startDate` filter (12 months ago)
- Previously fetched ALL published workouts ever — would degrade with 2+ years of data
- 12 months gives plenty of margin (staleness thresholds max at 6mo+)

### 3. Database Indexes for programming_plan_items
- New migration: `20260308000000_add_plan_items_indexes.sql`
- Added indexes on `user_id` and `pattern_id`
- Prevents slow queries as plan items grow over 1-2 years
- Applied in Supabase SQL Editor

### 4. Statistics Tab Cleanup
- **Removed:** Exercise/Movement Search section (search input + dropdown results)
- **Removed:** Browse Library button
- **Removed:** Movement Type filter buttons (Lifts/Bench/Forge/Exercises)
- **Removed:** Unused Only toggle
- **Removed:** Selected exercises chips + Clear All
- **Kept:** Summary cards, duration distribution, workout type breakdown, section type breakdown, Top Exercises with category filters
- Component reduced from 579 → ~260 lines

### 5. Top Exercises Bug Fix
- Was filtering from `statistics.movementFrequency` (pre-sliced top 50 overall)
- Category filter showed fewer results at longer timeframes because high-frequency exercises dominated the top 50
- Fix: Filter from `allMovementFrequency`, then slice to 50 after filtering

### 6. Section Types Fixes
- Fixed `Finisher/Bonus` → `Finisher/Bonus!` (missing exclamation mark)
- Added `Warm-up` and `Cool Down` to tracked section types
- Now 8 types: Warm-up, Skill, Gymnastics, Strength, Olympic Lifting, Finisher/Bonus!, Accessory, Cool Down

### 7. Section Type Cards Redesign
- Changed from grid cards to 4-column compact grid (2 rows of 4)
- Dark slate colour scheme (bg-slate-700, border-slate-600, text-slate-200/400)
- Clearly non-interactive info cards

### 8. Category Chips Styling
- Light teal background (bg-teal-100) for unselected state
- Differentiates from exercise chips below

## Files Modified
- `components/coach/analysis/PlannerSection.tsx` — 12-month lookback on exercise frequency
- `components/coach/analysis/StatisticsSection.tsx` — Major cleanup, removed search/library/movement-type sections
- `app/coach/analysis/page.tsx` — Removed redundant props, fixed top exercises filtering, fixed section types
- `supabase/migrations/20260308000000_add_plan_items_indexes.sql` — NEW

## Future Ideas
- Add "Section Type" dropdown filter to coach dashboard Workouts page (filter workouts by Finisher/Bonus!, etc.)

## Status
- Migration applied
- No new dependencies
