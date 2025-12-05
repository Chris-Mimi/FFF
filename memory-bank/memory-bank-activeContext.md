# Active Context

**Version:** 8.2
**Updated:** 2025-12-05 (Session 37 - Exercise Library UX Enhancements)

---

## ⚠️ CRITICAL RULES

| Rule | Detail |
|:---|:---|
| **Mandate** | Read `memory-bank/workflow-protocols.md` BEFORE any work |
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
├─ wods (id, date, sections: JSONB [content, lifts[], benchmarks[], forge_benchmarks[]], is_published, publish_time, publish_sections, google_event_id, coach_notes: TEXT)
├─ section_types (id, name, display_order)
├─ workout_types (id, name)
├─ workout_titles (id, title)
├─ exercises (id, name [UNIQUE], display_name, category, subcategory, equipment[], body_parts[], difficulty, is_warmup, is_stretch, search_terms, search_vector [GIN indexed])
├─ user_exercise_favorites (id, user_id, exercise_id, created_at [UNIQUE user_id + exercise_id])
├─ naming_conventions (id, category [equipment|movementTypes|anatomicalTerms|movementPatterns], abbr, full_name, notes)
├─ resources (id, name, description, url, category)
├─ tracks (id, name, description, color)
├─ weekly_sessions (id, date, time, workout_id, capacity, status)
├─ benchmark_workouts (id, name, type, description, display_order)
├─ forge_benchmarks (id, name, type, description, display_order)
├─ barbell_lifts (id, name, category, display_order)

Member Tables
├─ members (id, email, name, status, membership_types[], account_type: primary|family_member, primary_member_id, display_name, date_of_birth, relationship)
├─ bookings (id, session_id, member_id, status: confirmed|waitlist|cancelled|no_show|late_cancel)

Athlete Tables (linked to members.id)
├─ athlete_profiles (id, user_id, full_name, emergency_contact)
├─ workout_logs (id, user_id, wod_id, result, notes)
├─ benchmark_results (id, user_id, benchmark_name, result_value, scaling)
├─ lift_records (id, user_id, lift_name, weight_kg, reps, rep_max_type ['1RM'|'3RM'|'5RM'|'10RM'], rep_scheme [workout patterns], calculated_1rm, notes, lift_date)
```

---

## 📍 Current Status (Last 2 Weeks)

**Completed (2025-12-05 Session 37 - Sonnet):**
- **Exercise Library UX Enhancements:**
  - ✅ **Autocomplete for Exercise Form:** Added autocomplete to tags, equipment, and body parts fields in ExerciseFormModal
  - ✅ **Dropdown suggestions:** Show existing values from database as user types, filter already-added values
  - ✅ **Click to add:** Suggestions auto-append to comma-separated list with proper formatting
  - ✅ **Category filter buttons:** Added 8 quick-filter buttons above exercise list (Warm-up & Mobility, Oly Lift & Barbell, Compound Exercises, Gymnastics & Bodyweight, Core/Abs/Iso, Cardio & Cond, Strength & Cond, Recovery & Stretching)
  - ✅ **Shortened button labels:** Display names fit on single line for better layout
  - ✅ **Combined filtering:** Category filter works with search box and equipment/body parts filters
  - ✅ **CORS debugging:** Fixed port 3000 conflict caused by multiple dev servers running in Chris's terminals
  - Commit: e0995ae - feat(coach): add autocomplete and category filters to exercise library
  - Files: 2 modified (163 insertions, 44 deletions)
  - Status: Complete, tested, pushed to GitHub

**Completed (2025-12-04 Session 35 - Sonnet):**
- **Session 34 Completion - Benchmark Results Save Fix & UX Enhancements:**
  - ✅ **Root Cause Fixed:** Session 34 migration renamed columns (workout_date → result_date, result → result_value, scaling → scaling_level) but 5 component files still used old names
  - ✅ **Schema Migration Completion:** Updated ALL remaining references in AthletePageForgeBenchmarksTab (query), AthletePageRecordsTab (interface + 10+ refs), AthletePageBenchmarksTab (20+ refs), app/coach/athletes (interface + query + display)
  - ✅ **Cache Issue Resolution:** Next.js cache required full rebuild (rm -rf .next) to apply file changes - browser hard refresh insufficient
  - ✅ **Delete Icons Added:** Hover-to-show trash icons on Recent Benchmark cards (both Benchmarks and Forge Benchmarks tabs), matches Lifts tab UX pattern
  - ✅ **Scaling Dropdown Fix:** Changed condition from `!== false` to `?? true` (nullish coalescing) to properly hide dropdown when has_scaling=false
  - ✅ **Old Workout Handling:** Workouts created before Session 34 have undefined has_scaling (defaults to true), explicit false requires re-adding benchmark from library
  - ✅ **Special Benchmarks:** Documented approach for edge cases (Gwen, Lynne) - use Coach Library card description for instructions instead of complex multi-input UI
  - 🎯 **Session 34 Now Complete:** Benchmark scaling configuration and result tracking FULLY FUNCTIONAL, all save/display issues resolved
  - Commit: 8c09fc9 - fix(benchmarks): complete Session 34 schema migration and add delete icons
  - Files: 5 modified (105 insertions, 80 deletions)
  - Status: Complete and pushed to GitHub
  - **Testing:** ✅ Benchmark results save successfully, ✅ Display in tabs, ✅ Delete icons work, ✅ Scaling dropdown visibility correct

**Completed (2025-12-04 Session 34 - Chris):**
- **Benchmark Scaling Configuration & Result Tracking:**
  - ✅ **Database Migration:** Created benchmark scaling and results migration (20251204_add_benchmark_scaling_and_results.sql)
  - ✅ **Schema Design:** Added has_scaling BOOLEAN to benchmark_workouts and forge_benchmarks tables
  - ✅ **Results Table:** Created benchmark_results with XOR constraint (benchmark_id OR forge_benchmark_id)
  - ✅ **Schema Migration:** Migrated from old columns (workout_date, result, scaling) to new (result_date, result_value, scaling_level)
  - ✅ **Coach UI:** Added has_scaling checkbox in Coach Library modals (BenchmarksTab, ForgeBenchmarksTab)
  - ✅ **Coach CRUD:** Updated save operations to include has_scaling field in INSERT/UPDATE
  - ✅ **Propagation Fix:** Fixed has_scaling not copying from library to workout configuration (ConfigureBenchmarkModal, ConfigureForgeBenchmarkModal)
  - ✅ **Athlete Logbook UI:** Added result input boxes with conditional scaling dropdown (only shows when has_scaling !== false)
  - ✅ **API Route:** Created `/api/benchmark-results/route.ts` with UPSERT logic (checks existing by user_id + benchmark_name + result_date)
  - ✅ **Type Updates:** Added has_scaling to TypeScript interfaces (Benchmark, ForgeBenchmark, ConfiguredBenchmark, ConfiguredForgeBenchmark)
  - ✅ **CRUD Operations:** Initial implementation in AthletePageBenchmarksTab and AthletePageForgeBenchmarksTab
  - ⚠️ **KNOWN ISSUE (RESOLVED IN SESSION 35):** Benchmark results not saving - old column names in 5 component files
  - Commit: 7510c41 - feat(benchmarks): add scaling configuration and result tracking
  - Files: 12 modified (712 insertions, 313 deletions), 2 new files
  - Status: Code complete and pushed, resolved in Session 35

**Completed (2025-12-03 Session 33 - Chris):**
- **Lift Input Separation & Athlete Subscription Management:**
  - ✅ **Fixed Lift Input Bug:** Same lift with different rep schemes (e.g., Snatch 5x5 vs 6x6) now have separate input fields
  - ✅ **Updated liftKey Logic:** Changed from `${wod.id}-${section.id}-${lift.name}` to include `${repScheme}` for unique identification
  - ✅ **UPSERT Fix:** Database uniqueness check now includes rep_scheme (lift_name + lift_date + rep_scheme)
  - ✅ **Load Records Fix:** loadLiftRecords() matches by both lift_name AND rep_scheme when fetching existing data
  - ✅ **Workout Lift Progress Charts:** New collapsible section in AthletePageLiftsTab below Progress Charts
  - ✅ **Category Grouping:** Charts organized by Olympic, Press, Pull, Squat categories with collapse/expand
  - ✅ **Rep Scheme Display:** Charts show "Bench Press 5x5 (12 sessions)" with session count
  - ✅ **PR Tracking:** Red PR badges on highest weight for each lift+rep_scheme combination
  - ✅ **Chart Requirements:** Only shows charts with 2+ data points for meaningful progress tracking
  - ✅ **Subscription Management API:** Created `/api/members/athlete-subscription/route.ts`
  - ✅ **API Actions:** extend_trial (adds days), activate (full subscription), expire (manual expiry)
  - ✅ **Smart Date Extension:** Extends from current end date if not expired, otherwise from now
  - ✅ **Coach UI Buttons:** "+30d Trial" (teal) and "Activate" (green) in Active tab for primary members
  - ✅ **Conditional Display:** Buttons only show for primary accounts, "+30d Trial" for trial status, "Activate" for trial/expired
  - Commit: 2c066fa - feat(athlete): fix lift input separation and add subscription management
  - Files: 4 modified (394 insertions, 15 deletions), 1 new file
  - Status: Complete and pushed to GitHub
  - **Testing:** Lift input separation working, Workout Lift Progress displaying correctly, Subscription management functional

**Completed (2025-12-03 Session 32 - Chris):**
- **Lift Records Enhancement & Database Schema Fix:**
  - ✅ **Database Migration:** Created lift_records table migration (20251203_create_lift_records.sql)
  - ✅ **Schema Design:** Separated rep_scheme (workout patterns: "5x5") from rep_max_type (RM tests: '1RM', '3RM', '5RM', '10RM')
  - ✅ **XOR Constraint:** Ensures only one rep type field is set per record for data integrity
  - ✅ **Athlete Logbook Weight Tracking:** UPSERT logic for saving/updating lift records with database persistence
  - ✅ **Single-line Layout:** Lift title, athlete notes (parentheses), weight input (right-aligned, ml-auto)
  - ✅ **Default Athlete Notes:** "Record your heaviest set" pre-populated in form
  - ✅ **Lift Edit Functionality:** Click lift badges in Coach page to edit rep schemes, notes, percentages
  - ✅ **Form Pre-population:** Edit mode loads existing lift configuration into modal
  - ✅ **Recent Lifts Delete:** Hover-to-show delete button (right side) with confirmation
  - ✅ **Rep Scheme Display:** Badges show "5x5", "3x10" from workouts OR "1RM", "3RM" from PR tests
  - ✅ **Workout Visibility Fix:** Details show 1 hour BEFORE session start (datetime comparison, not date-only)
  - ✅ **ConfigureLiftModal Cleanup:** Removed coach notes section, removed scaling options
  - ✅ **Data Cleanup Script:** SQL to remove faulty lift records with UUID keys (cleanup-faulty-lift-records.sql)
  - ⚠️ **CRITICAL ISSUE:** Migration not yet applied - rep_scheme column missing from database cache
  - ⚠️ **ACTION REQUIRED (Mimi):** Execute migration in Supabase SQL Editor before testing lift records
  - Commit: 741ffd4 - feat(lifts): add rep scheme tracking and fix database constraint error
  - Files: 11 modified (464 insertions, 102 deletions), 2 new files
  - Status: Code complete and pushed, migration pending execution by Mimi
  - See `project-history/2025-12-03-session-32-lift-records-enhancement.md`

**Completed (2025-12-02 Session 31 - Mimi):**
- **Athlete Logbook Badge Display:**
  - ✅ **Extended WOD interface:** Added lifts[], benchmarks[], forge_benchmarks[] to logbook-utils.ts
  - ✅ **Format helpers:** Created formatLift, formatBenchmark, formatForgeBenchmark functions
  - ✅ **Badge rendering:** Color-coded badges (blue=lifts, teal=benchmarks, cyan=forge) in AthletePageLogbookTab
  - ✅ **Display details:** Shows movement names, scaling options, descriptions alongside exercises
  - Commit: dfaeef33 - feat(athlete): add structured movement badges to Logbook tab

- **Coach Library Improvements:**
  - ✅ **Part 1: Database-Driven Workout Types**
    - Replaced hardcoded arrays with database fetches from workout_types table
    - Added fetchWorkoutTypes to benchmarks-lifts/page.tsx
    - Updated BenchmarksTab + ForgeBenchmarksTab dropdowns to use database types
    - User manages types directly in Supabase (simplified approach)
  - ✅ **Part 2: Tracks Tab Migration**
    - Added Tracks as 6th tab in Coach Library (purple theme)
    - Full Track CRUD: create, edit, delete with inline modal
    - Track fields: name, description, color picker
    - Removed Track management from Analysis page (~85 lines)
    - Analysis page retains read-only track statistics
  - Commit: 64924865 - feat(coach): database-driven workout types + Tracks tab migration
  - Files: 4 modified (303 insertions, 112 deletions)
  - Status: Coach Library consolidation complete, Tracks centralized

**Completed (2025-12-01 Session 30 - Mimi):**
- **Refactor Branch Testing & Merge (Sessions 26-29):**
  - ✅ **Build verification:** Fixed TypeScript error in WorkoutFormFields (any → WODFormData union type)
  - ✅ **Full testing completed:** SessionManagementModal, AthletePageLogbookTab, WorkoutModal components
  - ✅ **All critical paths verified:** Booking operations, workout logging, modal interactions
  - ✅ **Edge cases tested:** Capacity auto-promotion, multiple logs/day, overlay rendering
  - ✅ **Zero regressions:** Drag/drop, calendar views, athlete tabs all functional
  - ✅ **Merged refactor/useWorkoutModal-extraction → main:** Fast-forward merge (17 commits)
  - ✅ **Branch cleanup:** Deleted remote and local refactor branch
  - **Total impact:** 1,207 lines eliminated, 12 focused files, 47-62% file size reductions
  - Commits: fde276a2 (TypeScript fix), plus 16 refactor commits from Sessions 26-29
  - Status: Refactoring complete, codebase ready for Week 1 launch tasks
  - Branch: main (now includes all refactoring)

**Completed (2025-11-30 Session 29 - Mimi):**
- **Large File Refactoring - SessionManagementModal & AthletePageLogbookTab:**
  - ✅ **SessionManagementModal extraction:** 944 → 357 lines (62% reduction, 587 lines saved)
  - ✅ **Created 3 utilities:** modalStateHelpers.ts, bookingHelpers.ts, sessionCapacityHelpers.ts (193 lines total)
  - ✅ **Created 3 hooks:** useSessionDetails (142), useSessionEditing (160), useBookingManagement (210)
  - ✅ **Created 3 components:** SessionInfoPanel (162), ManualBookingPanel (68), BookingListItem (95)
  - ✅ **AthletePageLogbookTab extraction:** 918 → 483 lines (47% reduction, 435 lines saved)
  - ✅ **Created 2 hooks:** useLogbookData (270), useWorkoutLogging (85) - eliminates 300+ lines of duplication
  - ✅ **Created utilities:** logbook-utils.ts (date helpers + getPublishedSections)
  - ✅ **Fixed critical overlay bugs:** Black screen rendering order + opacity syntax (`bg-black bg-opacity-30` → `bg-black/30`)
  - ✅ **Standardized opacity syntax:** Updated WorkoutModal, NotesModal, app/coach/athletes/page.tsx to modern Tailwind
  - **Total refactoring impact (Sessions 26-29):** 1,207 lines eliminated, 12 new focused files created
  - Commits: 1fb6fbec, 8e6cc3a4, a09e3c62, bd564372, 8ad79af5 (14 files changed)
  - Branch: refactor/useWorkoutModal-extraction (pushed, ready for testing → merge)
  - See `project-history/2025-11-30-session-29-component-refactoring-completion.md`

**Completed (2025-11-30 Session 28 - Mimi):**
- **WorkoutModal Header & Notes Extraction:**
  - ✅ **WorkoutModal.tsx extraction:** 797 → 612 lines (23% reduction, 185 lines saved)
  - ✅ **Created 2 components:** WorkoutModalHeader (112 lines), CoachNotesPanel (141 lines)
  - ✅ **Eliminated 185 lines of duplication** between panel and modal modes
  - ✅ **Fixed type compatibility:** WorkoutFormFields nullable types (color, workout_id)
  - ✅ **Zero breaking changes:** Both panel and modal modes tested and working
  - ✅ **Publish workflow tested:** Save → Re-open → Publish confirmed working
  - **Total refactor impact (Sessions 26-28):** 778 lines of duplication eliminated
  - Commits: d3337907 (4 files, 358 insertions, 290 deletions)
  - Branch: refactor/useWorkoutModal-extraction (pushed, ready to merge)
  - **Next:** Merge to main or continue with other large files
  - See `project-history/2025-11-30-session-28-WorkoutModal-header-notes-extraction.md`

**Completed (2025-11-29 Session 27 - Mimi):**
- **WorkoutModal Component Refactoring:**
  - ✅ **Full testing of Session 26 hook refactor:** All workflows tested (save/edit/publish/unpublish) - working perfectly
  - ✅ **Environment setup:** Added missing SUPABASE_SERVICE_ROLE_KEY to .env.local (required for publish workflow)
  - ✅ **WorkoutModal.tsx extraction:** 1,036 → 797 lines (23% reduction, 239 lines saved)
  - ✅ **Created 2 form components:** SessionTimeEditor (118 lines), WorkoutFormFields (121 lines)
  - ✅ **Fixed session selection bug:** Replaced direct Set mutation with proper setter (handleSessionSelectionToggle)
  - ✅ **Eliminated 266 lines of duplication** between panel and modal modes
  - ✅ **Zero breaking changes:** Panel mode tested and working
  - Commits: 060ad711 (4 files, 337 insertions, 281 deletions)
  - Branch: refactor/useWorkoutModal-extraction (completed in Session 28)
  - See `project-history/2025-11-29-session-27-WorkoutModal-component-refactor.md`

**Completed (2025-11-29 Session 26 - Mimi):**
- **useWorkoutModal Hook Refactoring:**
  - ✅ **Large file analysis:** Analyzed entire codebase, identified 39 files over 300 lines (6 critical files 800+ lines)
  - ✅ **useWorkoutModal extraction:** 1,123 lines → 769 lines (31% reduction)
  - ✅ **Created 3 focused hooks:** useSectionManagement (201), useMovementConfiguration (176), useModalResizing (160)
  - ✅ **Fixed resize jitter bug:** Notes panel resize now stable (captured initial position in start state, removed dependency causing re-renders)
  - ✅ **Zero breaking changes:** WorkoutModal.tsx required no modifications, interface maintained
  - ⏸️ **Testing:** 10/13 checklist items passed (save/edit/publish workflows deferred to next session)
  - Commit: 365b8e0c (4 files, 612 insertions, 427 deletions)
  - Branch: refactor/useWorkoutModal-extraction (ready to merge after full testing)
  - See `project-history/2025-11-29-session-26-useWorkoutModal-refactor.md`

**Completed (2025-11-29 Session 25 - Mimi):**
- **January Launch Planning & Dual-User Workflow Setup:**
  - ✅ **Launch timeline established:** 5-week plan (Dec 2 - Jan 5) for production deployment
  - ✅ **Dual-user Git workflow:** Mimi (mimihiles) and Chris (chrishiles) collaborating via GitHub organization
  - ✅ **GitHub authentication:** Configured personal access token (no expiration) for Mimi's Mac user
  - ✅ **Synology sync conflict resolved:** Eliminated 3-way sync (2 Mac users + NAS) causing folder duplication, switched to GitHub-only workflow
  - ✅ **Chris Notes cleanup:** Removed 17 bloated files (old chats, exercise backups, binaries), kept 26 useful reference files, now synced via Git
  - ✅ **Handover test:** Created HANDOVER-TEST.md for Chris to verify dual-user workflow (4 commits pushed successfully)
  - ⚠️ **Analysis page scroll bug:** Attempted 7+ different fixes (overflow-anchor, preventDefault, blur, scroll preservation) - DEFERRED to Week 1
  - 🎯 **Target launch:** January 2025 (1 month timeline)
  - 📋 **Outstanding:** RLS policies migration (CRITICAL), production build verification, feature tweaks discussion
  - Commits: 11 total (Memory Bank, Chris Notes sync/cleanup, handover test, 7 bug fix attempts)
  - Status: Dual-user workflow operational, deployment planning complete

**Completed (2025-11-28 Session 24):**
- **Analysis Page Unified Movement Tracking & Workout Modal Fix:**
  - ✅ **Workout modal display fix:** Benchmark/forge benchmark descriptions now show in both expanded and collapsed views
  - ✅ **Unified movement tracking:** Analysis page now tracks lifts, benchmarks, forge benchmarks, and exercises in single searchable interface
  - ✅ **Display names across Analysis:** All components (search, chips, top exercises, library modal) show formatted names instead of slugs
  - ✅ **Equipment badges:** Added to search dropdown and Browse Library modal for quick equipment identification
  - ✅ **Smart category filtering:** Category filters apply only to exercises (not lifts/benchmarks which don't have categories)
  - ✅ **Movement analytics consolidation:** Using movement-analytics utilities for all 4 movement types (parallel fetch with Promise.all)
  - Modified: WODSectionComponent.tsx, analysis/page.tsx, StatisticsSection.tsx, ExerciseLibraryPanel.tsx
  - Commit: f3b1d84 (393 insertions, 248 deletions)
  - Branch: main (pushed)
  - See `project-history/2025-11-28-session-24-analysis-unified-tracking.md`

**Completed (2025-11-27 Session 23):**
- **Exercise Analytics, Favorites & Programming References Migration:**
  - ✅ **Exercise frequency tracking:** Time range filters (All, 1M, 3M, 6M, 12M), purple "Used Xx" badges on exercise cards
  - ✅ **Enhanced regex patterns:** Now captures exercises with special characters (°, /, .), added fallback pattern for plain names
  - ✅ **Favorites system:** Star toggle on exercises, favorites section (amber) in Movement Library, database persistence
  - ✅ **Recently used:** localStorage tracking of last 10 exercises, blue section in Movement Library
  - ✅ **Display name fixes:** Movement Library now shows formatted names (not slugs) across all sections
  - ✅ **Programming references migration:** 45 naming conventions + 9 resources migrated from JSON to database (naming_conventions, resources tables)
  - ✅ **Data cleanup:** Removed "none" from 209 bodyweight exercises, cleared test workouts
  - New files: exercise-favorites.ts, exercise-storage.ts, 2 database migrations
  - Modified: ExercisesTab.tsx, MovementLibraryPopup.tsx, benchmarks-lifts/page.tsx, ReferencesTab.tsx, movement-analytics.ts
  - Commit: f5700aa (1,078 insertions, 99 deletions)
  - Branch: main (pushed)
  - See `project-history/2025-11-27-session-23-exercise-analytics-favorites.md`

**Completed (2025-11-26 Session 22):**
- **Exercise Library Filters & Video Playback:**
  - ✅ **Multi-select filters:** Equipment and body parts dropdowns (OR within groups, AND between groups)
  - ✅ **Video modal:** Resizable (600x400-1400x900), draggable, YouTube/HTML5 support, 📹 icons
  - ✅ **Equipment population:** Pattern-matching script populated 421/522 exercises (80.7%), 14 unmatched
  - ✅ **Enhanced search:** Extended to 8 fields (name, display_name, category, subcategory, tags, equipment, body_parts, search_terms)
  - ✅ **Critical correction:** "bodyweight" moved from equipment to search_terms (equipment = physical items only)
  - New files: MultiSelectDropdown.tsx, ExerciseVideoModal.tsx, video-helpers.ts, populate-equipment.ts
  - Modified: ExercisesTab.tsx, MovementLibraryPopup.tsx, benchmarks-lifts/page.tsx
  - Commit: a38765d (1,495 insertions, 37 deletions)
  - Branch: main (pushed)
  - See `project-history/2025-11-26-session-22-exercise-filters-video.md`

**Completed (2025-11-25 Session 21):**
- **Comprehensive Testing & Bug Fixes:**
  - ✅ **Testing:** 22/25 test cases passed (3-state system, booking flows, athlete pages, integration)
  - ✅ **Bug Fix #1:** Publish time reverting to 09:00 (2-hour debug - missing sessionTime prop on panel mode PublishModal)
  - ✅ **Bug Fix #2:** Auto-promote waitlist on booking cancellation (added to cancel route with 10-card tracking)
  - ✅ **Bug Fix #3:** Auto-promote waitlist on capacity increase (added to SessionManagementModal)
  - ✅ **Bug Fix #4:** Month view timezone bug (replaced toISOString with formatLocalDate in AthletePageLogbookTab)
  - ✅ **UX Improvements:** Rep max types in lift chart headers, PR badge color customization (all red for lifts, scaling-based for benchmarks)
  - ✅ **Exercise Modal:** Category/subcategory dropdowns with localStorage persistence for custom entries
  - Commits: e05b1e2 (publish time), f992e78 (auto-promotion + timezone), 1e1f4fd (dropdowns)
  - Branch: main (pushed)
  - See `project-history/2025-11-25-session-21-testing-deployment-prep.md`

**Completed (2025-11-24 Session 20):**
- **Exercise Library Complete Import & UI Text Fixes:**
  - ✅ **Full Exercise Import:** Parsed 8 corrected markdown files → 522 clean exercises
  - ✅ Created `parse-exercises.ts` script (markdown → JSON with typo fixes)
  - ✅ Created `clean-and-import-exercises.ts` (database refresh script)
  - ✅ Fixed 6 duplicate exercise names (category slug suffixes)
  - ✅ Deleted 1,062 mixed/incorrect exercises, imported 522 verified exercises
  - ✅ **UI Text Color Fixes:** Fixed greyed-out text in ExercisesTab and ReferencesTab
  - ✅ Search input, collapse arrows, list items, modal inputs now properly visible
  - **Exercise Breakdown:** Warm-up (110), Gymnastics (108), Core (83), Cardio (50), Strength (48), Recovery (46), Compound (44), Olympic (33)
  - **Database State:** Clean, verified data with all fields populated (equipment[], body_parts[], difficulty, search_terms)
  - Commits: a176d7c (UI fixes), 0bd5b4c (import system)
  - Branch: main (pushed)
  - See `project-history/2025-11-24-session-20-exercise-library-complete.md`

**Completed (2025-11-23 Session 19):**
- **Proactive Code Refactoring (Coach Library & Analysis Pages):**
  - ✅ **Coach Library Refactor:** app/coach/benchmarks-lifts/page.tsx: 1776 → 863 lines (52% reduction)
  - ✅ Extracted 5 tab components: BenchmarksTab (191), ForgeBenchmarksTab (278), LiftsTab (177), ExercisesTab (173), ReferencesTab (422)
  - ✅ Replaced all `any` types with proper TypeScript interfaces (NamingConvention, Resource)
  - ✅ **Analysis Page Refactor:** app/coach/analysis/page.tsx: 1522 → 887 lines (42% reduction)
  - ✅ Extracted 5 components: TrackModal (96), TrackManagementSection (81), DateRangePicker (200), ExerciseLibraryPanel (131), StatisticsSection (400)
  - ✅ Both refactors: Zero build errors, all functionality preserved
  - ✅ User confirmed: "All working" on Coach Library refactor
  - **Total Impact:** 10 new components, 1,548 lines extracted (47% reduction across both pages)
  - **Strategy Applied:** Proactive refactoring at ~1500 lines (lesson from Session 8)
  - Commits: 4434ed7 (Coach Library), c5c3887 (Analysis)
  - Branch: main (pushed)
  - See `project-history/2025-11-23-session-19-code-refactoring.md`

**Completed (2025-11-22 Session 18):**
- **Coach Library UX Enhancements:**
  - ✅ References tab: All 5 sections → 3-column grid, alphabetical sorting, grey theme
  - ✅ Exercises tab: Search/filter, collapsible categories, alphabetical sorting within categories
  - ✅ Exercise Library modal: Alphabetical sorting
  - ✅ Navigation: "Benchmarks & Lifts" → "Coach Library"
  - Commits: aa29b45 (grey bg), c684d27 (UX enhancements), 3705f46 (nested button fix)
  - Branch: main (pushed)

**Completed (2025-11-22 Session 17):**
- **Exercise Import System & Movement Library UX Improvements:**
  - ✅ **Exercise Import System:** Database schema extension with 8 new fields (display_name, subcategory, equipment[], body_parts[], difficulty, is_warmup, is_stretch, search_terms, search_vector)
  - ✅ Full-text search via trigger (weighted: name=A, search_terms=B, tags=C) with GIN index
  - ✅ Bulk import script using service role key: `npx tsx scripts/import-exercises.ts`
  - ✅ ExerciseFormModal with CRUD operations (comma-separated arrays, difficulty dropdown)
  - ✅ Added 4th "Exercises" tab to Benchmarks/Lifts page (8 categories, 5-column grid)
  - ✅ RLS policy: Read/Write enabled, Delete blocked (admin-only via dashboard)
  - ✅ Imported 55 exercises across 8 categories (sample data ready for 400+ full import)
  - ✅ **Movement Library UX:** Workout flow category ordering (Warm-up → Olympic → Compound → Gymnastics → Core → Cardio → Specialty → Recovery)
  - ✅ Ultra-compact layout: gap-0, px-0.5 py-0.5, text-xs (maximum density)
  - ✅ Dynamic 5-column cap prevents overcrowding (responsive 2-5 columns based on width)
  - ✅ **Active Section Fix:** Changed from direct mutation to proper setter (exercises now insert into clicked section)
  - Dependencies: Added dotenv, tsx for import script execution
  - Commits: 1c6cb43 (13 files, 2,955 insertions)
  - Branch: main (direct commits)
  - See `project-history/2025-11-22-session-17-exercise-import-movement-library-ux.md`

**Completed (2025-11-21 Session 16 - Phase 3-4):**
- **Movement Library Feature - Phase 3-4 (Athlete Display & Analytics):**
  - ✅ **Phase 3 - Athlete Display:** Badge rendering in AthletePageWorkoutsTab with format helpers
  - ✅ Blue (lifts), teal (benchmarks), cyan (forge) badges match coach view
  - ✅ Descriptions render with whitespace-pre-wrap for proper formatting
  - ✅ Past workouts show full details, future bookings show "Booked" placeholder
  - ✅ **Phase 4 - Analytics:** Created `utils/movement-analytics.ts` with comprehensive query functions
  - ✅ Lift frequency analysis: avgSets, avgReps, mostCommonPercentage
  - ✅ Benchmark/Forge frequency: mostCommonScaling, type, lastUsed date
  - ✅ Date range filtering (startDate, endDate) for all queries
  - ✅ Combined summary function, individual lookup by ID, sorted by frequency
  - ✅ Zero build errors, type-safe implementation ready for dashboard integration
  - 🎯 **Movement Library feature-complete:** All 4 phases done, ready for merge to main
  - Commits: 916a082 (Phase 3-4)
  - Branch: movement-library-feature (pushed)
  - See `project-history/2025-11-21-session-16-movement-library-phase-3-4.md`

**Completed (2025-11-21 Session 15 - Phase 2):**
- **Movement Library Feature - Phase 2 (Badge Display & UX):**
  - ✅ Badge display in WODSectionComponent (blue=lifts, teal=benchmarks, cyan=forge)
  - ✅ Format helpers: "Back Squat 5x5 @ 75%", "Fran (Rx)", variable reps "5-3-1"
  - ✅ Remove buttons [×] with handlers for each badge type
  - ✅ Database persistence verified (badges persist after save/reload)
  - ✅ Calendar hover preview shows structured movements with descriptions
  - ✅ Added description field to ConfiguredBenchmark/ConfiguredForgeBenchmark types
  - ✅ Configure modals: Draggable, positioned to right (820px), stay open after Add
  - ✅ Done button replaces back/X (reopens Movement Library)
  - ✅ Movement Library positioned to right for side-by-side workflow
  - Commits: 5c0dd28 (Phase 2)
  - Branch: movement-library-feature (pushed)
  - See `project-history/2025-11-21-session-15-movement-library-phase-2.md`

**Completed (2025-11-20 Session 14 - Phase 1):**
- **Movement Library Feature - Phase 1 (Lifts, Benchmarks, Forge):**
  - ✅ Created `/types/movements.ts` with TypeScript interfaces for structured data
  - ✅ Extended WODSection schema: Added lifts[], benchmarks[], forge_benchmarks[] JSONB fields
  - ✅ Built MovementLibraryPopup with 4 tabs (Exercises | Lifts | Benchmarks | Forge)
  - ✅ Fetches from barbell_lifts, benchmark_workouts, forge_benchmarks tables
  - ✅ ConfigureLiftModal: Constant reps (5x5 @ 75%) & Variable reps (per-set table with reps/percentages)
  - ✅ ConfigureBenchmarkModal & ConfigureForgeBenchmarkModal (scaling, visibility, notes)
  - ✅ useWorkoutModal: Added 9 handlers (select/add/remove for each movement type)
  - ✅ WorkoutModal: Integrated all modals with button-based insertion (mobile-friendly)
  - ✅ Build passes with zero errors
  - Commits: b169c7e (Phase 1)
  - Branch: movement-library-feature (pushed)
  - See `project-history/2025-11-20-session-14-movement-library-phase-1.md`

**Completed (2025-11-18 Session 13):**
- **WorkoutModal Refactor & Time Selector Improvements:**
  - ✅ Refactored WorkoutModal: 2256 → 905 lines (60% reduction)
  - ✅ Created useWorkoutModal.ts hook (946 lines) - all state/logic extracted
  - ✅ Fixed 30 pre-existing ESLint errors across 8 files (build now passes)
  - ✅ Fixed time selector broken by refactor (needed setter functions)
  - ✅ Split time selector: Separate hour (00-23) and minute (00/15/30/45) dropdowns
  - ✅ Strip seconds from time display (10:30:00 → 10:30)
  - ✅ Main Save button now saves pending time changes (was only small Save button)
  - Re-exported WODFormData/WODSection types for backwards compatibility
  - Commits: 8 commits (45455bc → 8bed8fb)
  - Branch: workout-modal-refactor (pushed)
  - See `project-history/2025-11-18-session-13-workout-modal-refactor.md`

**Completed (2025-11-18 Session 12):**
- **Independent Workout Architecture & Delete Simplification:**
  - ✅ Refactored Apply to Sessions: Creates independent workout copies (not shared references)
  - ✅ Each session gets unique workout_id (prevents cascading edits)
  - ✅ Fixed workout_logs: Can now log multiple sessions per day
  - ✅ Fixed empty session editing: Links new workout to session_id
  - ✅ Simplified delete: Removed smart prompt logic (no legacy data to handle)
  - ✅ Delete reduces from 77 → 28 lines (64% reduction)
  - Architecture: Shared workout_id → Independent copies per session
  - Commits: be92e8f (smart delete), c4a4934 (docs), c5ff461 (independent copies), d7a9cd9 (simplify)
  - Branch: coach-page-refactor (pushed)
  - See `project-history/2025-11-18-session-12-independent-workouts.md`

**Completed (2025-11-17 Session 11):**
- **Workout Operations & Copy/Paste Critical Fixes:**
  - ✅ Two-step delete: Workout delete → empty session (preserves bookings), session delete → remove all
  - ✅ Fixed copy/paste wrong times: Fetch session times from DB (not stale `classTimes`)
  - ✅ Fixed create workout on populated days: Check `selectedSessionIds.size` not `otherSessions.length`
  - ✅ Collapsible Thursday: Collapsed by default, toggle in week banner, dynamic grid 6/7 cols
  - Commits: f0ae640 (delete), a21e8d8 (DB fetch), 06a763d (logic fix), 490b978 (Thursday)
  - Branch: coach-page-refactor (pushed)
  - See `project-history/2025-11-17-session-11-workout-operations-fixes.md`

**Completed (2025-11-17 Session 10):**
- **Exercise Library Multi-Section Workflow Enhancement:**
  - ✅ Added ONE global "Library" button (next to "Add Section") replacing per-section buttons
  - ✅ Click any section to set it as active target for exercise insertion
  - ✅ Library stays open while switching between sections
  - ✅ No need to close/reopen library when populating multiple sections
  - ✅ Fixed bug: exercises now insert into clicked section, not always first section
  - Implementation: Added `onSetActive` prop, onClick handler on section wrapper, simplified `openLibrary()` function
  - UI: White Library button with teal border, cleaner section headers
  - Commits: 8f3a08a (WODModal rename), 466c619 (global library), ae89508 (activeSection fix)
  - Branch: coach-page-refactor (pushed)

- **Component Naming Convention Fix:**
  - ✅ Renamed `WODModal` → `WorkoutModal` (15 code files updated)
  - ✅ Aligns with terminology: "WOD" = section type only, "Workout" = general term
  - ✅ Updated all imports, component names, and documentation
  - Files: WorkoutModal.tsx, CalendarNav.tsx, PublishModal.tsx, SearchPanel.tsx, CalendarGrid.tsx, NotesModal.tsx, QuickEditPanel.tsx, useWODOperations.ts, useQuickEdit.ts, useCoachData.ts, useDragDrop.ts, useNotesPanel.ts, card-utils.ts, movement-extraction.ts, app/coach/page.tsx
  - Branch: coach-page-refactor (part of session)

**Completed (2025-11-17 Session 9):**
- **Coach Dashboard & Session Management Critical Fixes:**
  - ✅ Fixed multi-session creation: Check for existing sessions before INSERT (was violating unique constraint)
  - ✅ Session Management modal now shows all family member bookings (was showing "Unknown Member")
  - ✅ Fixed foreign key relationship: `members!bookings_member_id_fkey` for proper join
  - ✅ Hover popover shows all workout sections (removed filter excluding Warm-up, Cool Down, etc.)
  - ✅ Monthly view Copy/Delete buttons visible (added white background/shadow)
  - ✅ Family member profile updates work via members table (bypasses athlete_profiles RLS)
  - ✅ Added workout title CRUD UI to Schedule Tab (Create/Edit/Delete/Toggle active)
  - Commits: 1fc9380 → f0716fd (9 commits total)
  - Branch: coach-page-refactor
  - See `project-history/2025-11-17-coach-session-fixes.md`

**Completed (2025-11-15 Session 8):**
- **Fixed Card Clickability Bug from Refactor:**
  - ✅ Fixed z-index bug, made entire card clickable with smart event delegation
  - ✅ Cards now work correctly when Workout Library open
  - ✅ Section drag to closed cards deprioritized (partial implementation, works when modal open)
  - Commits: 3fc498a → 06c0442 (7 commits), Branch: coach-page-refactor

**Completed (2025-11-15 Session 7):**
- **Chart Visibility & Analysis Page Fixes:**
  - ✅ Fixed invisible gridlines in Lifts tab modal chart (added white stroke to CartesianGrid)
  - ✅ Darkened chart lines in Lifts & Forge Benchmarks tabs (#83e1b2ff → #208479 for better contrast)
  - ✅ Fixed Analysis page "Total Workouts" count: Now queries weekly_sessions (not wods table), matches calendar view
  - ✅ Only counts published workouts (filters by workout_publish_status === 'published')
  - ✅ Fixed week calculation: Monday-Sunday week (was Sunday-Saturday rolling window)
  - ✅ Updated both data query and UI label to use Monday-Sunday logic
  - ✅ Fixed track modal overlay: Semi-transparent bg-black/50 (was solid black bg-black bg-opacity-50)
  - Commits: af46e1f (charts), 29fcba4 (track modal), 21cbfa7 (analysis fixes)
  - Branch: augment-refactor (32 commits ahead, pushed)

**Completed (2025-11-14 Session 6):**
- **3-State Workout System Fixes & Athlete Booking Display:**
  - ✅ Fixed 3-state transitions: Save with content → draft (not auto-publish), edit preserves status, copy preserves both publish flags
  - ✅ Fixed exercise library: Auto-expand section before opening (prevents silent failure)
  - ✅ Athlete Workouts Tab: Fetch bookings first (not published workouts), show all bookings with session times
  - ✅ Athlete Logbook: Future bookings show "Booked" in Day/Week/Month views (light teal #7dd3c0)
  - ✅ Past attended workouts show full details + logging forms
  - ✅ UI updates: Benchmarks-Lifts page color schemes (Forge=cyan, Lifts=blue/sky, modals=dark)
  - Commits: 8 commits (15f87b8 → 5b9461c)
  - Branch: augment-refactor (26 commits ahead, pushed)
  - See `project-history/2025-11-14-3-state-fixes-booking-display.md`

**Completed (2025-11-13 Sessions 4-5):**
- **Athlete UI Enhancements - PR Logic & Layout Improvements:**
  - ✅ **Session 4 (Claude Code):** Fixed critical PR selection algorithm bug in Records tab (grouped comparison, not pairwise)
  - ✅ Standardized badge colors: Rx=red-600, Sc1=blue-800, Sc2=blue-500, Sc3=blue-400 (all tabs)
  - ✅ Progress Chart PR badges: RED for overall best, color-coded for scaling-level PRs
  - ✅ Layout improvements: Recent sections (3-col grid), main cards (inline attempt count), Records cards (4-col grid, badges replace icons)
  - ✅ Lifts tab: Estimated 1RM inline in brackets, best rep max priority display
  - ✅ **Session 5 (Cline):** UI refinements - enhanced shadows/rounded corners, typography upgrades, absolute badge positioning
  - ✅ Merged athlete-card-styling → augment-refactor (fast-forward, no conflicts)
  - 🧪 Dark theme experiment on Lifts tab (to be refined)
  - Branch: augment-refactor (18 commits ahead of main, pushed)
  - Status: Continuing testing before main branch replacement
  - See `project-history/2025-11-13-athlete-ui-enhancements.md`

**Completed (2025-11-12 Session 3):**
- **Athlete Tabs UI & Critical PR Logic Fix:**
  - ✅ Fixed critical bug: Time-based PRs now show BEST (lowest) time, not most recent (Fran: 7:55 not 10:31)
  - ✅ Consistent teal schemes: Medium Teal (Benchmarks), Electric Teal (Forge), Teal Blue (Lifts)
  - ✅ Full-width charts, white grid lines, year in dates, scaling badge colors (Rx=red, Sc1=dark blue, Sc2=blue)
  - Commits: 7134361, fb310e3, 7d0e28e (augment-refactor, pushed)
  - See `project-history/2025-11-12-athlete-tabs-ui-pr-fixes.md`

**Completed (2025-11-12 Sessions 1-2):**
- **Athlete Page Refactoring & Tab Enhancements:**
  - ✅ Split athlete/page.tsx: 2000+ lines → 268 lines, 8 tab components extracted
  - ✅ Added Recent sections, Progress Charts, PR badges to Benchmarks/Forge/Lifts tabs
  - Commits: 13f33a5, 2ee2e2b, af9dd4e, f4fb134 (augment-refactor)

**Completed (2025-11-09 Session 2):**
- **Workflow Protocol Fixes (Critical):**
  - ✅ Added mandatory git sync step to session start protocol
  - ✅ Fixed file paths in workflow-protocols.md to use absolute paths (were failing every session)
  - ✅ Documented root cause failures in protocol adherence
  - Commits: 7242ea5 (git sync), 71fc89c (absolute paths)
  - **Lesson:** Protocol documentation itself had bugs causing repeated failures

**Completed (2025-11-09 Session 1):**
- **3-State Workout System Implementation:**
  - ✅ Added `workout_publish_status` column to wods table (null/draft/published)
  - ✅ Separated session booking from workout publishing
  - ✅ Sessions auto-publish on generation (immediately bookable)
  - ✅ Workouts auto-publish when saved with content
  - ✅ Visual card states: Empty (light grey, dashed), Draft (dark grey, solid), Published (teal + 📊)
  - ✅ Drag handle in top-left corner for copying workouts
  - ✅ Auto-create default 09:00 session if none exist on date
  - ✅ Updated fetchWODs to query weekly_sessions with workout join
  - ✅ Schedule & Book pages: 3-column grid layout grouped by day
  - ✅ Built "Apply to Other Sessions" feature (link multiple sessions to one workout)
  - Commit: 9374e44 (3-state system)
  - Related: b15cc4a (apply to sessions), e352a42 (diagnostic cleanup), de2d30e (docs)

**Completed (2025-11-08 Session 2):**
- **RLS Issue Resolved:** Member registration now working via proper signup flow
  - ✅ Fixed signup to create members record after auth.signUp()
  - ✅ Used user.id from auth response (satisfies members.id constraint)
  - ✅ Tested: Signup creates members record with status='pending'
  - ✅ Verified: RLS blocks unauthenticated access correctly
  - Root cause: Yesterday's raw SQL tests bypassed auth context
  - Commit: 50d8656 (signup fix)

**Completed (2025-11-08 Session 1):**
- **Security & Testing:** Production readiness improvements
  - ✅ Tested late cancel/no-show functionality - fully operational
  - ✅ Fixed bug: `late_cancel` status missing from 10-card recalculation (TenCardModal.tsx:60)
  - ✅ Created RLS migrations for athlete/benchmark data protection
  - ⚠️ Discovered signup didn't create members records (fixed in Session 2)
  - See `project-history/2025-11-08-rls-debugging-session.md` for diagnostic process
  - Commits: ea1aad4 (10-card fix), 2045f77 (initial RLS), 50453a2 (docs), 0747b1c (debug session), 9653a54 (docs update)

**Completed (2025-11-07):**
- **UI Refinements:** Coach and Athlete page improvements
  - Coach pages: Changed background to gray-400 for consistency with athlete pages
  - Coach Benchmarks & Lifts: Compact 5-column grid, teal cards, count badges, darker text
  - Drag-and-drop reordering for Forge Benchmarks with grip handle (fixes button conflicts)
  - Athlete benchmarks: Cards collapse to show only name, expand on hover, results always visible
  - See `project-history/2025-11-07-ui-refinements.md` for details

**Completed (2025-11-06 Session 2):**
- **Athlete UI Redesign & UX Improvements:** Comprehensive redesign with 8 commits
  - Cyan theme: Darker background (gray-400), cyan cards across all tabs
  - Barbell Lifts: Removed categories, 5-column grid, olympic lifts on dedicated bottom row
  - Benchmarks: Intelligent sorting (completed first, then by recency)
  - Personal Records: Forge Benchmarks section, collapsible accordions, 4-column layout
  - Charts: Red "PR!" badges on best results per scaling level
  - Fixed lift display to show actual rep max type (not estimated 1RM only)

**Completed (2025-11-06 Session 1):**
- **Athlete Page Enhancements:** Benchmark cards and PR display
  - Added Forge Benchmarks tab (fetches from `forge_benchmarks` table)
  - Compact card design: 5 columns on large screens, hover shows details
  - Fixed PR logic: Prioritizes scaling hierarchy (Rx > Sc1 > Sc2 > Sc3) then best time
  - Multi-PR display: Shows best result per scaling level (e.g., Rx 20:41, Sc1 7:55)

**Completed (2025-11-05):**
- **Database-Driven Benchmarks & Lifts:** Coach management UI for benchmarks and lifts
  - Replaced hardcoded arrays with database tables
  - Coach CRUD interface at `/coach/benchmarks-lifts` with 3 tabs
  - Athletes now see dynamic lists based on coach configuration
  - Tables: `benchmark_workouts`, `forge_benchmarks`, `barbell_lifts`

**Known Issues:**
- macOS iCloud Keychain autofill popups (OS behavior, not app bug)

**Lessons Learned:**
- **2025-12-04 (Session 35):** Next.js aggressive caching requires manual intervention - Hard browser refresh insufficient when compiled modules cached. Solution: Stop server, `rm -rf .next`, restart. Symptoms: Git shows correct code, browser shows old behavior, grep confirms new code.
- **2025-12-04 (Session 35):** Nullish coalescing (??) for optional booleans - When boolean can be undefined/true/false, use `(field ?? true)` not `field !== false`. Latter treats undefined as true (shows when shouldn't). Former explicitly defaults undefined to true.
- **2025-12-04 (Session 35):** Schema migrations are global operations - Renaming columns affects ALL files that query that table, not just new feature files. Must search entire codebase (components/, app/) for old column names. Includes: interfaces, queries (.order, .select), display (result.column_name).
- **2025-12-04 (Session 35):** Edge case documentation beats complex UI - For rare special cases (Gwen, Lynne needing multiple inputs), document workaround in Coach Library card description instead of building complex multi-input UI. Simple instructions beat overengineering.
- **2025-12-04 (Session 34):** Schema migrations require component-wide updates - When changing database column names (workout_date → result_date), must update ALL components that query that table, not just new ones. Search for `.workout_date` globally to find all references. Includes interfaces, CRUD operations, and display logic.
- **2025-12-04 (Session 34):** XOR constraints need both IDs on INSERT - When benchmark_results has XOR constraint (benchmark_id OR forge_benchmark_id), INSERT must include appropriate ID. Fetch from source table (benchmark_workouts or forge_benchmarks) before inserting result.
- **2025-12-04 (Session 34):** Type field propagation in structured data - When adding boolean flags to structured movement data (has_scaling), must propagate through entire chain: database → TypeScript interfaces → Coach modal state → Configure modal → Workout sections → Athlete display. Missing any link breaks feature.
- **2025-12-03 (Session 33):** Composite keys prevent data collision - When same entity appears multiple times with variations (e.g., "Snatch 5x5" vs "Snatch 6x6"), include distinguishing field in key. Changed liftKey from `${lift.name}` to `${lift.name}-${repScheme}` fixed input collision bug. Apply to both UI state keys AND database UPSERT checks.
- **2025-12-03 (Session 33):** Progress charts need minimum data points - Only show charts with 2+ data points for meaningful trends. Single data point provides no progress visualization value.
- **2025-12-03 (Session 33):** Category grouping improves scalability - When data grows large, collapsible category sections prevent overwhelming users. Added category dropdowns when 10+ workout lift combinations existed.
- **2025-12-03 (Session 32):** Semantic data separation prevents constraint violations - Mixing workout rep patterns ("5x5") with RM test values ('1RM') in same column causes CHECK constraint failures. Solution: Use separate columns (rep_scheme vs rep_max_type) with XOR constraint for data integrity.
- **2025-12-03 (Session 32):** UPSERT pattern for unique constraint handling - Always check for existing records before INSERT when unique constraints apply (user_id + lift_name + date). Use `.maybeSingle()` to handle 0 results gracefully without errors.
- **2025-12-03 (Session 32):** Migration application vs creation - Creating migration file doesn't apply it to database. Code changes using new schema will fail until migration executes. Always verify schema cache after migrations.
- **2025-11-29 (Session 26):** useEffect dependency arrays with self-updating state cause instability - When state in dependency array is updated by the effect itself, fast operations can cause jitter/jumps. Solution: Capture initial values in separate state, remove changing values from dependencies.
- **2025-11-29 (Session 26):** Hook extraction improves testability without breaking consumers - Extracted 3 sub-hooks from 1,123-line hook, maintained interface compatibility (zero changes to WorkoutModal.tsx). Return sub-hook state via main hook interface for transparent delegation.
- **2025-11-29 (Session 26):** User testing catches subtle UX bugs - Resize jitter only appeared with fast mouse movement, not slow testing. User immediately recognized regression from previous fix. Always test critical UX flows at realistic speeds.
- **2025-11-29 (Session 26):** Hybrid refactoring strategy balances impact and effort - Analyze all large files (39 identified), refactor most critical immediately (useWorkoutModal), defer others to opportunistic refactoring when modifying. Prevents over-engineering.
- **2025-11-29 (Session 25):** 3-way sync causes folder conflicts - Syncing project folder via Synology Drive on 2 Mac users + NAS created nested duplicates. GitHub is sufficient for dual-user collaboration; eliminate cloud sync for code projects.
- **2025-11-29 (Session 25):** Dual-user paths need documentation flexibility - Workflow protocols with hardcoded paths fail when second user joins. Document as examples, use actual current working directory in practice.
- **2025-11-28 (Session 24):** Task dependency analysis prevents wasted work - User correctly identified modal display needed fixing before implementing tracking for proper testing. Always consider task dependencies.
- **2025-11-28 (Session 24):** Structured movement data enables rich UX - Storing complete workout descriptions (not just names) allows context-aware display across multiple views (modal, calendar, athlete log)
- **2025-11-28 (Session 24):** Different data sources need different tracking - Exercises (parsed from text), Lifts (structured arrays), Benchmarks (structured arrays) require distinct tracking strategies
- **2025-11-28 (Session 24):** Unified search requires semantic awareness - When combining data from different sources, filter logic must respect differences (category filters don't apply to standardized movements)
- **2025-11-28 (Session 24):** Component props need full data for rich display - When components need to format data, pass full objects arrays, not just IDs/names. Enables display_name lookup, equipment badges, etc.
- **2025-11-28 (Session 24):** UI states need consistent fixes - When fixing bugs, apply changes to all component states (expanded AND collapsed views, not just one)
- **2025-11-27 (Session 23):** Regex character classes need careful consideration - `\w` only matches letters/digits/underscores, use `[^\n@]+?` for natural language text with special characters (°, /, .)
- **2025-11-27 (Session 23):** Pattern fallbacks prevent silent failures - Always include catch-all pattern for data that doesn't match expected format (plain exercise names without prefixes)
- **2025-11-27 (Session 23):** Display names vs database slugs - Consistently use display_name for UI, name for database keys. Never show slugs to users
- **2025-11-27 (Session 23):** PostgreSQL reserved keywords cause migration failures - Common words like "full", "user", "table", "select" are reserved. Check before naming columns
- **2025-11-27 (Session 23):** RLS policies can't query auth.users - Authenticated users can't query auth.users table. Use `TO authenticated USING (true)` or auth.jwt() metadata
- **2025-11-27 (Session 23):** Static files don't persist user changes - Any user-editable data needs database storage. Static files are for code-time configuration only
- **2025-11-27 (Session 23):** Browser cache can hide React state updates - Hard refresh doesn't always remount components. Navigate away and back to force full lifecycle
- **2025-11-26 (Session 22):** Pattern ordering critical in rule-based systems - Specific patterns must come before general patterns (db-alt-snatch matched barbell instead of dumbbell until DB patterns moved first)
- **2025-11-26 (Session 22):** Equipment vs descriptor distinction - Equipment = physical items (barbell, pull-up bar), descriptors = attributes (bodyweight). Trust user domain expertise on semantic differences
- **2025-11-26 (Session 22):** Search comprehensiveness matters - If users can see/filter by a field, they expect search to work on that field (equipment, body_parts, search_terms)
- **2025-11-26 (Session 22):** Dry run mode enables safe automation - For batch data operations, always provide preview mode with explicit --apply flag. Let users verify before applying
- **2025-11-25 (Session 21):** Component instance search critical - When debugging props, search for ALL component instances in file, not just first match (components often rendered in multiple modes)
- **2025-11-25 (Session 21):** Timezone consistency prevents day-off bugs - Always use single timezone-aware helper (formatLocalDate), mixing UTC and local causes off-by-one errors
- **2025-11-25 (Session 21):** TODO comments mark incomplete features - During testing, search for related TODOs to find intentional feature gaps
- **2025-11-25 (Session 21):** localStorage enables UI persistence - Good for dropdown options, preferences, temporary state without database schema changes
- **2025-11-25 (Session 21):** Debugging session duration awareness - After 30-45 min stuck, step back and re-evaluate approach systematically
- **2025-11-24 (Session 20):** Markdown parsing with regex is fragile but effective - Split by `#### ` worked but required careful section parsing for subcategories
- **2025-11-24 (Session 20):** Clean slate imports prevent data corruption - Deleting all records before import ensures no mixed old/new data
- **2025-11-24 (Session 20):** Text color inheritance issues common in Tailwind - Must explicitly set text color on interactive elements (buttons, inputs)
- **2025-11-23 (Session 19):** Proactive refactoring strategy works - Refactoring at ~1500 lines (vs waiting for 2000+) enables clean extraction in single session without breaking changes
- **2025-11-23 (Session 19):** Natural component boundaries simplify refactoring - Tab-based structure provided logical separation that matches user mental model
- **2025-11-23 (Session 19):** Type safety catches integration errors - Build caught RefObject<HTMLButtonElement> vs RefObject<HTMLButtonElement | null> mismatch during integration
- **2025-11-23 (Session 19):** Incremental verification prevents debugging - Extract one component → build → verify → commit pattern isolated failures immediately
- **2025-11-22 (Session 17):** Progressive user feedback yields best UX - "Reduce spacing" request had 4 iterations (gap-2 → gap-1 → gap-0.5 → gap-0) based on user seeing each change. Final result 75% smaller than first attempt.
- **2025-11-22 (Session 17):** Auto-fill grid column caps need custom functions - `minmax(240px, 1fr)` prevents 6th column but wastes space. Dynamic calculation `Math.min(possibleCols, maxCols)` achieves perfect balance.
- **2025-11-22 (Session 17):** Direct state mutation invisible to React - `hook.activeSection = index` compiles without error but fails silently at runtime. Must use setters to trigger re-renders.
- **2025-11-22 (Session 17):** Trigger-based full-text search for non-immutable functions - Generated columns can't use to_tsvector (not immutable). PostgreSQL triggers are standard solution.
- **2025-11-22 (Session 17):** Service role key required for bulk operations - RLS good for app security, but bulk imports need admin bypass to avoid per-row policy checks.
- **2025-11-22 (Session 17):** User-driven iteration beats conservative design - User's "still more" feedback 3 times led to gap-0 layout that wouldn't have been reached via safe incremental changes.
- **2025-11-21 (Session 16):** Format helper reusability across views - Same format functions used in coach badges, calendar hover, and athlete display ensures perfect consistency
- **2025-11-21 (Session 16):** JSONB enables zero-migration analytics - Structured movement data in existing JSONB fields allows frequency analysis without schema changes
- **2025-11-21 (Session 16):** Type safety catches runtime errors early - TypeScript inference prevented several null/undefined access bugs during development
- **2025-11-21 (Session 16):** Athlete display parity reduces confusion - Athletes seeing movements in same format as coaches reduces training questions
- **2025-11-21 (Session 15):** Modal positioning matters for workflow - Centered modals block UI interaction; right-side positioning (820px) enables side-by-side work flow
- **2025-11-21 (Session 15):** Modal persistence improves efficiency - Keeping configure modals open after Add allows rapid multi-item addition without reopen overhead
- **2025-11-21 (Session 15):** Description storage enables better UX - Storing full benchmark descriptions from database makes hover previews much more informative
- **2025-11-21 (Session 15):** Format helper reusability - Same format functions used in both badge display and hover preview ensures consistency
- **2025-11-21 (Session 15):** Existing data migration considerations - New optional fields don't break existing workouts, but users need to re-add items to get new features
- **2025-11-20 (Session 14):** Complex features benefit from detailed upfront planning - Created 18-step plan before coding, user saved plan externally for reference
- **2025-11-20 (Session 14):** Structured data enables analytics - JSONB arrays (lifts[], benchmarks[]) allow querying "how often is Back Squat programmed?"
- **2025-11-20 (Session 14):** Button-based insertion better than drag for mobile - Avoids native mobile drag-and-drop complications, works everywhere
- **2025-11-20 (Session 14):** Variable reps need per-set configuration - 5-3-1 schemes require table UI (Set #, Reps, Percentage) not just comma-separated input
- **2025-11-18 (Session 13):** Hook refactors break direct state mutation - `hook.tempTime = value` doesn't work; must use setters `hook.setTempTime(value)`
- **2025-11-18 (Session 13):** Pre-existing errors accumulate silently - `npm run dev` doesn't catch all ESLint errors; only `npm run build` enforces strict linting
- **2025-11-18 (Session 13):** Save buttons need unified behavior - If time can be changed inline, main Save must also save that change (not just dedicated mini-Save)
- **2025-11-18 (Session 13):** Type re-exports maintain backwards compatibility - When moving types to hooks, re-export from original location to avoid breaking imports
- **2025-11-18 (Session 12):** Architecture decisions affect multiple systems - workout_logs constraint revealed by shared workout_id architecture; independent copies fixed it
- **2025-11-18 (Session 12):** Pre-production simplicity advantage - No legacy data means simpler solutions (removed smart delete logic)
- **2025-11-18 (Session 12):** Independent copies match user mental model - Copy/paste behavior users already understand; shared references confuse
- **2025-11-18 (Session 12):** Empty session IDs need special handling - `session-{uuid}` vs real workout IDs require different code paths (startsWith check)
- **2025-11-17 (Session 11):** Database is source of truth - Always fetch critical data from DB first, use object fields as fallback; stale in-memory fields cause silent bugs
- **2025-11-17 (Session 11):** Check user intent not data existence - `selectedSessionIds.size === 0` checks if user selected, not if data exists
- **2025-11-17 (Session 11):** Cascade deletes need planning - Two-step delete (set FK NULL, delete child, optionally delete parent) prevents orphaned records
- **2025-11-17 (Session 10):** State updates must cover all user interactions - Don't assume state only changes on toggle; clicking an already-active element should still update state
- **2025-11-17 (Session 10):** User workflow testing reveals hidden bugs - Initial implementation worked for "expand then add" but failed for "already expanded, click again"
- **2025-11-17:** Database unique constraints - Always check for existing records before INSERT when unique constraints exist (date + time)
- **2025-11-17:** Supabase foreign key syntax - Use explicit names (`table!fkey_name`) not generic `table!inner` for clarity
- **2025-11-17:** Field name consistency - Transform API responses to match expected field names (members → member) to prevent silent failures
- **2025-11-17:** RLS scoping strategy - Family members without auth accounts need different data paths (members table) than primary users (athlete_profiles)
- **2025-11-17:** Filter logic safety - Overly aggressive filters can hide valid data; start permissive then restrict as needed
- **2025-11-15 Session 8:** Component extraction requires careful integration - Task agents may create different hook signatures than expected
- **2025-11-15 Session 8:** useEffect dependency arrays critical - Including function references causes infinite re-renders
- **2025-11-15 Session 8:** Callback pattern beats prop drilling - Pass callbacks as parameters instead of requiring props in hook definitions
- **2025-11-15 Session 8:** Safety branches for major refactors - Create feature branch before large refactors to preserve working state
- **2025-11-15 Session 7:** NEVER push before user testing - User explicitly stated multiple times to wait for testing before pushing. Always commit locally, let user test, then push only after confirmation.
- **2025-11-15 Session 7:** Query consistency matters - Analysis page and Calendar must query same table (weekly_sessions) to show matching counts. Direct wods table query shows different count than calendar.
- **2025-11-15 Session 7:** Week standards vary by region - Monday-Sunday is standard in Europe and fitness industry (ISO 8601). Don't assume Sunday-Saturday.
- **2025-11-14:** State preservation on edits - Always preserve existing status on edit operations unless explicitly changing state
- **2025-11-14:** Data source priority matters - Fetch from source of truth (bookings table for booking status, not published workouts)
- **2025-11-14:** Silent failures need DOM state - UI actions requiring specific DOM state should ensure that state exists first (auto-expand before library open)
- **2025-11-14:** Component size threshold - Files >2000 lines become difficult to maintain, consider refactoring when hitting this size
- **2025-11-09 (Session 2):** Git sync MUST be first step when user mentions "pushed to GitHub" - Don't analyze local changes, immediately `git reset --hard origin/main`
- **2025-11-09 (Session 2):** Protocol documentation can have bugs - workflow-protocols.md had wrong file paths for weeks, causing repeated failures without root cause fixes
- **2025-11-09 (Session 2):** Fix root causes, not symptoms - Repeated workarounds without fixing broken protocols wastes time and erodes trust
- **2025-11-09:** Workflow clarity is critical - "Publishing" had dual meaning (booking + logging), causing confusion. Separate concerns for better UX.
- **2025-11-09:** RLS policies using auth.users subqueries fail - Authenticated users can't query auth.users. Use auth.jwt() metadata instead.
- **2025-11-08:** Testing RLS with raw SQL bypasses production auth flow - Always test via actual app signup/login, not direct database INSERT
- **2025-11-06:** Cline/Grok requires Active Context - Even for "simple" UI tasks, Cline needs to read `memory-bank-activeContext.md` first to prevent analysis paralysis. Without context, Cline overthinks and gets stuck (observed: 10+ min on 2-min task). Active Context acts as confidence anchor.

---

## 📋 Next Immediate Steps - JANUARY LAUNCH PLAN (5 Weeks)

**Target:** Public launch January 2025 | Dual-user workflow: Mimi & Chris via GitHub org

### Week 1: Security & Infrastructure (Dec 2-8) - CRITICAL
0. **⚠️ URGENT - Apply lift_records Migration (Session 32)**
   - Execute `supabase/migrations/20251203_create_lift_records.sql` in Supabase SQL Editor
   - Creates lift_records table with rep_scheme column for workout patterns
   - BLOCKING: Lift weight tracking non-functional until applied
   - Status: Migration file created, execution pending

1. **RLS Policies** (BLOCKING - Security Risk)
   - Execute `remove-public-rls-policies.sql` migration
   - Test with isolated accounts (verify data isolation)
   - Status: PUBLIC access currently enabled for testing

2. **Path & Workflow Fixes**
   - Update `workflow-protocols.md` paths (currently references Chris's paths only)
   - Document dual-user Git workflow (pull before work, push after)
   - Verify Chris's NAS folder structure (no nested duplicates)

3. **Build Verification**
   - Run `npm run build` - verify zero errors
   - Run `/code-cleanup` for 42 ESLint warnings
   - Create `.env.example` template

4. **Analysis Page Scroll Jump Bug** (DEFERRED from Session 25)
   - Page jumps when clicking category filter buttons while scrolled down
   - Attempted fixes: overflow-anchor, preventDefault, blur, scroll preservation (all unsuccessful)
   - Likely needs layout-based solution (fixed-height container or virtualized list)
   - Location: components/coach/analysis/StatisticsSection.tsx (filter buttons), Top Exercises section
   - Priority: Medium (UX polish, not blocking)

### Week 2: Testing & Refinement (Dec 9-15)
- Browser compatibility (Chrome, Firefox, Safari, iOS, Android)
- End-to-end flows (registration, booking, waitlist, logging, 10-card)
- Edge cases (rebook, late cancel, capacity increase)
- Data cleanup (delete test workouts/members)

### Week 3: Beta Launch (Dec 16-22)
- Deploy to hosting (Vercel recommended)
- Beta with 5-10 trusted members
- **Payment:** Manual 10-card tracking (no Stripe yet)
- Daily monitoring, bug reporting channel

### Week 4: Holiday Buffer (Dec 23-29)
- Critical bug fixes from beta feedback
- Reduced intensity (Christmas week)
- Documentation (user guide, FAQ, admin guide)

### Week 5: Public Launch (Dec 30-Jan 5)
- Stripe integration setup (automated 10-card payments)
- Final testing & member communication
- Public registration opens
- Post-launch monitoring

### Outstanding Decisions
- **Feature tweaks:** User to specify top 3 priority tweaks before Week 1
- **Hosting:** Vercel vs Railway (free tier start, upgrade if needed)
- **Google Calendar:** Required for launch or optional?

---

## 🗂️ Additional Resources

- **Detailed History:** See `project-history/` for feature implementation details by date
- **Critical Gotchas:** See `memory-bank/lessons-learned.md` for timezone handling, field naming, and architectural patterns
- **Workflow Rules:** See `memory-bank/workflow-protocols.md` for session protocols and agent usage
- **Tech Details:** See `memory-bank/memory-bank-techContext.md` for database schema and architecture
- **Code Patterns:** See `memory-bank/memory-bank-systemPatterns.md` for implementation standards

---

**File Size:** ~3.5KB
