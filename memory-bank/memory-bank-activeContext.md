# Active Context

**Version:** 10.3
**Updated:** 2025-12-13 (Session 51 - Athlete Logbook UI Improvements)

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

**New in Session 49 - Workout Naming System:**
- `wods.session_type` - Replaces title (WOD, Foundations, Kids & Teens, etc.)
- `wods.workout_name` - Optional name for tracking repeated workouts (e.g., "Overhead Fest", "Fran")
- `wods.workout_week` - ISO week format YYYY-Www (e.g., "2025-W50"), auto-calculated from date
- Unique workout identifier: `workout_name + workout_week` (NULL workout_name falls back to date)
- Index: `idx_wods_workout_name_week` on (workout_name, workout_week)

---

## 📍 Current Status (Last 2 Weeks)

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
- Commit: [Pending]
- Files: 2 modified (AthletePageLogbookTab.tsx, workflow-protocols.md), 1 created (session-close-checklist.md)
- See `project-history/2025-12-13-session-51-athlete-logbook-ui.md` (to be created)

**Completed (2025-12-12 Session 49 - Sonnet):**
- **✅ Workout Naming System (Movement Frequency Fix):**
  - Implemented database schema for tracking unique workouts by name+week
  - Added `session_type`, `workout_name`, `workout_week` columns to wods table
  - Unique identifier: `workout_name + workout_week` (e.g., "Overhead Fest" in "2025-W50")
  - Updated all 4 movement analytics functions (lifts, benchmarks, forge benchmarks, exercises)
  - Backwards compatible: NULL workout_name falls back to date counting
  - Migration executed via Supabase Dashboard (gitignored)
  - **Pending:** UI implementation for workout_name input field (next session)
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

**Completed (2025-12-12 Session 48 - Sonnet):**
- **✅ Athlete Workout Display Fixes:**
  - Fixed missing details for Dec 8 workout (publish_sections: null handling)
  - Added backwards compatibility: shows all sections when publish_sections null/empty
  - Dec 10 missing circle expected (no track assigned)
- **✅ Scoring Layout Optimization:**
  - Moved scoring inputs inline with section title (saves vertical space)
  - Changed from separate box below to inline: `[WARM-UP 10min | Result: ___ ___]`
- **✅ Fixed Incorrect Default Scoring Fields:**
  - Removed hardcoded defaults {time, reps, load, scaling} from 3 locations
  - Now only shows scoring inputs when coach explicitly enables them
  - Fixed in: Lifts, Benchmarks, Forge Benchmarks sections
- **✅ Coach Library Tab Error Fix:**
  - Changed dynamic imports to static imports in 3 coach pages
  - Fixed `Cannot read properties of undefined (reading 'split')` error
  - Pages: benchmarks-lifts, analysis, athletes
- **✅ Athletes Tab Logbook Query Fix:**
  - Replaced failing foreign key join with manual two-query approach
  - Shows workout titles correctly (not UUIDs)
  - Displays "Deleted Workout" for orphaned logs
- Commit: [See Session 48 history]
- Files: 5 changed
- See `project-history/2025-12-12-session-48-athlete-ui-fixes.md`

**Completed (2025-12-11 Session 47 - Sonnet):**
- **✅ Re-publish Button with Backwards Compatibility:**
  - Added "Re-publish" button to Edit Workout modal for re-sending workouts to Google Calendar
  - Button appears alongside "Unpublish" for published workouts
  - Opens PublishModal with previously selected sections pre-checked
  - Backwards compatible with legacy workouts (published before publish_sections field existed)
  - Legacy workouts: defaults to all sections, session time, calculated duration
  - New workouts: uses stored publish_sections, publish_time, publish_duration
  - Updated database queries to fetch publish_sections and publish_duration
  - Fixed PublishModal state reset when re-opening
- **✅ Workflow Protocols Update:**
  - Updated for 2-user Mac profile setup
  - Added project history reading to session start protocol
  - Version bumped to 3.0
- Commit: 66fabb5 "feat(coach): add re-publish button with backwards compatibility"
- Files: 6 changed, +104/-52 lines
- See `project-history/2025-12-11-session-47-republish-button.md`

**Completed (2025-12-10 Session 46 - Sonnet):**
- **✅ Google Calendar: Fix Structured Movement Formatting:**
  - Extended formatSectionToHTML to handle lifts, benchmarks, forge_benchmarks (not just content string)
  - Lifts formatted as bullet points (e.g., "• Back Squat 5x5 @ 80%")
  - Benchmarks/Forge Benchmarks show bold name + full description with line breaks
  - Fixes critical bug where Forge Benchmark sections appeared empty in calendar
- **✅ Publish Modal: Auto-Calculate Duration:**
  - Duration now auto-calculates from selected sections
  - Changed to read-only input with visual indication
  - Updates automatically when section selection changes
- **✅ Edit Workout Modal Improvements:**
  - Removed auto-generated notes message from session templates
  - Notes button now only shows green indicator when coach adds actual notes
  - Added scoring field checkboxes for "WOD movement practice" section type
- **✅ Exercises Tab: Reposition Edit/Delete Icons:**
  - Moved icons from top-right to bottom-right of exercise cards
  - Fixes issue where long exercise names hid video icon on hover
- Commit: 6413937 "feat(coach): enhance Google Calendar, publish modal, and UI improvements"
- Files: 5 changed, +128/-28 lines
- See `project-history/2025-12-10-session-46-ui-improvements.md`

**Completed (2025-12-10 Session 45 - Sonnet):**
- **✅ Google Calendar HTML Formatting:**
  - Implemented formatSectionToHTML with bold headers, bullet points, auto-linkify URLs
  - Changed separator to Unicode divider (─────────────────)
  - Enhanced readability for athletes viewing workouts in Google Calendar
- **✅ Google Calendar API Setup:**
  - Configured .env.local with service account credentials
  - Created "Forge Functional Fitness" calendar in personal Google account
  - Resolved organization policy restrictions (service account key creation blocked)
  - Resolved calendar sharing restrictions (switched from organization to personal calendar)
  - Status: Configured, ready for testing
- **✅ Lift Categories Migration Executed:**
  - Applied 20251208_update_lift_categories.sql via Supabase Dashboard
  - Updated category names: 'Olympic Lifts'→'Olympic', 'Squats'→'Squat', 'Pressing'→'Press', 'Pulling'+'Deadlifts'→'Pull'
- Commit: 907fc17 "feat(google): add HTML formatting for Google Calendar events"
- Files: 2 changed, +44/-16 lines
- See `project-history/2025-12-10-session-45-google-calendar-html.md`

**Completed (2025-12-10 Session 44 - Sonnet):**
- **✅ Workout Library Search Enhancements:**
  - Session times now display correctly from weekly_sessions.time (not 01:00)
  - Changed filter paradigm from "exclude" to "include" (more efficient)
  - Added "All" button (default) and "Notes" pseudo-button
  - Fixed search to use word boundaries (C2 no longer matches Sc2)
  - Changed to AND logic (all terms must match)
  - Fixed movement count deduplication (counts per workout, not per section)
- Commit: eafe9805 "feat(coach): enhance workout library search with session times and include filters"
- Files: 5 changed, +121/-45 lines
- See `project-history/2025-12-10-session-44-workout-library-search.md`

**Completed (2025-12-10 Session 43 - Sonnet):**
- **✅ Scoring Enhancements:**
  - Fixed athlete view: scoring inputs only show when fields explicitly enabled
  - Added unit labels to all inputs (kg, reps, rds, cal, m)
  - Extended scoring config to Olympic Lifting, Skill, Gymnastics, Strength, Finisher/Bonus sections
  - ONE set of scoring inputs per section (not per line)
- **✅ Coach Notes Improvements:**
  - Notes icon shows teal indicator when content exists
  - Auto-linkify URLs (http://, https://, www.)
  - Click to edit, URLs become clickable links when viewing
- **✅ Delete Workout Modal:**
  - Custom modal replaces browser confirm
  - Two options: Return to empty state OR Permanently delete
  - Clear warnings and helper text
- Commit: 3cd67dca "feat(coach/athlete): enhance scoring, notes, and workout deletion"
- Files: 11 changed (2 created, 9 modified), +320/-80 lines
- See `project-history/2025-12-10-session-43-scoring-notes-deletion.md`

**Completed (2025-12-09 Session 42 - Sonnet):**
- **✅ Lift Grid Drag-Drop COMPLETE:** Replicated Forge Benchmarks pattern exactly
  - Single unified grid (removed per-category grids)
  - Fixed empty cell keys (`empty-1` instead of `empty-Olympic-1`)
  - Drag lift to lift = swap, drag to empty = move
  - Display order global across all categories
  - 📋 **User Confirmed:** "working"
- **✅ Exercise Form Improvements:**
  - Fixed autocomplete cursor disappearing (moved component outside parent)
  - Replaced native select with searchable dropdown for templates
  - Added cursor position tracking for exercise library insertion
  - Added template selection to Forge Benchmarks tab
  - 📋 **User Confirmed:** All "working"
- **✅ Pull Category Added:** Updated to ['Olympic', 'Squat', 'Press', 'Pull']
- **✅ Database Backup Documentation:** DATABASE-BACKUP-GUIDE.md + quick reference card
- Commit: e1b0b670 "feat(coach): complete lift grid drag-drop and exercise improvements"
- Files: 14 modified (10 core + 4 docs/organization)
- Migration Pending: `20251208_update_lift_categories.sql` (update old category names to new)
- See `project-history/2025-12-09-session-42-lift-grid-complete.md`

**Completed (2025-12-08 Session 41 - Sonnet):**
- **Lift Organization System (Partial - Completed in Session 42):**
  - ✅ Date Bug Fixed, TypeScript Fixed, Categories Standardized
  - ✅ RLS Policies for barbell_lifts
  - ✅ Ordering Synchronized
  - ⚠️ Drag-Drop incomplete (fixed in Session 42)
- See `project-history/2025-12-08-session-41-lift-organization-wip.md`

**Completed (2025-12-08 Session 40 - Sonnet):**
- **Fixed Configurable Scoring Fields - ALL ISSUES RESOLVED**
- See `project-history/2025-12-08-session-40-fix-configurable-scoring.md`

**Completed (2025-12-06 Session 39 - Sonnet):**
- **Configurable WOD Section Scoring Fields + Database Safety System**
- See `project-history/2025-12-06-session-39-configurable-scoring-and-safety.md`

---

## 🚨 Known Issues (Next Session)

**UI Implementation Pending:**
1. **Workout Naming System - Coach Interface**
   - Add `workout_name` input field to coach workout creation modal
   - Auto-calculate `workout_week` from selected date
   - Test frequency counts with named workouts (verify accuracy)
   - **Expected Result:** Same workout repeated in same week counts as 1x

**Testing Required:**
1. **Re-publish Button** - Implementation complete, testing pending
   - Test with legacy workout (no publish_sections): verify all sections pre-selected
   - Test with new workout (has publish_sections): verify stored sections pre-selected
   - Verify Google Calendar event updates (not duplicates)
   - Verify athlete view updates to show new section selection
   - Verify database fields (publish_sections, publish_duration) save correctly after re-publish

**Migration Pending:**
1. **`20251206_fix_newlines_after_restore.sql`** (Optional) - Fix escaped `\n` in benchmark descriptions
   - **Apply via:** Supabase Dashboard SQL Editor (only if needed)

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

### Session 50 Priorities (Next Session)

1. **Workout Naming System UI**
   - Add `workout_name` input field to coach workout creation interface
   - Auto-calculate `workout_week` from selected date
   - Test with actual named workouts to verify frequency counts

2. **Test Session 47 Features**
   - Test re-publish button with legacy and new workouts
   - Verify Google Calendar updates correctly

3. **Continue with January Launch Plan**
   - See Week 1 priorities below

### JANUARY LAUNCH PLAN (Weeks 1-5)

**Week 1: Security & Infrastructure (Dec 2-8) - CRITICAL**

0. **⚠️ URGENT - Apply lift_records Migration (Session 32)**
   - Execute `supabase/migrations/20251203_create_lift_records.sql`
   - Status: Migration file created, execution pending

1. **RLS Policies** (BLOCKING - Security Risk)
   - Execute `remove-public-rls-policies.sql`
   - Test with isolated accounts
   - Status: PUBLIC access enabled for testing

2. **Build Verification**
   - Run `npm run build`
   - Run `/code-cleanup` for ESLint warnings
   - Create `.env.example`

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

**File Size:** ~3.8KB
