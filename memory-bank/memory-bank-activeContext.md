# Active Context

**Version:** 194
**Updated:** 2026-05-04 (Session 334 — iOS Safari login bounce fix + Planner Info modal + Uncategorised exercises panel)

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

**First action:** Verify the iOS Safari login fix works for the affected athlete (iPhone 16 Safari, "logs in then bounces back to start"). Once he confirms — that's the close on this thread; if he still bounces, suspect ITP cookie purge as the next culprit (different fix). Planner Info button + Uncategorised panel is shipped and ready for Chris to triage the unassigned movements over time. After 1–2 weeks of using the new Statistics dimming tiers, evaluate whether 10%/30% thresholds give the right signal in dominant-exercise categories — see Next Step 0b.

**Files to open first if continuing code work:**
- [app/login/page.tsx](app/login/page.tsx) — `window.location.href` post-`signInWithEmail` (replaces `router.push`) for full page load → guaranteed cookie flush before middleware.
- [components/coach/analysis/PlannerSection.tsx](components/coach/analysis/PlannerSection.tsx) — Info button next to Track toggle; renders `UncategorizedExercises` after the Planning Grid; new `handleAssignFromUncategorized` handler.
- [components/coach/analysis/PlannerInfoModal.tsx](components/coach/analysis/PlannerInfoModal.tsx) — static doc modal (8 sections covering all Planner mechanics).
- [components/coach/analysis/UncategorizedExercises.tsx](components/coach/analysis/UncategorizedExercises.tsx) — exercises ∉ any pattern; per-row Move-to popover with pattern chips; default-hides Pre-Workout + Recovery & Stretching.
- [middleware.ts](middleware.ts) — already correct (`@supabase/ssr` server client, refreshes session); the login bug was on the client-side push, not middleware.

**Carry-over status:**
- ⏳ S334 iOS Safari login fix — deployed; awaiting confirmation from the affected athlete (iPhone 16 Safari).
- ⏳ S333 Acronym form fields on Lifts / Benchmarks / Forge edit modals — deferred. Schema column + search + display all wired; only the in-app curation UI for those 3 tables is missing.
- ⏳ S332 Personal Activities — Chris tested live, working. Optional Session B heatmap + counts row deferred until usage justifies.
- ⏳ S331 shared-patterns — Chris hasn't explicitly confirmed both toggles show same patterns, but no complaints either.
- ⏳ S330 Clean & Jerk dot — Chris confirmed S330 changes work; deeper extractor canonical-name verification still pending if the dot doesn't light.
- ⏳ S321 late-cancel TZ fix — still waiting on a real organic cancellation to confirm.

**Landmines:**
- **Login flow uses `window.location.href` post-auth, NOT `router.push` (S334).** [app/login/page.tsx](app/login/page.tsx) lines 43-74. Reason: with `@supabase/ssr` browser client + Next.js middleware gating routes, `router.push` after `signInWithPassword` raced against cookie-flush + Next.js prefetch cache on iOS Safari → middleware saw no session → redirected back to `/login` → "logs in and bounces" symptom. Hard navigation forces a full page load so cookies are guaranteed propagated before middleware runs. **If you ever introduce another post-auth redirect (callback, magic-link, OAuth), use `window.location.href` not `router.push`.** Reset-password and registration redirects to `/login` are safe as `router.push` because `/login` is in `publicPaths` and middleware doesn't gate it.
- **Acronyms live in a curated `acronym TEXT` column on 4 tables (S333):** `exercises`, `barbell_lifts`, `benchmark_workouts`, `forge_benchmarks`. Each table has a `*_acronym_unique` partial unique index on `LOWER(acronym) WHERE acronym IS NOT NULL`. Form input enforces letters/digits, max 6 chars, auto-uppercase. **Replaces the S303 tags-as-acronym pattern** — `fetchAcronymMap` and `fetchExerciseNames` now read the column, NOT tags. The `dl` tag on Barbell Deadlift was promoted to `acronym='DL'` (tag still exists, harmless). If you re-introduce a tag-based acronym anywhere, the new column is still authoritative for search/display. **For movements that exist in two tables** (e.g. Clean & Jerk in `barbell_lifts` + Barbell Clean & Jerk in `exercises`), set the same acronym on both rows — there's no auto-sync (avoids the brittle name-mapping that already burned us in the S330 planner extractor). **WOD-search expansion** lives in `useCoachData` `combinedText` matcher: if the user types a known acronym, search ORs the canonical name(s) into the regex test, so historical WOD content gets matched correctly. **No content rewrites** — section content text is untouched.
- **Personal activity types are stored as TEXT, not enum (S332).** [types/personal-activity.ts](types/personal-activity.ts) `PERSONAL_ACTIVITY_TYPES` is the single source of truth. Adding a type = add a string. Renaming a type = the constant change is a one-liner, but existing rows keep the old name; they'll display fine but won't match the dropdown until you UPDATE them. List is currently in German (Schwimmen, Laufen, Radfahren, Yoga, Wandern, Externes CrossFit, Anderes Studio, Sonstiges). When i18n lands, this is one of the things to migrate to messages files.
- **Movement patterns are global to the user — not track-scoped (S331).** `movement_patterns.track` column is gone. The Adults/Kids toggle in PlannerSection only changes which `session_type`s feed coverage/gap analysis (`excludeSessionTypes` in `computeAnalysis`); it does not filter the pattern list. If a pattern is exclusively for one track (e.g. Kids-only stretches), there is no DB-level enforcement — coach has to choose to not link that pattern to any Adults exercises, or just not toggle it. If you re-introduce per-track scoping, switch to a `tracks text[]` column so a pattern can belong to multiple tracks.
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

**Session 334 (2026-05-04 — Opus 4.7) — iOS SAFARI LOGIN BOUNCE FIX + PLANNER INFO MODAL + UNCATEGORISED EXERCISES PANEL:**
- **Login bounce-back fix.** Athlete on iPhone 16 Safari logged in fine last week, then this week landed straight back on `/login` after submitting credentials — no error message, just bounce. Root cause: `router.push('/athlete')` after `signInWithPassword` raced cookie-flush + Next.js prefetch cache on iOS Safari (slower cookie writes than Chrome). The middleware ran before cookies propagated, saw no session, redirected back to login. Replaced 4× `router.push` post-auth with `window.location.href` in [app/login/page.tsx](app/login/page.tsx) — full page load guarantees cookies are flushed before middleware runs. Reset-password and register-member redirects left alone (they push to `/login` which is public).
- **Planner Info modal.** Chris asked for an info pop-up because the Planner is powerful but easy to forget when not used regularly. New [components/coach/analysis/PlannerInfoModal.tsx](components/coach/analysis/PlannerInfoModal.tsx) with 8 sections: what the Planner does, Adults/Kids toggle, past-week drill-in, current/future weeks, staleness thresholds, picker recency shading, auto-detection, and the new Uncategorised panel. Triggered by an "i How it works" button next to the Track toggle.
- **Uncategorised Exercises panel.** New [components/coach/analysis/UncategorizedExercises.tsx](components/coach/analysis/UncategorizedExercises.tsx) renders below the Planning Grid. Computes set-difference: every exercise minus those in any pattern. Pre-Workout + Recovery & Stretching are hidden by default with an "Include warm-ups & stretches" toggle. Each row has a teal **Move to →** button that opens an amber popover listing all patterns as colour-dot chips; click → inserts into `movement_pattern_exercises`, refreshes patterns + analytics, exercise drops out of the panel. Empty state shows "All sorted ✓" green badge. Goal: triage queue that shrinks to empty as Chris categorises the library.
- **Process moments worth remembering:**
  - **Diagnose-first on the login bug.** "Logs in then bounces" with `@supabase/ssr` + middleware is a known race; verified the auth setup (`createBrowserClient` + middleware refresh + cookie chunking) before recommending the fix. Saved guessing wrong about ITP / cookie size / private mode. Fix is well-documented for this exact stack.
  - **Asked A vs B before building Uncategorised.** Two valid models: (A) virtual pseudo-pattern at top of patterns list, (B) separate panel below grid. Recommended B because the goal is "list eventually empty" — fits a temporary triage panel better than a permanent fake pattern row, and avoids special-casing PatternManager.
  - **Defaulted to excluding warmup/stretch.** They're not really pattern material. Toggle reveals them when needed. Avoided the "show everything by default → overwhelming list" failure mode.
- **Tab rename + reorder.** `/coach/analysis` page header changed from "Workout Analysis" → "Planner" (mobile + desktop). Tab bar order swapped: **Planner first**, Statistics second. Default `activeTab` is now `'planner'` so the page lands on the Planner on open. Top-nav button label in `components/coach/CoachHeader.tsx` updated from "Analysis" → "Planner" (both layouts). Route `/coach/analysis` itself unchanged so existing bookmarks still work.
- **Statistics: category filter expansion.** Previously a category chip click filtered the top-50 list down to exercises in that category. Now: with no category selected → top 50 (unchanged); with one or more categories selected → walks the **full exercise library**, includes every exercise in those categories with its programmed count (defaulting to **0** for never-programmed). Sorted by count desc. No 50-cap when filtered. Lets Chris see at a glance which exercises in a category he hasn't programmed at all.
- **Statistics: relative-usage dimming (3 tiers).** Chips now visualised by `% of max count in the current view` — three traffic-light tiers: **>30% amber** (well-programmed, dominant), **10–30% teal-bordered white** (rotating, still active), **≤10% gray dashed + italic** (barely touched, action). Iterated through several versions before settling — first attempt was greys-only and the middle tier blended with normal; user explicitly pushed for 3 visually distinct levels. Amber background as the highest tier was Chris's call (swapped after seeing the initial layout). Threshold values 10/30 are first-pass — flagged for re-evaluation after 1–2 weeks of use; if categories with one dominant exercise (e.g. Back Squat in Olympic Lifting) end up mostly-dim, bump to 20/50 or switch to quantile-based ranking.
- **Files touched (full session):** `app/login/page.tsx` (4× redirect), `app/coach/analysis/page.tsx` (default tab + page header + `filteredTopExercises` filter rewrite to include 0-count exercises), `components/coach/CoachHeader.tsx` (Analysis → Planner label), `components/coach/analysis/PlannerSection.tsx` (Info button + UncategorizedExercises wire-up + handleAssignFromUncategorized), `components/coach/analysis/StatisticsSection.tsx` (3-tier dimming), `components/coach/analysis/PlannerInfoModal.tsx` (new), `components/coach/analysis/UncategorizedExercises.tsx` (new).
- **TS clean. Production build clean.** Login fix shipped in a separate commit (`fa0b862f`) so it could deploy independently of the Planner work; later commit (`bb80a85c`) bundled the Planner Info modal + Uncategorised panel; this session-close commit covers the tab rename + Statistics changes.

**Session 333 (2026-05-02 — Opus 4.7) — CURATED EXERCISE ACRONYMS + CROSS-SURFACE SEARCH:**
- **Trigger.** Coach-side Workouts page acronyms were collision-heavy (3× PUD, 2× PUH, 3× PUS, 3× PUT, 2× SPU in the push-up family alone) because they were auto-generated from initials. Chris asked for a curated system that works across the Library popup, Workouts search, Planning + Statistics tabs, AND the Movement Tracking panel.
- **Schema.** `acronym TEXT` column added to all 4 movement tables (`exercises`, `barbell_lifts`, `benchmark_workouts`, `forge_benchmarks`) with per-table case-insensitive unique partial indexes. Migration: [database/20260502_session333_acronyms.sql](database/20260502_session333_acronyms.sql) — gitignored, ran by Chris. Backfilled 22 push-ups + promoted the existing S303 `dl` tag to `acronym='DL'`. Final mapping ended at 5–6 char codes (SPSU, DPU, HSPU, HSPUK, RPSU, etc.) after Chris caught the RPU collision (Rings Push-Up vs Rings Pull-Up — now RPSU + reserved RPLU).
- **Form.** [components/coach/ExerciseFormModal.tsx](components/coach/ExerciseFormModal.tsx) gets an Acronym input next to Display Name (auto-uppercase, letters/digits only, max 6 chars). Lift / benchmark / forge edit modals deferred to follow-up — Chris can curate via Dashboard SQL until then.
- **Search wiring.** Library popup (all 4 tabs) ORs acronym into the word-boundary match. Workouts page exercise dropdown ORs acronym into the includes match. WOD-content search in [hooks/coach/useCoachData.ts](hooks/coach/useCoachData.ts) translates known acronyms to canonical names at search time — typing `DPU` finds every WOD containing "Push-up Diamond" without rewriting any historical content. `fetchExerciseNames` now pulls acronym from all 4 tables in parallel; reverse-map populated for cross-source lookup.
- **Display.** Small teal monospace pill before the name in Library popup cards (4 tabs) + SearchPanel exercise dropdown. Renders only when an acronym is set; null acronyms render as before. [components/coach/MovementTrackingPanel.tsx](components/coach/MovementTrackingPanel.tsx) `getCode()` now reads the curated acronym via a new `acronymByName` prop instead of the hardcoded `ACRONYM_OVERRIDES` map (deleted) + initials algorithm (kept as fallback).
- **Two pre-existing bugs surfaced + fixed (not S333-related, just visible now):**
  - **Custom Movements dropdown silently hid tracked exercises** — typing HSPU returned nothing because Handstand Push-Up Strict was already tracked. Fixed: tracked rows now show with a `✓ tracked` badge, click is a no-op (presence at-a-glance + clear "already added" affordance).
  - **"Show Unique" mode used a bi-weekly bucket** — same workout repeated across weeks counted as N unique entries (W13 → bucket W12, W14 → bucket W14, etc.). Switched to dedupe-by-`workout_name` only; one row per uniquely-named workout, ever. Most-recent occurrence is the one shown, with a small `×N` chip when N > 1. The bi-weekly logic was unrelated to "Apply to Sessions" removal (S326).
- **Group-assignment popover (new UX).** When you add an exercise from the Custom Movements dropdown and groups exist, an amber-bordered popover appears with chips for each group + a Skip button. Click a chip to drop the new exercise straight into the group's `exercise_ids`. Resolves the gap where adding to *tracking* didn't auto-add to a *group* (separate concepts).
- **Probe scripts (read-only, kept for reuse).** [scripts/probe-wod-naming-variants.ts](scripts/probe-wod-naming-variants.ts) scanned all WOD content for inconsistencies vs canonical names — Mimi's typing came back clean (only false-positive substring matches like "Fran" matching "Franziskah"). [scripts/probe-find-strings.ts](scripts/probe-find-strings.ts) locates specific text fragments by date+id. [scripts/probe-wods-for-acronym.ts](scripts/probe-wods-for-acronym.ts) for diagnosing dedup/expansion behavior per acronym.
- **Process moments worth remembering:**
  - **Conversation alignment before code.** ~10 design messages before any code: scope (single-table vs multi-table), display format (parens vs pill), search model (search-time expansion vs structured references), edge cases (existing-data impact, lift/exercise duplicates). Each clarification reframed scope. Worth the cost — building wrong would've been more expensive.
  - **Probe before backfill.** Read-only probe scan of all WOD content gave evidence that Chris's typing was clean enough to ship search-time-expansion without a bulk content rewrite. Cheap insurance, immediate confidence boost.
  - **"It's not a bug, it's a workflow gap" → enhancement.** When Chris reported HSPUK not appearing in his Push-up group after adding to tracking, the answer was "tracking and grouping are independent". But that prompted the natural enhancement (post-add group popover) — the gap was the bug.
  - **One movement, two tables: no auto-sync.** Decided against name-mapping (the S330 brittle pattern) — Chris curates the same acronym on both rows when needed. Trade-off accepted.
- **Files touched:** `database/20260502_session333_acronyms.sql` (new, gitignored), `app/coach/analysis/page.tsx`, `components/coach/ExerciseFormModal.tsx`, `components/coach/ExercisesTab.tsx`, `components/coach/MovementLibraryPopup.tsx`, `components/coach/MovementTrackingPanel.tsx`, `components/coach/SearchPanel.tsx`, `hooks/coach/useCoachData.ts`, `utils/movement-analytics.ts`, `scripts/probe-find-strings.ts` (new), `scripts/probe-wod-naming-variants.ts` (new), `scripts/probe-wods-for-acronym.ts` (new), `Chris Notes/Forge app documentation/Forge-Feature-Overview.md`.
- **TS clean. Production build passes. Single commit per close-session checklist.**

**Session 332 (2026-05-01 — Opus 4.7) — ATHLETE PERSONAL ACTIVITIES LOG ON LOGBOOK TAB:**
- **Trigger.** Chris asked for a way for athletes to log their own non-Forge workouts (holiday swims, external CrossFit, aerobics, etc.) so the app becomes a full personal training tracker — not just class-day logging. Wanted minimal complexity since usage will be light.
- **Decision.** Forge / Personal toggle at the top of the Logbook tab. Personal mode = simple flat list sorted by date desc + an Add button. No day/week/month nav, no whiteboard, no scoring fields — just date, activity type, optional duration, optional effort (1–5), optional notes. Chose this over a separate top-level tab because the use case shares the "tracking my training history" mental model with the existing logbook.
- **Schema.** `personal_activities (id, user_id → auth.users, activity_date, activity_type TEXT, duration_min, effort SMALLINT 1-5, notes, created_at, updated_at)`. RLS: `user_id = auth.uid()` for all ops. activity_type stored as TEXT (not enum) so the German list can be edited without a migration. Migration: [database/20260501_session332_personal_activities.sql](database/20260501_session332_personal_activities.sql) (gitignored, ran by Chris in Dashboard).
- **UI.** [components/athlete/personal/PersonalActivitiesView.tsx](components/athlete/personal/PersonalActivitiesView.tsx) (list + add) and [components/athlete/personal/PersonalActivityModal.tsx](components/athlete/personal/PersonalActivityModal.tsx) (add/edit/delete form). [hooks/athlete/usePersonalActivities.ts](hooks/athlete/usePersonalActivities.ts) wraps Supabase CRUD with toasts. Toggle wired into [components/athlete/AthletePageLogbookTab.tsx](components/athlete/AthletePageLogbookTab.tsx) at the existing header — Forge mode unchanged, Personal mode renders the new component.
- **German activity types.** Initial list shipped in English (Swim, Run, Bike, Yoga, Hike, External CrossFit, Other Gym, Other). Chris tested, confirmed it works, asked to translate the list. Now: Schwimmen, Laufen, Radfahren, Yoga, Wandern, Externes CrossFit, Anderes Studio, Sonstiges. Stored as TEXT so any English test rows still display verbatim.
- **Process moments worth remembering:**
  - **Asked single-session vs. split before building.** Two scopes: (A) ship CRUD now, add heatmap later if usage warrants; (B) ship both at once. Chris asked "is heatmap easy to add later?" — yes, the data is already structured by date+type, so it's purely a UI add. He picked split. Saved building stats infrastructure for a feature that may not see traffic.
  - **Schema choice: TEXT not enum for activity_type.** Tempting to use a Postgres enum for type safety, but enums require ALTER TYPE migrations to add values. TEXT + a const array in TypeScript trades a bit of DB-level rigor for zero-friction list edits. The const array IS the source of truth; DB just stores whatever the app sent. Right call for a fast-iterating list.
  - **Don't expand UI translation scope when only the list was asked.** When Chris asked for the activity list in German, I translated only the list, not the Date/Activity/Notes/Save labels. Existing logbook UI is mixed English/German per the deferred-i18n carry-over (`project_commercialization_and_i18n.md`); matching that convention beats partial translation that creates fresh inconsistency.
- **Files touched:** `database/20260501_session332_personal_activities.sql` (new, gitignored), `types/personal-activity.ts` (new), `hooks/athlete/usePersonalActivities.ts` (new), `components/athlete/personal/PersonalActivitiesView.tsx` (new), `components/athlete/personal/PersonalActivityModal.tsx` (new), `components/athlete/AthletePageLogbookTab.tsx` (toggle wire-up), `Chris Notes/Forge app documentation/Forge-Feature-Overview.md` (Athletes → Daily Workouts & Logging entry).
- **TS clean.** Single commit per close-session checklist.

**Session 331 (2026-05-01 — Opus 4.7) — PLANNER PATTERNS SHARED ACROSS ADULTS & KIDS TRACKS:**
- **Trigger.** Chris confirmed S330 Planner fixes work. He flagged that the Adults/Kids & Teens toggle in the Planner showed separate pattern lists per track, but the same patterns should be available to both — the toggle should only change which WODs feed coverage analysis.
- **Decision.** Drop the per-pattern `track` scoping entirely. Patterns are global per user; the Adults/Kids toggle continues to scope coverage/gap analysis WOD-side via `excludeSessionTypes` in `computeAnalysis`. Considered a `tracks text[]` model so a pattern could belong to multiple tracks, but Chris said any track-specific exclusions can be handled by simply not linking that exercise to a pattern, or leaving the pattern unused on a given track. Simpler model wins.
- **Migration.** `ALTER TABLE movement_patterns DROP COLUMN IF EXISTS track;` (run by Chris in Supabase Dashboard SQL Editor). SQL file at [database/20260501_drop_movement_patterns_track.sql](database/20260501_drop_movement_patterns_track.sql) — gitignored per project pattern but kept locally as the documented migration.
- **Code.** [components/coach/analysis/PlannerSection.tsx](components/coach/analysis/PlannerSection.tsx) `fetchPatterns` no longer takes a track arg; pattern fetch dropped `.eq('track', …)`. Pattern create no longer writes `track`. [types/planner.ts](types/planner.ts) `MovementPattern` interface lost `track`. `computeAnalysis(pats, trackFilter)` still uses `trackFilter` to compute `excludeSessionTypes` — that's the only thing the toggle controls now.
- **Verification.** Service-role probe confirmed column is gone and all 15 patterns load (10 real + 5 TEST placeholders kept intentionally for shape/visual testing).
- **Process moments worth remembering:**
  - **Asked single vs. multi-track up front.** Two valid models: (A) shared-only (drop the column), (B) `tracks text[]` for selective scoping. Chris picked (A) because there's no UI ceiling on pattern count and he can just order them. Cheaper choice both code-wise and migration-wise.
  - **Backup before migration.** Per CLAUDE.md DB-safety rule, ran `npm run backup` before applying the column drop. 40/40 tables saved. Cheap insurance for a 5-second column drop, but the rule isn't conditional.
- **Files touched:** `database/20260501_drop_movement_patterns_track.sql` (new, gitignored), `components/coach/analysis/PlannerSection.tsx`, `types/planner.ts`.
- **TS clean.** Single commit per close-session checklist.

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

**Older sessions (57-329):** See `project-history/` folder.

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

0. **Confirm S334 iOS Safari login fix with the affected athlete** — `window.location.href` post-login replaces `router.push`. If he still bounces, ITP cookie purge is the next suspect (different fix; would involve cookie max-age / size hardening).
0b. **Re-evaluate Statistics chip dimming thresholds after 1–2 weeks of use** — currently 10%/30% of max count in [components/coach/analysis/StatisticsSection.tsx](components/coach/analysis/StatisticsSection.tsx). If categories with one dominant exercise (e.g. Back Squat in Olympic Lifting) end up with most chips dimmed and the very-low tier loses signal, bump to 20%/50% or switch to quantile-based ranking (bottom 25% of the ranked list dims regardless of values). Three visual tiers: white/teal-border (normal), light-gray/gray-border (low), pale-gray/dashed-gray-border + italic (very low).
0a. **Acronym form fields on Lifts / Benchmarks / Forge edit modals (S333 follow-up)** — schema column + search + display already wired; only the in-app curation UI for these 3 tables is missing. ~15 min each. Until then, set acronyms via Dashboard SQL (e.g. `UPDATE barbell_lifts SET acronym = 'CJ' WHERE name = 'Clean & Jerk';`).
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
