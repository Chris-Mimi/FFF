# Active Context

**Version:** 10.10
**Updated:** 2025-12-23 (Session 57 - Bug Fixes: Exercise Parsing, Notes Modal, Publish RLS)

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
- Commit: (pending) "fix(coach): notes modal drag, publish RLS, exercise parsing"
- Files: 6 changed (2 movement utilities, 1 modal hook, 1 API route, 1 client hook, 1 script)
- See `project-history/2025-12-23-session-57-bug-fixes.md`

**Completed (2025-12-19 Session 56 - Sonnet):**
- **✅ Notes Markdown Rendering (HIGH PRIORITY):**
  - Installed react-markdown, remark-gfm, rehype-raw libraries
  - Replaced `linkifyText()` with ReactMarkdown component in CoachNotesPanel.tsx
  - Added Tailwind typography plugin for prose styling
  - Custom component overrides preserve URL linking functionality
  - Panel opens in formatted view mode, raw markdown only when editing
  - Created tailwind.config.ts with typography configuration
- **✅ Auto-List Continuation:**
  - Implemented Enter key handler for automatic list continuation
  - Auto-continues bullet lists (- ) with proper indentation
  - Auto-increments numbered lists (1. 2. 3.)
  - Press Enter twice on empty item to exit list mode
  - Location: CoachNotesPanel.tsx handleKeyDown function (lines 37-112)
- **✅ Search Terms Cleanup:**
  - Created cleanup-search-terms.ts script to remove duplicated search terms
  - Removed terms that duplicate name, category, subcategory, tags, equipment, or body_parts
  - Checked both whole terms and word parts (for hyphenated terms like "strength-endurance")
  - Result: 476 exercises with empty search_terms (will auto-generate), 60 with unique terms only
  - Total processed: 536 exercises
- **✅ YouTube Timestamp Preservation:**
  - Enhanced getEmbedUrl() in video-helpers.ts to preserve timestamps
  - Extracts timestamp from YouTube URL parameters (t or start)
  - Supports multiple formats: 77s, 1m30s, plain seconds
  - Converts to embed URL ?start=N parameter
  - Videos now start at saved timestamp instead of beginning
- **✅ Production Build Fixes:**
  - Fixed 6 TypeScript errors blocking build
  - MovementResultInput.tsx: Changed `{\!\!` to `{!!}` for boolean casting (6 instances)
  - ExerciseFormModal.tsx: Added explicit type annotations to forEach callbacks
  - MovementLibraryPopup.tsx: Fixed error handling with instanceof checks (4 locations)
  - useWorkoutModal.ts: Added handleTextareaInteraction to interface
  - Production build succeeds
- Commit: (pending) "feat(coach): complete notes markdown rendering, search cleanup, YouTube timestamps"
- Files: 10 changed (4 core features, 4 build fixes, 1 new config, 1 new script)
- See `project-history/2025-12-19-session-56-notes-markdown-search-cleanup.md`

**Completed (2025-12-19 Session 55 - Sonnet):**
- **✅ Analysis Page "Unused" Button Fix:**
  - Fixed Unused button to filter main search dropdown (previously only filtered Library Panel)
  - Added `showUnusedOnly` check to `filteredExercises` calculation (page.tsx:562-565)
  - Changed dropdown visibility to show when `exerciseSearch || showUnusedOnly` (StatisticsSection.tsx:345)
  - Removed 20-item slice limit that stopped at "Backwards Walk" (StatisticsSection.tsx:347)
- **✅ Movement Type Labels:**
  - Added color-coded type badges to Analysis dropdown (Lift=purple, Benchmark=teal, Forge=cyan, Exercise=gray)
  - Distinguishes programming context (strength lift vs WOD exercise)
  - Modified both page.tsx and StatisticsSection.tsx to pass/display type field
- **✅ Notes Formatting Toolbar:**
  - Added formatting toolbar to CoachNotesPanel.tsx (accessed via Edit/Create Workout Modal → Notes button)
  - Supports: Bold (**), Italic (_), Underline (<u>), Bullet lists, Numbered lists, H1/H2/H3 headings
  - Fixed toolbar blur issue using `onMouseDown` with `preventDefault()` instead of `onClick`
  - Fixed toolbar visibility condition from `isEditing || !notes` to `isEditing`
- **✅ Dead Code Cleanup:**
  - Archived NotesModal.tsx → `_archive/NotesModal.tsx.unused` (never triggered, dead code)
  - Commented out imports and render block in app/coach/page.tsx
  - Verified no other code paths use standalone notes modal
- **✅ Production Build Fixes:**
  - Fixed 12 TypeScript errors exposed during cleanup
  - Changed `error: any` → `error: unknown` with proper instanceof checks
  - Added type definitions for MovementResultInput.tsx (missing exports)
  - Fixed boolean casts with `!!` operator
  - Fixed type assertions for benchmark `has_scaling` property
  - Production build now succeeds
- **⚠️ Known Issue - Notes Markdown Display:**
  - Formatting toolbar inserts markdown syntax but doesn't render as HTML
  - `linkifyText()` only converts URLs, doesn't parse markdown
  - Need to add markdown-to-HTML renderer (e.g., react-markdown)
- Commit: (pending) "feat(coach): Analysis Unused button, movement type labels, notes formatting toolbar"
- Files: 10 changed (2 core Analysis files, CoachNotesPanel, 1 archived, 6 build error fixes)
- See `project-history/2025-12-19-session-55-analysis-unused-notes-formatting.md`

**Completed (2025-12-18 Session 54 - Sonnet):**
- **✅ RLS Security Fix (CRITICAL - Production Blocking):**
  - Executed `remove-public-rls-policies-CORRECTED.sql` migration
  - Removed PUBLIC access from `workout_logs`, `wod_section_results`, `wods` tables
  - Added missing COACH policies for `wods` table (4 policies: SELECT, INSERT, UPDATE, DELETE)
  - Added missing COACH policies for `wod_section_results` table (4 policies)
  - Added ATHLETE read-only policy for published wods
  - Added USER policies for `wod_section_results` (4 policies)
  - Fixed `auth.users` GRANT permissions for FK validation (GRANT SELECT to authenticated/anon roles)
  - SQL verification: 0 PUBLIC policies remain on athlete data tables
  - Live testing: Athlete logbook working correctly
- **✅ Enhanced Error Logging:**
  - Added detailed error logging to useLogbookData.ts (lines 145-150)
  - Logs error message, code, details, and hint for debugging
- **✅ Auth Callback Route:**
  - Created app/auth/callback/route.ts for email confirmation flow
  - Fixed signup/password reset email redirects
  - Configured Supabase redirect URLs (http://localhost:3001/auth/callback)
- **✅ RLS Isolation Testing:**
  - Tested with 2 independent athlete accounts
  - Verified each account can only see their own data
  - Confirmed no data leakage between accounts
  - Full isolation working correctly
- **⚠️ Known Issue - Backup Script:**
  - `npm run backup` doesn't capture athlete data with RLS enabled (uses anon key)
  - Backup shows 0 records for wod_section_results despite 11 existing
  - Future: Update backup script to use service_role key for admin access
- **📝 Files Created:**
  - `database/remove-public-rls-policies-CORRECTED.sql` (corrected policy names)
  - `database/add-missing-rls-policies.sql` (comprehensive policy additions)
  - `app/auth/callback/route.ts` (auth callback handler)
- **✅ Build Verification & Code Cleanup:**
  - Fixed 12 ESLint type errors blocking production build
  - Replaced `error: any` with `error: unknown` across error handlers
  - Added proper type definitions (WOD interface)
  - Fixed `let` to `const` for non-reassigned variables
  - Production build: ✓ Compiled successfully
- **✅ Environment Documentation:**
  - Created `.env.example` with Supabase and Google Calendar config
  - Documented all required environment variables
  - Added setup instructions with dashboard links
- Commits: b9507a9, 7b285c7, 8a0933c, 15abd5c (all pushed)
- Files: 12 changed total (2 SQL, 8 TypeScript, 2 documentation, 1 env example)

**Completed (2025-12-16 Session 53 - Sonnet):**
- **✅ Re-publish Button Testing (Session 47 Feature):**
  - Tested re-publish functionality with existing workouts
  - Verified Google Calendar updates correctly (no duplicates)
  - Found and fixed critical bug: edits not included in re-publish
- **✅ Auto-save Before Re-publish:**
  - Added auto-save to handlePublish() function (useWorkoutModal.ts:697-700)
  - Workout content now saves automatically before publishing to Google Calendar
  - Prevents data loss when users edit and re-publish without manual save
- **✅ Section Ordering Bug Fix:**
  - Fixed first "Add Section" click after opening Edit Workout modal
  - Root cause: lastExpandedSectionId not initialized when loading from localStorage
  - Now properly initializes to first expanded section (useSectionManagement.ts:56-87)
  - Correct section type now added in proper order on first click
- **✅ Athlete Logbook Time Display:**
  - Added workout time display to athlete logbook (day view)
  - Shows only time (e.g., "17:15") since date already in header
  - Added time field to WOD interface (logbook-utils.ts:21)
  - Session time fetched from weekly_sessions and passed through useLogbookData
- **✅ Verification:**
  - Confirmed lift_records migration already executed (table exists in database)
  - Created database verification script: scripts/check-republish.ts
- Commit: fc7f85c "fix(coach/athlete): re-publish auto-save, section ordering, and logbook time display"
- Files: 6 changed (+62/-3 lines)

**Completed (2025-12-15 Session 52 - Sonnet):**
- **✅ Workout Naming System - UI Already Implemented (Session 50):**
  - Discovered UI was complete from Session 50 but not documented
  - Input field: WorkoutFormFields.tsx:165-180 with placeholder and help text
  - Auto-calculation: useWorkoutModal.ts:20-32 calculates workout_week on date change
  - Database operations: useWODOperations.ts saves both workout_name and workout_week
  - Movement analytics: All 4 functions use workout_name+workout_week for deduplication
- **✅ Workout Naming System - Full Testing Complete:**
  - Test 1: Create named workout - ✅ Passed
  - Test 2: Copy to same week - ✅ Passed (same workout_week)
  - Test 3: Movement frequency analytics - ✅ Passed (showed 1x not 2x)
  - Test 4: Legacy compatibility - ✅ Passed (null workout_name works)
  - Test 5: Cross-week boundary - ✅ Passed (different weeks count separately)
- **✅ Critical Bug Fixes During Testing:**
  - **Search with Spaces:** Fixed Analysis search to handle multi-word queries (page.tsx:562-563)
  - **Time Edit Persistence:** Fixed handleTimeUpdate to save class_times AND sync formData (useWorkoutModal.ts:544,552-555)
  - **ISO Week Calculation - Timezone Bug:** Changed from local timezone to UTC-based calculation matching PostgreSQL (useWorkoutModal.ts:20-34)
  - **ISO Week in Copy Function:** Fixed duplicate buggy calculation in useWODOperations.ts copy function (lines 309-319)
  - **Restored Workout Not Appearing:** Created missing weekly_sessions entry for legacy workout (SQL INSERT)
- **✅ Analysis Page - Week Dropdown Enhancement:**
  - Replaced "1 Week" button with dropdown for 1-8 weeks
  - Removed "1 Month" button (now: Weeks dropdown + 3/6/12 Months buttons)
  - Date ranges go backwards from today (not forwards - can't analyze future workouts)
  - Week calculations use `timeframePeriod <= 2` condition (0.25=1wk, 0.5=2wk, ..., 2.0=8wk)
  - Auto-resets to today's date when switching from months to weeks
- Commit: a3149ba2 "fix(coach): ISO week calculation, search, time persistence, and analysis week dropdown"
- Files: 9 changed (2 modified core files, 6 test scripts created, 1 note)
- See `project-history/2025-12-15-session-52-workout-naming-testing.md` (to be created)

**Completed (2025-12-13 Session 51 - Sonnet):**
- **✅ Athlete Logbook Scoring Input Improvements:**
  - Added visible unit labels outside inputs (kg, cal, m, rds, reps)
  - Changed placeholders from units to descriptive text (Load, Cal, Distance, Rounds, Reps)
  - Increased input widths: reps/calories w-14→w-16, metres w-16→w-20
  - Changed text alignment from left to center for better appearance
  - Applied to all 4 logbook sections: Free-form (gray), Lifts (blue), Benchmarks (teal), Forge Benchmarks (cyan)
- **✅ Workflow Protocols Update:**
  - Updated STEP 6: Changed "Never Read Chris Notes" to "Monitor All File Changes"
  - Chris Notes folder synced between accounts, acknowledge all git changes
  - Don't read Chris Notes unless explicitly asked
- **✅ Session Close Checklist Created:**
  - Created `Chris Notes/AA frequently used files/session-close-checklist.md`
  - Documented correct order: Memory Bank → Project History → Backup → Git Add → Commit → Push
  - **Critical:** Backup BEFORE git operations (ensures backup files included in commit)
  - Includes verification checklist and common mistakes
- Commit: 2a14dccd "feat(athlete): improve logbook scoring inputs with external unit labels"
- Files: 2 modified (AthletePageLogbookTab.tsx, workflow-protocols.md), 1 created (session-close-checklist.md)
- See `project-history/2025-12-13-session-51-athlete-logbook-ui.md`

**Completed (2025-12-12 Session 49 - Sonnet):**
- **✅ Workout Naming System (Movement Frequency Fix):**
  - Implemented database schema for tracking unique workouts by name+week
  - Added `session_type`, `workout_name`, `workout_week` columns to wods table
  - Unique identifier: `workout_name + workout_week` (e.g., "Overhead Fest" in "2025-W50")
  - Updated all 4 movement analytics functions (lifts, benchmarks, forge benchmarks, exercises)
  - Backwards compatible: NULL workout_name falls back to date counting
  - Migration executed via Supabase Dashboard (gitignored)
  - **UI Implemented in Session 50 (not documented at time)**
- **✅ Orphaned Workout Logs Deletion:**
  - Implemented automatic deletion of logs for deleted workouts
  - Logs removed from database when coach views athlete logbook tab
  - No more "Deleted Workout" entries
- **✅ Save Button Validation Fix:**
  - Changed validation to allow notes-only OR scoring-only OR both
  - Button text changed "Save All Results" → "Save"
  - Fixed error showing when athlete entered notes without scoring data
- Commit: a7344faa "feat(coach/athlete): implement workout naming system"
- Files: 3 changed (+94/-41 lines), 1 migration executed
- See `project-history/2025-12-12-session-49-workout-naming-system.md`

---

## 🚨 Known Issues (Next Session)

**Migration Pending:**
1. **`20251206_fix_newlines_after_restore.sql`** (Optional) - Fix escaped `\n` in benchmark descriptions
   - **Apply via:** Supabase Dashboard SQL Editor (only if needed)

**System Improvements Needed:**
1. **Backup Script RLS Limitation:**
   - Current backup script uses anon key, blocked by RLS policies
   - Doesn't capture athlete data (wod_section_results, athlete_profiles, etc.)
   - Solution: Update script to use service_role key for admin-level backups

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

### Session 58 Priorities (Next Session)

**Week 2: Testing Phase** - Begin comprehensive validation before January Beta Launch
- All Week 1 critical tasks complete (RLS policies, build verification)
- Three bugs discovered and fixed during Session 57 (exercise parsing, notes modal, publish RLS)
- Testing plan created in plan mode (see ~/.claude/plans/effervescent-wibbling-reef.md)
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

**File Size:** ~4.2KB
