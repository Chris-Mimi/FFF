# Session 240 — Revert Sibling Sync + Logbook Investigation

**Date:** 2026-03-24
**AI:** Opus 4.6
**Status:** Sync reverted, data restored, logbook bugs identified

---

## Critical Incident: Sibling WOD Sync Overwrote Data

Session 239 added a sync in `useWODOperations.ts` that on WOD save, updated ALL sibling WODs matching `session_type + date`. The assumption was wrong — same session_type + date does NOT mean same workout. Different class times (10:00, 11:00, 17:15, 18:30) can have completely different workouts.

**Impact:** Saving one workout overwrote all others on the same date with the same session_type.
**Fix:** Removed sync code entirely from `useWODOperations.ts` (lines 52-65).
**Data recovery:** Restored `wods` table from 2026-03-23 backup using new single-table restore script.

## Non-RM Lift Logbook Investigation

Full data flow traced across Score Entry → API → Logbook load → UI render.

### Finding 1: Coach-entered scores DO appear in athlete logbook
- Coach save → `wod_section_results` (section_id: `sec-content-0`) + `lift_records` (lift_name + rep_scheme)
- Logbook load → `loadLiftResultsToSection()` reads `lift_records` → creates `:::lift-0` key
- UI reads `:::lift-0` key → displays weight_result

### Finding 2: RLS is NOT blocking the .or() query
- Coach save sets `user_id` = athlete's auth ID (resolved via email). RLS `user_id = auth.uid()` matches.
- The `member_id` part of `.or()` is redundant but harmless.

### Finding 3: Rep scheme format is consistent
- `useScoreEntry.ts:getNonRmLift()` and `loadingLogic.ts:loadLiftResultsToSection()` use identical format.

### Bug Found: Athlete self-save missing wod_section_results
- `AthletePageLogbookTab.tsx` line 188: `:::lift-` items only call `saveLiftRecord()` → `lift_records`
- Does NOT save to `wod_section_results` → scores won't appear on leaderboard

### Bug Found: Coach scoring fields invisible for lift sections
- Coach enters time/reps/rounds via Score Entry → stored in `wod_section_results` under `:::content-0` key
- Lift section UI (line 463) only reads `:::lift-0` key → extra scoring fields invisible
- Line 434: `if (hasStructuredItems) return null;` skips `:::content-0` rendering for lift sections

## Files Changed

| File | Change |
|:---|:---|
| `hooks/coach/useWODOperations.ts` | Removed sibling sync code (lines 52-65) |
| `scripts/restore-single-table.ts` | New script for single-table backup restore |

## Cleanup
- Pruned old backups: 71MB → 17MB, kept 2025-12-09 baseline + last 6 recent dates
