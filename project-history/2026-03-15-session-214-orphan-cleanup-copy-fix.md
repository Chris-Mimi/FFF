# Session 214 — Orphan Workout Cleanup + Copy Bug Fix (2026-03-15)

**Model:** Claude Opus 4.6

## Accomplishments

1. **Diagnostic script updated** — Added `orphan_wods` check to `Data Integrity and Orphan duplicate diagnostics`. Initially used wrong criteria (date+session_type+workout_name grouping), corrected to check for wod rows not referenced by any weekly_session.

2. **Orphan workout cleanup** — Deleted 85 orphan workout rows from database. Three root causes identified:
   - **Copy/drag overwrite**: Old workout was unpublished but not deleted, leaving orphan rows
   - **Delete session**: Session deleted but linked workout not cleaned up
   - **Double-click save**: Already fixed in Session 213

3. **Copy workflow bug fix** — `handleCopyWOD` in `useWODOperations.ts` had multiple issues:
   - `.maybeSingle()` threw errors when duplicate sessions existed at same date/time, causing cascading orphan creation
   - Old workouts were deleted without checking if other sessions still referenced them
   - No duplicate session cleanup during copy operations

4. **Delete session fix** — `handleDeleteSession` now checks if the linked workout is still referenced by other sessions before deleting it.

## Files Changed
- `hooks/coach/useWODOperations.ts` — Major rework of `handleCopyWOD` (duplicate-safe session lookup, orphan-safe workout deletion, duplicate session cleanup) + `handleDeleteSession` (orphan workout cleanup)
- `Chris Notes/Forge app documentation/Data Integrity and Orphan duplicate diagnostics` — Added `orphan_wods` check
- `memory-bank/memory-bank-activeContext.md` — Updated

## Key Decisions
- Replaced `.maybeSingle()` with `.select()` + array handling — prevents throws on duplicate sessions
- Old workout deletion now checks session references first — only deletes true orphans
- Copy flow auto-cleans duplicate sessions found at same date/time (keeps first, deletes rest)

## Bugs Found During Session
- Copying a workout to a day that already had sessions could create duplicate session rows at the same time slot
- Once duplicates existed, every subsequent copy created more orphan workouts (cascading failure)
- The aggressive delete fix from earlier in the session (deleting old workouts without checking references) could break sessions that shared a workout

## Next Session
- **CRITICAL: Test copy workflow thoroughly** — Copy published workout to another day, copy multiple times, verify no orphans or duplicate sessions. Run diagnostic SQL after each test.
- Coach library optimization (Equipment & Body Parts lists)
