# Session 159b — Google Calendar Duplicate Events Fix

**Date:** 2026-02-25
**Model:** Opus 4.6

---

## Accomplishments

1. **Google Calendar duplicate events fix:**
   - **Root cause:** When copying a workout to a session slot that already had a published workout, the old wod's Google Calendar event was never deleted. The old wod record became orphaned (no `weekly_sessions` row pointing to it) but its Calendar event persisted.
   - **Fix:** `handleCopyWOD()` now checks if the target session slot has an existing workout with a `google_event_id`, and calls the unpublish endpoint to delete the Calendar event before proceeding with the copy.

2. **Copy resets publish status:**
   - Previously, copied workouts carried `is_published: true` and `workout_publish_status: 'published'` from the source — but without `google_event_id`. This caused every publish of the copy to create a new Calendar event instead of updating.
   - Fix: Copied workouts now always start as `draft` / `is_published: false`.

---

## Files Changed

- `hooks/coach/useWODOperations.ts` — Added `authFetch` import, Calendar event cleanup before copy, reset publish status on copy

---

## Key Decision

- Used the existing unpublish API endpoint (`DELETE /api/google/publish-workout`) for cleanup rather than calling Google Calendar API directly from the client. This keeps all Calendar logic server-side and reuses existing auth/error handling.
