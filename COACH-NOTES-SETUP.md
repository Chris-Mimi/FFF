# Coach Notes Feature - Setup Instructions

## Database Migration Required

**IMPORTANT:** Before using the Coach Notes feature, you must run the SQL
migration in Supabase.

### Steps:

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `supabase-wods-coach-notes.sql`
4. Copy and paste the SQL into the Supabase SQL Editor
5. Click **Run** to execute the migration

### What the migration does:

- Adds `coach_notes` column (TEXT) to the `wods` table
- Creates full-text search indexes on `coach_notes` and `title` for fast
  searchability
- Enables you to search WODs by notes, title, sections, track, and workout type

## Feature Overview

### Coach Notes Button

- Every WOD card now has a **FileText icon** button (visible on hover)
- Click to open the Coach Notes side panel

### Side Panel Features

- Large textarea for detailed notes
- Auto-saves to database when you click "Save Notes"
- Shows workout preview (title, date, class times, sections, duration)
- Slides in from the right side of the screen

### WOD Modal Integration

- Coach Notes field added to the WOD creation/edit modal
- Located between "Max Capacity" and "Workout Sections"
- Notes are saved when you create or edit a WOD

### Searchability (Future)

All WOD data is now fully searchable:

- Title
- Sections content (JSONB)
- Coach notes
- Track name
- Workout type

This prepares the system for a WOD search feature that will let you find
workouts by any field and drag-drop them into the calendar.

## Usage Tips

Use Coach Notes to record:

- Athlete feedback ("Athletes loved this WOD, scale down weights next time")
- Scaling options used ("Most athletes needed 15kg barbells instead of 20kg")
- Time management ("Ran 5 minutes over, reduce warm-up next time")
- Equipment setup details ("Need 12 boxes and 12 jump ropes")
- Modifications made ("Changed from running to rowing due to weather")

These notes are **private** and will help you quickly find and reference
workouts in the future.
