# Active Context

**Version:** 173.0
**Updated:** 2026-04-24 (Session 312 — next-week release gate (UI + API enforcement))

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

**Session 312 (2026-04-24 — Opus 4.7) — NEXT-WEEK RELEASE GATE (UI + API ENFORCEMENT):**
- **Need:** coach wanted to publish next week's WODs ahead of time without athletes seeing/booking them until Sunday afternoon. Default behavior was: as soon as a session is `status='published'`, athletes see and book it.
- **Design:** time-gated visibility, not a per-week "Go Live" button. Two new columns on `booking_rules`: `next_week_release_day_of_week` (SMALLINT, JS getDay 0-6, default 0=Sunday) + `next_week_release_time` (TIME, default '14:00:00'). Pure helper `getMaxVisibleSessionDate(rules, now)` returns end-of-this-week normally, end-of-next-week once the release moment in this ISO week has passed. Defaults to Sunday 14:00 with no per-week intervention required.
- **Files (7):**
  1. `database/20260424_add_next_week_release_gate.sql` — adds the two columns with defaults + CHECK constraint on day-of-week.
  2. [lib/bookingRules.ts](lib/bookingRules.ts) — `BookingRules` interface + DEFAULT_BOOKING_RULES extended; getter/setter SELECT lists factored to a single `RULES_COLUMNS` constant; new pure helper `getMaxVisibleSessionDate()` (does NOT touch DB so safe to import client-side).
  3. [app/api/admin/booking-rules/route.ts](app/api/admin/booking-rules/route.ts) — PUT validates day (0-6 integer) + time (`HH:MM` or `HH:MM:SS` regex), normalizes 5-char input to `HH:MM:00`.
  4. [app/coach/admin/booking-rules/page.tsx](app/coach/admin/booking-rules/page.tsx) — new "Next-week release time" section with day-of-week `<select>` + native `<input type='time'>`. Saved as part of the existing PUT.
  5. [app/api/booking-rules/public/route.ts](app/api/booking-rules/public/route.ts) — NEW lightweight GET, no auth, returns only the two release fields. Lets the athlete-side avoid pulling the full (admin-only) rules.
  6. [app/member/book/page.tsx](app/member/book/page.tsx) — fetches the public config on mount, computes `maxVisibleDate`, adds `.lte('date', formatLocalDate(maxVisibleDate))` to the session query. `releaseConfig` added to the fetchSessions effect deps so the filter applies once the config loads.
  7. [app/api/bookings/create/route.ts](app/api/bookings/create/route.ts) — added a server-side gate check after the existing rules load: rejects with 403 if the requested session's date is past `getMaxVisibleSessionDate(rules)`. Closes the bypass where a determined athlete could read session IDs via the supabase client in dev tools and replay `/api/bookings/create` with a hidden ID.
- **TS clean** throughout. Existing booking-rule helpers (`advance_booking_days`, `max_bookings_per_day`, etc) untouched.

**Session 311 (2026-04-24 — Opus 4.7) — TRIAL NAMES IN CALENDAR-TILE HOVER:**
- S310 follow-up: trial athletes were missing from the booked-members hover tooltip on calendar tiles. Single-line fix in [hooks/coach/useCoachData.ts](hooks/coach/useCoachData.ts) — `bookedMembers` array now `.concat(trialNamesArr.map(n => `${n} (trial)`))` before sorting alphabetically. Trial names appear inline with booked members in the tooltip with a `(trial)` suffix.

**Session 310 (2026-04-24 — Opus 4.7) — TRIAL-ATHLETE TRACKING + AUTO-MERGE ON REGISTRATION:**
- **Need:** prior to S310 there was no formal way to mark trial athletes (pre-known, not yet registered, asked to register if they keep coming). Coach was writing "(trial)" in workout-section text. Wanted a structured slot that counted toward class capacity but didn't require a member row.
- **Design (after iteration with Chris):** rejected the bigger restructure (relaxing `bookings.member_id` to nullable + adding `whiteboard_name` column on bookings) in favor of a low-impact `weekly_sessions.trial_names TEXT[]` array. Trial entries don't generate booking rows; they're displayed alongside bookings everywhere it matters and counted toward capacity in UI/booking-decision math. After registration they auto-convert to bookings while staying in `trial_names` as a permanent onboarding record (Option 2).
- **Schema:** `database/20260424_add_trial_names.sql` — `ALTER TABLE weekly_sessions ADD COLUMN trial_names TEXT[] DEFAULT '{}' NOT NULL` (run by Chris in Supabase).
- **Entry point:** [components/coach/ManualBookingPanel.tsx](components/coach/ManualBookingPanel.tsx) — added `+ Trial Athlete (enter name)` sentinel option to the Add Member dropdown. Selecting it fires a `window.prompt` for name, then calls a new `onAddTrialAthlete` handler. Dropdown resets to empty so the regular Add button stays disabled. Capacity copy now shows trial count as a parenthetical when non-zero.
- **Display:** [components/coach/SessionManagementModal.tsx](components/coach/SessionManagementModal.tsx) — amber chip row above Confirmed Bookings, each chip with × to remove (confirms first). "Confirmed Bookings (X/Y)" header now sums `confirmedBookings.length + trial_names.length` so the chip shows total people attending.
- **Calendar tile:** [hooks/coach/useCoachData.ts](hooks/coach/useCoachData.ts) — `weekly_sessions` select now pulls `trial_names`, `confirmed_count` includes `trial_names.length`. CalendarGrid badge naturally bumps up.
- **Score Entry:** [app/api/score-entry/[sessionId]/route.ts](app/api/score-entry/[sessionId]/route.ts) — fetches `trial_names`, appends each as a whiteboard-style athlete entry (display name `Anna (trial)`, `whiteboardName: 'Anna'` for clean linking after registration). De-dupes against bookings + Whiteboard Intro section athletes.
- **Booking decision logic:** [hooks/coach/useBookingManagement.ts](hooks/coach/useBookingManagement.ts) — new prop `trialNames`, `handleManualBooking` uses `confirmedCount + trialNames.length` for capacity check. New `handleAddTrialAthlete` (prompt + INSERT into trial_names array) and `handleRemoveTrialAthlete` (confirm + filter array).
- **Admin Tools panel:** [app/coach/admin/page.tsx](app/coach/admin/page.tsx) — new `fetchTrialStats` queries `weekly_sessions` for the active date range (mirrors the attendance fetcher's window), flattens trial_names, groups by name with count + dates. Renders an amber "Trial Athletes" panel above the rankings table on the Attendance tab — header reads "X trial sessions · N unique athletes", chips show name + ×N if multi-tried (hover = comma-joined dates). Respects pill + month picker.
- **Auto-merge on approve:** [app/api/members/approve/route.ts](app/api/members/approve/route.ts) — after the existing whiteboard-score migration, queries `weekly_sessions` where `trial_names` contains the new whiteboard_name and inserts `status='confirmed'` bookings for each (skipping any session the member is already booked in). `trial_names` array intentionally untouched — Trial panel stays as a permanent record.
- **TS clean** throughout. 6 application files + 1 SQL migration.

**Session 309 (2026-04-23 — Opus 4.7) — WORKOUTMODAL STICKY-HEADING GAP FIX:**
- Bug: scrolling inside Edit/Create Workout modal showed a 24px modal-bg gap above the stuck "Workout Sections" heading.
- Root cause: sticky positioning's containing block is the parent's content box (inside padding), not its padding box. Form has `p-6` (24px padding-top), so `sticky top-0` was sticking 24px below the form's outer top edge — leaving the padding-top region visible.
- Fix: changed both `sticky top-0 ... pb-3 -mx-6 px-6` instances (Edit + Create form variants in [components/coach/WorkoutModal.tsx](components/coach/WorkoutModal.tsx)) to `sticky -top-6 ... pt-3 pb-3 -mx-6 px-6`. The `-top-6` (-1.5rem) lets the element stick 24px above content-box-top = flush with form's outer edge = flush with modal header. Added `pt-3` so the heading has 12px breathing room above (mirroring the existing `pb-3`). No responsive-padding overrides on the form, so works identically on mobile.

**Session 308 (2026-04-23 — Opus 4.7) — NAME BACKFILL + GUARDIAN-ONLY FILTER + OPEN GYM "OG" CHIP:**
- **`members.name` backfill (29 family-member rows):** Coach SearchPanel / ManualBookingPanel / MovementTrackingPanel / TenCardModal all read `member.name` directly with no `display_name` fallback, so kids in K&T + adult family members rendered blank. Ran `UPDATE members SET name = display_name WHERE name IS NULL AND display_name IS NOT NULL;` after preview-SELECT confirmation. 0 rows remain. (S307 had only patched the Admin attendance table with a code-side fallback; this fixes the underlying data so all surfaces benefit.)
- **Guardian-only excluded from Workouts page Athletes List** ([hooks/coach/useCoachData.ts:447](hooks/coach/useCoachData.ts#L447)): added `.eq('guardian_only', false)` to `fetchMembers` query, matching the existing pattern in `useMemberData.ts:91`. Guardian-only members no longer pollute the per-athlete attendance view.
- **Open Gym "OG" chip on Score Entry — full feature:** parallel to DNF, surfaces atttendance for athletes who came to class but did Open Gym instead of the WOD (e.g. pregnant member). 6 files:
  1. `database/20260423_add_open_gym_flag.sql` — `ALTER TABLE wod_section_results ADD COLUMN open_gym BOOLEAN DEFAULT FALSE NOT NULL` (run by Chris in Supabase).
  2. `hooks/coach/useScoreEntry.ts` — `AthleteScoreValues` + `ExistingResult` interfaces, `emptyScoreValues`, load mapping, save mapping, both `isEmpty` checks all extended with `open_gym`.
  3. `app/api/score-entry/save/route.ts` — `ScoreEntry` interface + `isScoreEmpty` + both record-builder branches.
  4. `components/coach/score-entry/AthleteScoreRow.tsx` — DNF chip toggles also clear `open_gym` (mutex). OG chip only renders when `dnf || open_gym` is true (default-hidden, appears after first DNF click). Click cycles: off → DNF (red bg) → OG (blue bg) → off, both chips vanishing back to DNF-only when both off. Row tints red/blue accordingly. "Copy from above" button also propagates open_gym.
  5. `utils/leaderboard-utils.ts` — `LeaderboardEntry.openGym?` + `RawSectionResult.open_gym?`. Filter includes OG entries. New `tierOf()` helper (0=score, 1=DNF, 2=OG) replaces the inline DNF tiebreaker in `comparePrimary` so OG sorts strictly below DNF.
  6. `components/athlete/LeaderboardView.tsx` — 3 SELECT strings (replaceAll) include `open_gym`; both rendering blocks check `entry.openGym ?` first (blue OG badge), then `entry.dnf ?` (red DNF badge), then real result.
- **TS clean** throughout. `App.api/score-entry/[sessionId]/route.ts` SELECT uses `*`, so `open_gym` flows through automatically once the column exists — no edit needed.

**Older sessions (57-307):** See `project-history/` folder.

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

1. **Carla Rydval duplicate-account cleanup** (S307 pending) — once Carla confirms which email she'll use, delete the other primary account + its 2 kid rows + auth.users row. Account 1: `carla-muecke@web.de` (id `666c7e65-…`) → kids Alicia `98c70cf3-…` + Aileen `0f8cd709-…`. Account 2: `c.rydval@web.de` (id `dd85adee-…`) → kids Alicia `98709904-…` + Aileen `d20ce712-…`. None have bookings/scores yet — clean slate.
2. **Re-enter Sonja Hujo's deleted score** (S305 cleanup) — both her orphan whiteboard row + registered-account row for the same WOD/section/date were deleted. Need to re-input via Score Entry UI; will land cleanly now that she has a booking from S305 backfill.
3. **Live-test Open Gym "OG" chip** (S308) — open Score Entry for any session, click DNF on a row → confirm OG chip appears, click OG → switches to blue, save → reload to confirm persistence, then check the WOD's leaderboard for OG entry at bottom (below DNF).
3b. **Live-test Trial Athletes flow end-to-end** (S310) — (a) add a trial via SessionManagementModal "+ Trial Athlete" dropdown option, confirm chip + capacity bump, (b) open Score Entry for that session, confirm "Anna (trial)" appears in the athlete list and a score saves cleanly, (c) approve a member with `whiteboard_name='Anna'` and confirm the trial session converts to a confirmed booking while still appearing in the Admin Tools Trial Athletes panel.
3c. **Live-test next-week release gate** (S312) — (a) confirm `/coach/admin/booking-rules` shows the new "Next-week release time" section with Sunday + 14:00 default, (b) as an athlete, navigate to next week before Sunday 14:00 → empty/partial week, (c) bump release time to a minute from now, refresh → next week visible, (d) optional: try to POST to `/api/bookings/create` with a hidden session ID — should 403 "not yet open for booking".
4. **Decide whether to extend the membership-type confirm guard to class types** (EKT / Tu / CFK / CFT) — same accidental-click risk applies to kids' class assignments. Chris not asked yet.
5. **Build Reject/Delete button on Members Pending tab** — currently no UI affordance to remove pending members; only Approve/Unapprove. S306 had to use SQL to clean up Claudia Herrmann. Future feature.
6. **Live-test Intervals timer mode itself** (S296) on deployed app — core mode never live-tested (presets already confirmed working S298).
7. **Verify SPF/DKIM/DMARC + test reset flow on deployed app (S297 follow-up)** — Resend → Domains → `the-forge-functional-fitness.de` should show all ✅. Then test the full reset flow end-to-end on live app (should now show "Updating password for [email]" above form).
8. **Mac Chrome hang investigation** — dedicated session. Start with Activity Monitor (Memory Pressure + Chrome Helper processes), disk free %, update status, then hang reports in `~/Library/Logs/DiagnosticReports/`. Will fix Mac push as a side effect.
9. **Athlete subscription bug** — fix Stefan Glocker DB row + investigate webhook ordering + `autoExpireSubscriptions` vs trialing.
10. **Whiteboard duplicate entries** (see `memory/project_whiteboard_duplicates.md`) — uncommitted changes from Session 251 need reviewing/committing. **Note:** S305 backfill may have largely resolved this by retroactively booking whiteboard names; re-evaluate before doing the S251 work.
11. **Score-entry API filter (deferred from S289)** — `app/api/score-entry/[sessionId]/route.ts:48-56` only filters bookings by `status='confirmed'` and ignores `members.status`. If unapprove should cascade to hide bookings, filter in API or cascade-cancel bookings.
12. **Test endpoint 410 cleanup** (deferred from S292) — route `app/api/notifications/test/route.ts` through `sendToSubscription` so expired subs auto-delete on Send Test.

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
