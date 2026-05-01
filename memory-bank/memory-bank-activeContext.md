# Active Context

**Version:** 190
**Updated:** 2026-05-01 (Session 330 — Planner past-week drill-in + Monday TZ fix + current-week shows coverage day-by-day)

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

## ⚡ Next Session Kickoff

_Updated at every session close. The "first 5 minutes of tomorrow" — read this immediately after the regular activeContext + latest project-history scan._

**First action:** Verify on the live Planner that S330 changes work as expected: (a) week labels now show Monday dates (e.g. "27 Apr"), (b) current-week dots fill when a published WOD this week matches a pattern's linked exercise, (c) past-week colored dot opens a details panel with the matched exercises + dates. If Clean & Jerk's pattern dot for w/o 27 Apr **still** doesn't light after reload, the bug is in the extractor (canonical-name mismatch — see Landmines).

**Files to open first if continuing code work:**
- [utils/pattern-analytics.ts](utils/pattern-analytics.ts) — `detectWeeklyCoverage` returns `WeeklyCoverageMap` (weekMonday → patternId → {exercises[], dates[]}).
- [components/coach/analysis/PlanningGrid.tsx](components/coach/analysis/PlanningGrid.tsx) — past+current both use coverage view; current falls back to planning circle when no coverage.
- [utils/movement-extraction.ts:50-53](utils/movement-extraction.ts#L50-L53) — `clean & jerk` → canonical `barbell clean & jerk`. If pattern's linked exercise is named "Clean & Jerk" (no Barbell prefix), the canonical-mapping branch fails the `knownLower?.has()` guard and falls through to fuzzy-match.

**Carry-over status:**
- ⏳ S330 Planner fixes — awaiting Chris's reload + confirmation. Two wins certain (TZ label fix is mechanical; current-week coverage is one-line render flip), one open question (will C&J actually light up, or is there a deeper extractor bug?).
- ⏳ S328 Michaela login — still awaiting her confirmation.
- ⏳ S321 late-cancel TZ fix — still waiting on a real organic cancellation to confirm.
- ✅ S329 Carina login + Adults/Kids filter + login-recovery runbook all closed previous session.

**Landmines:**
- **Planner extractor canonical-name mismatch (S330, suspected, unconfirmed).** [utils/movement-extraction.ts:50-53](utils/movement-extraction.ts#L50-L53) maps lift name `Clean & Jerk` → canonical `barbell clean & jerk` and ONLY emits that canonical name if it exists in the exercises library (`knownLower?.has(canonical)`). If your `exercises` table stores it as just `Clean & Jerk` (no Barbell prefix), the canonical branch fails its guard, falls through to fuzzy-match, and may emit a name that doesn't equal what the pattern's linked exercise has. Same shape applies to other genericToCanonical mappings (deadlift, snatch, back squat, etc.). If S330's reload doesn't light up the dot, this is the next thing to verify — write a service-role script that prints both `extractMovementsFromWod()` output for a recent WOD AND the linked-exercise names per pattern, and look for case/prefix mismatches.
- **Planner Monday-vs-Sunday labels: fixed in S330.** Was a `toISOString().split('T')[0]` UTC-shift bug in [utils/pattern-analytics.ts](utils/pattern-analytics.ts) `generateWeeks` and `detectWeeklyCoverage`. Now uses `formatDate(d)` from [utils/date-utils.ts](utils/date-utils.ts) which formats local-time YYYY-MM-DD. Same TZ class as S321. **Lesson:** any time you see `.toISOString().split('T')[0]` in this codebase, suspect it. Local midnight in Germany (UTC+1/+2) → UTC previous day.
- **Login recovery: PWA cache root cause is NOT fixed by S328.** S328 hardened the `check-status` failure message but only helps users whose PWA bundle has refreshed past S317. Athletes whose PWA is still on the pre-S317 bundle (likely most active phone users) will keep hitting the old generic-error path. Manual recovery via [scripts/admin-set-password.ts](scripts/admin-set-password.ts) is the only fix per user until their SW updates. Three rescues so far: Anja (S317), Michaela (S328), Carina (S329).
- **Adults/Kids classification has 3 signals** — `account_type === 'family_member'`, kids `class_types`, AND DOB age < 18. If you add another place that needs the same split, copy `isKidMember()` from [app/coach/admin/page.tsx](app/coach/admin/page.tsx). Threshold (18) hard-coded; bump if gym definition changes. Self-registered teens (Fabian, Lenny) only land in "Kids" via the DOB signal — class_types isn't reliably set on every member.
- **Incident roll-up walks `primary_member_id` once.** Family-member kid's no-show/late_cancel adds a +1 to the kid's row AND to the parent's row. Parent's expansion shows the kid's name in italic next to inherited rows. Filter-aware: under "Kids" the parent's inherited count is hidden; under "Adults" or "All" it's visible. Implemented in [app/coach/admin/page.tsx](app/coach/admin/page.tsx) `incidentStats` derivation.
- (Carry from S327) **Family-member rows have NULL `name`, only `display_name`.** Booking-page insert now writes both. All coach-side reads fall back via `display_name || name`. If you add a new place that reads `members.name`, always include the fallback or resolve at the data source.
- (Carry from S326) **WOD-edit cascade-delete dialog counts BOTH `wod_section_results` AND `lift_records`.** Tuple keys `(lift_name, RM:<rm_test>)` / `(lift_name, RS:<rep_scheme>)` infer association since lift_records have no section_id. Lifts present in a kept section are preserved.
- (Carry from S326) **"Apply to Sessions" no longer exists.** Fan-out is drag-and-drop or copy-paste only — both orphan-safe.
- (Carry from S325) Leaderboard's grouped-mode sibling lookup uses ONLY the selected section's UUID. `formatResult` accepts optional `scoringFields` — gates extras (weight/metres/reps/cals) on the section's current scoring config.
- (Carry from S325) Coach manual booking walks to the 10-card holder in `useBookingManagement.ts` `handleManualBooking` / `handleCancelBooking`.
- (Carry from S324) Migration `database/add-payment-method-and-tencard-holder.sql` is in production. SQL files are gitignored. Booking flow walks to a 10-card holder, not the booking member, in `/api/bookings/create`, `/api/bookings/cancel`.
- (Carry from S321) `Chris Notes/AA frequently used files/Notes for next session.md` is **Chris-owned** — Claude does NOT read/write content, but DOES commit/push when modified.
- (Carry) `bookings.is_og` migration in production. `sessionStartInstant()` in `lib/bookingRules.ts` for TZ-safe gates.

**Open questions still unanswered:** none active.

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

**Session 330 (2026-05-01 — Opus 4.7) — PLANNER PAST-WEEK DRILL-IN + MONDAY TZ FIX + CURRENT-WEEK COVERAGE DAY-BY-DAY:**
- **Trigger.** Chris asked what the colored dots in the Planner grid mean, whether they reflect plan-vs-execution, and whether past-week dots could show the exact exercises used on click. Mid-session: he flagged that his Clean & Jerk programmed on 27.04 hadn't lit up by 01.05, that he can't click past circles, and that week labels start on Sunday but the gym programs Mon-Sun.
- **Fix 1 — past-week drill-in.** [utils/pattern-analytics.ts](utils/pattern-analytics.ts) `detectWeeklyCoverage` return type changed from `Map<string, Set<string>>` to `WeeklyCoverageMap` (weekMonday → patternId → `{exercises[], dates[]}`). Records matched exercise names + workout dates per (week, pattern). [components/coach/analysis/PlanningGrid.tsx](components/coach/analysis/PlanningGrid.tsx) past colored dots are now buttons; click opens a panel below the grid showing matched-exercise chips + "Programmed on:" date list. Selected dot gets a ring. Click again or X to close. New types `PatternWeekCoverage` + `WeeklyCoverageMap` in [types/planner.ts](types/planner.ts).
- **Fix 2 — TZ label bug (Monday displayed as Sunday).** [utils/pattern-analytics.ts](utils/pattern-analytics.ts) `generateWeeks` and `detectWeeklyCoverage` Monday-of-workout were using `monday.toISOString().split('T')[0]`. Local midnight in CEST (UTC+2) is UTC 22:00 of the previous day → toISOString returned the Sunday. Both call sites now use `formatDate(d)` from [utils/date-utils.ts](utils/date-utils.ts) (TZ-safe local-component formatter). Same bug class as S321 late-cancel. Bug was visual-only (both grid keys and coverage keys had the same offset, so lookups still matched).
- **Fix 3 — current week shows coverage day-by-day.** Previously `week.isPast` (strictly `< currentMonday`) gated coverage view; the current week's row always showed planning circles, so dots only flipped after the week ended. Now past + current both use the coverage view; current additionally falls back to the planning circle when no coverage exists yet, so the coach can still toggle plan intent for the in-progress week. Implementation: extracted `renderCovered` and `renderPlanningButton` helpers in [PlanningGrid.tsx](components/coach/analysis/PlanningGrid.tsx); cell branches on `week.isPast || week.isCurrent`.
- **Open question — extractor canonical-name mismatch.** Chris's Clean & Jerk dot didn't light up. After S330's TZ + current-week fixes, two reasons remain why it might still not light: (a) the pattern doesn't have C&J as a linked exercise (Chris said adding-to-pattern isn't the issue, so excluded), or (b) [utils/movement-extraction.ts:50-53](utils/movement-extraction.ts#L50-L53) maps lift `Clean & Jerk` → canonical `barbell clean & jerk` but only emits it when that canonical name is in the exercises library; if his exercises table only has "Clean & Jerk" (no Barbell prefix), the emitted movement name and pattern-linked exercise name disagree. Awaits Chris's reload + confirmation. If still broken: write a service-role diagnostic that prints `extractMovementsFromWod()` output for the 27.04 WOD alongside the relevant pattern's linked-exercise names — look for case/prefix mismatches.
- **Process moments worth remembering:**
  - **Asked option-A/B/C before building** when Chris said "I can't click past dots". Three options: toggle plan retroactively / manual override coverage / both layered. He picked "neither — auto-detect should be reliable instead". Saved building the wrong thing. Per `feedback_ask_when_unsure.md`: ambiguous request → one short question. Worked exactly as intended.
  - **TZ-bug pattern recognition.** Spotted the `toISOString` issue from the symptom alone ("planner begins on Sunday"). Same shape as S321. Worth grepping the codebase periodically — `.toISOString().split('T')[0]` is the signature.
- **Files touched:** `types/planner.ts` (new types), `utils/pattern-analytics.ts` (richer return + TZ fix), `components/coach/analysis/PlannerSection.tsx` (state type), `components/coach/analysis/PlanningGrid.tsx` (drill-in panel + current-week coverage rendering + TZ fix).
- **TS clean.** Single commit per close-session checklist.

**Session 329 (2026-05-01 — Opus 4.7) — ADULTS/KIDS FILTER ON ATTENDANCE REPORTS + INCIDENT ROLL-UP TO GUARDIANS + LOGIN-RECOVERY RUNBOOK:**
- **Trigger.** Chris asked for a coach-side filter on the Attendance Reports panel ([app/coach/admin/page.tsx](app/coach/admin/page.tsx)) to show Adults vs Kids; also asked that family-member kids' incidents (no-shows, late_cancels) roll up to the parent's row, since parents are responsible for whether a kid actually shows up.
- **Adults/Kids filter — 3 signals.** Initial `isKidMember()` used `account_type === 'family_member' || class_types ∈ {cfk, cft}`. Chris flagged Fabian Siebert + Lenny Kleinert (both self-registered primary accounts) appearing in Adults. They're under 18 but registered themselves directly. Added DOB-based fallback: `ageFromDob() < 18`. Now any of three signals is sufficient. Trial Athletes panel hides when filter ≠ All (trials aren't members yet, no class_types or DOB). Pill row sits above the tab toggle so it scopes both Attended and Incidents.
- **Incident roll-up to guardian.** `incidentStats` derivation now walks `primary_member_id` per row: kid's incident counts on the kid's row AND on the parent's row. Parent's expansion includes the kid's incidents with the kid's name in italic next to inherited rows. Delete button uses the booking-owner's name in the confirm dialog (so deleting Alois's no-show under Julia's expansion still says "delete Alois's …"). Filter-aware: under "Kids" only the kid's row shows; under "Adults" the parent's rolled-up total shows. Member lookup map (`memberById`) lifted to component-level state with a one-shot `fetchAllMembers` to avoid two separate fetchers double-querying.
- **Login-recovery runbook published.** [Chris Notes/Forge app documentation/login-recovery-runbook.md](Chris%20Notes/Forge%20app%20documentation/login-recovery-runbook.md). Three rescues so far (Anja S317, Michaela S328, Carina S329); Chris asked for a documented procedure. 4 steps: pick simple temp password → run `npx tsx scripts/admin-set-password.ts <email> '<pw>'` → verify login in incognito → send password via WhatsApp with German template. Includes when-to-use criteria, why this keeps happening (PWA cache stuck on pre-S317 bundle), and escalation path if same user comes back twice.
- **Carina/Xaver mistake.** Mid-session Chris asked how to link Xaver Hiltel as a family member of Carina in Supabase. I answered, then he ran the admin-set-password script for Carina — but Carina is not actually Xaver's mom. Password is now changed; bcrypt is one-way so unrecoverable. Sent her the temp + apology message. He declined to add a "verify before running" warning to the runbook ("a warning wouldn't have helped, I should have been more careful"). Worth noting: the runbook intentionally does NOT add a verification step for this reason.
- **Process moments worth remembering:**
  - **Self-registered teens slip past the obvious classification fields.** `account_type` and `class_types` only catch kids who came in through the parent flow or were explicitly tagged. DOB is the most-reliable signal because every member has one. Lesson: when classifying users, use the most stable demographic field as a fallback, not just app-flow metadata.
  - **The PWA-cache login issue is a slow-burn UX bug, not a one-time incident.** Each rescue takes ~5 minutes but the same root cause keeps producing new victims. S328 message-fix doesn't retroactively help cached PWAs; only time fixes that. The runbook acknowledges this and gives Chris a turn-key script-driven path so he doesn't have to think through it each time.
  - **"Don't write SQL for Chris" + "ask, don't guess" together.** When he asked how to link Xaver to Carina, I gave both the Dashboard-edit path and the via-app path; couldn't have predicted he'd run a different script (admin-set-password) in between. The mistake wasn't a missing warning; it was conflating two threads. Memory rules already say trust user statements; that holds.
- **Files touched:** `app/coach/admin/page.tsx` (filter pills, kid detection helpers, `memberById` state + fetch, incident roll-up + filter, expansion enrichment, hide trial panel when scoped), `Chris Notes/Forge app documentation/login-recovery-runbook.md` (new).
- **TS clean.** Single commit (per checklist default).

**Session 328 (2026-04-30 — Opus 4.7) — LOGIN FALLBACK HARDENED AFTER MICHAELA EDER RESCUE:**
- **Trigger.** Michaela Eder couldn't log into the app on her phone despite a healthy account — same pattern as Anja (S317). Password reset email wasn't reaching her usefully.
- **Recovery.** Set temp password via `scripts/admin-set-password.ts`; sent her the temp + change-it-after instructions.
- **Root cause hypothesis.** Stale PWA service-worker bundle on her phone serving the pre-S317 login code path. Old code surfaced raw "Invalid login credentials" → Chrome auto-translated to a generic German "Es funktioniert nicht" with no actionable info.
- **Code hardening at [app/login/page.tsx:105](app/login/page.tsx#L105).** When `check-status` itself fails (network / 5xx / unexpected throw), render German fallback `"Anmeldung fehlgeschlagen. Bitte versuche es erneut oder nutze „Passwort vergessen?", falls das Problem bestehen bleibt."` instead of bubbling the raw Supabase string. Doesn't fix the cached-PWA case (those users are still on the old bundle) — only helps fresh installs and PWAs that have refreshed since S317.
- **Carry-over.** Awaiting Michaela's confirmation. The recurring pattern got documented in S329's runbook.

**Session 327 (2026-04-30 — Opus 4.7) — FAMILY-MEMBER `display_name` FALLBACK + STALE SUBSCRIPTION CARRY-OVER CLOSED:**
- **Trigger.** Chris hit two Score Entry display bugs: Fabian Siebert (kid) showing as `zielu2012`, Hannah Sterk (kid) rendering as a blank row in the Results modal. Asked where the names come from and what other coach views are affected.
- **Root cause.** Score Entry API ([app/api/score-entry/[sessionId]/route.ts](app/api/score-entry/[sessionId]/route.ts)) reads `members.name` directly with no fallback. Family-member kids added via the parent's Book Class page ([app/member/book/page.tsx:337-346](app/member/book/page.tsx#L337-L346)) get inserted with `display_name` set and `name = NULL`. Adult signup via `/signup` does the opposite (sets `name`, leaves `display_name` NULL). Codebase was inconsistent: ~5 places used `display_name || name`, ~6 used only `name`.
- **Fix — resolve at data sources, not UIs.** Five files: (1) [app/member/book/page.tsx:342](app/member/book/page.tsx#L342) — family-member insert now sets BOTH `name` and `display_name`. New kids unaffected going forward. (2) [app/api/score-entry/[sessionId]/route.ts](app/api/score-entry/[sessionId]/route.ts) — added `display_name` to SELECT, resolves into the athletes array `name` field, and the whiteboard-dedup name-set loop. (3) [hooks/coach/useCoachData.ts](hooks/coach/useCoachData.ts) `fetchMembers` — adds `display_name` to SELECT, maps `display_name || name` into the local `name` field. Covers SearchPanel + MovementTrackingPanel without touching them. (4) [hooks/coach/useSessionDetails.ts](hooks/coach/useSessionDetails.ts) — same pattern; normalizes before `filterAvailableMembers`. Covers ManualBookingPanel without touching it. (5) [components/coach/TenCardModal.tsx](components/coach/TenCardModal.tsx) — added `display_name` to prop type, header uses fallback.
- **Stale carry-over closed.** Chris asked about the "Athlete subscription bug" (item 4 in Next Immediate Steps). Verified both root causes from S280 are already fixed: webhook handler at [app/api/stripe/webhook/route.ts:251-264](app/api/stripe/webhook/route.ts#L251-L264) gates `athlete_subscription_end` on `subscription.status === 'active'` (skips trialing); `autoExpireSubscriptions` at [hooks/coach/useMemberData.ts:284-292](hooks/coach/useMemberData.ts#L284-L292) skips members with active/trialing Stripe subs via `!stripeSubMap[m.id]`. Removed both the Known Open Issues entry and the Next Immediate Steps item; renumbered list.
- **Process moments worth remembering:**
  - **"Where does X come from?" → trace to data source, not UI.** Chris's question ("from where are the names populated?") could've been answered by reading the modal. Reading the API gave the actual answer (raw `members.name`, no transform) and exposed the inconsistency across the codebase. The follow-up grep `members\.name\|m\.name\|member\.name\b` mapped every read site in two minutes.
  - **Fix at the data source, not every UI.** Six UI components used `member.name`. Changing each one would be 6 patches + 6 type updates. Resolving `display_name || name` in the two hooks (useCoachData, useSessionDetails) and the score-entry API covers 5 of those 6 components without touching them. Only TenCardModal needed direct touching.
  - **Verify "open issue" claims before scheduling work.** S280's bug description (the one in activeContext) was true at write time but obsolete by S324-ish. Two greps + a code read closed an item that had been migrating between Next Immediate Steps lists for 30+ sessions. Worth checking other long-lived "Next Immediate Steps" items for the same staleness on a future session.
- **TS clean.** Single commit (display_name fallback + carry-over removal + activeContext + history file).
- **Carry-over:** all 5 code changes ready for live verification by Chris on next session start. Optional: backfill the existing 5 family-member kids in Supabase with `name = display_name` (he can do via Dashboard); not required since the code now handles NULL `name`.

**Session 326 (2026-04-30 — Opus 4.7) — LIFT_RECORDS CASCADE + APPLY-TO-SESSIONS REMOVED + 13 ORPHAN WODS CLEANED:**
- **Trigger.** Continuing S325 follow-ups: (1) extend the new cascade-delete dialog to also clean orphaned `lift_records`, then (2) audit + fix the "sibling WOD count bloat" Chris had been seeing for weeks.
- **Fix 1 (commit `d397005f`).** [hooks/coach/useWODOperations.ts](hooks/coach/useWODOperations.ts) `handleSaveWOD` extended: builds `(lift_name, RM:<rm_test>)` and `(lift_name, RS:<rep_scheme>)` tuple keys from removed-vs-kept sections, queries `lift_records` matching orphan tuples, includes them in the destructive confirm dialog count, deletes them on confirm. Defensive: a lift present in both a removed AND a kept section is preserved (lift_records have no section_id, so we infer association by tuple). Live-tested on `c2999101` (Front Squat 5RM) and `bccffaeb` (multi-Deadlift defensive case) — both behaved correctly.
- **Audit 1.** [scripts/audit-sibling-wods.ts](scripts/audit-sibling-wods.ts) groups WODs by `(date, workout_name OR session_type)`, flags clusters of 3+ with `0 sessions / 0 bookings / 0 scores / 0 lifts` per row. Found 9 cluster-resident orphans across 4 dates (2026-04-22, -27, -28, -29). The 2026-04-22 "Strict Movements" cluster (S325's original bug source) had 5 of them.
- **Root-cause investigation.** Chris asked "is Apply to Sessions introducing unnecessary complexity?" — yes. Both `selectedSessionIds` branches in [hooks/coach/useWODOperations.ts](hooks/coach/useWODOperations.ts) (UPDATE-existing line 195+, INSERT-new line 427+) created a fresh WOD per ticked session and re-pointed `weekly_sessions.workout_id` to it WITHOUT deleting the previously-linked WOD. Re-running the picker n times produced n orphans. Drag-and-drop and copy-paste (`handleCopyWOD`, line 599+) were already orphan-safe — they have explicit cleanup at line 768+.
- **Fix 2 — feature deletion.** Removed the entire "Apply to Sessions" picker rather than patching it. Per Chris: drag-and-drop already covers the same use case, three fan-out paths is two too many. Files touched: [hooks/coach/useWorkoutModal.ts](hooks/coach/useWorkoutModal.ts) (state + handler + type field), [components/coach/WorkoutFormFields.tsx](components/coach/WorkoutFormFields.tsx) (UI block + props, restructured Max Capacity to standalone), [components/coach/WorkoutModal.tsx](components/coach/WorkoutModal.tsx) (inline UI block in the non-panel form, prop-passes, both `dataToSave` builders, `ChevronDown` import), [hooks/coach/useWODOperations.ts](hooks/coach/useWODOperations.ts) (both `selectedSessionIds` branches + the now-redundant guard). TS clean, dev server hot-reloaded both `/coach` and `/athlete` with no errors. Chris live-verified the picker is gone and saving works normally.
- **Cleanup.** [scripts/cleanup-orphan-wods.ts](scripts/cleanup-orphan-wods.ts) rewritten as generic orphan sweep (dry-run by default, `--apply` to delete; re-verifies sessions/scores/lifts at delete-time). Old S113 one-shot was overwritten — only referenced in S113 history. Dry-run found 13 orphans (4 more than the cluster audit, since the audit filtered to clusters of 3+). Chris approved "all 13" → ran `--apply` → 13 deleted. Verification re-run shows 0 orphans.
- **Process moments worth remembering:**
  - **Cluster filter hides solo orphans.** The audit script's "3+ siblings" filter caught the obvious cases but missed 4 lone orphans (older auto-named WODs like `WOD 2026-04-29 18:30`). Always do a follow-up unfiltered sweep before deleting — what the cluster view shows isn't the whole picture.
  - **Naming conflict gotcha.** I tried to write `scripts/cleanup-orphan-wods.ts` and Write blocked with "file not yet read". Read first revealed an unrelated S113 one-shot still sitting there. Lesson: even for a "new" script name, run the file-existence check before assuming.
  - **Feature deletion > feature patch.** First instinct was to patch `selectedSessionIds` to overwrite-in-place instead of insert. Chris's question — "is this introducing unnecessary complexity?" — flipped that: if a feature has a clean alternative already in place, removing it is simpler than fixing it. Three fan-out paths down to two.
- **TS clean.** Two commits: `d397005f` (lift_records cascade, mid-session) + session-close commit (Apply-to-Sessions deletion + cleanup script + audit script + activeContext + this history file).

**Older sessions (57-325):** See `project-history/` folder.

---

## 🚨 Known Open Issues

- **Mac Chrome hang (recurring, system-level)** — Chris's Macbook: after working a while, apps bounce in dock but won't launch ("Google Chrome is not responding"). Only full Mac restart fixes it. Happens increasingly often. Directly affects Forge pushes: Chrome in half-dead state = stuck GCM "Connecting", so Mac push never arrives. Not a Forge code issue; dedicated session needed. Diagnostic starting points: Activity Monitor Memory Pressure, disk free %, Chrome Helper memory leaks, `~/Library/Logs/DiagnosticReports/` for spindumps. (Session 292.)
- **Mac push delivery (downstream of above)** — Mac never receives FCM pushes even with clean DB subs + healthy SW. `chrome://gcm-internals/` shows Connection State "Connecting". Will auto-resolve once the Chrome-hang root cause is fixed. Android push unaffected.
- **Test endpoint doesn't cleanup 410s** — `app/api/notifications/test/route.ts` bypasses `sendToSubscription` helper so expired subs aren't auto-deleted when you click Send Test. Low priority — production flows still clean up 410s. (Session 292.)
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

1. **Set up `next-intl` i18n (DE/EN bilingual)** — Chris plans to commercialize. The ~11 inlined German strings from S317 should migrate to `messages/de.json` + matching `messages/en.json`. ~1 day of dedicated work. Stop adding more inline German until this lands. Memory: `project_commercialization_and_i18n.md`.
2. **Verify SPF/DKIM/DMARC + test reset flow on deployed app (S297 follow-up)** — Resend → Domains → `the-forge-functional-fitness.de` should show all ✅. Then test the full reset flow end-to-end on live app.
3. **Mac Chrome hang investigation** — dedicated session. Start with Activity Monitor (Memory Pressure + Chrome Helper), disk free %, update status, then hang reports in `~/Library/Logs/DiagnosticReports/`. Will fix Mac push as a side effect.
4. **Whiteboard duplicate entries** (see `memory/project_whiteboard_duplicates.md`) — uncommitted changes from Session 251 need reviewing/committing. **Note:** S305 backfill may have largely resolved this by retroactively booking whiteboard names; re-evaluate before doing the S251 work.
5. **Score-entry API filter (deferred from S289)** — `app/api/score-entry/[sessionId]/route.ts` only filters bookings by `status='confirmed'` (and now `is_og=false`) and ignores `members.status`. If unapprove should cascade to hide bookings, filter in API or cascade-cancel bookings.
6. **Test endpoint 410 cleanup** (deferred from S292) — route `app/api/notifications/test/route.ts` through `sendToSubscription` so expired subs auto-delete on Send Test.
7. **Improve `fetchWODs` error logging** — when Supabase errors stringify as `{}` in the catch block (as happened in S322 with the missing `is_og` column), the cause is hidden. Same fix as S318 booking-error toast: extract `.message`/`.code`/`.details`/`.hint`. Low priority.
8. **Audit other diagnostic scripts in `scripts/` for anon-key blind spot** (S323) — `check-ghost-scaling.ts` and others use `NEXT_PUBLIC_SUPABASE_ANON_KEY`; if they query RLS-protected tables they may silently return empty. Switch to service role.
9. **Optional: derive a "Guardian" badge on MemberCard** (deferred from S324) — automatically show when a member has any rows pointing at them via `primary_member_id`. Distinct from the existing "Guardian Only" toggle (which means "doesn't train"). Was discussed in S324 but not built; the `guardian_only` binary toggle covers the immediate need.

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
- **Deployment plan:** `Chris Notes/Deployment/deployment-plan.md`
- **Orphan diagnostics:** `Chris Notes/Database & Supabase/supabase-orphan-check-queries.md`
