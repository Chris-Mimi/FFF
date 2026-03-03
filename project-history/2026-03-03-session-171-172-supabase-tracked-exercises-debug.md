# Session 171-172: Supabase Tracked Exercises, Global Last-Programmed, Debug

**Date:** 2026-03-03
**AI:** Claude Opus 4.6

---

## Session 171 — Memory Bank Update (from Session 170 handoff)

Committed 4 files from previous session's handoff summary:
- `lib/exercise-storage.ts` — Supabase-backed `useTrackedExercises` hook, removed localStorage functions
- `hooks/coach/useMovementTracking.ts` — `globalLastProgrammed` state + computation + return
- `components/coach/MovementTrackingPanel.tsx` — new prop + amber "last programmed" header row
- `components/coach/SearchPanel.tsx` — pass `globalLastProgrammed`, sidebar 240px

**Commit:** `feat(session-171): Supabase tracked exercises, global last-programmed row, sidebar width`

---

## Session 172 — Debug: Exercise Not Appearing in Search

### Issue Reported
Exercise "Weight Plate Deep Squat 90° Hold + Hand Signal" didn't appear in:
1. Workouts search panel text search
2. Custom Movements tracking

### Investigation

**Initial hypothesis:** The `+` symbol in exercise names — `movement-extraction.ts:218` splits on `+` and `,` to handle lines like "3 Clean + Jerk". This would split the exercise name into two fragments that don't match.

**Finding:** User changed `+` to `with` in the display_name. Still didn't work.

**Deeper investigation:** Added temporary console.log to `useCoachData.ts` search function. Key finding:
- Query only returned **26 sessions** instead of the full ~128
- Only 1 session contained "Battle Rope" instead of 6

**Root cause:** User had a **member filter** active in the sidebar, which narrowed the query results via the `bookings` join. Not a code bug.

### Movement Extraction `+` Split
The `+` split in `movement-extraction.ts:218` is intentional for separating exercises on the same line (e.g., "Clean + Jerk"). Exercises with `+` in their names should use "with" instead in the database `display_name` field to avoid being split. User updated 10 exercises accordingly.

### Additional Note
`excludeWords` in `movement-extraction.ts` includes `'with'` — this could affect word-by-word fallback matching (line 311) but doesn't affect the primary `findMatchingExercise` path which matches full text against known exercise names.

### Files Changed
- `hooks/coach/useCoachData.ts` — temporary debug logging added and removed (no net change)

---

## Migration Applied (from Session 171)
- `supabase/migrations/20260303000000_add_coach_tracked_exercises.sql` — `coach_tracked_exercises` table with RLS + index, 8 initial rows
