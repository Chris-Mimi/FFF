# Session 239 — Leaderboard Sibling WOD Sync Fix

**Date:** 2026-03-24
**AI:** Opus 4.6
**Status:** "Almost correct" per Chris — needs testing next session

---

## Goal

Fix leaderboard not showing new sections/scores when coach edits an existing workout with multiple class times.

## Root Cause

Independent WOD copies (one per class time) diverge when coach edits only one copy. Leaderboard dedup (`session_type + workout_name`) picks an arbitrary copy — often the unedited one. This is why:
- Workout Card works (loads the specific WOD from booking)
- Logbook works (queries by specific WOD ID)
- Leaderboard fails (dedup picks different/unedited copy)
- Saturday copy works (only one WOD row, no dedup conflict)

## Files Changed

| File | Change |
|:---|:---|
| `hooks/coach/useWODOperations.ts` | After WOD save, syncs `sections`/`coach_notes`/`workout_name` to all sibling WODs with same `session_type` + `date` |
| `components/athlete/LeaderboardView.tsx` | Dedup picks WOD with most leaderboard items. Tracks sibling WOD IDs. Content + lift whiteboard queries use all sibling IDs. |

## Key Decisions

- **Sync on save** rather than merge on read — keeps data consistent, simpler than complex leaderboard merging
- **Dedup prefers most items** — even before sync propagates, the edited WOD (with more sections) is preferred
- **Sibling ID tracking** — ensures scores stored against any copy are found in leaderboard queries
