# Active Context

**Version:** 167.0
**Updated:** 2026-04-23 (Session 303/304 — Acronym search data-driven ship + session handoff infrastructure)

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

Athlete Tools
├─ timer_presets (id, user_id → auth.users, name, intervals JSONB [{work, rest}[]], created_at, updated_at [UNIQUE user_id + name])
```

**Workout naming:** `session_type` (WOD, Foundations, Kids & Teens…) + optional `workout_name` + auto-calculated `workout_week` (ISO, UTC-based). Unique identifier = `workout_name + workout_week` (falls back to date if null).

---

## 📍 Current Status (Last 5 Sessions)

**Session 304 (2026-04-23 — Opus 4.7) — SESSION HANDOFF INFRASTRUCTURE + S303 SHIP:**
- Finished shipping S303 acronym work (previously uncommitted). Chris ran `database/20260423_add_acronym_tags.sql` in Supabase SQL Editor; verified `"Barbell Deadlift"` now has `dl` in `tags[]`. Live-tested Workouts page search + Movement Tracking — "seems good". Committed S303 code (`utils/movement-extraction.ts`, `hooks/coach/useCoachData.ts`, the migration SQL via `git add -f`).
- **Session handoff docs (new discipline):** created `Chris Notes/AA frequently used files/handoff-prompt.md` — a reusable prompt to paste at 70% context to trigger a structured 8-point handoff doc. Added a one-line pointer to `CLAUDE.md` Context Monitoring section.
- **Session-close checklist rewrite** (`Chris Notes/AA frequently used files/session-close-checklist.md`): fixed duplicate step numbering, added explicit `git status` review step (vs reflex `git add .` — Session 240 incident), added step for updating `Notes for next session.md` (was missing entirely), codified `type(session-XXX):` commit-message pattern from recent git log, updated model attribution to Opus 4.7, dropped stale frozen table list (backup auto-discovers via `get_public_tables()`), added cross-reference to `handoff-prompt.md` for the emergency (70%+) path vs. this checklist's clean-close (< 60%) path.
- **Still open from S303:** 3 other callers of `extractMovementsFromWod` don't pass `acronymMap` — `utils/pattern-analytics.ts`, `hooks/coach/useMovementTracking.ts`, `utils/movement-analytics.ts`. Low priority, noted in Next Steps.

**Session 303 (2026-04-22 / 04-23 — Opus 4.7 across two days) — DATA-DRIVEN ACRONYM SEARCH:**
- Chris reported "BS" (Back Squat) didn't surface every intended workout in the Workouts search; asked for DL (Deadlift) too. Previous implementation had 26 acronyms hardcoded in `genericToCanonical`. Refactored to data-driven via `exercises.tags[]` so new acronyms are added via SQL, not code.
- **Migration 1** (`database/20260422_session303_strip_acronym_suffixes.sql`): stripped 26 `(XX)` suffixes from `display_name`, moved the acronym into `tags[]` lowercase. Verified step-3 returned 0 rows after run.
- **Migration 2** (`database/20260423_add_acronym_tags.sql`): added `'dl'` tag to `"Barbell Deadlift"` which had no parenthetical suffix. Template footer for future additions.
- **`utils/movement-extraction.ts`**: removed the hardcoded 26-acronym block + `acronymForName`/`canonicalToAcronym`/`acronymEntries`. Exported `type AcronymMap = Map<string, string>`. Added optional 3rd arg `acronymMap?: AcronymMap` to `extractMovementsFromWod` + `extractMovements`. Source 1 (lifts) now checks `acronymMap` FIRST, then falls back to `genericToCanonical` (still holds non-acronym generic mappings). Also stripped `(xxx)` parentheticals from remaining `genericToCanonical` values; two values changed prefix to match new DB names (`'barbell overhead squat'`, `'barbell strict oh press'`).
- **`hooks/coach/useCoachData.ts`**: `fetchExerciseNames` now selects `tags` too, builds 2 maps (`acronymMap`: tag → display_name, `displayNameToAcronyms`: display_name → tags). Search filter pushes all exercise tags into `combinedText` for Lifts-section lifts (tries `liftLower`, `barbell liftLower`, `kb liftLower`, `jump rope liftLower`). Both `extractMovementsFromWod` + `extractMovements` calls pass `acronymMap`.
- **TS check clean** (`npx tsc --noEmit`). Live-tested + verified by Chris S304.
- **Follow-up:** 3 other callers (pattern-analytics, useMovementTracking, movement-analytics) still don't pass `acronymMap` — deferred.

**Session 302 (2026-04-22 — Opus 4.7) — LEADERBOARD TIEBREAKER NaN FIX + DOB SYNC + BENCHMARK PARITY:**
- Chris live-tested S301 "Front Squat 5RM" (7 tied at 80kg) and reported tiebreaker wasn't ordering him (oldest, DOB set) to the top of the tied group.
- **Bug 1 — NaN poisoning the sort comparator** (`utils/leaderboard-utils.ts`): `ageOf` used `?? -Infinity` sentinel. When both entries had no DOB, `-Infinity - (-Infinity) = NaN`. `NaN !== 0` → `Array.sort()` silently abandoned remaining tiebreakers (date, session_time). Replaced with `compareAge` helper (both-null → 0 falls through, one-null → null ranks last, else older DESC). Applied in `rankSectionResults` and `rankLiftResults`.
- **Bug 2 — DOB written to wrong table** (`components/athlete/AthletePageProfileTab.tsx:202`): athlete profile save wrote DOB to `athlete_profiles.date_of_birth` but never to `members.date_of_birth`. `get_member_names` RPC (added S300) reads from `members`. Added `memberUpdate.date_of_birth = profile.date_of_birth || null` to the existing members-sync block (already syncs name + gender). Chris ran a one-time backfill SQL (`UPDATE members SET date_of_birth = ap.date_of_birth FROM athlete_profiles ap WHERE members.id = ap.user_id AND members.date_of_birth IS NULL AND ap.date_of_birth IS NOT NULL;`).
- **S301 live-tested ok** on Front Squat 5RM after Bug 1 + Bug 2 fixes.
- **Benchmark parity (S301 leftover)**: ported tiebreaker chain + shared ranks to `rankBenchmarkResults` (`utils/leaderboard-utils.ts`). Split sort into `comparePrimary` (scaling → track → weight tiebreaker → primary metric) and display tiebreakers (age DESC → `result_date` ASC). No `session_time` — benchmarks are all-time bests, not session-linked. Added `memberAges` 6th arg and `age` to output entries. Both callers in `LeaderboardView.tsx` (lines ~864 and ~1505) updated to pass ages. Benchmark parity **not yet live-tested**.
- Commits: `aeaa534` (bugs 1+2), S302 follow-up (benchmark parity) uncommitted at session close.

**Session 301 (2026-04-22 — Opus 4.7) — LIFT LEADERBOARD TIEBREAKER PARITY:**
- Chris tested S300 on a "Front Squat 5RM" leaderboard (Mon WOD, 7 athletes tied at 80kg). Shared ranks didn't apply — they still showed distinct ranks 2-8. Chris is the oldest athlete in the box with DOB set, so he expected to be at the top of the 80kg group.
- Root cause: the "Front Squat 5RM" chip is a `type: 'lift'` item sourced from `lift_records`, routed through `rankLiftResults` — NOT `rankSectionResults` (which was the only function S300 patched). S300 log explicitly flagged this as follow-up scope.
- **Ported S300 tiebreaker chain + shared ranks to `rankLiftResults`** (`utils/leaderboard-utils.ts`). Tied-on-weight entries share rank; display order within tied group: age DESC (missing DOB → youngest) → `lift_date` ASC → `session_time` ASC.
- **Schema additions:** `LeaderboardEntry` gained optional `age` + `sessionTime`. `RawLiftResult` gained optional `wod_id` + `session_time`. `rankLiftResults` gained optional 5th arg `memberAges`.
- **LeaderboardView lift path wiring** (`components/athlete/LeaderboardView.tsx`): selects `wod_id` on lift_records query, destructures `ages` from `fetchMemberNames`, annotates `session_time` via the same (wod_id, lift_date) → `weekly_sessions` → `bookings` chain. Uses `lift_records.user_id` as `bookings.member_id` (valid because `members.id === auth.users.id`). Whiteboard lift entries get `age: null`.
- **Still not covered:** `rankBenchmarkResults` (benchmark leaderboards). Left as follow-up — flag if Chris wants parity there too.
- **Not yet live-tested.**

**Session 300 (2026-04-22 — Opus 4.7) — LEADERBOARD TIEBREAKERS + SHARED RANKS:**
- Chris asked how tied scores are ordered. Discovered tied athletes previously got distinct sequential ranks (1,2,3,…) and final order was whatever PostgreSQL returned (roughly insertion order). Fix: new tiebreaker chain + shared-rank assignment.
- **Shared ranks** in `rankSectionResults` (`utils/leaderboard-utils.ts`): split sort into `comparePrimary` (DNF → scaling → track → primary metric — the chain that defines a "tie") and display-order tiebreakers. Rank loop compares adjacent sorted entries via `comparePrimary`; ties inherit the previous rank → standard competition ranking `1,1,1,4,…`.
- **Display-order tiebreakers (tied group only):** age DESC (older first, missing DOB treated as youngest) → `workout_date` ASC → `session_time` ASC (17:15 before 18:30).
- **Age exposure:** extended `get_member_names` RPC to return integer `age` computed server-side from `date_of_birth` via `DATE_PART('year', AGE(dob))::INT`. Raw DOB never leaves the DB. Return-type change required `DROP FUNCTION` before `CREATE`. Migration: `database/20260422_add_age_to_get_member_names.sql` (applied via dashboard).
- **Session-time lookup:** `wod_section_results` has no session_id, so inferred it: fetch `weekly_sessions` for (wod_id, date) pairs → fetch `bookings` (member_id → session_id) → match member's booking to the session, use that session's time. Single-session days skip the bookings query. Adds 2 lightweight queries per leaderboard load.
- **Schema additions:** `RawSectionResult` gained optional `wod_id` and `session_time`. `rankSectionResults` gained optional `memberAges` 5th arg. `fetchMemberNames` in `LeaderboardView` now also returns `ages`.
- Scope: `rankSectionResults` only (WOD section leaderboards). `rankBenchmarkResults` (benchmarks) + `rankLiftResults` (lift PRs) unchanged — noted as potential follow-up if Chris wants parity.
- **Not yet live-tested.**

**Older sessions (57-299):** See `project-history/` folder.

---

## 🚨 Known Open Issues

- **Mac Chrome hang (recurring, system-level)** — Chris's Macbook: after working a while, apps bounce in dock but won't launch ("Google Chrome is not responding"). Only full Mac restart fixes it. Happens increasingly often. Directly affects Forge pushes: Chrome in half-dead state = stuck GCM "Connecting", so Mac push never arrives. Not a Forge code issue; dedicated session needed. Diagnostic starting points: Activity Monitor Memory Pressure, disk free %, Chrome Helper memory leaks, `~/Library/Logs/DiagnosticReports/` for spindumps. (Session 292.)
- **Mac push delivery (downstream of above)** — Mac never receives FCM pushes even with clean DB subs + healthy SW. `chrome://gcm-internals/` shows Connection State "Connecting". Will auto-resolve once the Chrome-hang root cause is fixed. Android push unaffected.
- **Test endpoint doesn't cleanup 410s** — `app/api/notifications/test/route.ts` bypasses `sendToSubscription` helper so expired subs aren't auto-deleted when you click Send Test. Low priority — production flows still clean up 410s. (Session 292.)
- **Athlete subscription bug** — trialing sub sets `athlete_subscription_end = today` instead of +30d. Root causes possibly: webhook event order (`subscription.updated` overwriting checkout-handler end date), `autoExpireSubscriptions` not skipping `status='trialing'`. Stefan Glocker also needs manual DB fix.
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

1. **Decide whether to extend S303 acronym resolution** to `utils/pattern-analytics.ts:47,:162`, `hooks/coach/useMovementTracking.ts:46`, `utils/movement-analytics.ts:456`. Pattern: add optional `acronymMap?: AcronymMap` arg and plumb through from the calling hook (already has `exerciseNames` — expose the map the same way). Low priority.
2. **Live-verify S302 benchmark leaderboard tiebreakers** — find a benchmark with tied scores (e.g., two athletes tied on Fran time), confirm shared rank + age/date ordering within tied group.
3. **Live-verify S300 section leaderboard tiebreakers** — find a tie scenario on a section-result view (weight/reps/time), same age/date/time ordering expected.
4. **Live-verify S299 changes** — (a) leaderboard with reps+cals section shows combined ranking and `"X reps + Y cal"` format, (b) Records page Barbell Lifts list sorts Olympic→Press→Pull→Squat with lifts grouped alphabetically, (c) Intervals presets Delete button visible on iPhone.
5. **Live-test Intervals timer mode itself** (S296) on deployed app — core mode never live-tested (presets already confirmed working S298).
6. **Verify SPF/DKIM/DMARC + test reset flow on deployed app (S297 follow-up)** — Resend → Domains → `the-forge-functional-fitness.de` should show all ✅. Then test the full reset flow end-to-end on live app (should now show "Updating password for [email]" above form).
7. **Mac Chrome hang investigation** — dedicated session. Start with Activity Monitor (Memory Pressure + Chrome Helper processes), disk free %, update status, then hang reports in `~/Library/Logs/DiagnosticReports/`. Will fix Mac push as a side effect.
8. **Athlete subscription bug** — fix Stefan Glocker DB row + investigate webhook ordering + `autoExpireSubscriptions` vs trialing.
9. **Whiteboard duplicate entries** (see `memory/project_whiteboard_duplicates.md`) — uncommitted changes from Session 251 need reviewing/committing.
10. **Score-entry API filter (deferred from S289)** — `app/api/score-entry/[sessionId]/route.ts:48-56` only filters bookings by `status='confirmed'` and ignores `members.status`. If unapprove should cascade to hide bookings, filter in API or cascade-cancel bookings.
11. **Test endpoint 410 cleanup** (deferred from S292) — route `app/api/notifications/test/route.ts` through `sendToSubscription` so expired subs auto-delete on Send Test.

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
