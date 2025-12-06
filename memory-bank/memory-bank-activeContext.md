# Active Context

**Version:** 8.3
**Updated:** 2025-12-06 (Session 39 - Configurable Scoring Fields + Database Safety)

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

**Completed (2025-12-06 Session 39 - Sonnet):**
- **Configurable WOD Section Scoring Fields:**
  - ✅ **Database Migration:** Added 4 columns to wod_section_results (rounds_result, calories_result, metres_result, task_completed)
  - ✅ **TypeScript Interfaces:** Added scoring_fields to WODSection in types/movements.ts + hooks/coach/useWorkoutModal.ts
  - ✅ **Coach UI:** 8-checkbox configuration panel in WODSectionComponent (lines 192-328)
  - ✅ **Athlete UI:** Dynamic conditional input rendering in AthletePageLogbookTab (lines 905-1111)
  - ✅ **Save/Load Logic:** Updated saveSectionResult and loadSectionResults for 4 new fields
  - ✅ **8 Field Types:** Time, Reps, Rounds+Reps, Load, Scaling, Calories, Metres, Task ✓
  - ✅ **Backward Compatible:** Sections without scoring_fields default to showing Time/Reps/Load/Scaling
  - ⚠️ **Known Issue:** Feature partially working, needs fixes next session (user to provide specific notes)

- **Database Safety System (CRITICAL INFRASTRUCTURE):**
  - ✅ **Automated Backup Scripts:** backup-critical-data.ts (8 tables), restore-from-backup.ts, verify-all-tables.ts
  - ✅ **NPM Commands:** `npm run backup` and `npm run restore` added to package.json
  - ✅ **PRE_MIGRATION_CHECKLIST.md:** 714-line safety documentation
  - ✅ **Workflow Protocols Updated:** Added STEP 1.75: DATABASE SAFETY PROTOCOL with 5 mandatory backup scenarios
  - ✅ **Git Configuration:** .gitignore excludes backups/ directory
  - ✅ **Backup Coverage:** barbell_lifts, benchmark_workouts, forge_benchmarks, lift_records, benchmark_results, wod_section_results, wods, exercises

- **Database Restoration After Data Loss:**
  - ✅ **Restored Tables:** barbell_lifts (16), benchmark_workouts (21), forge_benchmarks (1), lift_records, benchmark_results
  - ✅ **5 Restoration Migrations:** restore_movement_tables.sql, restore_lift_records_table.sql, restore_benchmark_results_table.sql, add_configurable_scoring_fields.sql, fix_newlines_after_restore.sql
  - ✅ **Data Verified:** All tables exist and accessible via verify-all-tables.ts
  - ⚠️ **Data Lost:** Custom Forge Benchmarks (need recreation), Athlete lift records (user data lost)
  - 📋 **Lesson Learned:** Git branches ≠ database protection. Migrations run against live database regardless of branch.

- Commit: 66f2aae - feat: add configurable scoring fields and database safety system
- Files: 16 modified (1,215 insertions, 97 deletions)
- Status: Complete, committed, ready to push
- See `project-history/2025-12-06-session-39-configurable-scoring-and-safety.md`

**Completed (2025-12-05 Session 37 - Sonnet):**
[Previous sessions truncated for brevity - see project history files]

---

## 🚨 Known Issues (Next Session)

**User Feedback Required:**
1. ❌ Scoring fields checkboxes "not quite right" (user to specify issues)
2. ❌ Athlete Logbook shows same 4 fields regardless of configuration (may be fixed, needs testing)
3. ❌ Benchmark descriptions show escaped `\n` (migration created, needs execution)

**Root Causes Identified:**
- Duplicate WODSection interface (FIXED in useWorkoutModal.ts)
- Scoring fields panel layout (FIXED - moved outside flex container)
- Need to run `20251206_fix_newlines_after_restore.sql` migration

**To Fix Next Session:**
- Review user's notes on scoring fields issues
- Test end-to-end: Coach configures → Athlete sees correct fields
- Run newline fix migration
- Verify save/load cycle
- Test all 8 field combinations
- Test AMRAP pattern (rounds + reps together)

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

### Session 40 Priorities (Next Session)

1. **Fix Configurable Scoring Fields Issues**
   - Review user's notes on what's wrong
   - Debug why fields not appearing correctly
   - Test all 8 field combinations
   - Verify save/load cycle
   - Test AMRAP (rounds + reps) pattern
   - Verify backward compatibility with existing workouts

2. **Run Pending Migration**
   - Execute `20251206_fix_newlines_after_restore.sql` to fix benchmark descriptions

3. **User Data Recreation**
   - Recreate custom Forge Benchmarks
   - Run `npm run backup` immediately after recreation

4. **End-to-End Testing**
   - Coach: Configure scoring fields → Save
   - Athlete: View workout → See only configured fields → Log results
   - Coach: View athlete results
   - Verify data persists across sessions

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
