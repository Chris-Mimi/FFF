# Active Context

**Version:** 5.2
**Updated:** 2025-11-17 (Session 11 - completed)

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
├─ wods (id, date, sections: JSONB, is_published, publish_time, publish_sections, google_event_id, coach_notes: TEXT)
├─ section_types (id, name, display_order)
├─ workout_types (id, name)
├─ workout_titles (id, title)
├─ exercises (id, name, category)
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
├─ lift_records (id, user_id, lift_name, rep_max_type, weight, calculated_1rm)
```

---

## 📍 Current Status (Last 2 Weeks)

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
- **Multiple sessions per day:** Cannot create second workout at different time on same day (unique constraint on date+time). Deferred from Session 9 - needs investigation.
- macOS iCloud Keychain autofill popups (OS behavior, not app bug)

**Lessons Learned:**
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

## 📋 Next Immediate Steps

1. **Branch Management:**
   - ✅ coach-page-refactor: Session management fixes complete (Session 9)
   - **Decision needed:** Merge coach-page-refactor → augment-refactor, or continue on augment-refactor?
   - Note: All critical bugs fixed, branch stable and tested

2. **Immediate Priorities:**
   - **Add workout title management to Schedule Tab:**
     - Currently only managed in Supabase, need CRUD UI in Schedule Tab (natural context)
     - Implementation: Add tab/section showing workout_titles with Create/Edit/Delete/Toggle active
     - Reuse existing modal pattern from session templates (~100-150 lines)
     - Estimated time: 20-30 minutes
     - **Status:** Ready to implement (next session)
   - **Rethink "Apply to Other Sessions" section in Edit Workout Modal:**
     - Currently takes up significant vertical space
     - Consider collapsible button dropdown design
     - **Question:** Is this feature necessary? Need to test in actual workflow scenario

3. **Code Maintenance & Refactoring Needs:**
   - **File Size Management:** Keep files under 2000 lines to avoid frequent major refactors
   - **Large Files Needing Refactor:**
     - `app/coach/analysis/page.tsx` - 60KB (needs component/hook extraction)
     - `components/coach/WODModal.tsx` - 82KB (needs component/hook extraction)
   - **Lesson:** Proactive refactoring prevents large disruptive refactors like Session 8
   - **Strategy:** Extract when files exceed ~1500 lines, not wait until 2000+

4. **Testing & Deployment Preparation:**
   - Test 3-state workflow system in production-like environment (partially complete)
   - Verify all booking flows work correctly (partially complete)
   - Test athlete page tab enhancements (Recent sections, Progress Charts, PR badges)
   - Create deployment checklist

5. **Future Enhancements:**
   - **Undo after paste/drop:** Toast notification with "Undo" button for ~5 seconds after pasting/dropping workout (currently only "Cancel Copy" before paste, or manual delete after)
   - Coach ability to edit section types, workout types, exercises
   - Bulk operations for session/workout management
   - Improved search/filter capabilities
   - Member booking system (Phase 2)

---

## 🗂️ Additional Resources

- **Detailed History:** See `project-history/` for feature implementation details by date
- **Critical Gotchas:** See `memory-bank/lessons-learned.md` for timezone handling, field naming, and architectural patterns
- **Workflow Rules:** See `memory-bank/workflow-protocols.md` for session protocols and agent usage
- **Tech Details:** See `memory-bank/memory-bank-techContext.md` for database schema and architecture
- **Code Patterns:** See `memory-bank/memory-bank-systemPatterns.md` for implementation standards

---

**File Size:** ~3.5KB
