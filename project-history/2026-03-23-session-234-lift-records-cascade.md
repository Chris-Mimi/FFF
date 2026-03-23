# Session 234 — Lift Records CASCADE Cleanup + Validation Toast

**Date:** 2026-03-23
**AI:** Claude Opus 4.6 (Claude Code)
**Focus:** Fix orphaned lift_records on WOD delete + improve save validation UX

---

## What Was Done

### 1. Lift Records CASCADE on WOD Delete

**Problem:** When a WOD was deleted, `wod_section_results` were cleaned up (FK CASCADE), but `lift_records` auto-created by the RM test feature (Session 233) were orphaned — they had no link back to the source WOD.

**Fix:** Added `wod_id` column to `lift_records` with `REFERENCES wods(id) ON DELETE CASCADE`. Now:
- Score Entry auto-save stores `wod_id` on both insert and update of lift_records
- When a WOD is deleted, PostgreSQL CASCADE auto-deletes linked lift_records
- Manually entered lift records (`wod_id = NULL`) are unaffected

### 2. Validation Toast on Save

**Problem:** Clicking the save tick on the Workout Modal with missing required fields (Title, Workout Name) showed red borders but no toast — invisible if user had scrolled down.

**Fix:** Added `toast.error()` showing the first validation error message in `validate()`.

### Files Changed

- `supabase/migrations/20260323000001_add_wod_id_to_lift_records.sql` — New migration: adds `wod_id` FK + partial index
- `app/api/score-entry/save/route.ts` — Store `wod_id` on lift_records insert and update
- `hooks/coach/useWorkoutModal.ts` — Added toast on validation failure

### Key Design Decisions

- **Nullable `wod_id`** — Manually entered lift records (via athlete app) have no WOD source, so `wod_id` must be nullable
- **Partial index** — `WHERE wod_id IS NOT NULL` since most lift_records won't have a wod_id
- **Toast shows first error only** — Avoids multiple toasts stacking; red borders still show all errors
