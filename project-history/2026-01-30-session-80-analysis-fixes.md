# Session 80: Analysis Page Deduplication & Section Type Statistics

**Date:** 2026-01-30
**Model:** Sonnet 4.5
**Session Type:** Bug fixes, UI optimization, data integrity improvements

---

## Overview

This session focused on fixing duplicate counting issues in the Analysis page, implementing workout deduplication logic, adding section type statistics, and improving mobile UI. The root cause investigation revealed orphaned database records and missing data integrity constraints, which were addressed at both application and database levels.

---

## Primary Issues Fixed

### 1. Duplicate Movement Counting (Karen 3x → 1x)

**Issue:**
- Searching "Karen" in Analysis tab showed 3 occurrences
- User confirmed it should show 1 (same workout repeated 3x in the week with naming convention "TGU, Gymnastics & 'Karen'")

**Root Cause Investigation:**
- Movement analytics queried directly from `wods` table
- Database contained orphaned workout records (3 separate wod records for the same workout)
- Analysis page query was missing `workout_name` and `workout_week` fields
- `workout_week` was NULL for Jan 26 workouts

**Solution:**
1. Changed all 4 frequency functions to query from `weekly_sessions` instead of `wods`
2. Added filter for `workout_publish_status === 'published'`
3. Added `workout_name` and `workout_week` to Analysis page query
4. Implemented workout deduplication using `workout_name + workout_week` as unique identifier

**Files Changed:**
- `utils/movement-analytics.ts` (all 4 frequency functions)
- `app/coach/analysis/page.tsx`

**Deduplication Logic:**
```typescript
const uniqueWorkouts = new Map<string, WOD>();
wods.forEach(wod => {
  const workoutKey = wod.workout_name && wod.workout_week
    ? `${wod.workout_name}_${wod.workout_week}`
    : wod.date;
  if (!uniqueWorkouts.has(workoutKey)) {
    uniqueWorkouts.set(workoutKey, wod);
  }
});
```

---

### 2. Selected Exercise Count Fix (0x → Correct Count)

**Issue:**
- Selected exercise info button showing 0x count for benchmarks/lifts

**Root Cause:**
- Code was using legacy `exerciseFrequency` instead of new `allMovementFrequency`

**Solution:**
- Changed to use `allMovementFrequency`
- Added `MovementFrequencyItem` interface

**Files Changed:**
- `components/coach/analysis/StatisticsSection.tsx`

---

### 3. Track/Type Breakdown Deduplication (6x → 2x)

**Issue:**
- Benchmark Workouts showing 6x instead of 2x in track breakdown

**Root Cause:**
- Statistics calculation not deduplicating workouts before counting

**Solution:**
- Applied same `workout_name + workout_week` deduplication logic before counting tracks and types

**Files Changed:**
- `app/coach/analysis/page.tsx`

---

### 4. Workout Week Auto-Calculation (Root Cause Prevention)

**Issue:**
- NULL `workout_week` values caused orphaned records and counting issues

**User Requirement:**
- "Fix the underlying cause, not just a workaround"

**Solution:**
Implemented auto-calculation at two levels:

**Application Level:**
- Added `calculateWorkoutWeek()` function to `utils/date-utils.ts`
- Updated `useWODOperations.ts` to auto-calculate on save

**Database Level:**
- Created database trigger to auto-calculate on INSERT/UPDATE
- Migration: `supabase/migrations/20260130_add_workout_week_trigger.sql`

**ISO Week Calculation:**
```typescript
export const calculateWorkoutWeek = (date: Date): string => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayOfWeek = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek);
  const isoYear = d.getUTCFullYear();
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4DayOfWeek = jan4.getUTCDay() || 7;
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4 + (4 - jan4DayOfWeek)));
  const weekNo = Math.floor((d.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  return `${isoYear}-W${String(weekNo).padStart(2, '0')}`;
};
```

**Database Trigger:**
```sql
CREATE OR REPLACE FUNCTION calculate_workout_week()
RETURNS TRIGGER AS $
BEGIN
  NEW.workout_week := TO_CHAR(NEW.date, 'IYYY') || '-W' || TO_CHAR(NEW.date, 'IW');
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_workout_week_before_save ON wods;

CREATE TRIGGER set_workout_week_before_save
  BEFORE INSERT OR UPDATE ON wods
  FOR EACH ROW
  EXECUTE FUNCTION calculate_workout_week();

UPDATE wods
SET workout_week = TO_CHAR(date, 'IYYY') || '-W' || TO_CHAR(date, 'IW')
WHERE workout_week IS NULL;
```

**Files Changed:**
- `utils/date-utils.ts`
- `hooks/coach/useWODOperations.ts`
- `supabase/migrations/20260130_add_workout_week_trigger.sql` (NEW)

---

## Feature Additions

### 5. Total vs Unique Workouts

**User Request:**
- Add separate counts for "Total Workouts" (all published instances) and "Total Unique Workouts" (distinct designs)

**Implementation:**
- Total Workouts: Count all published wod instances
- Unique Workouts: Count deduplicated workouts (by workout_name + workout_week)
- Changed summary cards from 3-column to 4-column grid (2-column on mobile)

**User Clarification:**
- "Sessions are not the same as Published Workouts and should not be counted as such"
- Confirmed implementation correctly counts published workouts, not raw sessions

**Files Changed:**
- `app/coach/analysis/page.tsx`
- `components/coach/analysis/StatisticsSection.tsx`

---

### 6. Section Type Usage Statistics

**User Request:**
- Track usage of section types: Skill, Gymnastics, Strength, Olympic Lifting, Finisher/Bonus, Accessory
- Include total duration for each section type

**Implementation:**
```typescript
const targetSectionTypes = ['Skill', 'Gymnastics', 'Strength', 'Olympic Lifting', 'Finisher/Bonus', 'Accessory'];
const sectionTypeCounts: Record<string, number> = {};
const sectionTypeDurations: Record<string, number> = {};

deduplicatedWods.forEach(wod => {
  wod.sections.forEach(section => {
    if (targetSectionTypes.includes(section.type)) {
      sectionTypeCounts[section.type] = (sectionTypeCounts[section.type] || 0) + 1;
      if (section.duration) {
        const duration = parseInt(section.duration);
        if (!isNaN(duration)) {
          sectionTypeDurations[section.type] = (sectionTypeDurations[section.type] || 0) + duration;
        }
      }
    }
  });
});
```

**Display:**
- Shows count (e.g., "12x")
- Shows total duration if > 0 (e.g., "120m")

**Files Changed:**
- `app/coach/analysis/page.tsx`
- `components/coach/analysis/StatisticsSection.tsx`

---

## UI Improvements

### 7. Exercise Library Panel Mobile Optimization

**Issue:**
- Library panel disappeared off screen on mobile
- Library button covered by filter dropdown

**Solution:**
- Moved Library button above search box
- Made panel mobile-responsive:
  - Mobile: Full-screen modal with backdrop
  - Desktop: Original draggable/resizable behavior preserved
- 2-column grid on mobile with compact text sizes

**Files Changed:**
- `components/coach/analysis/ExerciseLibraryPanel.tsx`

---

### 8. Workout Library Track Counts Discrepancy (63 → 51)

**Issue:**
- Workout Library showing 63 total workouts
- Analysis page showing 51 workouts

**Root Cause:**
- Library counted all workouts (published + unpublished)

**Solution:**
- Filter `fetchTracksAndCounts()` to only published workouts

**Files Changed:**
- `hooks/coach/useCoachData.ts`

---

### 9. Workout Type Counts on Load

**Issue:**
- Workout Types not showing counts when library opens
- Tracks showed counts immediately, but Workout Types were empty until search

**Root Cause:**
- Counts calculated from `searchResults` (empty until search)

**Solution:**
- Calculate workout type counts in `fetchTracksAndCounts()`
- Store in state
- Pass through component hierarchy: `useCoachData → app/coach/page.tsx → SearchPanel`

**Files Changed:**
- `hooks/coach/useCoachData.ts`
- `app/coach/page.tsx`
- `components/coach/SearchPanel.tsx`

---

## Technical Patterns

### Deduplication Pattern
```typescript
const workoutKey = wod.workout_name && wod.workout_week
  ? `${wod.workout_name}_${wod.workout_week}`
  : wod.date;
```

### Query from weekly_sessions (not wods)
```typescript
let query = supabase
  .from('weekly_sessions')
  .select('date, wods(id, date, workout_name, workout_week, sections, workout_publish_status)');

const workouts = sessions
  ?.filter((s: any) => s.wods !== null && s.wods.workout_publish_status === 'published')
  .map((s: any) => ({...})) || [];
```

### ISO Week Calculation
- UTC-based to match PostgreSQL
- Jan 4 always in Week 1
- Thursday determines which week a date belongs to

---

## Errors and Fixes

### TypeScript Error: Property 'allMovementFrequency' does not exist
**Fix:** Added `MovementFrequencyItem` interface and `allMovementFrequency` field to `Statistics` interface

### Syntax Error: Missing closing div tag
**Fix:** Removed duplicate Library button code and properly closed the search input div

### Database Error: Trigger already exists
**Fix:** Updated migration to use `DROP TRIGGER IF EXISTS` before creating trigger

---

## User Feedback

**Key Quotes:**
- "Did you fix the underlying cause or make a workaround? I mean why are there duplicate/unpublished records in the first place?"
- "It should work correctly so it doesn't create these 'orphans' in the future"
- "Sessions are not the same as Published Workouts and should not be counted as such"

**Naming Convention:**
- User explicitly stated their naming convention ensures same workouts have the same workout_name
- This allows reliable deduplication using workout_name + workout_week

---

## Files Modified

### Core Logic
1. `app/coach/analysis/page.tsx` - Deduplication, section type stats, total/unique counts
2. `utils/movement-analytics.ts` - Query from weekly_sessions, published filter
3. `utils/date-utils.ts` - ISO week calculation function
4. `hooks/coach/useWODOperations.ts` - Auto-calculate workout_week on save
5. `hooks/coach/useCoachData.ts` - Track/type counts, published filter

### UI Components
6. `components/coach/analysis/StatisticsSection.tsx` - Fixed exercise count, new interfaces, section type display
7. `components/coach/analysis/ExerciseLibraryPanel.tsx` - Mobile responsive
8. `components/coach/SearchPanel.tsx` - Workout type counts prop
9. `app/coach/page.tsx` - Pass workout type counts

### Database
10. `supabase/migrations/20260130_add_workout_week_trigger.sql` (NEW) - Auto-calculate workout_week trigger

---

## Pending Actions

**Database Migration:**
- User needs to apply `20260130_add_workout_week_trigger.sql` to production via Supabase Dashboard

---

## Key Learnings

1. **Always investigate root causes** - User pushed back on workarounds, wanted underlying issues fixed
2. **Data integrity at multiple levels** - Application + database triggers for redundancy
3. **Query from views/joined tables** - `weekly_sessions` provides better data integrity than direct `wods` access
4. **Deduplication keys** - `workout_name + workout_week` provides reliable unique identifier
5. **ISO week calculations** - Must use UTC-based logic to match PostgreSQL behavior
6. **Mobile-first design** - Full-screen modals on mobile, draggable panels on desktop

---

## Session Metrics

- **Duration:** ~2 hours
- **Files Changed:** 10
- **Migrations Created:** 1
- **Bugs Fixed:** 5
- **Features Added:** 4
- **Context Usage:** ~50%
