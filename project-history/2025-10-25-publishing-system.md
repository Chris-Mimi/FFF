# Google Calendar Publishing System (v2.19-2.22)

**Date:** October 25, 2025
**Versions:** 2.19, 2.20, 2.21, 2.22

## Summary
Implemented workout publishing system with Google Calendar integration, athlete workout views, and database-driven workout titles.

## Key Features Completed

### v2.19 - Publishing Foundation
- Added publishing columns to wods table (is_published, publish_sections, google_event_id, publish_time, publish_duration)
- Publishing Modal with section checkboxes, time picker (30-min increments), duration selector
- Event preview before publishing
- Athlete Workouts Tab with weekly calendar view
- Google Calendar API endpoints (POST/DELETE) with service account auth
- Setup documentation created

### v2.20 - Bug Fixes
- Made Google Calendar optional (database updates always succeed, Google sync optional)
- Fixed publish_sections schema (INTEGER[] → TEXT[] for section type names)
- Fixed timezone bug in athlete workouts (removed toISOString())
- Fixed greyed out text styling in athlete workouts tab

### v2.21 - Publish/Unpublish Workflow
- Added is_published field to coach page queries for "P" badge display
- Corrected all SQL field names to match TypeScript
- Complete publish/unpublish flow with auto-refresh
- Updated AthleteWorkoutsTab field names
- Added is_published filter to athlete logbook

### v2.22 - Database-Driven Titles
- Moved hardcoded workout titles to Supabase `workout_titles` table
- Fixed session generation timezone bug (UTC offset causing 1-day shift)
- Auto-publish weekly_sessions when saving linked WODs

## Database Changes
- `supabase-publishing-columns.sql`
- `supabase-workout-titles.sql`
- Field name corrections (published → is_published, etc.)

## Files Modified
- `components/PublishModal.tsx`
- `components/WODModal.tsx`
- `components/AthleteWorkoutsTab.tsx`
- `app/athlete/page.tsx`
- `app/coach/page.tsx`
- `app/coach/schedule/page.tsx`
- `app/api/google/publish-workout/route.ts`
- `app/api/sessions/generate-weekly/route.ts`

## Technical Notes
- Location: Bergwerkstrasse 10, Pforzen
- Timezone: Europe/Berlin
- Google Calendar setup pending (requires manual configuration)
- Environment variables: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_CALENDAR_ID
