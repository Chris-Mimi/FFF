# Session 173: Search Panel UX, Workout Dedup, Scalability Indexes

**Date:** 2026-03-04
**AI:** Claude Opus 4.6

---

## Changes

### 1. Athletes Filter — Selected-to-Top + Kids Section
**Files:** `hooks/coach/useCoachData.ts`, `components/coach/SearchPanel.tsx`

- `fetchMembers` now selects `date_of_birth` from members table
- New `useMemo` splits members into `adultMembers` (16+) and `kidMembers` (<16)
- Selected members sort to top of each list for easy deselection
- "Kids" section appears below Athletes (only when kids exist), with own clear button
- Main "Athletes" clear button still clears all selections

### 2. Custom Movements Alphabetical Sort
**File:** `lib/exercise-storage.ts`

- `addTracked()` now sorts by display_name after adding
- `loadTracked()` sorts alphabetically on initial load (was ordered by created_at)

### 3. Workout Deduplication (Bi-Weekly Window)
**Files:** `utils/movement-analytics.ts`, `utils/movement-extraction.ts`, `hooks/coach/useCoachData.ts`, `app/coach/analysis/page.tsx`

**Problem:** Same workout_name appearing across multiple sessions (different times, session types, adjacent weeks) was counted multiple times. E.g., "Handstand Hold" showed 19 results instead of 7 unique workouts.

**Solution:** Deduplication key uses `workout_name + bi-weekly period`:
- ISO weeks grouped in pairs: W10+W11→W10, W12+W13→W12
- Same workout_name within 2-week window = 1 unique occurrence
- Regardless of session_type (WOD/Foundations/Endurance)
- Workouts without a name fall back to date-based uniqueness

**Applied to:**
- `getWorkoutKey()` in movement-analytics.ts (Analysis page)
- `extractMovements()` in movement-extraction.ts (Search panel movement counts)
- Analysis page `calculateStatistics` dedup
- Search results (via toggle, see below)

### 4. Unique/All Results Toggle
**File:** `components/coach/SearchPanel.tsx`

- Toggle button next to "Results (N)" header
- **Unique** (default, teal): shows deduplicated results
- **All** (plain): shows every session for finding specific Coach Notes
- Movement counts in sidebar always use deduped logic regardless of toggle

### 5. Movement Tracking Without Athletes
**Files:** `hooks/coach/useMovementTracking.ts`, `components/coach/MovementTrackingPanel.tsx`

**Problem:** Movement Tracking Panel required athletes to be selected. Global last-programmed dates weren't computed without athletes.

**Solution:**
- Separated `computeGlobal()` from `computeTracking()` — runs independently
- `computeGlobal()` fetches ALL published wods to find last-programmed dates
- Panel now renders with header + global last-programmed row even without athletes
- Removed "Select athletes" empty state message

### 6. Performance Indexes Migration
**File:** `supabase/migrations/20260304000000_add_performance_indexes.sql`

Scalability audit identified missing indexes. Created migration with 7 indexes:
- `idx_bookings_member_id` — bookings(member_id)
- `idx_bookings_session_id` — bookings(session_id)
- `idx_bookings_status` — bookings(status)
- `idx_bookings_member_status` — bookings(member_id, status) composite
- `idx_wods_workout_publish_status` — wods(workout_publish_status)
- `idx_weekly_sessions_date` — weekly_sessions(date)

**Status:** Pending application in Supabase SQL Editor (Supabase login down at session close)

### Scalability Notes
- App will work fine at 2 years (~3,000 sessions, ~35,000 bookings)
- Indexes are the highest-impact fix (prevent full table scans)
- Future optimization: refactor `fetchWODs()` to use server-side aggregation instead of downloading all bookings on page load
