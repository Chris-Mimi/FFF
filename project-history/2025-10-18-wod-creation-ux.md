# WOD Creation UX & Database-Driven Features (v2.8-2.10)

**Date:** October 18, 2025
**Versions:** 2.8, 2.9, 2.10

## Summary
Refactored workout creation interface with database-driven section types, improved exercise library, and smart section insertion logic.

## Key Features Completed

### v2.8 - Database Section Types & Exercise Library
- Moved Workout Type dropdown to section headers (removed from top form)
- Created `section_types` table with dynamic ordering
- Made Exercise Library draggable/resizable with 4-corner handles
- Responsive 2-4 column layout for exercises
- Sections now insert after currently expanded section

### v2.9 - Search Panel Enhancements
- Dynamic movement extraction from WOD content using regex
- Fixed Workout Type filter to use section-level `workout_type_id`
- Added section exclusion filters (hide Warm-up, etc.)
- WOD hover preview popover in search results
- Moved Cancel Copy button to navigation bar
- Fixed React hooks order violation in ExerciseLibraryPopup

### v2.10 - UX Refinements
- Hover preview adjusted to 75% width, left-aligned
- Smart section insertion based on database display_order
- Renamed all user-facing "WOD" text to "Workout"
- Changed default sections to [Warm-up, WOD, Cool Down]
- Fixed section time display (1-12, 13-27 instead of 0-12, 12-27)

## Database Changes
- Created `section_types` table
- Replaced hardcoded SECTION_TYPES array with DB-driven approach

## Files Modified
- `components/WODModal.tsx`
- `app/coach/page.tsx`
- `supabase-section-types.sql`

## Technical Notes
- Display order allows flexible section sequencing
- Exercise library stays open for multiple selections
- Drag-and-drop supports moving sections from search into workouts
