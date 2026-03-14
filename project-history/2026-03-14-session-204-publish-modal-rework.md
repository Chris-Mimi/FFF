# Session 204 — Publish Modal Rework + Athlete Display Fixes

**Date:** 2026-03-14
**AI:** Claude Opus 4.6

## Accomplishments

### 1. Publish Modal Decoupled (Google Calendar vs Athlete App)
- Google Calendar now always receives ALL sections (full workout description)
- Checkboxes in publish modal control only which sections athletes see in their app
- Duration auto-calculates from all sections (not just checked ones)
- Added explanatory note: "All sections are always published to Google Calendar. Checked sections are shown in the athlete app."
- **Files:** `components/coach/PublishModal.tsx`, `app/api/google/publish-workout/route.ts`

### 2. Athlete Workout Tab Bug Fix — session-* UUID Poisoning
- **Root cause:** When a booking exists for a session with no linked WOD, a fallback ID `session-{sessionId}` was generated. This non-UUID string was included in `.in('wod_id', workoutIds)` query to `wod_section_results`, causing a PostgreSQL error (`22P02: invalid input syntax for type uuid`) that broke the ENTIRE results fetch for the week.
- **Fix:** Filter out `session-*` IDs before querying results.
- **Impact:** This was a latent bug that surfaced when a session without a workout existed in the same week as scored sessions.
- **File:** `components/athlete/AthletePageWorkoutsTab.tsx`

### 3. Unpublished Workout Filter
- Athlete workout tab now filters out workouts where `is_published = false`
- Previously, unpublished workouts with confirmed bookings would still show on athlete side
- **File:** `components/athlete/AthletePageWorkoutsTab.tsx`

### 4. Coach Score Entry — Live Tested
- Confirmed coach-entered scores appear correctly in athlete Workout tab
- Green "Your Result" box displays time, reps, weight, scaling, etc.

## Key Decisions
- Score query button (athlete disputes) deprioritized — not a priority
- Logbook page left as-is — may be removed entirely once coach score entry flow proves out
- Publish flow redesigned: Google Calendar always gets full workout, checkboxes = athlete visibility only

## Files Changed
| File | Change |
|:-----|:-------|
| `components/coach/PublishModal.tsx` | Duration uses all sections, added explanatory note |
| `app/api/google/publish-workout/route.ts` | Google Calendar uses all sections |
| `components/athlete/AthletePageWorkoutsTab.tsx` | Filter session-* IDs, filter unpublished, is_published check |
