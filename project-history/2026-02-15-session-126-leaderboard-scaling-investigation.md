# Session 126 — Leaderboard Scaling Bug Investigation

**Date:** 2026-02-15
**Model:** Opus 4.6

## Root Cause Found

The leaderboard scaling bug from Session 125 was caused by **stray `wod_section_results` records** under WODs the user is NOT booked into.

### How strays were created
- The pre-Session-125 save bug (`saveAllResults` iterating all accumulated `sectionResults`) created records under multiple `wod_id`s for the same section
- Multiple WODs on the same date share **identical section IDs** (because sections are copied with the same IDs when the coach schedules the same workout for multiple class time slots)
- Example: "Strict Movements" on 2025-12-03 has 3 WOD instances. User is booked into 1 (session 17:15, wod 9d4a6926). But results existed under all 3 wod_ids.

### How strays caused the leaderboard bug
1. Leaderboard groups WODs by `workout_name` → queries across all wod_ids
2. Query returns multiple results for same user (1 per stray wod_id)
3. `bestResultPerUser` picks one — often the STRAY (with old scaling) instead of the real result

### Scale of the problem
- **33 stray records** out of 65 total `wod_section_results` (50% of table is garbage)
- All strays are under WODs with NO session or NO confirmed booking
- Strays span dates: 2025-12-01, 2025-12-03, 2025-12-27, 2026-01-11, 2026-01-14, 2026-01-16, 2026-02-09

## Code Changes Applied

### 1. `components/athlete/AthletePageLogbookTab.tsx`
- `loadSectionResultsWrapper` now filters loaded results to only include entries for WODs the user is booked into (`bookedWodIds` set from `workouts` state)
- Prevents stray records from polluting `sectionResults` state

### 2. `utils/leaderboard-utils.ts`
- Added `workout_date` field to `RawSectionResult` interface
- `bestResultPerUser` now breaks ties (equal scores) by preferring the most recent `workout_date`

### 3. `components/athlete/LeaderboardView.tsx`
- Added `workout_date` to the content section DB query (needed for tie-breaking)

### 4. New diagnostic/cleanup scripts
- `scripts/find-grouped-results.ts` — find all results for a specific section_id
- `scripts/check-booking-vs-results.ts` — cross-reference results with sessions/bookings
- `scripts/cleanup-stray-results.ts` — find and delete stray results (dry run by default, `--delete` flag to execute)

## NOT YET DONE — Next Session MUST Do

### 1. Run the cleanup (CRITICAL)
```bash
npx tsx scripts/cleanup-stray-results.ts --delete
```
This deletes 33 stray records. Run backup first (`npm run backup`).

### 2. Test the fix
- Navigate to a date with a grouped workout in the Logbook
- Change scaling, save
- Switch to Leaderboard → scaling should now reflect correctly
- Verify no new stray records are created

### 3. Verify `loadSectionResultsWrapper` filter works
- The filter depends on `workouts` state (booked WODs) being available when loading
- The useEffect that triggers loading already depends on `workouts` so this should be safe
- But test to confirm no data loss (existing results still load correctly)

### 4. Consider deeper section ID uniqueness
- Multiple WODs on the same date share identical section IDs (from JSONB copy)
- This is a data model issue: section IDs should ideally be unique per WOD instance
- For now, the booking filter + `bestResultPerUser` tie-breaking handle this
- Post-deploy: consider generating unique section IDs per WOD instance

## Key Files
- `components/athlete/AthletePageLogbookTab.tsx` (loadSectionResultsWrapper filter)
- `utils/leaderboard-utils.ts` (bestResultPerUser tie-breaking)
- `components/athlete/LeaderboardView.tsx` (workout_date in query)
- `scripts/cleanup-stray-results.ts` (cleanup script)
