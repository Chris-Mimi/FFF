# Active Context

**Version:** 10.98
**Updated:** 2026-02-12 (Session 109 - Weekly Leaderboard, Gender Filter, Fixes)

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
├─ weekly_sessions (id, date, time, workout_id, capacity, status)
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

**Completed (2026-02-12 Session 109 - Opus 4.6):**
- **✅ Fix "Unknown" athlete names** — `members` RLS only allowed self-read. Created `get_member_names(UUID[])` RPC (SECURITY DEFINER, authenticated only). Updated LeaderboardView + CommunityTab.
- **✅ Photo lightbox fix** — `fill` + container replaces broken `width={0} height={0}`
- **✅ Weekly leaderboard navigation** — Converted from daily to weekly (Mon-Sun). Arrows ±1 week, "This Week" button, workout selector shows day prefix. Fixed infinite re-render (`allDates` needed `useMemo`).
- **✅ Gender system** — `gender` column on `members` (M/F/null), M/F toggle on coach MemberCard, gender select on athlete profile, M/F filter on leaderboard with client-side re-ranking. RPC updated to return gender.
- See: `project-history/2026-02-12-session-109-weekly-leaderboard-gender-filter.md`

**Completed (2026-02-11 Session 108 - Opus 4.6):**
- **✅ Multi-Source WOD Leaderboard** — Leaderboard queries all 3 data sources (lift_records, benchmark_results, wod_section_results). Item picker pills, ±30 day grouping.
- See: `project-history/2026-02-11-session-108-multi-source-leaderboard.md`

**Completed (2026-02-11 Session 106 - Opus 4.6):**
- **✅ Add aria-labels to all icon-only buttons** — 137 labels across 32 files.
- See: `project-history/2026-02-11-session-106-aria-labels.md`

**Completed (2026-02-11 Session 105 - Opus 4.6):**
- **✅ Replace all alert() with sonner toast notifications** — 39 files, zero alert() remaining.
- See: `project-history/2026-02-11-session-105-sonner-toast-notifications.md`

**Completed (2026-02-11 Session 104 - Opus 4.6):**
- **✅ Social Reactions, Community Feed, Leaderboard, RLS updates**
- See: `project-history/2026-02-11-session-104-social-reactions-leaderboard.md`

**Older Sessions (57-103):**
See `project-history/` folder for detailed implementation history

---

## 🚨 Known Issues / Remaining Items

**Pre-Deployment Audit — COMPLETE:**
- ✅ All 17 items completed (Sessions 96-101)

**Code Quality (from Session 103 review):**
- 30 `@typescript-eslint/no-explicit-any` suppressions (pragmatic, post-deploy)
- 5 large files >800 lines (MovementLibraryPopup 1341, SearchPanel 952, book/page 950, useWorkoutModal 896, ForgeBenchmarksTab 858) — refactor post-deploy
- ✅ ~~15+ `alert()` calls should become toast notifications~~ — DONE (Session 105, sonner)
- ✅ ~~50+ icon buttons missing aria-labels~~ — DONE (Session 106, 137 labels added)
- Escape key handlers for modals/popups (Code Improvement #3)

**Feature Gaps (from competitor analysis — updated):**
- ✅ #1 Social reactions (fist bumps) — DONE (Session 104)
- ✅ #2 Per-workout leaderboard — DONE (Session 104)
- Remaining: Push notifications, workout intent/stimulus notes, at-risk member alerts, workout timer, % calculator, badges/streaks
- See: `Chris Notes/session-103-code-review-findings.md` for full ranked list

**Other Known Issues:**
- Athletes page: Previously logged benchmarks/lifts may not display for some athletes (pre-existing)

**Migrations Pending (apply in Supabase SQL Editor):**
1. **`20260211_create_reactions_table.sql`** — New reactions table for fist bumps
2. **`20260211_add_community_read_policies.sql`** — Open read access on result tables for community feed
3. **`get_public_tables()` RPC function** — Required for backup auto-discovery (see session 95)
4. **`database/20260212_add_get_member_names_rpc.sql`** — RPC for name lookups (bypasses members RLS)
5. **`database/20260212_add_gender_to_members.sql`** — Gender column + updates RPC with gender return

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

### Session 110 Priorities

**Testing:**
- **Test multi-source leaderboard live** — Verify lift/benchmark/content items all load with weekly nav
- **Test gender filter** — Set gender on a few members via coach admin, verify M/F filter works

**Code Improvements (from Session 103 review):**
- #3 Add escape key handlers to modals/popups

**Features (from competitor analysis):**
- #4 Workout intent/stimulus notes per section (low effort, high value)
- #5 At-risk member alerts dashboard (already have booking data)
- #7 Auto percentage calculator from athlete's 1RM

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
