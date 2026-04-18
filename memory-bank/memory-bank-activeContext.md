# Active Context

**Version:** 153.0
**Updated:** 2026-04-18 (Session 287 - waitlist promotion fix)

---

## ⚠️ CRITICAL RULES

| Rule | Detail |
|:---|:---|
| **Mandate** | Read `memory-bank/workflow-protocols.md` only when task actually needs it |
| **Database Safety** | Run `npm run backup` BEFORE any migration or risky change |
| **Agent Use** | Agent only for 3+ step tasks, multi-file changes, genuine unknowns |
| **Efficiency** | Target < 50% context. See `Chris Notes/AA frequently used files/Claude open or close session.md` for rules |
| **Context Monitoring** | 50/60%: alert. 70%: STOP, summary+commit+new session. 80%: critical |

---

## 🎯 Project Overview

CrossFit gym management app — WOD creation, analysis, member booking, athlete performance tracking.

**Stack:** Next.js 15 App Router · TypeScript · Tailwind · Supabase (PostgreSQL + RLS) · Supabase Auth · Recharts · Stripe (live mode)

**Deployed:** `https://app.the-forge-functional-fitness.de` (Stripe identity verified Session 193)

**Units:** Metric (kg, cm, m)

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
├─ barbell_lifts (id, name, category, display_order, equipment)
├─ programming_notes (id, user_id, title, content [markdown], folder_id, created_at, updated_at)
├─ note_folders (id, user_id, name, display_order, created_at, updated_at)
├─ coach_tracked_exercises (id, user_id, exercise_id, display_name, active, created_at)
├─ movement_patterns (id, user_id, name, description, track [adults|kids], created_at, updated_at)
├─ movement_pattern_exercises (id, pattern_id, exercise_id)
├─ programming_plan_items (id, user_id, pattern_id, planned_date, created_at)

Member Tables
├─ members (id, email, name, status, membership_types[], account_type: primary|family_member, primary_member_id, display_name, date_of_birth, relationship, class_types[] [ekt|t|cfk|cft], gender [M|F|null], whiteboard_name, subscription_tier, athlete_subscription_start, athlete_subscription_end, athlete_subscription_status)
├─ bookings (id, session_id, member_id, status: confirmed|waitlist|cancelled|no_show|late_cancel|coach_cancelled)

Athlete Tables (linked to members.id)
├─ athlete_profiles (id, user_id, full_name, emergency_contact)
├─ workout_logs (id, user_id, wod_id, result, notes)
├─ benchmark_results (id, user_id, benchmark_id, forge_benchmark_id [XOR], benchmark_name, benchmark_type, result_value, scaling_level, scaling_level_2, scaling_level_3, result_date)
├─ lift_records (id, user_id, lift_name, weight_kg, reps, rep_max_type ['1RM'|'3RM'|'5RM'|'10RM'], rep_scheme, calculated_1rm, notes, lift_date, wod_id [CASCADE])
├─ wod_section_results (id, user_id, member_id, wod_id, section_id, workout_date, time_result, reps_result, weight_result, weight_result_2, weight_result_3, scaling_level, scaling_level_2, scaling_level_3, rounds_result, calories_result, metres_result, task_completed, track [SMALLINT 1/2/3 or NULL], whiteboard_name)

Achievement Tables
├─ achievement_definitions (id, name, description, category, branch, tier, difficulty, created_at)
├─ athlete_achievements (id, user_id, achievement_id, achieved_date, notes, awarded_by, created_at [UNIQUE user_id + achievement_id])

Social Tables
├─ reactions (id, user_id, target_type ['wod_section_result'|'benchmark_result'|'lift_record'], target_id, reaction_type ['fist_bump'], created_at [UNIQUE user_id + target_type + target_id])
```

**Workout naming:** `session_type` (WOD, Foundations, Kids & Teens…) + optional `workout_name` + auto-calculated `workout_week` (ISO, UTC-based). Unique identifier = `workout_name + workout_week` (falls back to date if null).

---

## 📍 Current Status (Last 3 Sessions)

**Session 287 (2026-04-18 — Opus 4.7) — WAITLIST PROMOTION FIX (capacity=0 + WOD save path):**
- Reported: tomorrow's 10:30 session stuck at `1/10 confirmed + 1 waitlist` despite room on roster.
- Two compounding bugs: (1) `capacity === 0` (meant "unlimited") was being treated as "zero spots" in booking logic — `confirmedCount < 0` always false → every booking went to waitlist. (2) `useWODOperations.ts` WOD-save paths update `weekly_sessions.capacity` but never call `promoteWaitlistMembers` — so when capacity was raised from 0→10 via Workout modal, waitlist stayed stuck.
- Fixes: `lib/coach/bookingHelpers.ts` + `app/api/bookings/create/route.ts` now treat `capacity === 0` as unlimited. Added `promoteWaitlistForSession`/`promoteWaitlistForWorkout` helpers to `lib/coach/sessionCapacityHelpers.ts`; wired into all 5 capacity-update sites in `hooks/coach/useWODOperations.ts`.
- DB state: Lukas (waitlist at that 10:30 session) promoted to confirmed via direct UPDATE. Christian+Kathrin were already self-cancelled.
- Carryover: member booking page UI does not handle capacity=0 (`app/member/book/page.tsx:540-564` — division by zero, shows "Full"). Not fixed.

**Session 286 (2026-04-17) — ORPHAN WOD PREVENTION:**
- Added self-delete guards to WOD-creation paths (rapid-save + session-generate failures). Commit 98fa868.

**Session 285 (2026-04-17 — Opus 4.7) — ORPHAN WOD CLEANUP + EFFICIENCY RULES:**
- Data Integrity SQL surfaced 8 orphan WODs (wods rows with no linked weekly_sessions).
- All 8 = unpublished shells, zero dependent data (no section_results/logs/lifts). Deleted after backup.
- Pattern: 3 duplicates of "CrossFit Open #15.2" created 5 min apart (duplicate-save), 5 default-named WODs from bulk-generate (likely `app/api/sessions/generate-weekly/route.ts` missing self-delete guard that `useWODOperations.ts:264-268` has).
- Pruned activeContext.md from ~270 lines to target < 80 lines. Added efficiency rules to session-start doc.

**Session 284 (2026-04-17) — ATTENDANCE COUNT FIX (whiteboard text):**
- Pre-launch members severely undercounted (ThomasG 8→22, Steven 10→39, DanielB 8→20).
- Root causes: (1) Supabase JS strips `null` → RPC fell to `DEFAULT 30`-day window. Fixed with `36500`. (2) Whiteboard Intro free-text mentions invisible to RPC. Added 3rd UNION matching `members.whiteboard_name` ~* `wods.sections::text` with POSIX `\y` word boundaries.
- Files: `database/update-attendance-functions-include-whiteboard-text.sql`, `hooks/coach/useMemberData.ts`, `hooks/coach/useCoachData.ts`.
- Carryover: Steven shows 39 on Members page vs 37 on Workouts-tab search — +2 discrepancy unresolved.

**Older sessions (57-284):** See `project-history/` folder.

---

## 🚨 Known Open Issues

- **Athlete subscription bug** — trialing sub sets `athlete_subscription_end = today` instead of +30d. Root causes possibly: webhook event order (`subscription.updated` overwriting checkout-handler end date), `autoExpireSubscriptions` not skipping `status='trialing'`. Stefan Glocker also needs manual DB fix.
- **Member booking page UI doesn't handle capacity=0** — `app/member/book/page.tsx:540-564` does `confirmed / capacity * 100` (division by zero) and `capacity - confirmed < 0` which renders as "Full". Cosmetic; unlimited sessions still book correctly. Deferred Session 287.
- **iPhone search bug (latent)** — same `readOnly` anti-autofill hack exists in `components/coach/SearchPanel.tsx:946` (Analysis page search). Deferred Session 282.
- **`SearchPanel` 500-row limit** — `useCoachData.ts:245` caps queries at 500 rows. Not a current concern (gym has far fewer published sessions than 500).

**Pre-deployment:** All CRITICAL/HIGH/MEDIUM items done. LOW items (28 files >500 lines) deferred per Session 260.

**Exercise naming conventions (Session 149):**
- "Lunge Walking" (not "Walking Lunge")
- "Jump Rope Double-Unders (DUs)"
- KB Swing default = American (AKBS)
- Generic "Row" in benchmarks = C2 Rower

---

## 📋 Next Immediate Steps

1. **Test Session 287 waitlist fix** — see `Chris Notes/AA frequently used files/session-287-test-prompt.md` for the exact test prompt.
2. **Athlete subscription bug** — fix Stefan Glocker DB row + investigate webhook ordering + `autoExpireSubscriptions` vs trialing.
3. **Member book page capacity=0 UI** — fix division-by-zero + "Full" display when capacity is 0 (unlimited). Cosmetic, low priority.

---

## 💰 Business Model (Session 270)

- **Free:** All active members can book classes (no payment required)
- **10-Card:** €150 for 10 gym sessions (drop-in alternative, separate from app)
- **Athlete App — Forge:** €8/mo or €80/yr (logbook, records, leaderboards, achievements)
- **Athlete App — Wellpass:** €10/mo or €100/yr (same features, for Wellpass members)

---

## 🗂️ Resources

- **Detailed history:** `project-history/` folder
- **Gotchas & patterns:** `memory-bank/lessons-learned.md`
- **Workflow rules:** `memory-bank/workflow-protocols.md`
- **Tech details:** `memory-bank/memory-bank-techContext.md`
- **Code patterns:** `memory-bank/memory-bank-systemPatterns.md`
- **Deployment plan:** `Chris Notes/deployment-plan.md`
- **Orphan diagnostics:** `Chris Notes/supabase-orphan-check-queries.md`
