# Active Context

**Version:** 8.5
**Updated:** 2025-12-08 (Session 41 - Lift Organization WIP)

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
├─ wods (id, date, sections: JSONB [content, lifts[], benchmarks[], forge_benchmarks[], scoring_fields], is_published, publish_time, publish_sections, google_event_id, coach_notes: TEXT)
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

---

## 📍 Current Status (Last 2 Weeks)

**In Progress (2025-12-08 Session 41 - Sonnet):**
- **Lift Organization System (INCOMPLETE - Priority for next session):**
  - ✅ **Date Bug Fixed:** Invalid date in Personal Records tab (used wrong field name)
  - ✅ **TypeScript Fixed:** Added missing BenchmarkResult interface fields (time_result, reps_result, weight_result)
  - ✅ **Categories Standardized:** Updated to 'Olympic', 'Squat', 'Press' across all components
  - ✅ **RLS Policies:** Created coach INSERT/UPDATE/DELETE policies for barbell_lifts (applied)
  - ✅ **Ordering Synchronized:** Benchmarks alphabetical, Forge Benchmarks by display_order, Lifts by category+display_order
  - ⚠️ **Drag-Drop WIP:** Attempted grid-based drag-drop for lifts (matching Forge Benchmarks) - NEEDS REFINEMENT
  - 📋 **User Feedback:** "No, still not correct but I'm out of session time. Mimi can finish the drag and drop in another session"

- Commit: cb8645c "wip: implement lift grid organization and fix date bugs"
- Files: 6 modified (page.tsx, LiftsTab, MovementLibraryPopup, 3 Athlete components) + Chris Notes
- Migration Pending: `20251208_update_lift_categories.sql` (update old category names to new)
- Status: Partially complete, drag-drop needs work
- See `project-history/2025-12-08-session-41-lift-organization-wip.md`

**Completed (2025-12-08 Session 40 - Sonnet):**
- **Fixed Configurable Scoring Fields - ALL ISSUES RESOLVED:**
  - ✅ Layout, Configuration, Universal Support, Inline Positioning, Instructions Logic
  - ✅ Unified Save Function, Database Migration, Null Checks, Free-form Persistence
  - 📋 **User Confirmed:** "It's working" - Feature fully functional
- See `project-history/2025-12-08-session-40-fix-configurable-scoring.md`

**Completed (2025-12-06 Session 39 - Sonnet):**
- **Configurable WOD Section Scoring Fields (Initial Implementation):**
  - ✅ Database Migration, TypeScript Interfaces, Coach UI, Athlete UI, 8 Field Types
  - ⚠️ Had bugs requiring Session 40 fixes
- **Database Safety System:** Backup/restore scripts, PRE_MIGRATION_CHECKLIST.md, npm commands
- See `project-history/2025-12-06-session-39-configurable-scoring-and-safety.md`

---

## 🚨 Known Issues (Next Session)

**PRIORITY - Session 41 Incomplete Work:**
1. **Lift Grid Drag-Drop:** Implementation not working correctly (user: "No, still not correct")
   - **User Requirement:** "Same functionality as the Forge Benchmark tab without the insert row function"
   - **Current State:** Grid layout implemented, drag-drop behavior needs refinement
   - **Reference:** ForgeBenchmarksTab.tsx (working implementation)
   - **Files:** components/coach/LiftsTab.tsx, app/coach/benchmarks-lifts/page.tsx

2. **Migration Pending:** `20251208_update_lift_categories.sql` - Update existing lift categories from old names to new
   - **Apply via:** Supabase Dashboard SQL Editor
   - **Purpose:** Change 'Olympic Lifts'→'Olympic', 'Squats'→'Squat', 'Pressing'→'Press', etc.

**Note:** Benchmark descriptions with escaped `\n` migration (`20251206_fix_newlines_after_restore.sql`) still pending execution if needed.

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

### Session 42 Priorities (Next Session - PRIORITY)

1. **🔴 URGENT: Complete Lift Grid Drag-Drop** (Session 41 incomplete work)
   - **Goal:** Match Forge Benchmarks drag-drop behavior exactly (no insert row function)
   - **Reference:** ForgeBenchmarksTab.tsx working implementation
   - **Test:** Smooth drag, no snap-back, grid positioning works correctly
   - **Files:** components/coach/LiftsTab.tsx, app/coach/benchmarks-lifts/page.tsx

2. **Apply Pending Migration**
   - Execute `20251208_update_lift_categories.sql` via Supabase Dashboard SQL Editor
   - Updates existing lift categories to new naming convention

3. **Optional: Benchmark Descriptions Migration**
   - Execute `20251206_fix_newlines_after_restore.sql` if escaped `\n` still present

4. **User Data Recreation** (If Not Already Done)
   - Recreate custom Forge Benchmarks (lost in Dec 6 incident)
   - Run `npm run backup` immediately after recreation

5. **Continue with January Launch Plan**
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
