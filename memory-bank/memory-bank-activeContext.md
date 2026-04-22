# Active Context

**Version:** 166.0
**Updated:** 2026-04-22 (Session 302 - Leaderboard tiebreaker NaN fix + DOB sync + benchmark parity)

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

**Session 299 (2026-04-22 — Opus 4.7) — LEADERBOARD reps+cals SCORING + RECORDS SORT + INTERVALS MOBILE FIX:**
- **Intervals presets mobile overflow** (`components/athlete/WorkoutTimer.tsx`): Delete preset button was off-screen on small viewports. Root cause: native `<select>` inside `flex items-center` won't shrink below its longest option's intrinsic width, pushing siblings out. Fix: added `min-w-0` + reduced horizontal padding on the select. Save/Delete were already icon-only on mobile via `hidden sm:inline`.
- **Leaderboard combined reps+cals scoring** (`utils/leaderboard-utils.ts`): when a section has both `reps` AND `calories` scoring fields enabled, ranking previously resolved to plain `reps` per priority ladder — the cals column looked unsorted. Added new `'reps_cals'` scoring type (positioned above plain `reps` in `detectScoringType`), sorts by `(reps_result + calories_result)` descending. Primary display: `"X reps + Y cal"`. Filter accepts entries with either value > 0. Extras suppressed (both already in primary).
- **Records page Barbell Lifts sort** (`components/athlete/AthletePageRecordsTab.tsx`): Chris asked about sort criteria — it was accidental Map insertion order (most-recently-logged new lift+rep combo first). Now explicit: parallel-fetches `barbell_lifts` (name, category, display_order), sorts by **category display_order → lift_name alphabetical → weight_kg DESC**. Keeps all rep-maxes of same lift together (Chris's preference after first pass used weight-desc as secondary).
- **Non-events this session:** User started reporting a class-capacity drift bug (session showing 12/12 when set to 10) — turned out to be user error, no changes made. Related S295 fix still in place.

**Session 298 (2026-04-21 — Opus 4.7) — INTERVALS TIMER NAMED PRESETS (DB-backed):**
- Cross-device persistence for S296 Intervals routines. New `timer_presets` table (`id, user_id → auth.users, name, intervals JSONB, created_at, updated_at`), `UNIQUE (user_id, name)`, RLS-gated on `auth.uid() = user_id` (select/insert/update/delete). Migration: `supabase/migrations/20260421000000_add_timer_presets.sql`, applied via dashboard SQL Editor.
- `components/athlete/WorkoutTimer.tsx` IntervalsEditor: new Presets panel above Quick Fill — dropdown (load by name) + Save (upsert with `onConflict: 'user_id,name'`) + Delete. `busy` state disables buttons during network calls. No API route — direct supabase-js calls behind RLS.
- Earlier in session: S297 follow-up marked done — `app/coach/profile/page.tsx` (change-password UI for logged-in coach) already present from parallel session, tested & working per Chris.
- **Not yet tested live** — Chris live-testing cross-device after session close.

**Session 297 (2026-04-21 — Opus 4.7) — PASSWORD RESET BUG + BOOKING LIFT RECORDS FIX:**
- **Bug 1 (commit `3e0892d`):** Coach "Remove Booking" was silently skipping `lift_records` deletion. Root cause: `lift_records.user_id` → `auth.users.id`, but the filter used `members.id`. Fix: capture `user_id` from `wod_section_results` first, then delete `lift_records` by those IDs. Files: `hooks/coach/useBookingManagement.ts:252-275`, `app/api/bookings/cancel/route.ts:170-193`.
- **Bug 2 (commit `bd594e4`) — CRITICAL, happened live:** Chris clicked an athlete's recovery link while logged in as coach in another tab. Code exchange at `/auth/callback` failed silently (error swallowed), his coach session stayed active, `updateUser({ password })` on `/reset-password` overwrote his coach password. Fix: sign out before recovery code exchange, surface exchange errors → `/login?error=reset_link_invalid`, add session-email display on reset page, show error on login. Both accounts restored via SQL `UPDATE auth.users SET encrypted_password = crypt(...)`.
- **SMTP (dashboard config, not code):** Configured Resend as custom SMTP sender for Supabase Auth emails. Sender `noreply@the-forge-functional-fitness.de`. Password resets no longer use Supabase's 4/hour shared pool. Gmail still flags as suspicious on some cold sends — improves as DKIM/SPF/DMARC + sender reputation establish.
- **Follow-ups:** Verify SPF/DKIM/DMARC all ✅ in Resend → Domains. Test full reset flow on deployed app. **Build coach profile / change-password page** (no UI for logged-in coach to change own password — would have avoided the SQL fallback).

**Older sessions (57-296):** See `project-history/` folder.

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

1. **Live-verify S302 benchmark leaderboard tiebreakers** — find a benchmark with tied scores (e.g., two athletes tied on Fran time), confirm shared rank + age/date ordering within tied group.
2. **Live-verify S300 section leaderboard tiebreakers** — find a tie scenario on a section-result view (weight/reps/time), same age/date/time ordering expected.
3. **Live-verify S299 changes** — (a) leaderboard with reps+cals section shows combined ranking and `"X reps + Y cal"` format, (b) Records page Barbell Lifts list sorts Olympic→Press→Pull→Squat with lifts grouped alphabetically, (c) Intervals presets Delete button visible on iPhone.
4. **Live-test Intervals timer mode itself** (S296) on deployed app — core mode never live-tested (presets already confirmed working S298).
5. **Verify SPF/DKIM/DMARC + test reset flow on deployed app (S297 follow-up)** — Resend → Domains → `the-forge-functional-fitness.de` should show all ✅. Then test the full reset flow end-to-end on live app (should now show "Updating password for [email]" above form).
6. **Mac Chrome hang investigation** — dedicated session. Start with Activity Monitor (Memory Pressure + Chrome Helper processes), disk free %, update status, then hang reports in `~/Library/Logs/DiagnosticReports/`. Will fix Mac push as a side effect.
7. **Athlete subscription bug** — fix Stefan Glocker DB row + investigate webhook ordering + `autoExpireSubscriptions` vs trialing.
8. **Whiteboard duplicate entries** (see `memory/project_whiteboard_duplicates.md`) — uncommitted changes from Session 251 need reviewing/committing.
9. **Score-entry API filter (deferred from S289)** — `app/api/score-entry/[sessionId]/route.ts:48-56` only filters bookings by `status='confirmed'` and ignores `members.status`. If unapprove should cascade to hide bookings, filter in API or cascade-cancel bookings.
10. **Test endpoint 410 cleanup** (deferred from S292) — route `app/api/notifications/test/route.ts` through `sendToSubscription` so expired subs auto-delete on Send Test.

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
