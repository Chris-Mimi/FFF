# Active Context

**Version:** 28.0
**Updated:** 2026-02-19 (Session 144 - Achievement System Phase 1)

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

**Completed (2026-02-20 Session 145 - Opus 4.6):**
- **✅ Achievement System Phase 2 — Athlete View + Self-Log**
  - Achievements embedded as collapsible section in Records tab (not separate top-level tab)
  - Visual grid: unlocked (amber checkmark), next claimable (dashed border), locked (grey lock)
  - Sequential progression enforced — can only claim tier N+1 after tier N
  - Claim modal with date picker + optional notes; detail modal with Remove option
  - Dark Ocean Teal background theme matching Records page

**Completed (2026-02-19 Session 144 - Opus 4.6):**
- **✅ Achievement System Phase 1 — DB + Coach Management**
  - 2 new tables: `achievement_definitions`, `athlete_achievements` (with RLS + indexes)
  - Coach "Achievements" tab in Toolkit (amber) — grouped by category/branch/tier
  - 39 starter achievements seeded across 4 categories

**Completed (2026-02-19 Session 143 - Opus 4.6):**
- **✅ Auto % Calculator + Progress Chart Fix + Desktop Share Fix**

**Completed (2026-02-19 Session 142 - Opus 4.6):**
- **✅ Share Card & Login Page Polish** — Logo/branding, desktop save-to-file

**Completed (2026-02-19 Session 141 - Opus 4.6):**
- **✅ Share to Social Media (Feature #9) IMPLEMENTED** — Branded image card sharing

**Older Sessions (57-139):**
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
- ✅ ~~Escape key handlers for modals/popups~~ — DONE (Session 116, 15 modals added)
- ✅ ~~Debounce search inputs~~ — DONE (Session 117, useDebouncedValue hook)
- ✅ ~~Form validation (HIGH priority)~~ — DONE (Sessions 117-118, 7/7 files).
- ✅ ~~Form validation (MEDIUM priority)~~ — DONE (Session 118, 16/16 files).
- ✅ ~~Empty states~~ — DONE (Session 120)
- ✅ ~~Touch targets (<44px)~~ — DONE (Session 120)
- ✅ ~~Replace browser confirm() with styled modals~~ — DONE (Session 121, 33 calls)
- ✅ ~~Focus traps in modals~~ — DONE (Session 121, 33 modals)
- ✅ ~~Color contrast audit~~ — DONE (Session 129, 15 files fixed)

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
- ✅ #6 Badges/achievements — Phase 1+2 DONE (Sessions 144-145). Coach management + DB + athlete view + self-log. Phase 3 (coach award flow) next.
- See: `Chris Notes/session-103-code-review-findings.md` for full ranked list

**Push Notification Issues:**
- ✅ ~~Mimi profile not delivering~~ — FIXED (Session 138). Root cause: stale Chrome FCM connection. Fix: SW unregister + Chrome restart. Added auto-refresh + test endpoint to prevent recurrence.

**Other Known Issues:**
- **✅ ~~Leaderboard scaling bug~~ — FIXED (Sessions 125-127). Root cause: stray records from save bug. Fix: booking filter + tie-breaking + 33 stray records deleted.**
- Athletes page: Previously logged benchmarks/lifts may not display for some athletes (pre-existing)
- Google Calendar EMOM bug: "The Ghost" (2025-12-01) has stale `workout_type_id` in JSONB on "WOD movements" and "Skill" sections → shows "- EMOM" suffix. Needs DB JSONB cleanup or code fix. May affect other workouts too.

**Migrations Pending (apply in Supabase SQL Editor):**
1. **`get_public_tables()` RPC function** — Required for backup auto-discovery (see session 95)

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

**Movements filter (remaining from Sessions 122-124):**
- Update benchmark/forge_benchmark descriptions to use exact DB exercise names (113 audit mismatches)
- Run: `npx tsx scripts/audit-benchmark-exercises.ts`

**Google Calendar fix:**
- Fix stale `workout_type_id` in JSONB sections (Ghost workouts + scan for others)

**Session 137 Follow-up:**
- Test intent/stimulus notes end-to-end (save, reload, publish, athlete view)
- Debug push notification delivery on Mimi profile (stale subscription suspected)

**Features (from competitor analysis):**
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
