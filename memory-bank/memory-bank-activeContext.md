# Active Context

**Version:** 4.1
**Updated:** 2025-11-09

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
- **athlete/page.tsx file too large** - File exceeds Read tool limits (~2000 lines), prevents debugging/maintenance. Needs refactoring into smaller component files.
- macOS iCloud Keychain autofill popups (OS behavior, not app bug)

**Lessons Learned:**
- **2025-11-09 (Session 2):** Git sync MUST be first step when user mentions "pushed to GitHub" - Don't analyze local changes, immediately `git reset --hard origin/main`
- **2025-11-09 (Session 2):** Protocol documentation can have bugs - workflow-protocols.md had wrong file paths for weeks, causing repeated failures without root cause fixes
- **2025-11-09 (Session 2):** Fix root causes, not symptoms - Repeated workarounds without fixing broken protocols wastes time and erodes trust
- **2025-11-09:** Workflow clarity is critical - "Publishing" had dual meaning (booking + logging), causing confusion. Separate concerns for better UX.
- **2025-11-09:** RLS policies using auth.users subqueries fail - Authenticated users can't query auth.users. Use auth.jwt() metadata instead.
- **2025-11-08:** Testing RLS with raw SQL bypasses production auth flow - Always test via actual app signup/login, not direct database INSERT
- **2025-11-06:** Cline/Grok requires Active Context - Even for "simple" UI tasks, Cline needs to read `memory-bank-activeContext.md` first to prevent analysis paralysis. Without context, Cline overthinks and gets stuck (observed: 10+ min on 2-min task). Active Context acts as confidence anchor.

---

## 📋 Next Immediate Steps

1. **Refactor athlete/page.tsx** (High Priority - Technical Debt)
   - **Problem:** File too large to read with Read tool (~2000+ lines)
   - **Solution:** Split into focused component files
   - **Approach:** Extract major sections into separate components:
     - ProfileSection.tsx - athlete profile display
     - BenchmarkSection.tsx - CrossFit benchmark tracking
     - ForgeBenchmarkSection.tsx - Forge benchmark tracking
     - LiftRecordsSection.tsx - barbell lift PRs
     - WorkoutLogSection.tsx - workout logging
   - **Benefit:** Easier debugging, better code organization, follows React best practices
   - **Risk:** Low - pure refactoring with testing after each extraction

2. **Testing & Deployment Preparation:**
   - Test 3-state workflow system in production-like environment
   - Verify all booking flows work correctly
   - Create deployment checklist

3. **Future Enhancements:**
   - Coach ability to edit section types, workout types, exercises
   - Bulk operations for session/workout management
   - Improved search/filter capabilities

---

## 🗂️ Additional Resources

- **Detailed History:** See `project-history/` for feature implementation details by date
- **Critical Gotchas:** See `memory-bank/lessons-learned.md` for timezone handling, field naming, and architectural patterns
- **Workflow Rules:** See `memory-bank/workflow-protocols.md` for session protocols and agent usage
- **Tech Details:** See `memory-bank/memory-bank-techContext.md` for database schema and architecture
- **Code Patterns:** See `memory-bank/memory-bank-systemPatterns.md` for implementation standards

---

**File Size:** ~3.4KB
