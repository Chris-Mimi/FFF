# Active Context

**Version:** 3.9
**Updated:** 2025-11-08 (Session 2)

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

**Active Development:**
- None

**Known Issues:**
- macOS iCloud Keychain autofill popups (OS behavior, not app bug)

**Lessons Learned:**
- **2025-11-08:** Testing RLS with raw SQL bypasses production auth flow - Always test via actual app signup/login, not direct database INSERT
- **2025-11-06:** Cline/Grok requires Active Context - Even for "simple" UI tasks, Cline needs to read `memory-bank-activeContext.md` first to prevent analysis paralysis. Without context, Cline overthinks and gets stuck (observed: 10+ min on 2-min task). Active Context acts as confidence anchor.

---

## 📋 Next Immediate Steps

1. **Test booking system end-to-end:**
   - Coach creates session templates
   - Sessions auto-generate weekly
   - Members can book sessions
   - Verify RLS policies for bookings
2. Consider adding coach ability to edit section types, workout types, exercises
3. Build member approval workflow for coaches

---

## 🗂️ Additional Resources

- **Detailed History:** See `project-history/` for feature implementation details by date
- **Critical Gotchas:** See `memory-bank/lessons-learned.md` for timezone handling, field naming, and architectural patterns
- **Workflow Rules:** See `memory-bank/workflow-protocols.md` for session protocols and agent usage
- **Tech Details:** See `memory-bank/memory-bank-techContext.md` for database schema and architecture
- **Code Patterns:** See `memory-bank/memory-bank-systemPatterns.md` for implementation standards

---

**File Size:** ~3.4KB
