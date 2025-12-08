# Active Context

**Version:** 8.4
**Updated:** 2025-12-08 (Session 40 - Fixed Configurable Scoring Fields)

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

**Completed (2025-12-08 Session 40 - Sonnet):**
- **Fixed Configurable Scoring Fields - ALL ISSUES RESOLVED:**
  - ✅ **Layout Fixed:** Scoring checkboxes moved back inside flex container (WODSectionComponent lines 169-307)
  - ✅ **Configuration Respected:** Fixed fallback logic in AthletePageLogbookTab line 918 (explicit null check)
  - ✅ **Universal Item Support:** Scoring fields now work for Lifts, Benchmarks, Forge Benchmarks, Free-form exercises
  - ✅ **Inline Positioning:** All scoring inputs positioned to right of items using ml-auto flexbox
  - ✅ **Instructions Logic:** Distinguishes between instructions (italic text) vs exercises (with scoring boxes)
  - ✅ **Unified Save Function:** Replaced 4 broken save buttons with single working "Save All Results" (lines 453-581)
  - ✅ **Database Migration Applied:** `20251206_add_benchmark_result_fields.sql` via Dashboard SQL Editor
  - ✅ **Benchmark Tab Fixed:** Added null checks to timeToSeconds, updated to use time_result/reps_result columns
  - ✅ **Free-form Persistence:** Fixed key format reconstruction for content items (lines 367-375)
  - ✅ **Load Functions:** Created loadBenchmarkResultsToSection() and loadLiftResultsToSection() (lines 582-703)
  - ✅ **Rounds+Reps Logic:** Only combines when values exist (not "0+0" when time used)
  - ✅ **End-to-End Testing:** Coach configure → Athlete input → Save → Reload → All persists correctly
  - 📋 **User Confirmed:** "It's working" - Feature fully functional

- Commit: Pending (ready to commit and push)
- Files: 3 modified (AthletePageLogbookTab, AthletePageBenchmarksTab, WODSectionComponent) + Chris Notes
- Status: Complete, tested, working
- See `project-history/2025-12-08-session-40-fix-configurable-scoring.md`

**Completed (2025-12-06 Session 39 - Sonnet):**
- **Configurable WOD Section Scoring Fields (Initial Implementation):**
  - ✅ Database Migration, TypeScript Interfaces, Coach UI, Athlete UI, 8 Field Types
  - ⚠️ Had bugs requiring Session 40 fixes
- **Database Safety System:** Backup/restore scripts, PRE_MIGRATION_CHECKLIST.md, npm commands
- See `project-history/2025-12-06-session-39-configurable-scoring-and-safety.md`

---

## 🚨 Known Issues (Next Session)

**None - All Session 39/40 issues resolved.**

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

### Session 41 Priorities (Next Session)

1. **Optional: Benchmark Descriptions Migration**
   - Execute `20251206_fix_newlines_after_restore.sql` if escaped `\n` still present

2. **User Data Recreation** (If Not Already Done)
   - Recreate custom Forge Benchmarks (lost in Dec 6 incident)
   - Run `npm run backup` immediately after recreation

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
