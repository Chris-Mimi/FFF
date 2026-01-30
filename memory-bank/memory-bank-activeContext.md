# Active Context

**Version:** 10.35
**Updated:** 2026-01-30 (Session 80 - Analysis Deduplication + Section Stats)

---

## ⚠️ CRITICAL RULES

| Rule | Detail |
|:---|:---|
| **Mandate** | Read `memory-bank/workflow-protocols.md` BEFORE any work |
| **Database Safety** | Run `npm run backup` BEFORE any migration or risky change |
| **Agent Use** | Use Agent for 3+ step tasks, multi-file changes, bug investigations |
| **Efficiency** | Target: Keep sessions under 50% context usage |
| **Context Monitoring** | 50%/60%/70%: Alert. 80%: STOP, finish current task, ask for Memory Bank update |

---

## 🎯 Project Overview

**Goal:** CrossFit gym management app with WOD creation, analysis, member booking system, and athlete performance tracking.

**Tech Stack:**
- Next.js 15 App Router + TypeScript + Tailwind
- Supabase (PostgreSQL) with RLS enabled
- Supabase Auth (signup/login/logout)
- Recharts for progress visualization
- Metric units enforced (kg, cm, meters)

---

## 🗄️ Data Models (Core Schema)

```
Users (Supabase Auth)
├─ auth.users (id, email)

Coach Tables
├─ wods (id, date, session_type: TEXT, workout_name: TEXT, workout_week: TEXT, sections: JSONB [content, lifts[], benchmarks[], forge_benchmarks[], scoring_fields], is_published, publish_time, publish_sections, publish_duration, google_event_id, coach_notes: TEXT, title: TEXT [DEPRECATED - use session_type])
├─ section_types (id, name, display_order)
├─ workout_types (id, name)
├─ workout_titles (id, title)
├─ exercises (id, name [UNIQUE], display_name, category, subcategory, equipment[], body_parts[], difficulty, is_warmup, is_stretch, search_terms, search_vector [GIN indexed])
├─ user_exercise_favorites (id, user_id, exercise_id, created_at [UNIQUE user_id + exercise_id])
├─ naming_conventions (id, category [equipment|movementTypes|anatomicalTerms|movementPatterns], abbr, full_name, notes)
├─ resources (id, name, description, url, category)
├─ tracks (id, name, description, color)
├─ weekly_sessions (id, date, time, workout_id, capacity, status)
├─ benchmark_workouts (id, name, type, description, display_order, has_scaling)
├─ forge_benchmarks (id, name, type, description, display_order, has_scaling)
├─ barbell_lifts (id, name, category, display_order)
├─ programming_notes (id, user_id, title, content [markdown], folder_id, created_at, updated_at)
├─ note_folders (id, user_id, name, display_order, created_at, updated_at)

Member Tables
├─ members (id, email, name, status, membership_types[], account_type: primary|family_member, primary_member_id, display_name, date_of_birth, relationship)
├─ bookings (id, session_id, member_id, status: confirmed|waitlist|cancelled|no_show|late_cancel)

Athlete Tables (linked to members.id)
├─ athlete_profiles (id, user_id, full_name, emergency_contact)
├─ workout_logs (id, user_id, wod_id, result, notes)
├─ benchmark_results (id, user_id, benchmark_id, forge_benchmark_id [XOR], benchmark_name, benchmark_type, result_value, scaling_level, result_date)
├─ lift_records (id, user_id, lift_name, weight_kg, reps, rep_max_type ['1RM'|'3RM'|'5RM'|'10RM'], rep_scheme [workout patterns], calculated_1rm, notes, lift_date)
├─ wod_section_results (id, user_id, wod_id, section_id, workout_date, time_result, reps_result, weight_result, scaling_level, rounds_result, calories_result, metres_result, task_completed)
```

**Workout Naming System (Session 49/50/52):**
- `wods.session_type` - Replaces title (WOD, Foundations, Kids & Teens, etc.)
- `wods.workout_name` - Optional name for tracking repeated workouts (e.g., "Overhead Fest", "Fran")
- `wods.workout_week` - ISO week format YYYY-Www (e.g., "2025-W50"), auto-calculated from date
- Unique workout identifier: `workout_name + workout_week` (NULL workout_name falls back to date)
- Index: `idx_wods_workout_name_week` on (workout_name, workout_week)
- **ISO Week Calculation:** UTC-based to match PostgreSQL (Jan 4 always in Week 1, Thursday determines week)

---

## 📍 Current Status (Last 2 Weeks)

**Completed (2026-01-30 Session 80 - Sonnet):**
- **✅ Analysis Page Deduplication Fix:**
  - Fixed duplicate movement counting (Karen showing 3x instead of 1x when same workout repeated in week)
  - Root cause: Movement analytics queried directly from `wods` table with orphaned records
  - Solution: Changed all 4 frequency functions to query from `weekly_sessions` with published filter
  - Added workout deduplication using `workout_name + workout_week` as unique identifier
  - File: utils/movement-analytics.ts (all 4 frequency functions)
- **✅ Selected Exercise Count Fix:**
  - Fixed selected exercise info button showing 0x count for benchmarks/lifts
  - Changed from using `exerciseFrequency` to `allMovementFrequency`
  - File: components/coach/analysis/StatisticsSection.tsx
- **✅ Track/Type Breakdown Deduplication:**
  - Fixed track breakdown showing inflated counts (6x Benchmark Workouts instead of 2x)
  - Applied deduplication logic before counting tracks and workout types
  - File: app/coach/analysis/page.tsx
- **✅ Workout Week Auto-Calculation:**
  - Prevented future NULL workout_week values
  - Application level: Added `calculateWorkoutWeek()` in useWODOperations.ts
  - Database level: Created trigger to auto-calculate on INSERT/UPDATE
  - Migration: supabase/migrations/20260130_add_workout_week_trigger.sql
  - Utility: utils/date-utils.ts (calculateWorkoutWeek function)
- **✅ Total vs Unique Workouts:**
  - Added separate counts: Total Workouts (all published instances) vs Unique Workouts (distinct designs)
  - Changed summary cards from 3-column to 4-column grid (2-column on mobile)
  - File: app/coach/analysis/page.tsx, components/coach/analysis/StatisticsSection.tsx
- **✅ Section Type Usage Statistics:**
  - Added breakdown showing usage counts for: Skill, Gymnastics, Strength, Olympic Lifting, Finisher/Bonus, Accessory
  - Includes total duration tracking for each section type
  - File: app/coach/analysis/page.tsx
- **✅ Exercise Library Panel Mobile Optimization:**
  - Made library panel mobile-responsive with full-screen modal
  - 2-column grid on mobile with compact text sizes
  - Moved Library button above search box to prevent overlap
  - File: components/coach/analysis/ExerciseLibraryPanel.tsx
- **✅ Workout Library Track Counts Fix:**
  - Fixed discrepancy between Library (63 workouts) and Analysis (51 workouts)
  - Root cause: Library counted all workouts (published + unpublished)
  - Solution: Filter `fetchTracksAndCounts()` to only published workouts
  - File: hooks/coach/useCoachData.ts
- **✅ Workout Type Counts on Load:**
  - Fixed Workout Types not showing counts when library opens
  - Added `workoutTypeCounts` calculation in `fetchTracksAndCounts()`
  - Counts now display immediately for both Tracks and Workout Types
  - Files: hooks/coach/useCoachData.ts, app/coach/page.tsx, components/coach/SearchPanel.tsx
- See: `project-history/2026-01-30-session-80-analysis-fixes.md`

**Completed (2026-01-30 Session 79 - Opus):**
- **✅ Athlete Profile Images on Coach Athletes Tab:**
  - Fixed profile images not displaying despite being uploaded
  - Added avatar_url to AthleteProfile interface
  - Added avatar_url to Supabase query select
  - Updated UI to display images in both list and detail views
  - File: app/coach/athletes/page.tsx
- **✅ Analysis Tab Mobile Optimization:**
  - Header/controls stack vertically on mobile
  - Timeframe selector: compact week dropdown (1W-8W), shorter month labels (3M, 6M, 12M)
  - Date navigation: smaller buttons, narrower display
  - Summary cards: 3-column grid with smaller text
  - Duration distribution: 4-column grid on mobile
  - Movement type filters: shorter labels (Bench, Forge)
  - Search section: stacks vertically on mobile
  - Track breakdown: smaller elements
  - Workout type grid: 3-column on mobile
  - Top exercises: smaller pills
  - File: components/coach/analysis/StatisticsSection.tsx
- **✅ Mobile Category Name Mapping:**
  - Added MOBILE_CATEGORY_NAMES mapping for shorter category labels
  - Warm-up & Mobility → Warm-up
  - Olympic Lifting & Barbell Movements → Oly Lift
  - Compound Exercises → Compound
  - Gymnastics & Bodyweight → Gymnastics
  - Core, Abs & Isometric Holds → Core & Iso
  - Cardio & Conditioning → Cardio
  - Recovery & Stretching → Recovery
  - Strength & Functional Conditioning → Strength
  - File: components/coach/analysis/StatisticsSection.tsx
- **✅ Date Range Picker Mobile Centering:**
  - Fixed popup not centered on mobile screens
  - Mobile: Centered modal with backdrop, tap outside to close
  - Desktop: Original positioned/draggable popup preserved
  - File: components/coach/analysis/DateRangePicker.tsx
- See: `project-history/2026-01-30-session-79-analysis-mobile-avatar-fix.md`

**Completed (2026-01-29 Session 78 - Opus):**
- **✅ Coach Dashboard Mobile Optimization:**
  - Fixed CoachNotesPanel syntax error (missing closing fragment tag `</>`)
  - Changed "Add Section" button text to "+ Section" (WorkoutModal.tsx)
  - SearchPanel now full-screen on mobile (`w-full lg:w-[800px]`)
  - MovementLibraryPopup full-screen on mobile with isMobile state detection
- **✅ MovementLibraryPopup Mobile Display:**
  - Added window resize listener for mobile detection (`< 1024px`)
  - Mobile: Full-screen overlay with `inset-0`, no inline positioning
  - Desktop: Original draggable/resizable behavior preserved
  - Hidden resize handle on mobile
  - Disabled drag functionality on mobile
  - File: components/coach/MovementLibraryPopup.tsx
- **✅ SearchPanel Mobile Display:**
  - Made Workout Library panel full-screen on mobile
  - Responsive width: `w-full lg:w-[800px]`
  - File: components/coach/SearchPanel.tsx
- **✅ Movement Library Search Fix:**
  - Fixed "rings" matching "hamstrings" (substring match issue)
  - Added `matchesWordBoundary()` helper with regex `\b` word boundaries
  - Applied to exercises, lifts, benchmarks, and forge benchmarks search
  - File: components/coach/MovementLibraryPopup.tsx
- **✅ Exercise Video Modal Mobile Display:**
  - Fixed video appearing zoomed in on mobile (800x600px exceeded screen)
  - Mobile: Full-screen overlay with `inset-0`
  - Desktop: Original draggable/resizable behavior preserved
  - File: components/coach/ExerciseVideoModal.tsx
- See: `project-history/2026-01-29-session-78-coach-mobile-optimization.md`

**Completed (2026-01-29 Session 77 - Sonnet):**
- **✅ Book a Class Tab Navigation Refinement:**
  - Removed "Previous Week"/"Next Week" text labels (arrow icons only)
  - Reduced week date range font size: text-sm (mobile), text-lg (desktop)
  - Changed back button from TrendingUp icon to ChevronLeft arrow
  - Button text changed from "Athlete Page" to "back"
  - File: app/member/book/page.tsx
- **✅ Add Family Member Button Optimization:**
  - Reduced button size from px-3 py-1 to px-2 py-0.5
  - Shortened text from "+ Add Family Member" to "+ Family"
  - Added whitespace-nowrap to prevent wrapping
  - File: app/member/book/page.tsx
- **✅ Book a Class Filter Buttons:**
  - Added "All" and "Booked" filter toggle buttons
  - Default view shows all sessions ("All")
  - "Booked" filter shows only confirmed/waitlist bookings
  - Filter persists during week navigation
  - Empty state message when no booked sessions
  - File: app/member/book/page.tsx
- **✅ Published Workouts Tab Header Cleanup:**
  - Removed large header section with Calendar icon and title
  - Simplified to compact navigation bar matching other tabs
  - Week date label font: text-sm (mobile), text-lg (desktop)
  - Removed unused Calendar import
  - File: components/athlete/AthletePageWorkoutsTab.tsx
- **✅ Whiteboard Tab Date Display:**
  - Navigation header shows date range: "12 Jan - 18 Jan 2026"
  - Photo card header shows: "2026 Week 3 (5 photos)"
  - Added helper functions: getWeekDateRange(), getWeekLabel()
  - File: components/athlete/AthletePagePhotosTab.tsx
- **✅ Athlete Logbook Variable Rep Display:**
  - Variable rep lifts now display on 2 lines in day view
  - Line 1: Lift name + reps (e.g., "≡ Back Squat 10-6-5-5-5-5-5")
  - Line 2: Percentages (e.g., "@ 40-50-60-70-80-85-90%")
  - Same font size (text-xs) for both lines to prevent screen overflow
  - File: components/athlete/AthletePageLogbookTab.tsx (lines 1141-1156)
- See: `project-history/2026-01-29-session-77-mobile-ui-refinements.md`

**Completed (2026-01-29 Session 76 - Sonnet):**
- **✅ Athlete Page Mobile Optimization:**
  - Header layout: Stacks vertically on mobile, side-by-side on desktop
  - Tab navigation: Icon above label on mobile, side-by-side on desktop
  - Shortened tab names for mobile readability (Logbook, Benchmarks, Forge, Lifts, Records, Security)
  - Hidden scroll arrows on mobile (md:block)
  - Added proper touch targets (min-h-[44px])
  - Responsive text sizing throughout
  - Files: app/athlete/page.tsx, app/layout.tsx (viewport meta)
- **✅ Workouts Tab Mobile Optimization:**
  - Mobile compact view: Header + title only
  - Desktop view: Full details unchanged
  - Responsive grid: 1 col mobile → 5 cols XL
  - Date navigation: Stacks on mobile with responsive sizing
  - Added workout_name field to interface and SQL
  - File: components/athlete/AthletePageWorkoutsTab.tsx
- **✅ Logbook Navigation Standardization:**
  - Updated Day/Week/Month navigation to match Workouts tab style
  - Rounded-full buttons with size 24 chevrons
  - Added title attributes (Previous Day, Next Day, etc.)
  - Responsive gap spacing (gap-2 md:gap-3)
  - Responsive text sizing (text-sm md:text-lg)
  - File: components/athlete/AthletePageLogbookTab.tsx
- **✅ Whiteboard Tab Navigation:**
  - Arrow-only navigation (no text labels) matching Workouts tab
  - File: components/athlete/AthletePagePhotosTab.tsx
- **✅ Time Display Without Seconds:**
  - Removed seconds from all time displays in Workouts tab
  - Applied .slice(0, 5) to show HH:MM format
  - Locations: card header, booked workouts, event time
  - File: components/athlete/AthletePageWorkoutsTab.tsx
- See: `project-history/2026-01-29-session-76-athlete-mobile-optimization.md`

**Completed (2026-01-28 Session 75 - Sonnet):**
- **✅ Coach Notes in Calendar Popover:**
  - Added coach notes section to workout hover popover (monthly & weekly views)
  - Displays below sections with pale teal background (bg-teal-50)
  - Only shows when notes exist, preserves formatting
  - File: components/coach/CalendarGrid.tsx (lines 376-382)
- **✅ Workout Library Modal Notes Styling:**
  - Changed coach notes background from yellow (bg-yellow-50) to pale teal (bg-teal-50)
  - Matches calendar popover styling
  - File: components/coach/SearchPanel.tsx (line 599)
- **✅ Notes Indicator on Workout Cards:**
  - Added small "N" indicator on cards when coach notes exist
  - Pale teal background (bg-teal-50) with darker teal text
  - Clickable - opens workout modal with notes panel automatically
  - Files:
    - components/coach/CalendarGrid.tsx (lines 204-216)
    - hooks/coach/useWorkoutModal.ts (added initialNotesOpen parameter)
    - components/coach/WorkoutModal.tsx (passes initialNotesOpen to hook)
    - app/coach/page.tsx (openEditModalWithNotes handler)
- **✅ Removed Published Icon:**
  - Removed 📊 icon from workout cards
  - Card color (dark teal) already indicates published status
  - File: components/coach/CalendarGrid.tsx
- See: `project-history/2026-01-28-session-75-coach-notes-calendar-indicator.md`

**Completed (2026-01-26 Session 74 - Opus):**
- **✅ Whiteboard Photos in Athlete Logbook Tab:**
  - Added whiteboard photos section at bottom of Logbook tab
  - Photos fetched for current week based on selected date
  - 2-column grid with click-to-enlarge modal
  - Files: components/athlete/AthletePageLogbookTab.tsx
- **✅ Photo Navigation Arrows (All Photo Modals):**
  - Added prev/next navigation arrows to all whiteboard photo modals
  - Navigation only shows when >1 photo, wraps at ends
  - Added photo counter (e.g., "2 / 5") to modal footer
  - Files updated:
    - components/athlete/AthletePageWorkoutsTab.tsx (Published Workouts)
    - components/athlete/AthletePageLogbookTab.tsx (Athlete Logbook)
    - components/athlete/AthletePagePhotosTab.tsx (Whiteboard tab)
    - components/coach/WhiteboardGallery.tsx (Coach Whiteboard)
- **✅ Renamed "Whiteboard Photos" → "Whiteboard":**
  - Tab label in app/athlete/page.tsx
  - Section headers in AthletePagePhotosTab, AthletePageLogbookTab, AthletePageWorkoutsTab
- **✅ Fixed TypeScript Error:**
  - Fixed pre-existing type error: section.duration type check
  - File: components/athlete/AthletePageLogbookTab.tsx (line 943)
- See: `project-history/2026-01-26-session-74-whiteboard-logbook-navigation.md`

**Completed (2026-01-25 Session 73 - Opus):**
- **✅ Whiteboard Upload Cross-Browser Fix:**
  - Issue: "Choose Photo Files" button not working on Mimi's Chrome profile
  - Root cause: Programmatic `.click()` on hidden file input blocked by browser
  - Solution: Overlay invisible input over styled button (direct click, not programmatic)
  - Added group-hover for visual feedback
  - File: components/coach/WhiteboardUploadPanel.tsx
- **✅ Whiteboard Photos Ordering:**
  - Changed from display_order/created_at to photo_label ordering
  - Photos now display in date order (Week 49.1, Week 49.2, etc.)
  - File: app/api/whiteboard-photos/route.ts
- **✅ Add Section Reliability Improvement:**
  - Issue: First click on "Add Section" sometimes failed to detect active section
  - Root cause: lastExpandedSectionId not updated when clicking inside textarea
  - Solution: Update lastExpandedSectionId in handleTextareaInteraction
  - File: hooks/coach/useWorkoutModal.ts
  - **Note:** Still intermittent - may need additional focus handlers on other inputs
- Commit: d339d80e
- Files: 3 changed
- See: `project-history/2026-01-25-session-73-whiteboard-cross-browser-fix.md`

**Completed (2026-01-24 Session 72 - Opus):**
- **✅ Multi-File Upload for Whiteboard Photos:**
  - Added `multiple` attribute to file input for batch uploads
  - Preview grid shows all selected photos before upload
  - Progress indicator shows upload status (e.g., "Uploading 3/5...")
  - Auto-numbering for labels when multiple files (e.g., "Photo 1", "Photo 2")
  - File: components/coach/WhiteboardUploadPanel.tsx
- **✅ Auto-Parse Week from Filename:**
  - Parses filenames like "2025 week 49.1" to extract week info
  - Auto-assigns photos to correct week (e.g., "2025-W49")
  - Auto-generates label from filename (e.g., "Week 49.1")
  - Falls back to selected week if filename doesn't match pattern
- **✅ Week Navigation for Coach Whiteboard:**
  - Added Previous/Today/Next buttons to browse weeks
  - Photos now display for any selected week, not just current
  - File: app/coach/whiteboard/page.tsx
- **✅ Photo Card & Modal Improvements:**
  - Cards now scrollable within container (top-justified)
  - Grid changed from 3 columns to 2 columns for better viewing
  - Modals improved: click backdrop to close, better image sizing
  - Fixed greyed-out edit input boxes (added text-gray-900)
  - Applied to both Coach and Athlete Whiteboard views
  - Files: WhiteboardGallery.tsx, AthletePagePhotosTab.tsx, AthletePageWorkoutsTab.tsx
- Commit: (pending)
- Files: 5 changed
- See: `project-history/2026-01-24-session-72-whiteboard-upload-improvements.md`

**Completed (2026-01-23 Session 71 - Sonnet):**
- **✅ Athlete Page Tab Navigation UX:**
  - Fixed runtime error: "Cannot access 'tabs' before initialization"
  - Implemented clickable chevron buttons for tab scrolling
  - Added overscroll-contain to prevent swipe-back navigation
- **✅ Whiteboard Photos Tab (Athlete View):**
  - Created new tab showing weekly whiteboard photos
  - Week-based navigation with photo grid and full-screen modal
- Commit: 2c24416
- See: `project-history/2026-01-23-session-71-whiteboard-photos-tab-nav.md`

**Completed (2026-01-22 Session 70 - Opus):**
- **✅ Synology Drive Sync Crisis Resolution:**
  - Discovered 241 conflict folders from infinite sync loop
  - Root cause: node_modules file locking during npm reinstall + Synology sync
  - Cleaned up conflicts from local machine and Synology Drive server
  - Found 354,045 files in manual backups folder (10 copies with node_modules)
  - Removed node_modules/.next/.git from all 10 manual backups
  - Configured Synology Drive to exclude: node_modules, .next, .git
  - Key learning: `.synologyignore` does NOT work - use Synology Drive Client settings
  - Manual backup size: 869MB → 10MB per backup (exclude regeneratable folders)
- **✅ Benchmark Display Fix - Logbook Results:**
  - Issue: Benchmark results recorded via Logbook not showing on Benchmark Workouts cards
  - Root cause: Logbook saved to time_result/reps_result/weight_result, cards displayed result_value
  - API fix: Now populates result_value when saving for backwards compatibility
  - Display fix: Cards check time_result/reps_result/weight_result as fallbacks
  - Files:
    - app/api/benchmark-results/route.ts (lines 86-94, 104, 128)
    - components/athlete/AthletePageBenchmarksTab.tsx (lines 155, 447, 504, 710)
- Commit: (pending)
- Files: 2 changed
- See: `project-history/2026-01-22-session-70-synology-benchmark-fix.md`

**Completed (2026-01-18 Session 69 - Sonnet):**
- **✅ Configure Lift Modal - Variable Reps Defaults:**
  - Changed default from 1 set (5 reps) to 7 sets
  - Default values: 10, 6, 5, 5, 5, 5, 5 reps @ 40, 50, 60, 70, 80, 85, 90%
  - Applied to both initial state and reset-to-defaults logic
  - File: components/coach/ConfigureLiftModal.tsx (lines 37-45, 100-108)
- **✅ Configure Lift Modal - Per-Row Delete Buttons:**
  - Added X icon delete button on each row in variable reps table
  - Removed "Remove Set" button (obsolete)
  - Delete function re-numbers remaining sets after deletion
  - Disabled when only 1 set remains
  - Files: components/coach/ConfigureLiftModal.tsx (lines 4, 146-154, 405-414, 421-428)
- **✅ Configure Lift Modal - "Add to Section" Text Color:**
  - Fixed greyed-out dropdown text
  - Added `text-gray-900` class to select element
  - File: components/coach/ConfigureLiftModal.tsx (line 235)
- **✅ Unlimited Capacity (0) Support:**
  - **Database Migration:** Created migration to allow capacity >= 0 (was >= 1)
  - **Validation:** Updated validateCapacity() to accept 0 as unlimited
  - **Session Info Panel:**
    - Display shows "Unlimited" when capacity is 0
    - Input min changed from '1' to '0'
    - Added helper text "0 = unlimited"
  - **Session Management Modal:**
    - Confirmed bookings header shows "X/∞" when capacity is 0
  - **Manual Booking Panel:**
    - Shows "Unlimited spots available" when capacity is 0
  - **Calendar Booking Badge:**
    - Capacity 0 always shows green (not red)
    - Display shows "X/∞" instead of "X/0"
    - Tooltip shows "unlimited" instead of "0 capacity"
  - Files:
    - supabase/migrations/20260118_allow_unlimited_capacity.sql (NEW)
    - lib/coach/sessionCapacityHelpers.ts (lines 19-26)
    - components/coach/SessionInfoPanel.tsx (lines 115-145)
    - components/coach/SessionManagementModal.tsx (line 252)
    - components/coach/ManualBookingPanel.tsx (lines 55-59)
    - components/coach/CalendarGrid.tsx (lines 218-233)
- Commit: (pending)
- Files: 7 changed + 1 migration
- See: `project-history/2026-01-18-session-69-lift-modal-unlimited-capacity.md`

**Completed (2026-01-17 Session 68 Continuation - Sonnet):**
- **✅ Google Calendar Zero Duration Display:**
  - Hidden duration/time info from Google Calendar events when section duration is 0
  - Conditionally show `${duration} mins (${startMin}-${endMin})` only when duration > 0
  - File: app/api/google/publish-workout/route.ts (lines 157-159)
- **✅ Unlimited Max Capacity Option:**
  - Added 0 = unlimited capacity option for workout sessions
  - Changed input min from '1' to '0' in WorkoutFormFields
  - Updated validation to accept 0-30 range (was 1-30)
  - Added helper text: "0 = unlimited capacity"
  - Files:
    - components/coach/WorkoutFormFields.tsx (lines 104, 113)
    - hooks/coach/useWorkoutModal.ts (lines 667-668)
- **✅ Unlimited Section Duration Input:**
  - Removed max='60' constraint from duration input field
  - Allows coaches to enter any number of minutes (no longer limited to 60)
  - No complications - duration is just arithmetic for running time calculations
  - File: components/coach/WODSectionComponent.tsx (line 159)
- **✅ Comprehensive Database Backup Script:**
  - **CRITICAL UPGRADE:** Expanded from 10 tables to 22 tables
  - Changed from anon key to service role key (bypasses RLS for complete backup)
  - Added 12 missing tables: members, bookings, athlete_profiles, programming_notes, note_folders, and more
  - Organized into categories: Movement/Workout Definitions (10), Programmed Workouts (2), User/Membership Data (3), Athlete Performance (4), Coach Tools (3)
  - Successfully tested: 879 records across 22 tables backed up
  - File: scripts/backup-critical-data.ts (lines 16-26, 78-117)
  - **RESOLVED:** Known issue from activeContext (line 432-436) about RLS limitation
- Commit: (pending)
- Files: 5 changed
- See: `project-history/2026-01-16-session-68-ui-fixes-google-calendar.md` (to be updated)

**Completed (2026-01-16 Session 68 - Sonnet):**
- **✅ Programming Notes Hyperlink Styling:**
  - Fixed hyperlinks in Programming Notes tab to show light blue color with bold on hover
  - Used ReactMarkdown custom components instead of Tailwind prose classes
  - Added text-gray-900 to preview, search box, and title input to fix greyed-out text
  - File: components/coach/ProgrammingNotesTab.tsx (lines 726-743)
- **✅ Variable Rep Lift Percentage Display:**
  - Fixed percentage display to show ALL percentages when every set has a value defined
  - Changed from showing first percentage only to showing all: "40-40-50-50-50-50-50%"
  - Applied across all components: WODSectionComponent, CalendarGrid, AthletePageLogbookTab, AthletePageWorkoutsTab
  - Only shows percentages if ALL sets have them defined (no undefined/null values)
  - Files:
    - components/coach/WODSectionComponent.tsx (lines 28-43)
    - components/coach/CalendarGrid.tsx (lines 17-36)
    - components/athlete/AthletePageLogbookTab.tsx (lines 50-69)
    - components/athlete/AthletePageWorkoutsTab.tsx (lines 98-117)
    - app/api/google/publish-workout/route.ts (lines 126-141)
- **✅ Google Calendar Event Title Format:**
  - Changed to use workout.title (session type) instead of workout.session_type
  - Fixed titles showing "WOD" instead of actual types like "Kids & Teens" or "Foundations"
  - Root cause: Database stores type in `title` field, not `session_type` field
  - File: app/api/google/publish-workout/route.ts (lines 285-289)
- **✅ Family Member Workout Results RLS:**
  - Fixed "row-level security policy violation" when family members save workout results
  - Root cause: Foreign key constraints referenced auth.users table, but family members only exist in members table
  - Changed foreign key constraints to reference members(id) instead of auth.users(id)
  - Applied to wod_section_results, lift_records, benchmark_results tables
  - File: supabase/migrations/20260116_add_wod_section_results_family_rls.sql
  - Example family members: Cody (85d9ec49...), Neo (8e4d1ad3...) under primary account 84280ec0...
- **✅ Section Duration "0" Display Fix:**
  - Hidden "0 min" display for sections with 0 duration (e.g., "Whiteboard Intro")
  - Changed condition to only show duration when `(section.duration > 0)`
  - Applied to both Athlete Logbook and Athlete Workouts tabs
  - Files:
    - components/athlete/AthletePageLogbookTab.tsx (line 943)
    - components/athlete/AthletePageWorkoutsTab.tsx (line 481)
- Commit: (pending)
- Files: 9 changed + 1 migration
- See: `project-history/2026-01-16-session-68-ui-fixes-google-calendar.md`

**Completed (2026-01-14 Session 67 - Sonnet):**
- **✅ Programming Notes Tab - Coach Library:**
  - Added full-featured note-taking system for workout planning and reference
  - Features:
    - CRUD operations for notes with title, markdown content, timestamps
    - Folder organization with create, rename, delete operations
    - Drag-and-drop notes between folders and "Unfiled" section
    - Search functionality filtering by title and content
    - Collapsible folder sections with note counts
    - Preview mode with ReactMarkdown rendering (remarkGfm, rehypeRaw)
    - Edit mode with formatting toolbar (bold, italic, underline, lists, headings)
    - Right-click context menu for quick folder moves
  - Database schema:
    - programming_notes table (id, user_id, title, content, folder_id, timestamps)
    - note_folders table (id, user_id, name, display_order, timestamps)
    - RLS policies restrict to coaches only
    - Cascading delete: folder deletion sets notes.folder_id to NULL
  - Libraries: @dnd-kit/core for drag-and-drop, ReactMarkdown for preview
  - Files:
    - components/coach/ProgrammingNotesTab.tsx (complete implementation)
    - supabase/migrations/20260114_add_programming_notes.sql
    - supabase/migrations/20260114_add_note_folders.sql
    - app/coach/benchmarks-lifts/page.tsx (added "Programming Notes" tab)
  - Bug fixes after auto-compaction:
    - Restored missing closing paren in folder map return statement
    - Removed remarkBreaks plugin causing double line breaks in preview
- Commit: (pending)
- Files: 3 changed + 2 migrations
- See: `project-history/2026-01-14-session-67-programming-notes.md`

**Completed (2026-01-13 Session 66 - Sonnet):**
- **✅ Google Calendar Event Title Format:**
  - Changed title format from "Workout Name - Date" to "Workout Name - Session Type"
  - Example: "Overhead Fest - WOD" instead of "Overhead Fest - Thu, 28 Dec"
  - File: app/api/google/publish-workout/route.ts
  - Changes:
    - Line 70: Added session_type to Workout interface
    - Line 101: Added session_type to query
    - Line 267: Changed event summary to use session_type instead of date
- **✅ Google Calendar Running Time Display:**
  - Added cumulative running time to section headers in calendar events
  - Format: "Section Name X mins (start-end)"
  - Example: "Warm-up 12 mins (1-12)", "Gymnastics 16 mins (13-28)", "WOD 20 mins (29-48)"
  - File: app/api/google/publish-workout/route.ts
  - Changes:
    - Line 146: Updated formatSectionToHTML() signature with startMin/endMin params
    - Lines 211-221: Added cumulative time calculation before formatting
- **✅ Workout Library Search - Regex Escape Fix:**
  - Fixed crash when typing special regex characters (parentheses, brackets)
  - Issue: "Uncaught SyntaxError: Invalid regular expression: /(()/gi: Unterminated group"
  - Solution: Added escapeRegex() helper to escape special characters before creating RegExp
  - File: utils/search-utils.ts
  - Changes:
    - Lines 6-8: Added escapeRegex() helper function
    - Line 21: Escape search terms before creating RegExp
- **✅ Workout Library Search - Phrase Matching:**
  - Changed search from word-by-word to exact phrase matching
  - Issue: "Toes to Bar (s" found workouts with "toes" separately, not the phrase
  - Solution: Treat entire query as single phrase instead of splitting by spaces
  - Files:
    - hooks/coach/useCoachData.ts (lines 219-246): Changed from searchTerms array to searchPhrase
    - components/coach/SearchPanel.tsx (line 406): Pass entire query as single-item array
- **✅ Workout Library Search - Include workout_name Field:**
  - Added workout_name to search text alongside title, coach_notes, and section content
  - File: hooks/coach/useCoachData.ts (lines 226, 237, 241)
- Commit: (pending)
- Files: 3 changed (publish-workout route.ts, search-utils.ts, useCoachData.ts, SearchPanel.tsx)
- See: `project-history/2026-01-13-session-66-google-calendar-search-fixes.md`

**Completed (2026-01-12 Session 65 - Sonnet):**
- **✅ Athlete Workouts Tab - Weekly Selector Fix:**
  - Issue: "Today" button jumping to wrong week (11 Jan showed 12-18 Jan instead of 6-12 Jan)
  - Root cause: Week calculation treating Sunday as start of next week instead of end of current week
  - Solution: Fixed getWeekDates() to handle Sunday correctly (go back 6 days to find Monday)
  - File: components/athlete/AthletePageWorkoutsTab.tsx (lines 239-253)
  - Formula: `const diff = day === 0 ? -6 : 1 - day`
- **✅ Athlete Workouts Tab - Results Display Order:**
  - Issue: Results showing "Reps" before "Rounds" (incorrect priority)
  - Solution: Swapped display order to Time → Rounds → Reps → Weight → Calories → Distance
  - File: components/athlete/AthletePageWorkoutsTab.tsx (lines 494-495)
- **✅ Schedule Page - Week Generation Buttons:**
  - Renamed "Generate Next Week" → "Next Week" (purple button)
  - Added "Current Week" button (blue button) - generates sessions from Monday of current week
  - Both buttons use same date calculation logic (consistent with Athlete tab fix)
  - Files: app/coach/schedule/page.tsx
    - Lines 226-277: Added handleGenerateCurrentWeek() and refactored handleGenerateWeek()
    - Lines 397-414: Added both buttons to header
- **✅ Schedule Page - Toggle Scroll Jump Fix:**
  - Issue: Page jumping to top when toggling template/title active/inactive
  - Solution: Preserve scroll position with requestAnimationFrame after state update
  - Files: app/coach/schedule/page.tsx
    - Lines 200-214: handleToggleActive() preserves scroll
    - Lines 387-401: handleToggleTitleActive() preserves scroll
- Commit: (pending)
- Files: 2 changed (AthletePageWorkoutsTab.tsx, schedule/page.tsx)
- See: `project-history/2026-01-12-session-65-athlete-workouts-schedule-fixes.md`

**Completed (2026-01-11 Session 64 - Sonnet):**
- **✅ Supabase DNS Resolution Fix:**
  - Issue: "Failed to fetch" error on login - DNS resolution failed
  - Root cause: Supabase free tier auto-pauses projects after 7 days of inactivity
  - DNS records removed for paused projects (NXDOMAIN globally)
  - Solution: User resumed project from Supabase Dashboard
  - Prevention: Upgrade to Pro ($25/month) or visit app every few days
- **✅ Workout Library Search Display Enhancement:**
  - Added workout name and track display to search result cards
  - Shows format: "Workout Name • Track Name" (whichever exists)
  - Applied to all 3 locations: search cards, hover popover, detail view header
  - File: components/coach/SearchPanel.tsx
  - Changes:
    - Line 407: Added trackName lookup from tracks array
    - Lines 426-431: Added workout_name/track conditional display in search cards
    - Lines 443-448: Added workout_name/track to hover popover header
    - Lines 512-517: Added workout_name/track to detail view header
- Commit: (pending)
- Files: 1 changed (SearchPanel.tsx)
- See: `project-history/2026-01-11-session-64-workout-library-display-enhancement.md`

**Completed (2025-12-28 Session 63 - Sonnet):**
- **✅ Strength & Conditioning Filter Fix:**
  - Fixed "Strength & Cond" filter not working in Coach Library
  - Root cause: Category name mismatch - code used 'Specialty', database used 'Strength & Functional Conditioning'
  - Files changed:
    - components/coach/ExercisesTab.tsx (lines 18, 27): Changed 'Specialty' → 'Strength & Functional Conditioning'
    - components/coach/MovementLibraryPopup.tsx (line 40): Changed 'Specialty' → 'Strength & Functional Conditioning'
- **✅ Calendar Hover Display Improvement:**
  - Changed hover popover to show workout name or track name instead of session type
  - Example: "Endurance #25.43" instead of "Endurance" or "Mixed Modal" instead of "WOD"
  - Files changed:
    - components/coach/CalendarGrid.tsx:
      - Line 49: Added tracks prop to CalendarGridProps interface
      - Lines 116-120: Added getTrackName() helper function
      - Line 188: Added title attribute to show workout/track name on hover (browser tooltip)
      - Line 291: Changed popover header to show `workout_name || track_name || title`
    - app/coach/page.tsx (line 303): Passed tracks prop to CalendarGrid
    - app/api/google/publish-workout/route.ts:
      - Line 75: Updated Workout interface to handle array type for tracks
      - Lines 256-263: Fixed track name extraction with proper TypeScript handling
- **✅ Athlete Logbook Display Enhancement:**
  - Updated Athlete Logbook to show "Session Type - Workout Name" or "Session Type - Track Name"
  - Example: "Endurance - Endurance #25.43" or "WOD - Mixed Modal"
  - Applied to all 3 view modes: Day view, Week view, Month view calendar
  - Files changed:
    - utils/logbook-utils.ts (lines 20-21): Added session_type and workout_name to WOD interface
    - hooks/athlete/useLogbookData.ts (lines 114-115): Added fields to Supabase query
    - components/athlete/AthletePageLogbookTab.tsx:
      - Lines 868-873: Updated day view title to show session_type + workout_name/track_name
      - Lines 1547-1550: Updated week view to show session_type + workout_name/track_name
      - Line 1650: Updated month view calendar to show session_type + workout_name/track_name
- Commit: (pending)
- Files: 8 changed (ExercisesTab, MovementLibraryPopup, CalendarGrid, coach page, publish-workout route, logbook-utils, useLogbookData, AthletePageLogbookTab)

**Completed (2025-12-28 Session 62 - Sonnet):**
- **✅ WOD Pt.4, Pt.5, Pt.6 Section Support:**
  - Added three new WOD section types to support same functionality as WOD Pt.1-3
  - Workout type dropdown and scoring configuration now appear for all WOD parts (Pt.1-6)
  - File: components/coach/WODSectionComponent.tsx
  - Changes:
    - Line 152: Added WOD Pt.4, Pt.5, Pt.6 to workout type dropdown conditional
    - Line 172: Added WOD Pt.4, Pt.5, Pt.6 to scoring configuration conditional
- **✅ Google Calendar Event Title Priority:**
  - Changed event titles to prioritize workout_name over track name over session_type
  - Example: "Overhead Fest - Thu, 28 Dec" instead of "WOD - Thu, 28 Dec"
  - File: app/api/google/publish-workout/route.ts
  - Changes:
    - Lines 67-76: Updated Workout interface to include workout_name, track_id, tracks relation
    - Line 97: Updated SELECT query to fetch workout_name, track_id, tracks(name)
    - Lines 255-258: Changed event summary to use `workout_name || tracks?.name || title`
- **✅ Exercise Parsing Fix for Comma-Separated Values (CRITICAL):**
  - Fixed exercises not appearing in Analysis page when separated by commas
  - Example: "Burpee x 10, Push-Up Strict x 25, Forward Lunge x 50, Abmat Sit-up x 100, Airsquat x 150"
  - Root cause: Parsing only split by '+' symbols, not commas
  - Solution: Changed regex from `split('+')` to `split(/[+,]/)`
  - Files changed:
    - utils/movement-analytics.ts (lines 469, 563, 651)
    - utils/movement-extraction.ts (line 45)
  - Applies to section content, benchmark descriptions, and forge benchmark descriptions
- **✅ Calendar Card Benchmark Description Display:**
  - Fixed calendar cards showing only benchmark names without full descriptions
  - Changed format functions to return objects with description field
  - File: components/coach/CalendarGrid.tsx
  - Changes:
    - Lines 27-43: Updated formatBenchmark() and formatForgeBenchmark() to return objects
    - Lines 311-317: Added benchmark description display with whitespace-pre-wrap
    - Lines 331-336: Added forge benchmark description display with whitespace-pre-wrap
    - Shows description if exists, otherwise shows exercises array
- Commit: (pending)
- Files: 5 changed (WODSectionComponent.tsx, publish-workout route.ts, movement-analytics.ts, movement-extraction.ts, CalendarGrid.tsx)

**Completed (2025-12-25 Session 61 - Sonnet):**
- **✅ Benchmark RLS Policy Fix (CRITICAL):**
  - Issue: Unable to create benchmarks - "new row violates row-level security policy"
  - Root cause: Migration 20251105_add_coach_permissions_benchmarks_lifts.sql was never applied
  - JWT token contained coach role, but INSERT/UPDATE/DELETE policies were missing
  - Applied missing RLS policies via Supabase SQL Editor:
    - `Coaches can insert benchmark workouts` (WITH CHECK auth.jwt() -> 'user_metadata' ->> 'role' = 'coach')
    - `Coaches can update benchmark workouts` (USING auth.jwt() -> 'user_metadata' ->> 'role' = 'coach')
    - `Coaches can delete benchmark workouts` (USING auth.jwt() -> 'user_metadata' ->> 'role' = 'coach')
  - forge_benchmarks policies already existed
  - File: Created diagnostic migrations (not needed - used direct SQL approach)
- **✅ Publish Modal Preview Improvements:**
  - Issue: Preview only showed section.content, not benchmarks/lifts/forge benchmarks
  - Added structured content rendering matching Google Calendar API format
  - File: components/coach/PublishModal.tsx
  - Changes:
    - Lines 178-259: Added format helpers and conditional rendering for lifts/benchmarks/forge benchmarks
    - Lines 134-176: Section checkboxes now show summary ("1 benchmark, 2 lifts")
    - Displays benchmark/forge benchmark descriptions (whitespace-pre-wrap)
    - Matches API route formatting exactly
- **✅ Publish Modal Section Auto-Selection Fix:**
  - Issue: New sections added after initial publish weren't pre-selected
  - Root cause: `currentPublishConfig.selectedSectionIds` only contained old section IDs
  - Solution: Merge old selection + new sections in useEffect
  - File: components/coach/PublishModal.tsx (lines 54-79)
  - Preserves manually deselected sections, auto-includes new ones
- **✅ Code Cleanup:**
  - Removed debug JWT logging from benchmarks-lifts/page.tsx
  - Simplified error handling in saveBenchmark() and saveForge()
- Commit: (pending)
- Files: 4 changed (PublishModal.tsx, benchmarks-lifts/page.tsx, 2 diagnostic migrations created but not needed)

**Completed (2025-12-24 Session 60 - Sonnet):**
- **✅ Coach Notes Modal UX Improvements:**
  - Fixed click-to-edit behavior requiring double-click
  - Root cause: onBlur handler was triggering on mouseDown, immediately exiting edit mode
  - Added Edit/Preview toggle button in modal header
  - Implemented scroll position preservation when switching between edit/preview modes
  - Preview mode: Shows formatted markdown (ReactMarkdown with remarkGfm, remarkBreaks, rehypeRaw)
  - Edit mode: Shows raw markdown with formatting toolbar (bold, italic, underline, lists, headings)
  - File: components/coach/CoachNotesPanel.tsx
  - Changes:
    - Line 35-60: Added isEditing state, toggleEditMode() function with scroll preservation
    - Line 247-263: Added Edit/Preview toggle button to floating mode header
    - Line 268-336: Conditional rendering of toolbar and edit/preview content
    - Line 355-369: Added Edit/Preview toggle to side panel mode header
    - Line 371-442: Conditional rendering for side panel mode
- **✅ Google Calendar Event Duration Rounding:**
  - Changed event duration to round to nearest hour instead of exact minutes
  - Examples: 63 min → 60 min, 67 min → 60 min, 90 min → 120 min
  - Improves calendar readability for athletes
  - File: app/api/google/publish-workout/route.ts (line 222-227)
  - Formula: `Math.round(durationMinutes / 60) * 60`
- Commit: ebf509b "fix(coach): prevent modals from closing on backdrop click"
- Files: 2 changed (CoachNotesPanel.tsx, route.ts)

**Completed (2025-12-23 Session 59 - Sonnet):**
- **✅ Modal Closing Behavior Fix:**
  - Fixed all Coach Library modals closing when clicking outside (incorrect UX)
  - Root cause: Initial debugging focused on wrong file (MovementLibraryPopup vs actual tab components)
  - ModalsFixed:
    - Add Benchmark modal (BenchmarksTab.tsx:106)
    - Add Forge Benchmark modal (ForgeBenchmarksTab.tsx:307)
    - Add Barbell Lift modal (LiftsTab.tsx:250)
    - Session Management modal (SessionManagementModal.tsx:168)
  - Removed `onClick={onClose}` from backdrop divs in all 4 components
  - Modals now only close via X button or Cancel/Create buttons
  - Also cleaned up debug code from MovementLibraryPopup.tsx (console.logs, alerts, test text)
- **✅ Notes Panel Format Bar Icons Fix (Carried over from Session 58):**
  - Fixed faded/invisible format toolbar icons
  - Added `text-gray-700` class to all toolbar buttons
  - File: CoachNotesPanel.tsx (lines 259-284, 365-390)
- Commit: (pending) "fix(coach): prevent modals from closing on backdrop click"
- Files: 5 changed (4 modal components, 1 debug cleanup)
- See `project-history/2025-12-23-session-59-modal-closing-fix.md`

**Completed (2025-12-23 Session 58 - Sonnet):**
- **✅ Athlete Workouts Tab - Results Display:**
  - Fixed results not appearing in Published Workouts tab workout cards
  - Root cause: Section ID mismatch between workout sections and wod_section_results table
  - Workout sections: `section-1764750292053-2`, Results table: `section-1764750292053-2-content-0`
  - Solution: Changed section result lookup to match by prefix using `startsWith(section.id + '-content')`
  - File: components/athlete/AthletePageWorkoutsTab.tsx (lines 403-406)
  - Moved result display from before section content to after (lines 476-491)
  - Results now show at bottom of each section with green background
  - Displays: time, reps, rounds, weight, calories, distance, scaling level, task completion
- **✅ Publish Modal - Pre-select All Sections:**
  - Changed default behavior to pre-select all sections for publishing
  - Allows coach to deselect any unwanted sections
  - File: components/coach/PublishModal.tsx (lines 44-46, 56)
  - Used `sections.map(s => s.id)` for default selectedSectionIds
- **✅ Google Calendar - Section Separator Removal:**
  - Removed horizontal separator lines between sections in Google Calendar events
  - Changed from `'<br><br>─────────────────<br><br>'` to `'<br><br>'`
  - File: app/api/google/publish-workout/route.ts (lines 207-209)
- **✅ Google Calendar - Re-publish After Manual Delete:**
  - Fixed republish not creating new event after manual deletion from Google Calendar
  - Added try/catch around calendar.events.update()
  - On 404 error, creates new event instead of failing
  - File: app/api/google/publish-workout/route.ts (lines 262-279)
- **✅ Coach Notes - Line Break Preservation:**
  - Fixed line breaks not preserved when copying from Google Calendar events
  - Added remark-breaks plugin to ReactMarkdown
  - Changed from require() to ES6 import syntax
  - File: components/coach/CoachNotesPanel.tsx (line 4, 76)
- **✅ WOD Section Types - Added WOD Pt. 4, 5, 6:**
  - Added three new section types to section_types table
  - Display orders: 16, 17, 18
  - Description: "Workout of the Day (main conditioning piece)"
  - Created via script: scripts/add-wod-parts-correct.ts
- **✅ Athlete Workouts Tab - Show Only Days with Workouts:**
  - Changed grid to only display days where athlete completed workouts
  - Removed empty day cards, expanded remaining cards horizontally
  - Used dynamic grid columns: `repeat(N, minmax(0, 1fr))` where N = workout count
  - File: components/athlete/AthletePageWorkoutsTab.tsx (lines 328-333)
- Commit: 7f5be4c "docs: add Week 2 testing plan to project history"
- Files: 5 changed (AthletePageWorkoutsTab, PublishModal, publish-workout route, CoachNotesPanel, new script)
- See `project-history/2025-12-23-session-58-athlete-workouts-results.md`

**Completed (2025-12-23 Session 57 - Sonnet):**
- **✅ Exercise Parsing Bug Fix (CRITICAL):**
  - Fixed multiple exercises per line only detecting first exercise
  - Issue: `* Box Step Up + * Shuttle Run` only showed "Box Step Up" in Analytics/Library
  - Root cause: Line-by-line parsing with single match per line in both utilities
  - Solution: Split each line by `+` before parsing, process each part independently
  - Files: utils/movement-extraction.ts (lines 40-111), utils/movement-analytics.ts (lines 461-534)
  - Both Analytics page and Coach Library Exercises tab now detect all exercises correctly
- **✅ Notes Modal Drag Boundary Fix:**
  - Fixed Notes modal dragging too far up (header disappearing under page header)
  - Goal: Match Exercise library modal behavior (both can reach viewport top at y=0)
  - Removed HEADER_HEIGHT restriction entirely: `maxBottom = window.innerHeight - notesModalSize.height`
  - Added notesModalSize to useEffect dependencies to prevent stale closure bug
  - File: hooks/coach/useModalResizing.ts (lines 56-154)
  - User confirmed: "Notes modal: ok" ✅
- **✅ Publish Workout RLS Blocking Fix (CRITICAL):**
  - Fixed "Workout not found" 404 error when publishing workouts
  - Root cause: API route using regular `supabase` client blocked by Session 54 RLS policies
  - Solution: Changed ALL 4 database queries to use `supabaseAdmin` (bypasses RLS)
  - Queries updated: Fetch workout (line 95), Update publish (line 285), Fetch for unpublish (line 366), Update unpublish (line 405)
  - File: app/api/google/publish-workout/route.ts
  - Added debug logging for troubleshooting (can be removed later)
  - File: hooks/coach/useWorkoutModal.ts (improved error messages)
  - User confirmed: "Working" ✅
- **✅ Build Fixes:**
  - Fixed TypeScript errors in scripts/cleanup-search-terms.ts
  - Added explicit type annotations: `(term: string)`, `(t: string)` for lambda parameters
  - Production build succeeds
- **⚠️ Lesson Learned:**
  - Committed exercise parsing fix (bba54f7) before user testing - user corrected with "Don't commit/push until I've tested"
  - User preference: Wait for explicit approval before committing bug fixes
- Commit: f711b2f "fix(coach): notes modal drag boundary and publish workout RLS blocking"
- Files: 6 changed (2 movement utilities, 1 modal hook, 1 API route, 1 client hook, 1 script)
- See `project-history/2025-12-23-session-57-bug-fixes.md`

---

## 🚨 Known Issues (Next Session)

**Migration Pending:**
1. **`20251206_fix_newlines_after_restore.sql`** (Optional) - Fix escaped `\n` in benchmark descriptions
   - **Apply via:** Supabase Dashboard SQL Editor (only if needed)

**No Critical Blocking Issues**

---

## 🛡️ Database Safety Protocol

**MANDATORY Before ANY Database Change:**

```bash
npm run backup  # Creates timestamped JSON backups
```

**When to Backup:**
1. ✅ Before running ANY migration
2. ✅ Before switching git branches (if branch has migrations)
3. ✅ Before DROP TABLE, DELETE, TRUNCATE, or ALTER...DROP operations
4. ✅ Daily before starting work session
5. ✅ Before testing features that write to database

**Emergency Restore:**
```bash
npm run restore              # List backups
npm run restore 2025-12-06  # Restore specific date
```

**Pre-Migration Checklist:**
- Read `PRE_MIGRATION_CHECKLIST.md` EVERY TIME
- Review migration SQL for destructive operations
- Verify backup exists
- Run migration via Supabase Dashboard SQL Editor
- Verify data still exists
- Create new backup after success

**Why This Matters:**
- Dec 6, 2025 incident: Lost custom Forge Benchmarks + athlete lift records
- Root cause: Assumed git branches protected database (they don't!)
- Solution: Mandatory backups before risky operations

---

## 📋 Next Immediate Steps

### Session 60 Priorities (Next Session)

**Week 2: Testing Phase** - Begin comprehensive validation before January Beta Launch
- All Week 1 critical tasks complete (RLS policies, build verification)
- Modal closing behavior fixed (Session 59)
- Testing plan created in plan mode (see testing plan file)
- Ready to begin systematic manual validation of all features

### JANUARY LAUNCH PLAN (Weeks 1-5)

**Week 1: Security & Infrastructure (Dec 2-8) - CRITICAL**

1. **✅ RLS Policies** (COMPLETED - Session 54)
   - ✅ Removed PUBLIC access from athlete data tables
   - ✅ Added coach and user-based policies
   - ✅ Fixed auth.users GRANT permissions
   - ✅ Tested with isolated accounts - working correctly

2. **✅ Build Verification** (COMPLETED - Session 54)
   - ✅ Fixed 12 ESLint type errors
   - ✅ Production build successful (`npm run build`)
   - ✅ Created `.env.example` with all environment variables documented

3. **Analysis Page Scroll Jump Bug** (DEFERRED)
   - Location: components/coach/analysis/StatisticsSection.tsx
   - Priority: Medium (UX polish)

**Week 2-5:** Testing, Beta Launch, Public Launch (see full plan above)

---

## 🗂️ Additional Resources

- **Detailed History:** See `project-history/` for feature implementation details by date
- **Critical Gotchas:** See `memory-bank/lessons-learned.md` for patterns
- **Workflow Rules:** See `memory-bank/workflow-protocols.md` (includes DATABASE SAFETY PROTOCOL)
- **Tech Details:** See `memory-bank/memory-bank-techContext.md`
- **Code Patterns:** See `memory-bank/memory-bank-systemPatterns.md`

---

**File Size:** ~4.3KB
