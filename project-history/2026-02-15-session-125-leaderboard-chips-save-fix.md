# Session 125 — Leaderboard Chip Labels + Save Bug Fix

**Date:** 2026-02-15
**Model:** Opus 4.6

## Accomplishments

### 1. Leaderboard Chip Labels — Exercise Names
**Problem:** Content-only section chips showed generic type like "WOD Pt.2 - Max Reps (2m)" instead of the exercise name.

**Fix:** Added `extractExerciseSummary()` function in `LeaderboardView.tsx` (line 80-99) that:
- Parses first exercise name from `section.content` free-form text
- Strips bullet markers (`* `, `- `, `• `)
- Skips header lines (AMRAP, EMOM, rounds, etc.)
- Skips scaling description lines (`Sc1:`, `(Sc2:`, `Rx:`)
- Strips rep counts and weight notations
- Falls back to `section.type` if content empty/unparseable
- Added `content?: string` to local `WodSection` interface

**Result:** "Jump Rope Double-Under (DU) - Max Reps" instead of "WOD Pt.3 - Max Reps"

### 2. Save Bug — Phantom Records
**Problem:** `saveAllResults` in `AthletePageLogbookTab.tsx` iterated ALL entries in `sectionResults` state, which accumulates across every date the user visits (never cleared). This caused:
- "43 results saved" when only 19 input boxes existed
- Phantom records in `wod_section_results` with wrong `workout_date`
- Potential scaling/result corruption from stale data

**Root cause:** `sectionResults` state merges new results via `{ ...prev, ...newResults }` on every date navigation but never clears old entries. The save function's section-ID check passed for workouts sharing section IDs (like multiple class sessions of "The Ghost").

**Fix:** In `saveAllResults`:
- Build `validWodIds` set from all workouts matching the save date
- Filter `resultsToSave` to only include entries whose `wodId` is in `validWodIds`
- Use `entryWorkout` (matched by wodId) instead of first `currentWorkout` for section validation

### 3. DB Cleanup — 10 Phantom Records Deleted
- All phantom records were "The Ghost" (wod_date=2025-12-01, result_date=2025-12-03)
- Verified 0 phantoms remaining, 65 clean results
- Scripts: `scripts/check-phantom-results.ts`, `scripts/cleanup-phantom-results.ts`

## Unresolved Issues

### Leaderboard Scaling Not Updating
- User changes scaling (Rx→Sc3) in Logbook, saves successfully, but Leaderboard still shows old value
- Code analysis shows save logic and leaderboard query both include `scaling_level`
- `saveSectionResult` upserts with `scaling_level: result.scaling_level || null`
- Leaderboard queries `scaling_level` and maps to `scalingLevel` in entries
- Phantom records were cleaned up but issue persists
- **Next step:** Add console.logs to verify DB writes and reads. Check if `bestResultPerUser` drops scaling. Verify actual DB value via authenticated query.

## Files Changed
- `components/athlete/LeaderboardView.tsx` — chip label extraction, bullet/scaling line parsing
- `components/athlete/AthletePageLogbookTab.tsx` — save filter by current date WOD IDs
- `scripts/check-phantom-results.ts` — diagnostic script (new)
- `scripts/cleanup-phantom-results.ts` — cleanup script (new)
- `scripts/check-ghost-scaling.ts` — diagnostic script (new)
