# Active Context

**Version:** 36.0
**Updated:** 2026-02-23 (Session 154 - Pre-Deployment Security Audit)

---

## ⚠️ CRITICAL RULES

| Rule | Detail |
|:---|:---|
| **Mandate** | Read `memory-bank/workflow-protocols.md` BEFORE any work |
| **Database Safety** | Run `npm run backup` BEFORE any migration or risky change |
| **Agent Use** | Use Agent for 3+ step tasks, multi-file changes, bug investigations |
| **Efficiency** | Target: Keep sessions under 50% context usage |
| **Context Monitoring** | 50%/60%: Alert. 70%: STOP, create summary, commit code, tell user to start new session. 80%: Critical limit (Memory Bank updates in fresh session - see workflow-protocols.md) |

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
├─ weekly_sessions (id, date, time, workout_id, workout_type: TEXT, capacity, status)
├─ benchmark_workouts (id, name, type, description, display_order, has_scaling)
├─ forge_benchmarks (id, name, type, description, display_order, has_scaling)
├─ barbell_lifts (id, name, category, display_order)
├─ programming_notes (id, user_id, title, content [markdown], folder_id, created_at, updated_at)
├─ note_folders (id, user_id, name, display_order, created_at, updated_at)

Member Tables
├─ members (id, email, name, status, membership_types[], account_type: primary|family_member, primary_member_id, display_name, date_of_birth, relationship, class_types[] [ekt|t|cfk|cft], gender [M|F|null])
├─ bookings (id, session_id, member_id, status: confirmed|waitlist|cancelled|no_show|late_cancel)

Athlete Tables (linked to members.id)
├─ athlete_profiles (id, user_id, full_name, emergency_contact)
├─ workout_logs (id, user_id, wod_id, result, notes)
├─ benchmark_results (id, user_id, benchmark_id, forge_benchmark_id [XOR], benchmark_name, benchmark_type, result_value, scaling_level, result_date)
├─ lift_records (id, user_id, lift_name, weight_kg, reps, rep_max_type ['1RM'|'3RM'|'5RM'|'10RM'], rep_scheme [workout patterns], calculated_1rm, notes, lift_date)
├─ wod_section_results (id, user_id, wod_id, section_id, workout_date, time_result, reps_result, weight_result, scaling_level, rounds_result, calories_result, metres_result, task_completed)

Achievement Tables
├─ achievement_definitions (id, name, description, category, branch, tier, created_at)
├─ athlete_achievements (id, user_id, achievement_id, achieved_date, notes, awarded_by, created_at [UNIQUE user_id + achievement_id])

Social Tables
├─ reactions (id, user_id, target_type ['wod_section_result'|'benchmark_result'|'lift_record'], target_id, reaction_type ['fist_bump'], created_at [UNIQUE user_id + target_type + target_id])
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

**Completed (2026-02-23 Session 154 - Opus 4.6):**
- **✅ Pre-Deployment Security Audit** — 5 parallel audit agents (URLs/env, console.logs, code quality, security, build config). Fixed all CRITICAL+HIGH security issues: IDOR fixes in benchmark-results/lift-records/stripe routes, auth hardening (requireAuth/requireCoach added to 4 endpoints), deleted 5 scripts with hardcoded service role keys, stripped raw error.message from API responses.

**Completed (2026-02-23 Session 153 - Sonnet 4.6):**
- **✅ Attendance Reports panel** — Admin page refactored from single table to two-tab panel with time filters + sortable columns.

**Completed (2026-02-23 Session 152 - Sonnet 4.6):**
- **✅ Coach "Remove" booking button** + **Attendance Behaviour report**

**Completed (2026-02-22 Session 151 - Sonnet 4.6):**
- **✅ Google Calendar EMOM bug fix** + **Analysis page scroll jump fix**

**Completed (2026-02-21 Session 150 - Opus 4.6):**
- **✅ Session history renumbering** + **Drag-and-drop fix**

**Older Sessions (57-148):**
See `project-history/` folder for detailed implementation history

---

## 🚨 Known Issues / Remaining Items

**Pre-Deployment Audit — Sessions 96-101 + 154:**
- ✅ All original 17 items completed (Sessions 96-101)
- ✅ Session 154 security audit: All CRITICAL + HIGH items fixed
- **MEDIUM remaining (Session 154):** console.log in NotificationPrompt.tsx:128, "Check console" toasts in TenCardModal.tsx:160 + AthletePageLogbookTab.tsx:277, `window as any` drag-and-drop in 3 hooks, missing SSR guard in modalStateHelpers.ts, no loading.tsx/not-found.tsx pages
- **LOW remaining:** 8 files >500 lines, 22 `@typescript-eslint/no-explicit-any`, no rate limiting on registration, duplicated Supabase mapping in movement-analytics.ts

**Code Quality (from Session 103 review):**
- 22 `@typescript-eslint/no-explicit-any` suppressions (pragmatic, post-deploy)
- 8 large files >500 lines — refactor post-deploy

**Feature Gaps (from competitor analysis — updated):**
- ✅ #1 Social reactions (fist bumps) — DONE (Session 104)
- ✅ #2 Per-workout leaderboard — DONE (Session 104)
- ✅ #3 Push notifications — All phases DONE (Sessions 130-134). Booking, WOD publish, PR notifications all working.
- ✅ #4 Workout intent/stimulus notes — DONE (Session 137). Per-section notes with athlete visibility toggle.
- ✅ #7 Workout timer — DONE (Sessions 135-136). 5 modes, persistent oscillator audio, fullscreen mobile. Mobile distortion deferred.
- ✅ #5 At-risk member alerts — DONE (Session 140). At-Risk tab on Members page with last attended date.
- ✅ #8 TV Display — DONE (Session 139). Dark theme, large fonts, per-section zoom, Monitor chip on cards.
- ✅ #9 Share to social media — DONE (Session 141). Branded image cards from Records + Leaderboard.
- ✅ #7 Auto % calculator from 1RM — DONE (Session 143). Computed kg in logbook lift badges.
- ✅ #6 Badges/achievements — ALL PHASES DONE (Sessions 144-147). DB + coach management + athlete view + self-log + coach award flow + theme polish.
- See: `Chris Notes/session-103-code-review-findings.md` for full ranked list

**Push Notification Issues:**
- ✅ ~~Mimi profile not delivering~~ — FIXED (Session 138). Root cause: stale Chrome FCM connection. Fix: SW unregister + Chrome restart. Added auto-refresh + test endpoint to prevent recurrence.

**Other Known Issues:**
- **✅ ~~Leaderboard scaling bug~~ — FIXED (Sessions 125-127). Root cause: stray records from save bug. Fix: booking filter + tie-breaking + 33 stray records deleted.**
- **✅ ~~Google Calendar EMOM bug~~** — FIXED (Session 151). Root cause: Workout Type dropdown was WOD-only; stale `workout_type_id` couldn't be cleared on other section types. Fix: dropdown now shown on all sections. Open "The Ghost" and clear the Type on Skill/WOD Movements sections, then re-publish.

**Exercise Naming Conventions (Session 149):**
- "Lunge Walking" (not "Walking Lunge") — groups lunge variants together
- "Jump Rope Double-Unders (DUs)" — groups jump rope exercises together
- KB Swing default = American (AKBS) for CF benchmarks
- Generic "Row" in benchmarks = C2 Rower

**Migrations Pending (apply in Supabase SQL Editor):**
- ✅ `get_public_tables()` RPC — confirmed working (new tables auto-discovered in backups)
- **`supabase/migrations/20260223_add_coach_cancelled_status.sql`** — Adds `coach_cancelled` to bookings CHECK constraint + updates unique index. Required for "Remove" button in Session Management.

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

### Next Priorities

**Push Notifications — COMPLETE (all phases):**
- Clean up test data from `benchmark_results` table (if any stale entries remain)

**Movements filter — COMPLETE (Session 149):**
- ✅ Benchmark/forge_benchmark descriptions updated to use exact DB exercise names
- ✅ genericToCanonical failsafe mapping handles old WOD JSONB snapshots
- Audit script: `npx tsx scripts/audit-benchmark-exercises.ts` (0 mismatches)

**Session 137 Follow-up:**
- Test intent/stimulus notes end-to-end (save, reload, publish, athlete view)
- Debug push notification delivery on Mimi profile (stale subscription suspected)

**Features (from competitor analysis):**
- All 9 competitor features COMPLETE ✅

**Pending Polish (LOW):**
- Athletes page benchmarks/lifts display issue (investigate)

---

## 🗂️ Additional Resources

- **Detailed History:** See `project-history/` for feature implementation details by date
- **Critical Gotchas:** See `memory-bank/lessons-learned.md` for patterns
- **Workflow Rules:** See `memory-bank/workflow-protocols.md` (includes DATABASE SAFETY PROTOCOL)
- **Tech Details:** See `memory-bank/memory-bank-techContext.md`
- **Code Patterns:** See `memory-bank/memory-bank-systemPatterns.md`

---

**File Size:** ~4.5KB
