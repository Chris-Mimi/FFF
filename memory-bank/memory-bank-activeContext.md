# Active Context

**Version:** 201
**Updated:** 2026-05-08 (Session 339 close — coach score-entry cascades to benchmark_results for benchmark/forge sections + score-entry header surfaces lift/benchmark/forge chips)

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

**First action:** Re-save the 1km Rower / SkiErg 1km Forge Benchmark scores in the live coach-side score-entry modal — the upsert UPDATEs existing wod_section_results (no leaderboard duplicate) and INSERTs the missing benchmark_results row. Then open the athlete-side Forge Benchmarks tab and Records tab and confirm 1km Rower appears with the saved time. Plus: verify the new chip header (blue lift / teal benchmark / cyan forge) shows the configured movements above the content preview — this is the UX fix so you can stop adding duplicate "C2 Rower" content rows.

**Files to open first if continuing code work:**
- [app/api/score-entry/save/route.ts](app/api/score-entry/save/route.ts) — accepts new `benchmarks` / `forgeBenchmarks` payload maps; cascades to `benchmark_results` after the existing lift cascade. Mirrors deletion path.
- [hooks/coach/useScoreEntry.ts](hooks/coach/useScoreEntry.ts) — `WodSection` extended with `benchmarks?` / `forge_benchmarks?`; `saveScores` builds the two maps from `section.benchmarks?.[0]` / `section.forge_benchmarks?.[0]`.
- [app/coach/score-entry/[sessionId]/page.tsx](app/coach/score-entry/[sessionId]/page.tsx) — new chip row above content preview surfaces every configured lift / benchmark / forge benchmark with type prefix (Forge · / Benchmark · / lift name with optional ` · 5RM`).

**Carry-over status:**
- ✅ S339 coach score-entry → benchmark_results cascade shipped (insert + update + delete). Whiteboard-only athletes skipped (no auth user). PR notify NOT wired in cascade — defer until requested. Re-saving existing coach-entered Forge/Benchmark scores will backfill `benchmark_results` rows; consider whether a one-shot script is needed for older scores or just re-save manually.
- ✅ S339 score-entry header chips shipped — coach no longer needs to duplicate the benchmark name as content text. If a section has nothing configured (lift/benchmark/forge slots all empty), the chip row is hidden and only the content preview shows, as before.
- ⏳ S338 verify on production — open AKBS Deadlift "WOD Pt.3" leaderboard (Chris 47/20 should rank above Madeleine 48/12). Spot-check Back Squat Testing, BFS 5x5, Strict Movements/KBOHC. If anything looks off, run `npx tsx scripts/cleanup-stale-scoring-fields.ts` (dry run).
- ⏳ S338 Chris's test Sumo DL row — stale wod_section_results + lift_record from his earlier test still present. Use Session Management → Remove Booking flow now that it's fixed.
- ⏳ S336 retroactive booking pass — 35 missing bookings remaining across 8 athletes (Anton 12, Max 8, Ole 5, Fabian 4, Leopold 3, Adrian 1, Kim 1, Bettina 1). Manual flow via Session Management modal increments the counter correctly when status lands as `confirmed`.
- ✅ S337 chip + modal polish shipped.
- ✅ S335 booking countdown deployed — awaiting field tuning of 2h/30m thresholds.
- ✅ S335 acronym CRUD on Lifts / Benchmarks / Forge modals — done.
- ✅ S335 lift↔exercise link inheritance — DDL run, all 20 lifts resolved.
- ⏳ S331 shared-patterns — no complaints; assumed working.
- ⏳ S330 Clean & Jerk dot — no follow-up needed unless the dot doesn't light on next test.
- ⏳ S321 late-cancel TZ fix — still waiting on a real organic cancellation to confirm.

**Landmines:**
- **Coach score-entry now writes `benchmark_results` for sections with a benchmark or forge_benchmark slot (S339).** [app/api/score-entry/save/route.ts](app/api/score-entry/save/route.ts). Previously the API wrote ONLY to `wod_section_results` (and cascaded to `lift_records` for lift sections), so coach-entered benchmark/forge scores showed on the leaderboard but never landed in the athlete's Forge Benchmarks / Records tabs (both read `benchmark_results`). The cascade now upserts by `(user_id, benchmark_id|forge_benchmark_id, result_date)` and uses the same email→auth-user resolution as the lift cascade. **Whiteboard-only athletes are skipped** — they have no `auth.users.id` so they can't own `benchmark_results` rows. **PR notify is NOT wired in the cascade** (deliberate scope limit — the lift cascade triggers PR notifies on RM-test inserts but the non-RM lift path doesn't either; matched the simpler pattern). **If you add another save path that writes `wod_section_results` for benchmark/forge sections, replicate this cascade** or athlete tabs will silently miss the data again. Client side: [hooks/coach/useScoreEntry.ts](hooks/coach/useScoreEntry.ts) `saveScores` reads `section.benchmarks?.[0]` and `section.forge_benchmarks?.[0]` per scorable section — only the first of each is forwarded; sections with multiple benchmarks would need this loop expanded.
- **Score-entry section header now renders chip row from `lifts` / `benchmarks` / `forge_benchmarks` (S339).** [app/coach/score-entry/[sessionId]/page.tsx](app/coach/score-entry/[sessionId]/page.tsx). Sits above the content preview. Color-coded: blue lift (with ` · 5RM` suffix when `rm_test`), teal `Benchmark · <name>`, cyan `Forge · <name>`. Only renders if at least one is configured. **This means coaches no longer need to duplicate the benchmark name in the section's content** field — that pattern was the original cause of S339's diagnosis confusion (Chris had added "C2 Rower" as content alongside the Forge Benchmark, but they were unrelated to the cascade bug). If you find old WODs with redundant content matching a configured benchmark name, those are now safe to clean up but it's purely cosmetic.
- **Leaderboard ranker masks disabled load/scaling slots via `maskDisabledFields` (S338).** [utils/leaderboard-utils.ts](utils/leaderboard-utils.ts). When a section's `scoring_fields` says `load: false`, `scaling: false`, etc., the ranker treats the corresponding row column as null — even if a value exists in the DB. **If you add a new ranking helper that consumes `RawSectionResult` directly, route it through `maskDisabledFields` first** or it will reproduce the screenshot bug (athletes silently ranked by hidden fields). The mask is applied in both `bestResultPerUser` and `rankSectionResults`; double-masking is a no-op so callers don't have to coordinate.
- **Score-save paths now NULL slots that the section says are off (S338).** [utils/logbook/savingLogic.ts](utils/logbook/savingLogic.ts) (athlete logbook) reads optional `scoringFields` arg from caller and gates load/scaling. [app/api/score-entry/save/route.ts](app/api/score-entry/save/route.ts) (coach API) fetches the WOD's sections at request start and masks each record server-side. **If you add a new save path for `wod_section_results`, replicate this guard** or new stale data will accumulate the moment a coach toggles a field off mid-cycle.
- **Section editor cleans existing rows on toggle-off (S338).** [hooks/coach/useWODOperations.ts](hooks/coach/useWODOperations.ts) the WOD update flow now diffs `scoring_fields` per kept section; for any field that flipped `true → false`, it issues an UPDATE that NULLs the corresponding column on `wod_section_results` for that section. **This means changing a section's scoring_fields is no longer purely additive.** Coaches can't accidentally turn scoring off and have it come back later — the data is gone. Cleanup script [scripts/cleanup-stale-scoring-fields.ts](scripts/cleanup-stale-scoring-fields.ts) was the one-shot equivalent for the 146 rows that pre-dated this guard.
- **Cancel-booking resolves auth user id via `/api/coach/resolve-auth-user` (S338).** [hooks/coach/useBookingManagement.ts](hooks/coach/useBookingManagement.ts) `handleCancelBooking`. Athlete-self-entered scores save with `user_id = auth.users.id` (different UUID from `members.id`). The OR clause used to test both columns against the same `memberId`, missing those rows entirely (and skipping the `lift_records` cleanup gated on `userIds.length > 0`). Now resolves the auth id via the new coach-only endpoint, then `or(member_id.eq.${memberId},user_id.eq.${authId ?? memberId})`. **If you add another cleanup that touches both coach-entered and athlete-entered scores, use the same resolve pattern.**
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

**Session 339 (2026-05-08 — Opus 4.7) — COACH SCORE-ENTRY CASCADES TO benchmark_results + SECTION HEADER SURFACES LIFT/BENCHMARK/FORGE CHIPS:**
- **Bug trigger.** Chris recorded a 1km Rower Forge Benchmark via the coach-side score-entry modal. The score landed in the leaderboard but was missing from his athlete-side Forge Benchmarks tab and Records tab. Diagnosis: the score-entry API writes to `wod_section_results` (leaderboard reads this ✓) and cascades to `lift_records` for lift sections, but had **no cascade to `benchmark_results`** for benchmark/forge_benchmark sections — and both athlete tabs read `benchmark_results`. Same shape as the lift cascade, just never wired up.
- **Defense-in-depth fix.** [app/api/score-entry/save/route.ts](app/api/score-entry/save/route.ts) now accepts `benchmarks` / `forgeBenchmarks` payload maps (parallel to `rmTestLifts` / `nonRmLifts`). After the lift cascades, walks each score, resolves `user_id` via the existing email→auth lookup, skips whiteboard-only athletes, and upserts to `benchmark_results` keyed on `(user_id, benchmark_id|forge_benchmark_id, result_date)`. Encodes `result_value` matching the athlete-self-entry path (time → rounds+reps → reps → weight → metres → calories priority). Deletion path also delete-cascades the `benchmark_results` row when a score is cleared. [hooks/coach/useScoreEntry.ts](hooks/coach/useScoreEntry.ts) extends `WodSection` with `benchmarks?` / `forge_benchmarks?` and builds the two maps from `section.benchmarks?.[0]` / `section.forge_benchmarks?.[0]` per scorable section.
- **UX fix landed in same session.** Chris had been adding redundant "C2 Rower" content rows to sections that already had Forge Benchmarks configured, because the score-entry modal didn't display the benchmark name anywhere. [app/coach/score-entry/[sessionId]/page.tsx](app/coach/score-entry/[sessionId]/page.tsx) now renders a chip row above the content preview surfacing every configured lift / benchmark / forge_benchmark with type prefix and color coding (blue / teal / cyan). Coaches can stop duplicating benchmark names as content. The redundant content rows still work but are no longer needed.
- **Process moments worth remembering:**
  - **First diagnosis was wrong direction.** I started chasing the in-WOD athlete logbook flow before Chris clarified he saved through the coach-side modal. Asked one disambiguating question instead of guessing — saved an exploration cycle. Per `feedback_ask_when_unsure.md`.
  - **Asked "is dual-entry the cause?" — Chris's instinct was right that something was odd, wrong about which thing.** The dual entry was a UX papercut (could be fixed independently) but had nothing to do with the cascade bug. Worth surfacing both as separate work items rather than conflating.
  - **Single commit covers both fixes** — same code surface (score-entry flow), same trigger (Chris's 1km Rower test). Splitting would have produced two near-identical commit bodies.

**Session 338 (2026-05-07 — Opus 4.7) — LEADERBOARD IGNORES DISABLED SCORING FIELDS (READ + WRITE + TOGGLE-OFF + 146-ROW CLEANUP) + CANCEL-BOOKING FINDS ATHLETE-SELF-ENTERED SCORES:**
- **Bug 1 trigger.** Chris flagged the AKBS Deadlift leaderboard ranking him (47 reps · 20 kg · T2) below Madeleine (48 reps · 12 kg · T2). Service-role probe revealed the screenshot section (`section-1774340929806`, "WOD Pt.3") had `scoring_fields.scaling: false` but every row still had `scaling_level` populated from before the toggle was flipped. Aggregate scaling (chain rank: tier → track → scaling → score) silently demoted Sc1 entries below Rx — invisibly, because the display correctly hid scaling badges per S325's `formatResult` gate.
- **Defense-in-depth fix.** [utils/leaderboard-utils.ts](utils/leaderboard-utils.ts) — new `maskDisabledFields` zero-walks load/scaling slots when `scoring_fields` says they're off; both `bestResultPerUser` and `rankSectionResults` accept an optional `scoringFields` arg. [components/athlete/LeaderboardView.tsx](components/athlete/LeaderboardView.tsx) plumbs `section.scoring_fields` through. [utils/logbook/savingLogic.ts](utils/logbook/savingLogic.ts) (athlete) and [app/api/score-entry/save/route.ts](app/api/score-entry/save/route.ts) (coach) gate slots at write time too — the API endpoint fetches `wods.sections` at request start, builds a per-section field map, masks each record. [hooks/coach/useWODOperations.ts](hooks/coach/useWODOperations.ts) — coach edits to a section's scoring_fields now NULL the corresponding columns on existing rows (toggle-off cleanup). [scripts/cleanup-stale-scoring-fields.ts](scripts/cleanup-stale-scoring-fields.ts) — one-shot data heal: 146 rows across 21 sections nulled (Back Squat 22, BFS 5x5 22, AKBS Deadlift 13, Strict Movements 11, Weekend WOD #26.7 8, Isabel 1, etc.).
- **Bug 2 trigger.** Chris recorded a test 200kg Sumo DL on a workout, then used Session Management → Remove Booking. The booking moved to `coach_cancelled` but the score remained on the leaderboard AND the Lifts tab. Root cause in [hooks/coach/useBookingManagement.ts:347](hooks/coach/useBookingManagement.ts#L347): `or(member_id.eq.${memberId},user_id.eq.${memberId})` tested both columns against the same `memberId` — but athlete-self-entered rows save with `user_id = auth.users.id`, a different UUID. The query missed the row, the lift_records cleanup was gated on `userIds.length > 0` from that query → both tables silently kept the data.
- **Cancel-booking fix.** New [app/api/coach/resolve-auth-user/route.ts](app/api/coach/resolve-auth-user/route.ts) (coach-only) resolves `members.id → auth.users.id` via email lookup. `handleCancelBooking` calls it before the OR cleanup. Falls back to `memberId` if resolution fails so the existing coach-entered match still works.
- **Process moments worth remembering:**
  - **Stopped guessing after the second wrong theory.** First diagnosis was "load slot mismatch between dates" — Chris pushed back ("I just copied the workout, slots are identical"). Second was "stale data from edited section" — correct, but I wrote a probe FIRST this time before claiming. Probe revealed exact data, theory matched. Lesson: in a 5-bug-history-on-one-feature situation, write the probe before the theory.
  - **Asked "how is stale data being saved in the first place?" turned a symptom fix into a defense-in-depth fix.** The original plan was just the read-time mask. Chris's question forced the full chain (read + write + toggle-off + cleanup) which is what actually solves it.
  - **Bulk write paused for explicit go-ahead.** 146-row cleanup ran in dry-run first, presented the impact summary (per-section per-WOD), got "apply" confirmation, then ran with `--apply`. Matches the S240 silent-bulk-write rule.
  - **Single commit for two unrelated bugs surfaced from one test.** Both came from the same Chris test session and both deploy-affect leaderboard correctness. No value in splitting; commit body covers both clearly.

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

**Older sessions (57-334):** See `project-history/` folder.

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

0. **Verify the score-entry → benchmark_results cascade on production (S339).** Open the coach-side score-entry modal for the workout with the 1km Rower / SkiErg 1km Forge Benchmarks, hit Save (existing values pre-fill). Then on the athlete side, open Forge Benchmarks tab + Records tab — the 1km Rower entry should appear with the saved time. Also confirm the new chip header (blue lift / teal benchmark / cyan forge) renders above the content preview. If a tab shows nothing, check the browser network tab for the `/api/score-entry/save` response — `saved` should be > 0; if there's an error, dump the response body.
0a. **Decide on backfill for older coach-entered Forge / Benchmark scores (S339).** Anything saved from coach-side BEFORE this fix is still missing from `benchmark_results`. Two options: (i) manually re-save each affected score in the score-entry modal (simplest, low volume probably fine), or (ii) write a one-shot script that walks `wod_section_results` for sections with a benchmark/forge slot and inserts the missing rows. Skip until needed — likely there are only a handful.
1. **Verify the AKBS Deadlift leaderboard fix on the production deploy (S338).** Open the WOD's leaderboard for "WOD Pt.3" — Chris (47/20) should rank above Madeleine (48/12), and Irene (40/12) below them. Then spot-check Back Squat Testing, BFS 5x5, and Strict Movements/KBOHC leaderboards — all had stale rows cleaned by the one-shot script. If anything looks wrong, run `npx tsx scripts/cleanup-stale-scoring-fields.ts` (dry run) to detect new stale rows.
1a. **Re-test the cancel-booking flow (S338).** Add a fake score to a workout via athlete UI, then use Session Management → Remove Booking. Both the leaderboard row AND the lift_record (if any) should disappear this time. Chris's earlier test 200kg Sumo DL is still live — easiest cleanup is to just run that flow on it now.
1b. **Finish retroactive 10-card bookings for the 8 remaining athletes (S336 carry).** Run `npx tsx scripts/probe-unbooked-whiteboard-athletes.ts` for the per-athlete date list. Manually book each via the Session Management modal — counter increments correctly when status lands as `confirmed`. After each athlete, glance at the chip — ⚠ glyph means a mismatch with `ten_card_sessions_used`; open TenCardModal → Recalc → Save to clear (or leave as a documented override per Rosita's case).
1c. **Re-evaluate booking-window countdown thresholds (S335)** — currently amber under 2h, red under 30m on Book a Class cards. If athletes report the warning fires too early/late after a few days of real use, tune the breakpoints in [app/member/book/page.tsx](app/member/book/page.tsx) `renderBookingCountdown`.
1d. **Re-evaluate Statistics chip dimming thresholds after 1–2 weeks of use** — currently 10%/30% of max count in [components/coach/analysis/StatisticsSection.tsx](components/coach/analysis/StatisticsSection.tsx). If categories with one dominant exercise (e.g. Back Squat in Olympic Lifting) end up with most chips dimmed and the very-low tier loses signal, bump to 20%/50% or switch to quantile-based ranking (bottom 25% of the ranked list dims regardless of values). Three visual tiers: white/teal-border (normal), light-gray/gray-border (low), pale-gray/dashed-gray-border + italic (very low).
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
