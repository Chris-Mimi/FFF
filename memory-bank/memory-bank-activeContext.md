# Active Context

**Version:** 10.60
**Updated:** 2026-02-07 (Session 97 - Pre-Deployment Audit Fixes)

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

**Completed (2026-02-07 Session 97 - Opus 4.6):**
- **✅ Pre-Deployment Audit Fixes (Continued from Session 96):**
  - **#7 Console.log cleanup** — Removed 18 console.logs across 6 files (webhook, whiteboard-photos, generate-weekly, ExerciseLibraryPopup, MovementLibraryPopup, TenCardModal)
  - **#14 Error detail exposure** — Fixed 7 instances in publish-workout and whiteboard-photos routes (removed `error.message` / `details` from client responses)
  - **#5 N+1 query** — Replaced N individual attendance queries with single batch RPC call `get_all_members_attendance` in coach/members/page.tsx
  - **#6 Middleware** — Created `middleware.ts` for centralized route protection using `@supabase/ssr`, updated `lib/supabase.ts` to `createBrowserClient`
  - **#8 next/image** — Converted all 10 raw `<img>` tags to `next/image` across 7 files. Added `images.remotePatterns` for Supabase storage in next.config.ts
  - **#10 Security headers** — Already done in next.config.ts (confirmed)
  - **#11 select('*')** — Replaced with explicit columns in 8 API routes + 5 page/component files + loadingLogic.ts (3 queries). Fixed pre-existing type mismatch in WorkoutLog interface
  - **#12 DB indexes** — Created `database/add-audit-indexes.sql` with indexes for benchmark_results, lift_records, workout_logs, wod_section_results, whiteboard_photos, athlete_profiles, subscriptions. Applied to Supabase
  - **#4 Error boundaries** — Verified error.tsx exists at app root, /coach, /athlete, /member
- **New files:** middleware.ts, lib/auth-api.ts, lib/auth-fetch.ts, app/error.tsx, app/coach/error.tsx, app/athlete/error.tsx, app/member/error.tsx, database/add-audit-indexes.sql
- Build passes clean throughout all changes
- See: `project-history/2026-02-07-session-97-pre-deployment-audit-fixes.md`

**Completed (2026-02-06 Session 95 - Opus 4.6):**
- Backup auto-discovery, Google Calendar workout types, class type color fix
- See: `project-history/2026-02-06-session-95-backup-autodiscovery-calendar-types.md`

**Completed (2026-02-06 Session 94 - Sonnet 4.5):**
- Kids programs class type system, enhanced age filtering
- See: `project-history/2026-02-06-session-94-kids-class-filtering.md`

**Completed (2026-02-05 Session 93 - Opus 4.5):**
- Coach athletes mobile optimization, family member fixes, delete duplicates SQL fix
- See: `project-history/2026-02-05-session-93-coach-athletes-mobile-family-fixes.md`

**Completed (2026-02-04 Sessions 91/92):**
- Root page auth redirect, member registration flow, mobile testing, memory bank cleanup
- See: `project-history/2026-02-04-session-91-auth-redirect-member-registration.md`
- See: `project-history/2026-02-04-session-92-member-registration-mobile-testing.md`

**Older Sessions (57-90):**
See `project-history/` folder for detailed implementation history

---

## 🚨 Known Issues / Remaining Audit Items

**Audit Items Remaining (LOW priority):**
- **#13** Auto-confirmed emails — Requires Supabase Dashboard config (not code)
- **#15** Large components >1000 lines — Refactoring (coach/athletes, benchmarks-lifts, members)
- **#16** No favicon — Needs gym logo asset
- **#17** Missing OG/Meta tags

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

### Session 98 Priorities

**Pre-Deployment Audit Status:**
- ✅ #1-12, #14 completed (Sessions 96-97)
- Remaining: #13, #15, #16, #17 (all LOW priority)
- Full audit findings: `Chris Notes/pre-deployment-audit-findings.md`

**Ready for Deployment:**
- All CRITICAL and HIGH audit items resolved
- All MEDIUM items resolved
- Build passing clean
- Security headers, middleware, error boundaries, auth all in place

**Pending Polish (LOW):**
- #15 Large component refactoring (coach/athletes 1264 lines, benchmarks-lifts 1445 lines)
- #16 Favicon (needs gym logo)
- #17 OG/Meta tags
- Analysis page scroll jump bug (DEFERRED)

---

## 🗂️ Additional Resources

- **Detailed History:** See `project-history/` for feature implementation details by date
- **Critical Gotchas:** See `memory-bank/lessons-learned.md` for patterns
- **Workflow Rules:** See `memory-bank/workflow-protocols.md` (includes DATABASE SAFETY PROTOCOL)
- **Tech Details:** See `memory-bank/memory-bank-techContext.md`
- **Code Patterns:** See `memory-bank/memory-bank-systemPatterns.md`

---

**File Size:** ~4.3KB
