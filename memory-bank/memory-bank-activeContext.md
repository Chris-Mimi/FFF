# Active Context

**Version:** 10.90
**Updated:** 2026-02-09 (Session 101 - Chart Polish, Meta Tags, Lift Modal UX)

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
├─ programming_notes (id, user_id, title, content [markdown], folder_id, created_at, updated_at)
├─ note_folders (id, user_id, name, display_order, created_at, updated_at)

Member Tables
├─ members (id, email, name, status, membership_types[], account_type: primary|family_member, primary_member_id, display_name, date_of_birth, relationship, class_types[] [ekt|t|cfk|cft])
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

## 📍 Current Status (Last 5 Sessions)

**Completed (2026-02-09 Session 101 - Opus 4.6):**
- **✅ OG/Meta Tags** — Added Open Graph, Twitter Card, themeColor to layout.tsx (audit #17 complete)
- **✅ Lift Modal UX** — Modal stays open after save/update (closes only on "x")
- **✅ Progress Chart Date Format** — Two-line dates (month/day + year below) across all 6 charts
- **✅ Chart XAxis Fix** — Added `interval={0}` + padding to prevent first/last date clipping
- **✅ Tooltip Snap** — `isAnimationActive={false}` on all charts for instant tooltip movement
- **✅ Active Dot Hover** — Added teal hover circle (`r: 6`) with white border on all charts
- **✅ Cursor Line Polish** — Subtle hover lines: mini-charts `#aaa`, modal charts `#999`
- See: `project-history/2026-02-09-session-101-chart-polish-meta-tags.md`

**Completed (2026-02-09 Session 100 - Opus 4.6):**
- RM Test Feature, Recharts fixes, SVG focus outline, mobile optimization
- See: `project-history/2026-02-09-session-100-rm-test-mobile-optimization.md`

**Completed (2026-02-07 Session 99 - Opus 4.6):**
- Lift Records DB Fix (rep_type_xor), Recharts pinned to 3.3.0, UX polish
- See: `project-history/2026-02-07-session-99-lift-records-recharts-fixes.md`

**Completed (2026-02-07 Session 98 - Opus 4.6):**
- Audit #13/#15: Large component refactoring (3 coach pages, 20 new files)
- See: `project-history/2026-02-07-session-98-large-component-refactoring.md`

**Completed (2026-02-07 Session 97 - Opus 4.6):**
- Pre-deployment audit fixes: #5-#14
- See: `project-history/2026-02-07-session-97-pre-deployment-audit-fixes.md`

**Older Sessions (57-96):**
See `project-history/` folder for detailed implementation history

---

## 🚨 Known Issues / Remaining Audit Items

**Pre-Deployment Audit — COMPLETE:**
- ✅ All 17 items completed (Sessions 96-101)

**Other Known Issues:**
- Athletes page: Previously logged benchmarks/lifts may not display for some athletes (pre-existing)

**Migration Pending:**
1. **`get_public_tables()` RPC function** - Required for backup auto-discovery
   - **Apply via:** Supabase SQL Editor (see project-history/2026-02-06-session-95)

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

### Session 102 Priorities

**Pending Polish (LOW):**
- Athletes page benchmarks/lifts display issue (investigate)
- Analysis page scroll jump bug (DEFERRED)

---

## 🗂️ Additional Resources

- **Detailed History:** See `project-history/` for feature implementation details by date
- **Critical Gotchas:** See `memory-bank/lessons-learned.md` for patterns
- **Workflow Rules:** See `memory-bank/workflow-protocols.md` (includes DATABASE SAFETY PROTOCOL)
- **Tech Details:** See `memory-bank/memory-bank-techContext.md`
- **Code Patterns:** See `memory-bank/memory-bank-systemPatterns.md`

---

**File Size:** ~4.5KB
