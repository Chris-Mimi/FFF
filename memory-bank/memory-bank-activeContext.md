# Active Context

**Version:** 93.0
**Updated:** 2026-03-17 (Session 219 - Fix collapse/expand on Records tab)

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
├─ weekly_sessions (id, date, time, workout_id, workout_type: TEXT, capacity, status, is_locked: BOOLEAN [NULL=auto, true=locked, false=unlocked])
├─ benchmark_workouts (id, name, type, description, display_order, has_scaling)
├─ forge_benchmarks (id, name, type, description, display_order, has_scaling)
├─ barbell_lifts (id, name, category, display_order)
├─ programming_notes (id, user_id, title, content [markdown], folder_id, created_at, updated_at)
├─ note_folders (id, user_id, name, display_order, created_at, updated_at)
├─ coach_tracked_exercises (id, user_id, exercise_id, display_name, active, created_at)
├─ movement_patterns (id, user_id, name, description, track [adults|kids], created_at, updated_at)
├─ movement_pattern_exercises (id, pattern_id, exercise_id)
├─ programming_plan_items (id, user_id, pattern_id, planned_date, created_at)

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

**Completed (2026-03-17 Session 219 - Opus 4.6) — FIX COLLAPSE/EXPAND ON RECORDS TAB:**
- **✅ Fixed collapse/expand** — Moved from wrong standalone tabs to Records tab (AthletePageRecordsTab). Toggles all 4 sections.

**Completed (2026-03-17 Session 218 - Opus 4.6) — ACHIEVEMENT DIFFICULTY LEVELS + COLLAPSE/EXPAND:**
- **✅ Achievement difficulty system** — New `difficulty` column (bronze/silver/gold/platinum) independent of tier. Migration pending.
- **✅ Difficulty filter chips** — Multi-select on both Coach and Athlete achievements tabs.
- **✅ Coach definition modal** — Difficulty selector with metallic-colored buttons.
- **✅ Collapse/expand all** — Added to Coach/Athlete Achievements tabs + Records tab.

**Completed (2026-03-17 Session 217 - Opus 4.6) — FIST BUMP MOBILE UX + ACHIEVEMENT BW CALC:**
- **✅ Fist bump mobile UX reworked, leaderboard tightened, CAP format fix, achievement bodyweight calculator.**

**Completed (2026-03-16 Session 216 - Opus 4.6) — WHITEBOARD SCORE ENTRY BUGFIXES:**
- **✅ CHECK constraint bug fixed, dedup logic improved, leaderboard whiteboard support.**

**Completed (2026-03-16 Session 215 - Opus 4.6) — WHITEBOARD SCORE ENTRY:**
- **✅ Whiteboard Intro score entry + migration applied.**

**Completed (2026-03-15 Session 214 - Opus 4.6) — ORPHAN WORKOUT CLEANUP + COPY BUG FIX:**
- **✅ Orphan cleanup + copy/drag/delete fixes.**

**Older Sessions (57-213):**
See `project-history/` folder for detailed implementation history

---

## 🚨 Known Issues / Remaining Items

**Pre-Deployment Audit — Sessions 96-101 + 154-155:**
- ✅ All CRITICAL, HIGH, and MEDIUM items completed
- **LOW remaining:** 8 files >500 lines, 22 `@typescript-eslint/no-explicit-any`, no rate limiting on registration

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
- See: `Chris Notes/remaining-low-items.md` for outstanding LOW items

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
- ✅ `get_public_tables()` RPC — confirmed working
- ✅ `coach_cancelled` booking status — confirmed applied (Session 158)
- ✅ `is_beta_tester` column — applied (Session 158)
- ✅ `20260304000000_add_performance_indexes.sql` — 7 indexes on bookings/wods/weekly_sessions (Session 173, applied Session 190)
- ✅ `20260307000000_drop_search_terms.sql` — Drop search_terms column, update search_vector trigger (Session 180, applied)
- ✅ `20260307000001_add_programming_planner.sql` — 3 tables applied directly in SQL Editor (Session 183)
- ✅ `20260307000002_add_pattern_track.sql` — Adds track column to movement_patterns + updated unique constraint (Session 184, applied)
- ✅ `20260308000000_add_plan_items_indexes.sql` — Indexes on programming_plan_items(user_id, pattern_id) (Session 187, applied)
- ✅ `20260310000000_add_duplicate_prevention_constraints.sql` — Unique indexes on wod_section_results + benchmark_results (Session 189, applied Session 190)
- ✅ `20260313_add_session_cancelled_preference.sql` — Adds `session_cancelled` boolean column to notification_preferences (Session 202, applied Session 203)
- ✅ `20260314_add_member_id_to_section_results.sql` — Adds `member_id` column to wod_section_results, makes `user_id` nullable (Session 203, applied)
- ✅ `20260314_add_score_recorded_preference.sql` — Adds `score_recorded` boolean column to notification_preferences (Session 205, applied)
- ✅ `20260316_add_whiteboard_name_to_section_results.sql` — Adds `whiteboard_name` to wod_section_results + members, updates CHECK constraint (Session 215, applied)
- ⏳ `20260317000000_add_achievement_difficulty.sql` — Adds `difficulty TEXT` column to achievement_definitions with CHECK constraint (Session 218)

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

### NEXT SESSION
1. **Run achievement difficulty migration** — Apply `20260317000000_add_achievement_difficulty.sql` in Supabase SQL Editor.
2. **Test difficulty filter + definition modal** — End-to-end after migration applied.
3. **Test collapse/expand on Records tab** — Verify all 4 sections toggle correctly.
4. **Deploy + test whiteboard leaderboard** — Verify whiteboard-only athletes show names (not "Unknown") on athlete leaderboard after deploy.
5. **Coach library optimization** — Equipment & Body Parts lists need optimising.
6. **April 13 reminder:** Verify Stripe trial payment processed for test athlete.

### DEPLOYMENT (Session 158+)

- ✅ **Phase 1:** Code changes DONE
- ✅ **Phase 2:** Vercel Setup DONE — Hobby (free), percepto25 personal account, 15 env vars
- ✅ **Phase 3:** Domain Setup DONE — `app.the-forge-functional-fitness.de`, CNAME in Squarespace
- ✅ **Phase 4:** Supabase Config DONE — Production site URL + redirect URLs

**Open question from Chris:** "Why do we need a beta_tester flag? Can't I just activate them on the member page?" — Revisit. Options: (a) keep beta flag, (b) coach manually sets `athlete_subscription_status = 'active'`, (c) add UI toggle on Members page. Simplest may be (b).

- ✅ **Phase 5:** Stripe Live Mode DONE (Session 190) — 3 products created, webhook configured, Vercel env vars updated, redeployed (Session 191)
- ✅ **Phase 5b:** Stripe identity verification DONE + live keys fixed (Session 193)
- ⏳ **Phase 6:** Beta Testing (4-5 testers) — Use coach manual override to grant access
- **Phase 7:** Full Launch (after 1 month, update Stripe prices to €10/€100)

**Full deployment plan:** `Chris Notes/deployment-plan.md`

### Business Model (decided Session 157)
- **Free:** All active members can book classes (no payment required)
- **10-Card:** €150 for 10 gym sessions (drop-in alternative, separate from app)
- **Athlete App:** €7.50/mo or €75/yr (logbook, records, leaderboards, achievements). Launch pricing rises to €10/€100 after 1 month.

---

## 🗂️ Additional Resources

- **Detailed History:** See `project-history/` for feature implementation details by date
- **Critical Gotchas:** See `memory-bank/lessons-learned.md` for patterns
- **Workflow Rules:** See `memory-bank/workflow-protocols.md` (includes DATABASE SAFETY PROTOCOL)
- **Tech Details:** See `memory-bank/memory-bank-techContext.md`
- **Code Patterns:** See `memory-bank/memory-bank-systemPatterns.md`

---

**File Size:** ~4.5KB
