# Active Context

**Version:** 199
**Updated:** 2026-05-06 (Session 337 close — 10-card chip uses card total (5/10/20-card support), modal full vs near-full message, tooltip explains mismatch as "recorded + manually added")

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

**First action:** Continue manually booking the remaining 8 ten-card athletes from the [scripts/probe-unbooked-whiteboard-athletes.ts](scripts/probe-unbooked-whiteboard-athletes.ts) output (Anton 12, Max 8, Ole 5, Fabian 4, Leopold 3, Adrian 1, Kim 1, Bettina 1). The chip now mirrors the modal counter when there's a mismatch (S337 fix), so e.g. setting Frieda's counter to 5/10 with 2 actual bookings shows the chip as `5/10 ⚠` and the tooltip explains "2 from recorded bookings + 3 manually added (e.g. pre-app sessions)". For each athlete: open TenCardModal → set the counter to the correct pre-app starting point → close. The 2 retroactive bookings will increment from there as you add them via the Session Management modal.

**Files to open first if continuing code work:**
- [components/coach/members/MemberCard.tsx](components/coach/members/MemberCard.tsx) — 10-card chip now reads from actual bookings (not derived from counter). ⚠ glyph appears when `ten_card_sessions_used !== past+upcoming`. Red `>=9` background still tied to counter.
- [hooks/coach/useMemberData.ts](hooks/coach/useMemberData.ts) — single bookings query splits into `pastTenCardMap` + `upcomingTenCardMap` per holder, bounded by `ten_card_purchase_date`.
- [components/coach/TenCardModal.tsx](components/coach/TenCardModal.tsx) — Recalc/Save still the way to fix mismatches (sets counter to current bookings count since purchase date).
- [scripts/probe-unbooked-whiteboard-athletes.ts](scripts/probe-unbooked-whiteboard-athletes.ts) — read-only diagnostic, ten_card-only filter; lists registered athletes with whiteboard appearances but no booking, grouped per athlete.

**Carry-over status:**
- ✅ S336 chip mismatch warning shipped — Rosita's case (counter manually set to 10 by Mimi for pre-app sessions; real bookings = 6+1) now renders as `6+1/10 ⚠`. Acceptable indefinitely if the override is intentional.
- ⏳ S336 retroactive booking pass — 6 of 41 missing bookings done (Rosita). 35 remaining across 8 athletes from the probe; manual flow via Session Management modal increments the counter correctly when status lands as `confirmed`.
- ✅ S335 booking countdown deployed — awaiting field tuning of 2h/30m thresholds.
- ✅ S335 acronym CRUD on Lifts / Benchmarks / Forge modals — done. The S333 follow-up is closed.
- ✅ S335 lift↔exercise link inheritance — DDL run, all 20 lifts resolved.
- ✅ S334 iOS Safari login fix — confirmed working on the affected athlete's iPhone 16 Safari.
- ⏳ S332 Personal Activities — Chris tested live, working. Optional Session B heatmap + counts row deferred until usage justifies.
- ⏳ S331 shared-patterns — Chris hasn't explicitly confirmed both toggles show same patterns, but no complaints either.
- ⏳ S330 Clean & Jerk dot — Chris confirmed S330 changes work; deeper extractor canonical-name verification still pending if the dot doesn't light.
- ⏳ S321 late-cancel TZ fix — still waiting on a real organic cancellation to confirm.

**Landmines:**
- **10-card chip display logic depends on mismatch state (S337 refines S336).** [components/coach/members/MemberCard.tsx](components/coach/members/MemberCard.tsx). When `counter !== past + upcoming` (override case): chip mirrors counter as `${counter}/${total}` with ⚠ glyph — this is "coach intent" view. When matched: shows split `${past}+${upcoming}/${total}` if upcoming > 0, else `${counter}/${total}`. Tooltip explains the split between recorded bookings and manually-added (when counter > actual) or suggests Recalc (when counter < actual). **Total is now `member.ten_card_total ?? 10`** — works for 5-cards, 20-cards, etc. Red background trigger moved from `counter >= 9` to `counter >= total - 1`. **If you change ten-card display anywhere else (modal, payments, booking flow), use `ten_card_total` not hardcoded 10.**
- **TenCardModal full vs near-full message split (S337).** [components/coach/TenCardModal.tsx](components/coach/TenCardModal.tsx). `sessionsUsed >= total` shows "Card is full — issue a new card before next booking". `sessionsUsed === total - 1` shows "Next session will complete this card". Below the threshold: nothing. Old single-message logic was confusing at the boundary (5/5 still said "next session will complete").
- **10-card chip now displays `actual_past+upcoming/10` from real bookings, NOT `counter-derived` (S336).** [components/coach/members/MemberCard.tsx](components/coach/members/MemberCard.tsx). Counter (`members.ten_card_sessions_used`) is no longer the chip's source of truth — it only drives the red `>=9` background and the ⚠ mismatch glyph. **If you add a new place that reads "how many sessions used", decide whether you want the counter (intent) or actual bookings (truth).** The TenCardModal "Sessions Used" input still shows the counter; the bookings list shows actual. Mismatches are now visible to the coach via the chip glyph instead of being silent.
- **`upcoming_ten_card_bookings` + `past_ten_card_bookings` derive from `bookings ⨝ members` filtered by *current* effective method (S336).** [hooks/coach/useMemberData.ts](hooks/coach/useMemberData.ts). If a member switched payment methods (e.g. ten_card → wellpass), historical bookings on the previous method won't be attributed. Acceptable for now; if Chris ever does mid-card method changes, this would undercount. Both counts are bounded by the holder's `ten_card_purchase_date` so previous-card bookings don't bleed in.
- **Coach manual booking via Session Management modal: increments `ten_card_sessions_used` ONLY if status lands as `confirmed`.** [hooks/coach/useBookingManagement.ts:62](hooks/coach/useBookingManagement.ts#L62) computes status via `canAddToSession(confirmedCount + trialNames.length, capacity)`. For past sessions at capacity this could push to `waitlist` — silent failure mode for retroactive bookings (S336 investigation false-positive: Rosita didn't hit this, but worth knowing). If you ever back-book a heavily-attended past session and the counter doesn't move, check the inserted booking's `status`.
- **Exercise display_name "Barbell" prefix stripped on 17 of 20 Olympic Lifting rows (S336).** Migration [database/20260505_session336_strip_barbell_prefix_from_display_name.sql](database/20260505_session336_strip_barbell_prefix_from_display_name.sql). `name` (UNIQUE canonical) untouched — `genericToCanonical` map in [utils/movement-extraction.ts](utils/movement-extraction.ts) still maps to `barbell snatch` etc. and works fine. Exclusion list (`Barbell Row`, `Barbell Bent Over Row`, `Barbell Dead Row`) kept the prefix because "Row" alone is ambiguous (also a benchmark cardio movement). **When adding new barbell exercises:** keep "Barbell" in `name`, drop it from `display_name` for the picker (placeholders in [ExerciseFormModal.tsx](components/coach/ExerciseFormModal.tsx) already nudge this).
- **`barbell_lifts.exercise_id` is the new acronym source-of-truth for linked lifts (S335).** Migration [database/20260505_session335_link_lifts_to_exercises.sql](database/20260505_session335_link_lifts_to_exercises.sql) added `exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL` + index. **When set, the lift's own `acronym` column is forced to NULL** ([hooks/coach/useLiftsCrud.ts](hooks/coach/useLiftsCrud.ts) `saveLift`). 18 of 20 lifts auto-paired; Hang Clean + Hang Snatch left unlinked (Chris pairs manually). **Read pattern (everywhere that needs a lift's acronym):** `lift.acronym ?? linkedExercise.acronym`. Currently applied in [hooks/coach/useCoachData.ts](hooks/coach/useCoachData.ts) `fetchExerciseNames` and [components/coach/MovementLibraryPopup.tsx](components/coach/MovementLibraryPopup.tsx) `fetchLifts`. **If you write a new query against `barbell_lifts` and need the acronym, use the join + fallback** — don't read `barbell_lifts.acronym` alone, or you'll silently get NULL for 18 of 20 lifts. Supabase types embedded selects as `T | T[]`; use `Array.isArray(linked) ? linked[0] : linked` to unwrap. The `LiftsTab` modal Acronym input auto-locks and shows the inherited value when `exercise_id` is set.
- **Book a Class lock check now uses `sessionStartInstant` + per-type `auto_lock_lead_minutes` (S335).** [app/member/book/page.tsx](app/member/book/page.tsx) `effectivelyLocked` previously did `new Date(\`${session.date}T${session.time}\`)` which is interpreted as **runtime-local** (UTC on Vercel) — produced a 2h offset on prod. Replaced with `sessionStartInstant(date, time)` from [lib/bookingRules.ts](lib/bookingRules.ts) and `lockAtMs = startInstant - leadMinutes * 60_000`. Per-type lead minutes come from `/api/booking-rules/public` (extended to expose `auto_lock_lead_minutes` + `session_type_lock_minutes` array). **If you ever see `new Date(\`${date}T${time}\`)` in this codebase, it's the same bug class** — search-and-replace with `sessionStartInstant`.
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

**Session 337 (2026-05-06 — Opus 4.7) — 10-CARD CHIP REAL-WORLD POLISH (FRIEDA TEST: CARD TOTAL + FULL/NEAR-FULL MESSAGES + MISMATCH TOOLTIP REWORD):**
- **Chip uses `member.ten_card_total ?? 10`** instead of hardcoded `/10`. [components/coach/members/MemberCard.tsx](components/coach/members/MemberCard.tsx) — Frieda's 5-card now correctly reads `5/5` instead of `5/10`. Red `>=9` background also moved to `>= total - 1` so 5-cards turn red at 4/5. Future-proof for any card size (5, 10, 20).
- **Mismatch chip shows the counter, not the split.** Counter is the source of truth when overridden (coach intent for pre-app sessions). For Frieda set to 5/10 with 2 actual bookings, chip reads `5/10 ⚠` (was `2+0/10 ⚠`). When no mismatch, behaviour unchanged: `past+upcoming/total` with split when there are upcoming bookings, otherwise just `counter/total`.
- **Modal full vs near-full distinction.** [components/coach/TenCardModal.tsx](components/coach/TenCardModal.tsx) — `sessionsUsed >= total` now shows "Card is full — issue a new card before next booking" (was incorrectly "Next session will complete this card"). Near-full (`sessionsUsed === total - 1`) keeps the original message.
- **Tooltip rewording — explains the split.** Old: "counter manually set to 5/10 — actual bookings show 2 past + 0 upcoming = 2" (technically correct, confusing). New: "10-card: 5/10 used. 2 from recorded bookings (2 past + 0 upcoming) + 3 manually added (e.g. pre-app sessions). Click to manage." When counter is BELOW actual (rare), tooltip suggests Recalc instead.
- **Trigger.** Chris tested with Frieda Stromer (Crossfit Kids, pre-app card holder). Chip showed `0/10` with ⚠ instead of mirroring her 5/5 manual override. Modal said "Next session will complete this card" at 5/5 (it's already complete). Tooltip implied the counter was set to 5 when Chris had set it to 3 (the +2 came from real bookings). All three were UI bugs surfaced by real launch-transition data.
- **Process moments worth remembering:**
  - **Asked clarifying questions before coding** when Chris's message had both "don't write code" and a UX complaint. Resolved by asking — turns out he meant "no transient launch-only code", not "no fixes". Saved a guess in the wrong direction.
  - **Three small fixes shipped together** because they all surfaced from one test scenario (Frieda). Single commit, single test pass. No splitting needed.
  - **Real-world testing > theoretical correctness.** S336 looked clean in TS + build, but Chris's first test against a 5-card immediately surfaced 3 bugs that no synthetic test would have caught.

**Session 336 (2026-05-05 — Opus 4.7) — EXERCISE DISPLAY_NAME "BARBELL" STRIP + 10-CARD CHIP REWRITE (ACTUAL BOOKINGS + ⚠ MISMATCH GLYPH) + TENCARDMODAL BOOKINGS LIST + UNBOOKED-WHITEBOARD PROBE:**
- **Exercise picker sort cleanup.** Stripped `Barbell ` prefix from `exercises.display_name` on 17 of 20 Olympic Lifting rows (kept `Barbell Row`/`Bent Over Row`/`Dead Row` — "Row" alone is ambiguous). Migration: [database/20260505_session336_strip_barbell_prefix_from_display_name.sql](database/20260505_session336_strip_barbell_prefix_from_display_name.sql). `exercises.name` untouched — `genericToCanonical` map + S335 FK inheritance unaffected.
- **10-card chip rewrite (truth, not derived).** [components/coach/members/MemberCard.tsx](components/coach/members/MemberCard.tsx) chip now displays `actual_past+upcoming/10` derived from real bookings via [hooks/coach/useMemberData.ts](hooks/coach/useMemberData.ts) (single bookings query, split per holder, bounded by purchase date). When the counter (`members.ten_card_sessions_used`) doesn't equal `past + upcoming`, an amber **⚠** glyph appears with a tooltip explaining the mismatch. Surfaces silent counter overrides (e.g. Mimi setting Rosita's card to 10/10 to account for pre-app-launch sessions) instead of letting them produce phantom "consumed" counts. Red `>=9` background still tied to the counter to preserve "intentionally fully used" intent. [types/member.ts](types/member.ts) gained `past_ten_card_bookings?: number`.
- **TenCardModal bookings list.** When 10-card section is open, lists every consuming booking (`confirmed`/`no_show`/`late_cancel`) since purchase date, split into Consumed (past) and Upcoming with date+time+status badge. Family-share rows show booker name in italic purple. Resolves "what dates went on this card?" question.
- **Read-only probe: registered athletes with whiteboard names but no booking.** [scripts/probe-unbooked-whiteboard-athletes.ts](scripts/probe-unbooked-whiteboard-athletes.ts) — service-role diagnostic, ten_card-only filter. Initial run: 9 athletes / 41 missing bookings (Anton 12, Max 8, Rosita 6, Ole 5, Fabian 4, Leopold 3, Adrian 1, Kim 1, Bettina 1). Mirrors the alias map from `backfill-whiteboard-bookings.ts` so behavior matches what the backfill would do.
- **Triggers.** (1) Chris asked if "Barbell" prefix is doing useful work — it's not, picker sort suffers. (2) David Montgomery showed 7/10 used after only 5 attended sessions — investigation found counter was correct (5 past + 2 upcoming) but badge ambiguous; ungated UX rewrite followed. (3) Rosita Blum showed 9+1/10 with manual override of 10 — counter math produced 9 phantom consumed sessions; led to the actual-bookings rewrite + ⚠ glyph.
- **Process moments worth remembering:**
  - **Asked design choice up front** on display_name vs name (3 options: drop `name`, drop `display_name`, both). Picked `display_name` only — no impact on internal canonical match keys, picker sort improves immediately.
  - **Two-commit split.** Checkpoint commit `8f951e8` shipped chip split + modal bookings list mid-session; close commit bundles the actual-bookings rewrite + ⚠ glyph + probe. Match for S334/S335 split shape.
  - **Three wrong guesses about Rosita's mismatch before asking directly** (waitlist, capacity check, member_id mismatch). Should have asked Chris one direct question earlier per `feedback_ask_when_unsure.md`. Chris corrected with "It's a user error. Mimi manually set this card at 10/10" — saved further speculation.
  - **`feedback_include_todo_list.md` rule landed wrong on first save** ("every reply"). Chris clarified "session start only" within minutes — corrected immediately.

**Session 335 (2026-05-05 — Opus 4.7) — BOOKING COUNTDOWN + CHECKLIST SPLIT + ACRONYM CRUD ON LIFT/BENCHMARK/FORGE + LIFT↔EXERCISE LINK INHERITANCE:**
- **Book a Class booking-window countdown.** Cards now show "Closes in Xd Yh / Xh Ym / Xm" under capacity row. Gray normally, **amber <2h**, **red <30m**. Ticks every 60s. [app/api/booking-rules/public/route.ts](app/api/booking-rules/public/route.ts) extended to expose `auto_lock_lead_minutes` + per-type overrides. `lockAtMs = sessionStartInstant - leadMinutes * 60_000`. Latent UTC-vs-Berlin bug in `effectivelyLocked` fixed at the same time (was `new Date(\`${date}T${time}\`)`, now `sessionStartInstant`).
- **Workflow: split session-close checklist.** New [Chris Notes/AA frequently used files/1-mid-session-checkpoint-checklist.md](Chris%20Notes/AA%20frequently%20used%20files/1-mid-session-checkpoint-checklist.md) — light "ship + redeploy + keep coding" version. Old checklist renamed [2-session-close-checklist.md](Chris%20Notes/AA%20frequently%20used%20files/2-session-close-checklist.md). Cues: "checkpoint" → file 1, "close session" → file 2.
- **Acronym CRUD shipped on Lifts / Benchmarks / Forge edit modals.** S333 follow-up closed. [hooks/coach/useLiftsCrud.ts](hooks/coach/useLiftsCrud.ts), [hooks/coach/useBenchmarksCrud.ts](hooks/coach/useBenchmarksCrud.ts), [hooks/coach/useForgeBenchmarksCrud.ts](hooks/coach/useForgeBenchmarksCrud.ts) — interface, form state, openModal pre-fill, save (uppercase-or-NULL). [components/coach/LiftsTab.tsx](components/coach/LiftsTab.tsx), [components/coach/BenchmarksTab.tsx](components/coach/BenchmarksTab.tsx), [components/coach/ForgeBenchmarksTab.tsx](components/coach/ForgeBenchmarksTab.tsx) — Acronym input next to Name (auto-uppercase, letters/digits, max 6). ForgeBenchmark template-pick clears acronym (must be unique per row).
- **Lift↔exercise link inheritance — single source of truth for acronyms.** Migration [database/20260505_session335_link_lifts_to_exercises.sql](database/20260505_session335_link_lifts_to_exercises.sql) added `barbell_lifts.exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL` + index. Backfill paired 18 of 20 lifts to their canonical exercise (Snatch→Barbell Snatch, Clean & Jerk→Barbell Clean & Jerk, etc.). Hang Clean + Hang Snatch left unlinked (library only has Hang Power variants — different movement). New "Linked Exercise" dropdown in LiftsTab filtered to `Olympic Lifting & Barbell Movements`; when set, the Acronym input auto-locks and shows inherited value as a teal hint. [hooks/coach/useCoachData.ts](hooks/coach/useCoachData.ts) `fetchExerciseNames` and [components/coach/MovementLibraryPopup.tsx](components/coach/MovementLibraryPopup.tsx) `fetchLifts` updated with the inheritance fallback.
- **Process moments worth remembering:**
  - **Asked design choice before building** the lift↔exercise link: 3 options (merge tables / link column / soft name-mapping warning). Picked B (link column) — explicit, no drift, ~30min, doesn't depend on the brittle S330 generic-to-canonical mapping. Saved building either A (over-engineered migration) or C (still drift-prone).
  - **Showed Chris the auto-pair table before running the migration** — flagged 2 ambiguous matches (Hang Clean / Hang Snatch) so he could decide them manually rather than guessing wrong. Confirmed before SQL ran.
  - **Three commits / one session.** Login-fix style: ship the fast deploy first (countdown + checklist split — Vercel-deployable), then iterate; close-session bundles the rest. Match for the S334 split-commit pattern.
- **Threshold caveats logged:** countdown 2h/30m and Statistics dimming 10%/30% are both first-pass — Next Step 0b covers re-tuning after a few days/weeks.

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

**Older sessions (57-332):** See `project-history/` folder.

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

0. **Finish retroactive 10-card bookings for the 8 remaining athletes (S336 carry).** Run `npx tsx scripts/probe-unbooked-whiteboard-athletes.ts` for the per-athlete date list. Manually book each via the Session Management modal — counter increments correctly when status lands as `confirmed`. After each athlete, glance at the chip — ⚠ glyph means a mismatch with `ten_card_sessions_used`; open TenCardModal → Recalc → Save to clear (or leave as a documented override per Rosita's case).
0a. **Re-evaluate booking-window countdown thresholds (S335)** — currently amber under 2h, red under 30m on Book a Class cards. If athletes report the warning fires too early/late after a few days of real use, tune the breakpoints in [app/member/book/page.tsx](app/member/book/page.tsx) `renderBookingCountdown`.
0b. **Re-evaluate Statistics chip dimming thresholds after 1–2 weeks of use** — currently 10%/30% of max count in [components/coach/analysis/StatisticsSection.tsx](components/coach/analysis/StatisticsSection.tsx). If categories with one dominant exercise (e.g. Back Squat in Olympic Lifting) end up with most chips dimmed and the very-low tier loses signal, bump to 20%/50% or switch to quantile-based ranking (bottom 25% of the ranked list dims regardless of values). Three visual tiers: white/teal-border (normal), light-gray/gray-border (low), pale-gray/dashed-gray-border + italic (very low).
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
