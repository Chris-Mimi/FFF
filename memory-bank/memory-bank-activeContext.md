# Active Context

**Version:** 10.13
**Updated:** 2025-12-24 (Session 60 - Coach Notes UX & Google Calendar Duration)

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
- Commit: (pending)
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
