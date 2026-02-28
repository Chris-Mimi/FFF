# Active Context

**Version:** 47.0
**Updated:** 2026-02-27 (Session 163 - Timer speech + achievement template copy)

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

**Completed (2026-02-28 Session 164 - Opus 4.6) — DEBUG SESSION (transient issue):**
- **✅ Investigated "signal is aborted without reason" + page not loading** — Transient issue, resolved on its own. Root cause unknown (not .next cache, not Supabase pause). Diagnostic: check DevTools Network tab if recurs.
- **✅ ExercisesTab.tsx useEffect cleanup** — Added `cancelled` flag, `clearTimeout`, and `AbortError` guard for React Strict Mode hygiene.

**Completed (2026-02-27 Session 163 - Sonnet 4.6) — TIMER SPEECH + ACHIEVEMENT TEMPLATE + SEARCH/EXERCISE UX:**
- **✅ Timer speech synthesis** — Web Speech API with iOS unlock. Speech toggle button.
- **✅ Achievement template copy** — Copy from existing in Add modal. "Strength" category added.
- **✅ Exercise usage click-through** — "Used Nx" badge clickable → slide-in panel with workout list.
- **✅ Movement analytics enhancement** — `ExerciseFrequency` now includes `workouts[]` array with date/session_type/workout_name. Internal `Set` → `Map`.
- **✅ Intent/stimulus UX** — Amber bg + truncated preview when collapsed; auto-expanding textarea.
- **✅ Search fixes** — "N" badge for coach notes, "Workout Name" filter, WOD Movements folded into WOD (All Parts), word-boundary regex fix.

**Completed (2026-02-27 Session 162 - Opus 4.6) — TAB REORDER + TIMER RELOCATION + AUDIO FIX:**
- **✅ Reordered athlete tabs** — Logbook now directly after Workouts
- **✅ Removed Timer tab** — moved to Forge Benchmarks header icon
- **✅ FIXED timer audio distortion** — WAV files replace Web Audio API oscillators

**Completed (2026-02-27 Session 161 - Opus 4.6) — GOOGLE CALENDAR DUPLICATE FIX:**
- **✅ Dual-layer orphan cleanup on publish**

**Completed (2026-02-26 Session 160 - Opus 4.6) — BENCHMARK SAVE + ORPHAN WOD FIXES:**
- **✅ Forge Benchmark reps save bug, upsert, leaderboard orphan filter, copy-workout cleanup**

**Older Sessions (57-163):**
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

### DEPLOYMENT (Session 158+)

**Phase 1 DONE (code changes).** Remaining phases are configuration/setup:

**Open question from Chris:** "Why do we need a beta_tester flag? Can't I just activate them on the member page?" — Revisit. Options: (a) keep beta flag, (b) coach manually sets `athlete_subscription_status = 'active'`, (c) add UI toggle on Members page. Simplest may be (b).

**Phase 2: Vercel Setup**
- Create Vercel account (sign up with GitHub)
- Import `forge-functional-fitness` repo
- Add env vars from `.env.local` + set `NEXT_PUBLIC_APP_URL=https://app.the-forge-functional-fitness.de`

**Phase 3: Domain Setup**
- In Vercel: Add domain `app.the-forge-functional-fitness.de`
- In Squarespace: Add CNAME record `app` → `cname.vercel-dns.com`

**Phase 4: Supabase Config**
- Auth → URL Configuration: Site URL + redirect URLs to production domain
- ✅ All pending migrations applied

**Phase 5: Stripe Live Mode**
- Complete Stripe onboarding, toggle to live
- Create products: Athlete Monthly €7.50 + Yearly €75 (both with 1-month free trial) + 10-Card €150
- Set up webhook: `https://app.the-forge-functional-fitness.de/api/stripe/webhook`
- Update Vercel env vars with live keys

**Phase 6: Beta Testing** (4-5 testers)
**Phase 7: Full Launch** (after 1 month, update Stripe prices to €10/€100)

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
