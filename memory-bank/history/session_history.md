# The Forge Functional Fitness - Active Context

Version: 2.3
Timestamp: 2025-10-18 20:30 UTC

## ⚠️ CRITICAL: READ THIS FIRST EVERY SESSION

**BEFORE doing ANY work, read:** `memory-bank/workflow-protocols.md`

**Key Protocol Rules:**
- **Use Agent (Task tool) for:** 3+ step tasks, multi-file changes, bug investigations
- **Work directly for:** Single-file edits, simple well-defined tasks
- **Target:** Keep sessions under 50% context usage
- If you don't use an agent when you should, you WILL burn through tokens unnecessarily

## Project Overview
CrossFit gym management application for coaches and athletes. Coaches create and manage daily WODs (Workouts of the Day), athletes view and track their workouts.

## Complete Project History

### ✅ Session 1: Initial Setup (October 12-13, 2025)
1. Set up Next.js 15 project with TypeScript and Tailwind
2. Installed lucide-react for icons
3. Created login page (`app/page.tsx`) with coach/athlete role selection
4. Created coach dashboard (`app/coach/page.tsx`) with calendar view
5. Created WOD Modal (`components/WODModal.tsx`) with initial functionality:
   - Collapsible sections with content preview
   - Auto-expanding textarea (no scrollbar)
   - Drag-and-drop section reordering with grip icon
   - Hardcoded exercise library (Warm-up, Strength, MetCon, Gymnastics, Stretches)
   - Click collapsed content to expand and edit
   - Sections auto-collapse when adding new ones
   - Default template: Warm-up (12min), Accessory (10min), Strength (15min), WOD (15min)
6. Git repository initialized and connected to GitHub (https://github.com/Percepto25/FFF.git)

### ✅ Session 2: Supabase & UI Enhancements (October 14, 2025)
1. **Supabase Integration - FULLY FUNCTIONAL:**
   - Created Supabase project (xvrefulklquuizbpkppb.supabase.co)
   - Set up environment variables in `.env.local`
   - Created `lib/supabase.ts` client
   - Designed and created `exercises` table with schema: id, name, category, description, video_url, tags, created_at, updated_at
   - Added indexes for category and name for faster searches
   - Seeded database with 80+ exercises across 5 categories (Warm-up, Gymnastics, Strength, MetCon, Stretches)
   - Connected WOD modal to fetch exercises from Supabase (replaced hardcoded data)

2. **Coach Dashboard Enhancements (`app/coach/page.tsx`):**
   - Added weekly/monthly view toggle with icons
   - Implemented ISO week number calculation and display
   - Fixed date highlighting timezone bug (was showing wrong day)
   - Widened weekly view layout (max-w-[1600px]) with flexbox columns
   - Added global copy/paste system for WODs (clipboard with paste buttons)
   - Implemented drag-and-drop functionality for copying WODs between days
   - Changed background to darker grey (bg-gray-200)
   - Made icons hover-only (copy, delete) with vertical layout and absolute positioning
   - Changed weekday labels from abbreviated to full names
   - Made WOD cards clickable to edit in both weekly and monthly views

3. **WOD Modal UI Improvements (`components/WODModal.tsx`):**
   - Added editable workout title dropdown with preset options (WOD, Foundations, Endurance, Kids, Kids & Teens, ElternKind Turnen, FitKids Turnen, Diapers & Dumbbells)
   - Redesigned header with Check (✓) and X icon buttons
   - Removed bottom Cancel/Save buttons in favor of header controls
   - Fixed all text readability issues (added explicit text-gray-900/700 classes)
   - Fixed typo: "Diapers & Dumbells" → "Diapers & Dumbbells"
   - **Fixed exercise library flashing issue:** Added caching so exercises only fetch once on first open, eliminating distracting flash on subsequent opens

4. Git: All changes committed and pushed to GitHub

### ✅ Session 3: Track System & Analysis Dashboard (October 14, 2025)
1. **Supabase Database Expansion:**
   - Created `tracks` table with fields: id, name, description, color, created_at, updated_at
   - Created `workout_types` table with fields: id, name, description, created_at, updated_at
   - Created `wods` table with fields: id, title, track_id, workout_type_id, class_times, max_capacity, date, sections (JSONB), created_at, updated_at
   - Added indexes on date, track_id, and workout_type_id for performance
   - Seeded default tracks: Strength Focus, Endurance Focus, Gymnastics Focus, Olympic Lifting, Mixed Modal, Benchmark WOD
   - Seeded default workout types: For Time, AMRAP, EMOM, Chipper, Rounds for Time, Tabata, Interval, Other
   - Enabled Row Level Security (RLS) with PUBLIC policies for rapid development

2. **WOD Modal Enhancements (`components/WODModal.tsx`):**
   - Added Track dropdown selector (fetches from Supabase)
   - Added Workout Type dropdown selector (fetches from Supabase)
   - Updated WODFormData interface to include track_id and workout_type_id
   - Track and Workout Type selections persist when creating/editing WODs

3. **Coach Dashboard - WOD Persistence (`app/coach/page.tsx`):**
   - **Migrated from component state to Supabase database**
   - Implemented `fetchWODs()` to load all WODs from database on page load
   - Updated `handleSaveWOD()` to insert/update WODs in Supabase
   - Updated `handleDeleteWOD()` to delete from Supabase
   - Updated `handleCopyWOD()` to copy WODs via Supabase
   - WODs now persist across page refreshes and sessions
   - Added "Analysis" button to header navigation

4. **Analysis Page - NEW (`app/coach/analysis/page.tsx`):**
   - **Track Management Section:**
     - Full CRUD operations for Tracks (Create, Read, Update, Delete)
     - Modal for adding/editing Tracks with name, description, and color picker
     - Grid display showing all Tracks with color indicators
     - Edit and delete buttons on each Track card

   - **Monthly Statistics Section:**
     - Month navigation (previous/next arrows)
     - Displays current month/year
     - Fetches WODs for selected month from Supabase
     - Calculates and displays comprehensive statistics:

   - **Summary Cards (compact):**
     - Total Workouts count
     - Average WOD Duration (in minutes)
     - Total WOD Time (sum of all WOD sections)

   - **WOD Duration Distribution:**
     - 7 duration ranges: 1-8 mins, 9-12 mins, 13-20 mins, 21-30 mins, 31-45 mins, 45-60 mins, 60+ mins
     - Calculates total duration by summing all sections with type "WOD"
     - Handles multiple WOD sections correctly
     - Grid display showing count for each duration range

   - **Track Breakdown:**
     - Visual progress bars showing workout count per Track
     - Color-coded by Track color
     - Sorted by count (descending)
     - Shows percentage of total workouts

   - **Workout Type Breakdown:**
     - Grid display of workout counts by type
     - Shows all workout types (For Time, AMRAP, EMOM, etc.)

   - **Top Exercises:**
     - Extracts exercises from WOD section content using pattern matching
     - Filters out common non-exercise words
     - Shows top 20 most frequently used exercises
     - Displays count for each exercise

5. **Bug Fixes:**
   - Fixed Analysis page authentication (corrected sessionStorage key mismatch)
   - Added RLS policies for INSERT/UPDATE/DELETE on all tables
   - Split SQL queries to handle table creation and RLS setup separately

6. Git: Committed with message "feat: add Track system and Analysis page with comprehensive statistics" (commit 636d4e9)

### ✅ Session 4: Athlete Dashboard - Initial Build (October 14, 2025)
1. **Created Athlete Dashboard (`app/athlete/page.tsx`):**
   - Complete tab-based navigation system with 6 tabs
   - Clean header with gym name, welcome message, and logout button
   - Tab icons from lucide-react matching each section purpose
   - Active tab highlighting with teal color scheme (#208479)
   - Mobile-responsive tab navigation with horizontal scroll

2. **Profile Tab:**
   - User profile picture placeholder
   - Personal information form fields:
     - Full Name, Email, Date of Birth, Phone Number
     - Height (cm) and Weight (kg)
   - Emergency Contact section (Name and Phone)
   - Save Changes button with teal styling

3. **Athlete Logbook Tab:**
   - Date navigation with previous/next day buttons
   - "Go to Today" button when viewing past/future dates
   - Fetches WODs from Supabase for selected date
   - Displays all WOD sections with duration indicators
   - Shows Track and Workout Type badges (color-coded)
   - "My Notes & Results" section for each WOD
   - Result/Time input field
   - Notes textarea for workout feedback
   - Loading and empty states

4. **Benchmark Workouts Tab:**
   - 12 classic CrossFit benchmarks (metric units: kg, cm)
     - Girls: Fran, Helen, Cindy, Grace, Isabel, Annie, Diane, Elizabeth, Kelly, Nancy, Jackie, Mary
   - Grid display with descriptions
   - Click to log results in modal
   - Shows personal bests
   - Recent history display

5. **Barbell Lifts Tab:**
   - 12 major lifts grouped by category (weights in kg)
     - Squat: Back Squat, Front Squat, Overhead Squat
     - Pull: Deadlift, Sumo Deadlift
     - Press: Bench Press, Shoulder Press, Push Press, Jerk
     - Olympic: Clean, Snatch, Clean & Jerk
   - Weight/reps logging with modal
   - Automatic 1RM calculator (Brzycki formula)
   - Shows current PRs
   - Recent lift history

6. **Personal Records Tab:**
   - Summary stats with gradient cards
   - Benchmark WODs section
   - Barbell Lifts section
   - Empty states for sections with no data

7. **Access & Security Tab:**
   - Change Password section
   - Two-Factor Authentication section
   - Danger Zone for account deletion

### ✅ Session 5: Athlete Database Integration (October 14, 2025)
1. **Created Supabase Athlete Tables:**
   - Created SQL script: `supabase-athlete-tables.sql`
   - Created documentation: `SUPABASE-ATHLETE-SETUP.md`
   - Tables created:
     - `athlete_profiles` - personal info, emergency contact
     - `workout_logs` - daily WOD results and notes
     - `benchmark_results` - benchmark WOD tracking
     - `lift_records` - barbell lift tracking with 1RM calculations
   - All tables have RLS enabled with PUBLIC policies for development
   - User-specific policies ready for production (when Supabase Auth is implemented)

2. **Connected Benchmark Workouts Tab to Supabase:**
   - Added `useEffect` to fetch data on mount
   - Created `fetchBenchmarkHistory()` function
   - Updated `handleSaveBenchmark()` to insert into `benchmark_results` table
   - Updated `getBestTime()` to use correct field names (`benchmark_name`, `workout_date`)
   - Recent history displays data from database
   - Full CRUD functionality with Supabase

3. **Connected Barbell Lifts Tab to Supabase:**
   - Added `useEffect` to fetch data on mount
   - Created `fetchLiftHistory()` function
   - Updated `handleSaveLift()` to insert into `lift_records` table
   - Stores `calculated_1rm` in database using Brzycki Formula
   - Updated `get1RM()` to use `lift_name`, `lift_date`, `weight_kg`, `calculated_1rm`
   - Recent history displays data from database
   - Full CRUD functionality with Supabase

4. **Connected Athlete Logbook Tab to Supabase:**
   - Changed state from single `workoutNote`/`workoutResult` to `workoutLogs` object keyed by WOD ID
   - Updated `fetchWODsForDate()` to also fetch existing workout logs
   - Created `handleSaveWorkoutLog()` function with insert/update logic
   - Checks for existing logs and updates if present, inserts if new
   - Each WOD has its own result/notes inputs that persist
   - Full CRUD functionality with Supabase

5. **Connected Profile Tab to Supabase:**
   - Added state management for all profile fields
   - Created `fetchProfile()` function to load existing profile
   - Created `handleSaveProfile()` function with insert/update logic
   - Handles new users (no profile yet) gracefully
   - Loading state while fetching data
   - All profile fields persist to `athlete_profiles` table
   - Full CRUD functionality with Supabase

6. **Connected Personal Records Tab to Supabase:**
   - Added `useEffect` to fetch data on mount
   - Created `fetchPersonalRecords()` function
   - Fetches best result per benchmark from `benchmark_results`
   - Fetches highest 1RM per lift from `lift_records`
   - Summary stats display real counts from database
   - Benchmark and Lift sections display real PRs
   - Loading state while fetching data
   - Empty states when no PRs logged
   - Automatically syncs with other tabs (no manual refresh needed)

7. **All Metric Units Confirmed:**
   - Weights: kg
   - Heights: cm
   - Distances: meters (m), kilometers (km)
   - All benchmarks updated with metric values

### ✅ Session 6: Progress Charts & Enhanced Tracking (October 15, 2025)
1. **Database Migration - Rep Max Tracking:**
   - Created `supabase-lift-records-update.sql` migration file
   - Added `rep_max_type` column to `lift_records` table
   - Added constraint to validate rep_max_type ('1RM', '3RM', '5RM', '10RM', 'Other')
   - Added index on `rep_max_type` for faster queries
   - Updated existing records to set rep_max_type based on reps field
   - Maintains backward compatibility with flexible reps field

2. **Barbell Lifts Tab - Enhanced for Multiple Rep Maxes (`app/athlete/page.tsx`):**
   - Changed state from `newReps` to `newRepMaxType` with TypeScript union type
   - Updated modal to show "Rep Max Type" dropdown instead of "Reps" input
   - Created `getRepMaxPR()` function to fetch PR for specific rep max type
   - Created `getAllRepMaxPRs()` function to fetch all PRs (1RM, 3RM, 5RM, 10RM)
   - Updated lift cards to display all rep max PRs in 2-column grid layout
   - Updated `handleSaveLift()` to store `rep_max_type` field in database
   - Updated Recent History to display rep max type
   - Added date selector to lift logging modal (defaults to current date)

3. **Date Selectors Added to All Logging:**
   - **Benchmark modal:** Added date input that defaults to current date but allows historical logging
   - **Lifts modal:** Added date input that defaults to current date but allows historical logging
   - **Logbook save:** Added date input for each WOD log entry
     - Updated state type to include `date` field: `Record<string, { result: string; notes: string; date: string }>`
     - Date defaults to selected date but can be changed independently per WOD
     - Save function uses the date from the log object

4. **Coach Athletes Page - NEW (`app/coach/athletes/page.tsx`):**
   - **Athletes List Panel:**
     - Displays all athlete profiles from database
     - Clickable athlete cards to select and view details
     - Shows athlete name with visual selection highlighting

   - **Athlete Details Panel:**
     - Displays selected athlete's full profile information
     - Shows personal stats (height, weight, emergency contact)
     - Tab navigation for Benchmarks, Lifts, and Logbook

   - **Benchmarks Tab (Coach View):**
     - Displays all benchmark results for selected athlete
     - Shows personal bests grouped by benchmark name
     - "Add Result" button to manually log benchmark results
     - Modal with date selector, result, and notes fields

   - **Lifts Tab (Coach View):**
     - Displays all lift records grouped by lift name
     - Shows PRs for each rep max type
     - "Add Lift" button to manually log lift records
     - Modal with date selector, weight, rep max type dropdown, and notes
     - Shows estimated 1RM for non-1RM lifts

   - **Logbook Tab (Coach View):**
     - Displays workout logs for selected athlete
     - Shows WOD date, result, and notes
     - Sortable by date

   - Added "Athletes" button to Coach dashboard header with Users icon
   - Full CRUD operations for coaches to manually add data for athletes

5. **Progress Charts - Recharts Integration:**
   - Installed `recharts` library (98 packages)
   - Imported LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend

6. **Benchmark Tab - Progress Charts (`app/athlete/page.tsx`):**
   - Added `chartBenchmark` state to track selected benchmark for chart
   - Created `getBenchmarkChartData()` function to format data for charts
   - Created `benchmarksWithHistory` array to show only benchmarks with recorded data
   - Added "Progress Charts" section below Recent History
   - Selectable benchmark buttons showing benchmark name and count
   - LineChart displays when benchmark is selected
   - Chart shows all recorded results over time (sorted chronologically)
   - XAxis shows date (Month abbreviation + day)
   - YAxis shows result value
   - Teal line color (#208479) matching app theme

7. **Lifts Tab - Progress Charts (`app/athlete/page.tsx`):**
   - Added `chartLift` and `chartRepMaxType` state variables
   - Created `getLiftChartData()` function to format lift data for specific rep max type
   - Created `liftsWithHistory` array with rep max counts per lift
   - Added "Progress Charts" section below Recent History
   - Two-tier selection system:
     - First row: Lift selector buttons (shows total count across all rep maxes)
     - Second row: Rep Max Type buttons (shows count per type, only displays types with data)
   - LineChart displays weight progression over time for selected lift and rep max type
   - YAxis label shows "Weight (kg)"
   - Chart updates when switching between lifts or rep max types
   - Reset rep max type to 1RM when switching lifts

### ✅ Session 7: Edit & Delete Functionality for Athlete Records (October 15, 2025)
1. **Benchmark Workouts Tab - Edit/Delete Functionality (`app/athlete/page.tsx`):**
   - Added `editingBenchmarkId` state variable to track which entry is being edited
   - Modified `handleSaveBenchmark()` to handle both INSERT (new) and UPDATE (existing) operations
   - Added `handleEditBenchmark()` function to populate modal with existing entry data
   - Added `handleDeleteBenchmark()` function with confirmation dialog
   - Updated modal header to show "Edit" or "Log" based on editing state
   - Updated save button text to show "Update" or "Save" based on editing state
   - Updated cancel button to clear editing state
   - Added Edit (pencil icon) and Delete (trash icon) buttons to each Recent History entry
   - Buttons appear on right side of each history card with hover effects
   - Edit button color changes to teal on hover
   - Delete button color changes to red on hover
   - Both operations refresh history automatically after completion

2. **Barbell Lifts Tab - Edit/Delete Functionality (`app/athlete/page.tsx`):**
   - Added `editingLiftId` state variable to track which entry is being edited
   - Modified `handleSaveLift()` to handle both INSERT and UPDATE operations
   - Added `handleEditLift()` function to populate modal with existing lift data (weight, rep max type, notes, date)
   - Added `handleDeleteLift()` function with confirmation dialog
   - Updated modal header to show "Edit" or "Log" based on editing state
   - Updated save button text to show "Update" or "Save" based on editing state
   - Updated cancel button to clear editing state
   - Added Edit and Delete icon buttons to each Recent Lift History entry
   - Same styling and hover effects as Benchmark buttons
   - Both operations refresh history automatically after completion

3. **Technical Implementation Details:**
   - Both modals reuse existing forms for editing (no duplicate code)
   - Edit handlers populate all form fields including date
   - Delete handlers use browser `confirm()` dialog for safety
   - Supabase `update()` includes `updated_at` timestamp
   - History refresh happens automatically after save/delete
   - All state properly cleared when closing modal

4. **Benchmark Charts - Time Format Display Fix (`app/athlete/page.tsx`):**
   - **Problem Fixed:** Time-based results (e.g., "10.00" for 10 minutes) were not displaying on progress charts
   - **Solution Implemented:**
     - Created `parseResultToNumber()` helper function (lines 837-866) to convert various result formats to numeric values:
       - Time format "5:42" → 5.7 minutes (5 + 42/60)
       - Decimal time "10.00" → 10.0 minutes
       - Rounds+reps "15 rounds + 5" → 15.05 (15 rounds + 5/100)
     - Modified `getBenchmarkChartData()` function (lines 868-882) to:
       - Convert all results to numeric values using `parseResultToNumber()`
       - Keep original string as `resultDisplay` for tooltip
       - Filter out entries that couldn't be parsed
     - Added custom Tooltip component (lines 1070-1084) to display original result format instead of numeric values
   - **Result:** All benchmark formats now display correctly on progress charts with readable tooltips

### ✅ Session 8: WOD Search Panel & Coach Notes (October 18, 2025)
1. **Coach Notes Feature:**
   - Created SQL migration: `supabase-wods-coach-notes.sql`
   - Added `coach_notes` TEXT column to `wods` table
   - Created GIN index for full-text search on coach_notes
   - Created documentation: `COACH-NOTES-SETUP.md`

2. **WOD Modal - Coach Notes Panel (`components/WODModal.tsx`):**
   - Added "Notes" button in modal header (toggles side panel)
   - Implemented 400px wide side panel sliding from right
   - Auto-expanding textarea for private coach notes
   - Notes persist with WOD save/load operations
   - Modal expanded from max-w-5xl to max-w-7xl
   - Smooth slide-in animation with button highlighting

3. **Coach Dashboard - WOD Search Panel (`app/coach/page.tsx`):**
   - Added "Add WOD" button in header (opens search panel)
   - Implemented 500px wide search panel (fixed, slides from right)
   - Search input with 300ms debounce
   - Track filters with checkboxes and real-time counts
   - "All Tracks" checkbox for bulk selection
   - Search results grid with WOD cards

4. **Search Functionality:**
   - Database search on title and coach_notes (case-insensitive)
   - Client-side filtering on sections content
   - Empty state when no results found
   - Loading state during search operations
   - Combines database and client-side filtering

5. **Drag-and-Drop from Search Results:**
   - Search result WOD cards are draggable
   - Drop on calendar days to copy WOD to target date
   - Visual feedback with drag cursors
   - Integrates with existing calendar drag-drop system

6. **Layout Adjustments:**
   - Calendar receives `pr-[500px]` padding when search panel open
   - Prevents calendar overlap with fixed search panel
   - Panel uses fixed positioning: `fixed right-0 top-16`
   - Smooth transition with `translate-x-full/0` animation

7. **Styling (`app/globals.css`):**
   - Added custom scrollbar styles for search panel
   - Webkit scrollbar: 8px width, rounded thumb, hover effects

8. **Known Layout Issue:**
   - Calendar shifts left when search panel opens (due to padding)
   - Functionality maintained but visual transition needs refinement
   - Future enhancement: smoother layout transition strategy

### ✅ Session 9: WOD Panel System & Advanced Drag-Drop (October 18, 2025)
1. **WOD Modal Conversion to Side Panel:**
   - Converted WOD Modal to 800px left-side panel
   - Added slide-in-left animation (translate-x-[-100%] to translate-x-0)
   - Panel positioned `fixed left-0 top-16 h-[calc(100vh-4rem)]`
   - Scroll container for WOD content with custom scrollbar styling
   - Background overlay maintained for focus

2. **Coach Notes Panel Repositioning:**
   - Coach Notes panel now opens to RIGHT of WOD panel (not inside it)
   - 400px wide, positioned `left-[800px]` when WOD panel is open
   - Opens with WOD panel to create unified editing workspace
   - Independent close button (can close notes while keeping WOD panel open)
   - Smooth transitions synchronized with WOD panel

3. **WOD Search Panel Enhancements:**
   - Reduced from 500px to 400px wide for better proportion
   - Positioned on far right of screen
   - Includes individual section drag-drop functionality
   - Sections from search results draggable into WOD panel
   - Shows section type, duration, and exercise preview

4. **Advanced Drag-and-Drop System:**
   - **Entire WOD Drag-Drop:** Drag complete WOD cards from search to calendar dates
   - **Section Drag-Drop:** Drag individual sections from search WODs into WOD panel
   - Drop zones in WOD panel highlight on drag over
   - Sections can be inserted at any position in WOD
   - Combines calendar date-based and content-based drag-drop
   - Visual feedback: drag cursors, drop zone highlighting

5. **Layout System:**
   - **Final Layout:** [WOD 800px LEFT] [Calendar Center] [Notes 400px] [Search 400px RIGHT]
   - Calendar adjusts margins dynamically:
     - `ml-[800px]` when WOD panel open (left margin)
     - `mr-[800px]` when both notes and search panels open (right margin)
     - `mr-[400px]` when only search panel open
   - Smooth transitions between layout states
   - No calendar overlap with any panel

6. **Database & Persistence:**
   - All changes save to Supabase (wods table with coach_notes)
   - Section drag-drop modifies sections JSONB array
   - Coach notes persist independently
   - Search panel queries updated to include coach_notes field

7. **Files Modified:**
   - `app/coach/page.tsx` - WOD panel system, layout margins, drag-drop handlers
   - `components/WODModal.tsx` - Converted to side panel, repositioned notes panel
   - `app/globals.css` - Scrollbar styles for WOD panel

8. **SQL Migration:**
   - `supabase-wods-coach-notes.sql` (created in Session 8, applied in Session 9)

### 🐛 KNOWN ISSUES
- **Notes Panel Positioning:** Minor adjustment needed to butt up against WOD panel edge (currently slight gap)

### 📋 NEXT STEPS
1. Implement Supabase Auth to replace sessionStorage
3. Add user_id to all athlete tables (currently NULL)
4. Remove PUBLIC RLS policies once Auth is implemented
5. Add multi-user support with proper data isolation
6. Test athlete dashboard with multiple users
7. Consider adding PR notifications when athletes beat their records
8. Add ability for coaches to view athlete progress charts
9. Consider adding filters/date range selectors for progress charts

## Key Technical Decisions
- Using Next.js 15 App Router
- All interactive pages are Client Components ('use client')
- Supabase for database (PostgreSQL with RLS)
  - **Coach Tables:** exercises, tracks, workout_types, wods (with coach_notes field)
  - **Athlete Tables:** athlete_profiles, workout_logs, benchmark_results, lift_records
  - JSONB storage for WOD sections (flexible structure)
  - GIN indexes for full-text search (coach_notes)
  - Row Level Security enabled with PUBLIC policies for development
  - User-specific RLS policies ready for production
- SessionStorage for temporary auth (will upgrade to Supabase Auth)
- Teal color scheme: #208479 (primary), #1a6b62 (hover)
- Darker grey background: #e5e7eb (bg-gray-200)
- **All data stored in Supabase database** (no local state for persistence)
- Metric units throughout: kg, cm, meters
- File structure:
  - app/page.tsx (login)
  - app/coach/page.tsx (coach dashboard with search panel)
  - app/coach/analysis/page.tsx (analysis & statistics)
  - app/coach/athletes/page.tsx (athlete management)
  - app/athlete/page.tsx (athlete dashboard - all 6 tabs)
  - components/WODModal.tsx (with coach notes panel)
  - lib/supabase.ts
  - supabase-athlete-tables.sql
  - supabase-wods-coach-notes.sql
  - SUPABASE-ATHLETE-SETUP.md
  - COACH-NOTES-SETUP.md

## Coach Dashboard Features (Reference)
- Weekly/monthly view toggle with ISO week numbers
- Global copy/paste system for WODs (clipboard shows paste buttons when WOD copied)
- Drag-and-drop WODs between days
- Hover-only icons (vertically positioned, absolute top-right)
- Click WOD to edit in both views
- Today's date highlighted with teal ring
- Fixed date handling to prevent timezone issues
- **Add WOD button in header** - opens WOD search panel
- **Analysis button in header** - navigates to statistics page
- **Athletes button in header** - navigates to athlete management page
- **WOD Search Panel:**
  - 500px wide fixed panel slides from right
  - Search input with 300ms debounce
  - Track filters with checkboxes and counts
  - Search results display WOD cards
  - Drag-and-drop from search results to calendar
  - Database + client-side search (title, coach_notes, sections)
- **All WODs persist in Supabase** - survive page refreshes

## Coach Athletes Page Features (Reference)
- **Athletes List Panel:**
  - Displays all athlete profiles from database
  - Clickable athlete cards with visual selection highlighting
  - Shows athlete name for easy identification

- **Athlete Details View:**
  - Displays selected athlete's profile information
  - Shows personal stats (height, weight, emergency contact)
  - Tab navigation: Benchmarks, Lifts, Logbook

- **Benchmarks Tab (Coach View):**
  - Shows all benchmark results for selected athlete
  - Displays personal bests grouped by benchmark
  - "Add Result" button to manually log results
  - Modal includes date selector, result, and notes

- **Lifts Tab (Coach View):**
  - Shows all lift records grouped by lift name
  - Displays PRs for each rep max type (1RM/3RM/5RM/10RM)
  - "Add Lift" button to manually log records
  - Modal includes date selector, weight, rep max type dropdown, notes
  - Shows estimated 1RM for non-1RM lifts using Brzycki formula

- **Logbook Tab (Coach View):**
  - Displays all workout logs for selected athlete
  - Shows WOD date, result, and notes
  - Sortable by date

- Full CRUD operations for coaches to manage athlete data
- Coaches can add historical data by changing date in modals

## WOD Modal Features (Reference)
- Header: Check (✓) to save, X to cancel, **Notes button** to toggle coach notes panel
- Editable title dropdown with preset options
- **Track dropdown** - selects workout focus/track
- **Workout Type dropdown** - selects workout format (For Time, AMRAP, etc.)
- **Coach Notes Panel:**
  - 400px wide side panel slides from right
  - Private notes for coaches only
  - Auto-expanding textarea
  - Notes saved with WOD (coach_notes field)
  - Smooth slide-in animation
- Modal expands to max-w-7xl to accommodate notes panel
- Collapsible sections showing content when collapsed
- Auto-expanding textarea grows with content
- Drag sections to reorder (HTML5 drag-drop)
- Exercise library fetches from Supabase (80+ exercises, cached after first load)
- No flashing/loading on library re-opens (exercises cached)
- Section types: Whiteboard Intro, Warm-up, Skill, Gymnastics, Accessory, Strength, WOD Preparation, WOD, Cool Down
- Default template automatically created for new WODs

## Analysis Page Features (Reference)
- **Track Management:**
  - Add/Edit/Delete Tracks with color picker
  - Grid display with color indicators
  - Used for categorizing workouts by focus area

- **Monthly Statistics:**
  - Month navigation (previous/next)
  - Summary cards: Total Workouts, Avg WOD Duration, Total WOD Time (compact)
  - **WOD Duration Distribution:** 7 ranges from 1-8 mins to 60+ mins
  - Track Breakdown: Visual progress bars with color coding
  - Workout Type Breakdown: Grid showing count per type
  - Top 20 Exercises: Frequency analysis from WOD content
  - All statistics update automatically when month changes

## Athlete Dashboard Features (Reference)
- **Tab Navigation:** 6 tabs with icons and active state highlighting
- **Profile Tab - FULLY CONNECTED TO SUPABASE:**
  - Personal info fields (name, email, DOB, phone, height, weight)
  - Emergency contact section
  - Fetches existing profile on load
  - Insert/update logic for new and existing profiles
  - Loading state while fetching
  - All data persists to `athlete_profiles` table
- **Athlete Logbook Tab - FULLY CONNECTED TO SUPABASE:**
  - Date navigation (previous/next/today)
  - Fetches WODs from Supabase by date
  - Fetches existing workout logs for date
  - Displays WOD sections with Track/Type badges
  - Notes and results input for each workout (separate per WOD)
  - **Date selector for each workout log** (defaults to selected date but can be changed)
  - Insert/update logic for workout logs
  - Loading and empty states
  - All logs persist to `workout_logs` table
- **Benchmark Workouts Tab - FULLY CONNECTED TO SUPABASE:**
  - 12 classic CrossFit benchmarks (metric units)
  - Click to log results in modal with **date selector**
  - Shows personal bests from database
  - Recent history displays last 10 results
  - **Edit/Delete functionality on history entries:**
    - Edit button (pencil icon) opens modal pre-filled with entry data
    - Delete button (trash icon) removes entry with confirmation
    - Hover effects: teal for edit, red for delete
  - **Progress Charts section:**
    - Displays benchmarks with recorded data
    - Click benchmark to view line chart of progress over time
    - XAxis shows dates, YAxis shows results
    - Chart shows all recorded results chronologically
    - **BUG:** Time-based results (e.g., "10.00") don't display on chart, only rounds+reps format works
  - All data persists to `benchmark_results` table
  - Real-time updates when new results saved
- **Barbell Lifts Tab - FULLY CONNECTED TO SUPABASE:**
  - 12 major lifts grouped by category (kg)
  - **Tracks 1RM, 3RM, 5RM, and 10RM** separately for each lift
  - Weight logging modal with **date selector** and **Rep Max Type dropdown**
  - Automatic 1RM calculator (Brzycki formula) shown for non-1RM lifts
  - Lift cards display all rep max PRs in 2-column grid (only shows types with data)
  - Recent lift history displays last 10 entries with rep max type
  - **Edit/Delete functionality on history entries:**
    - Edit button (pencil icon) opens modal pre-filled with lift data
    - Delete button (trash icon) removes entry with confirmation
    - Hover effects: teal for edit, red for delete
    - Works correctly with all rep max types
  - **Progress Charts section:**
    - Two-tier selection: First select lift, then select rep max type (1RM/3RM/5RM/10RM)
    - Only shows rep max types with recorded data
    - Line chart displays weight progression over time
    - YAxis labeled "Weight (kg)"
    - Chart updates when switching lifts or rep max types
    - Charts work correctly (numeric weight data)
  - All data persists to `lift_records` table with `rep_max_type` field
  - Stores calculated_1rm in database
- **Personal Records Tab - FULLY CONNECTED TO SUPABASE:**
  - Summary stats with gradient cards (real counts)
  - Benchmark WODs section (fetches best per benchmark)
  - Barbell Lifts section (fetches highest 1RM per lift)
  - Loading state while fetching
  - Empty states when no PRs logged
  - Automatically syncs with Benchmark/Lifts tabs
- **Access & Security:** Password change, 2FA, account deletion options (UI only)
- Authentication checks on page load (redirects if not athlete role)
- Logout button clears session and returns to login

---

### ✅ Session 10: Fix Athletes Page Runtime Error (October 20, 2025)

#### Problem Identified
- **Initial Error:** `TypeError: Cannot read properties of undefined (reading 'call')`
- **Location:** Athletes page (`app/coach/athletes/page.tsx`) when trying to fetch athlete data
- **Root Cause:** `selectedAthlete.user_id` was being accessed when `selectedAthlete` was undefined, causing crashes during data fetching operations

#### Database Schema Context
The `athlete_profiles` table has both an `id` (primary key) and a `user_id` (UUID for future auth integration). Data tables (`benchmark_results`, `lift_records`, `workout_logs`) reference the `user_id` field, not the `id` field. This means when fetching athlete data, we must use `selectedAthlete.user_id` as the foreign key.

#### Solution Implemented
Added comprehensive null safety guards throughout the Athletes page to prevent crashes when `athleteId` is undefined:

1. **Made athleteId Optional in All Child Components:**
   - `BenchmarksSection`: Changed prop type from `athleteId: string` to `athleteId?: string`
   - `LiftsSection`: Changed prop type from `athleteId: string` to `athleteId?: string`
   - `LogbookSection`: Changed prop type from `athleteId: string` to `athleteId?: string`
   - `AddBenchmarkModal`: Changed prop type from `athleteId: string` to `athleteId?: string`
   - `AddLiftModal`: Changed prop type from `athleteId: string` to `athleteId?: string`

2. **Added Null Guards in useEffect Hooks:**

**Before (BenchmarksSection - lines 276-304):**
```typescript
useEffect(() => {
  fetchBenchmarks();
}, [athleteId]);

const fetchBenchmarks = async () => {
  const { data, error } = await supabase
    .from('benchmark_results')
    .select('*')
    .eq('user_id', athleteId)
    .order('workout_date', { ascending: false });
  // ...
};
```

**After (BenchmarksSection - lines 276-304):**
```typescript
useEffect(() => {
  if (athleteId) {
    fetchBenchmarks();
  }
}, [athleteId]);

const fetchBenchmarks = async () => {
  if (!athleteId) return;
  const { data, error } = await supabase
    .from('benchmark_results')
    .select('*')
    .eq('user_id', athleteId)
    .order('workout_date', { ascending: false });
  // ...
};
```

3. **Applied Same Pattern to All Data Fetch Functions:**
   - `LiftsSection.fetchLifts()` (lines 348-376)
   - `LogbookSection.fetchLogs()` (lines 425-462)
   - `AddBenchmarkModal.handleSave()` (lines 524-527)
   - `AddLiftModal.handleSave()` (lines 663-666)

4. **Updated Athlete Profiles Query:**
   - Changed from `select('*')` to explicitly selecting columns including `user_id`
   - Modified query at line 48: `.select('id, full_name, email, user_id')`
   - This ensures `user_id` is available when athlete is selected (line 509, 639)

#### Files Modified
- **File:** `/Users/chrishiles/SynologyDrive/CrossFit Hammerschmiede (CFH)/AI Development/forge-functional-fitness/app/coach/athletes/page.tsx`
- **Lines Modified:**
  - Line 48: Updated athlete_profiles query to explicitly select user_id
  - Lines 276-304: Added null guards in BenchmarksSection
  - Lines 348-376: Added null guards in LiftsSection
  - Lines 425-462: Added null guards in LogbookSection
  - Line 509: Made athleteId optional in AddBenchmarkModal props
  - Lines 524-527: Added null guard in handleSave
  - Line 639: Made athleteId optional in AddLiftModal props
  - Lines 663-666: Added null guard in handleSave

#### Git Commit
- **Commit Hash:** 3132471
- **Message:** `fix(athletes): add null guards for athleteId in data fetching`
- **Changes:** Single file modification with null safety improvements

#### Testing
- Cleaned `.next` build directory to ensure fresh compilation
- Restarted Next.js dev server
- Verified Athletes page loads without errors
- Confirmed 200 response for athlete_profiles query
- Tested selecting athletes and viewing their data tabs

#### Technical Notes
- All optional parameters use TypeScript's `?` syntax for proper type safety
- Guard pattern: Check `if (athleteId)` in useEffect, check `if (!athleteId) return;` in async functions
- This prevents race conditions where component renders before athlete is selected
- Future-proofs the code for scenarios where no athlete is selected or athlete is deselected
