# Active Context

**Version:** 220
**Updated:** 2026-05-15 (Session 352 — kids calendar color regression fix + Gloria Stoffer family→primary profile merge. `KIDS_KEYWORDS` matcher switched from strict equality to `startsWith` so age-suffixed titles like "Kids & Teens 6-9" (added around 2026-04-20 when Mimi specified age groups) render in the lighter teal-400 again. Member merge done as a 3-statement SQL transaction in Supabase — bookings + wod_section_results repointed to new primary id, family-member row deleted; S351 trigger auto-resynced the 10-card counter.)

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

**First action:** Visual-verify on prod that kids-class calendar cards render in the lighter teal-400 again (after Vercel deploys S352 commit `32f50d1`). Open `/coach`, scan the current week — any Kids & Teens / FitKids Turnen / Elternkind Turnen card with an age suffix should be light teal, not the dark WOD teal.

**Second action:** Once Chris has paper-card access (~1 day from now), enter `purchase_date` for the 10-card holders missing it, then click Recalc + Save on each to sync. After that they're auto-tracked by the S351 trigger forever. Until then, those holders' counters stay where they are (trigger bails on null `purchase_date`).

**Files to open first if continuing code work:**
- [utils/card-utils.ts](utils/card-utils.ts) — kids matcher now uses `startsWith` (same pattern foundations already used). If a future title needs a different prefix family (e.g. "Junior CrossFit"), add to `KIDS_KEYWORDS`.
- [database/20260515_session351_ten_card_consumed.sql](database/20260515_session351_ten_card_consumed.sql) — S351 trigger + column. Lives in DB now; file is for reference.
- [app/api/coach/link-trial-to-member/route.ts](app/api/coach/link-trial-to-member/route.ts) — S351 trial-link endpoint.
- [components/coach/SessionManagementModal.tsx](components/coach/SessionManagementModal.tsx) — trial chips + link UI from S351.

**Carry-over status:**
- ⏳ S352 visual-verify kids-class calendar color on prod after Vercel deploys commit `32f50d1`.
- ⏳ S351 paper-card sync — enter `purchase_date` for ~10 holders missing it, click Recalc + Save once each. After that, drift is mathematically impossible for that holder.
- ⏳ S346 gym memberships live test — Add → Edit → Delete flow on `/coach/admin` Memberships tab; cron should auto-expire active rows past `end_date` at 06:00 UTC.
- ⏳ S345 whiteboard backfill — Nico Enzmann still needs Recalc + Save. Kim Salzgeber done (S351 via bulk reconcile + trial-link).
- ⏳ S344 deletion-paths forward fix — two paths still skip wsr/lift_records/reactions cleanup: `handleDeleteIncident` ([app/coach/admin/page.tsx:231](app/coach/admin/page.tsx#L231)) + `handleDeleteSession` ([hooks/coach/useWODOperations.ts:534](hooks/coach/useWODOperations.ts#L534)). Plus reactions DELETE missing from all 4 cleanup paths.
- ⏳ S342 user verification — once Nikolina/Lisa enter the 7d window, confirm Subscriptions Due banner cash bucket with Renew buttons.
- ⏳ S341 user verification — `/coach/analysis` planner `[ All | RM Testing only ]` toggle.
- ⏳ S338 verify on production — AKBS Deadlift "WOD Pt.3" leaderboard ordering.
- ⏳ S336 retroactive bookings carry — Anton (Koffler/Jacht ambiguity), Max Weber, Lenny Kleinert dupe, etc.
- ⏳ S321 late-cancel TZ fix — still waiting on a real organic cancellation.

**Landmines:**
- **`bookings.ten_card_consumed` is the SOURCE OF TRUTH for the 10-card counter (S351 Path B).** Any code path that creates/modifies/deletes a `bookings` row MUST set `ten_card_consumed` correctly — otherwise the DB trigger recomputes the counter from a wrong base. The four write paths (`app/api/bookings/create`, `app/api/bookings/cancel`, `app/api/coach/cancel-member-booking`, `lib/coach/promoteFromWaitlist`) already do. **If you add a fifth write path, set the flag:** `true` when the booking eats a 10-card session (effective payment = ten_card AND not trial), `false` otherwise. The trigger fires on INSERT, UPDATE OF (status/is_trial/ten_card_consumed/member_id), or DELETE. Direct DB inserts via Supabase Table Editor also fire the trigger — drift via deletion is finally impossible.
- **Trigger bails when `members.ten_card_purchase_date IS NULL` (S351 Path B).** Holders without a date set don't get counter auto-updates. Bookings still record `ten_card_consumed=true` (data captured), but `members.ten_card_sessions_used` stays at whatever it currently is. Once Chris sets the date and clicks Recalc, counter snaps to truth; from then on the trigger maintains it. **Until then, those holders are on the legacy manual-counter regime** — don't be confused if you book a session for them and the chip doesn't move.
- **Trial-linked bookings have `is_trial=true` + `linked_trial_name=<text from trial_names>` (S351).** [app/api/coach/link-trial-to-member/route.ts](app/api/coach/link-trial-to-member/route.ts). These bookings: KEEP the original `weekly_sessions.trial_names` entry (historical record); set `ten_card_consumed=false` (don't debit); excluded from capacity counts everywhere (`app/api/bookings/create/route.ts`, [lib/coach/bookingHelpers.ts](lib/coach/bookingHelpers.ts), [components/coach/SessionManagementModal.tsx](components/coach/SessionManagementModal.tsx)). The trial chip in SessionManagementModal renders a green `linked` badge when there's a matching `linked_trial_name` booking; the linked booking renders an amber `Trial` badge on its row. **If you add a new capacity-counting surface, exclude `is_trial=true` from confirmedCount** OR the seat gets double-counted (trial_names slot + booking row).
- **Movement extractor needs `liftExerciseMap` to bridge linked-lift → exercise (S348 post-close).** [utils/movement-extraction.ts](utils/movement-extraction.ts) `extractMovementsFromWod` + `extractMovementsWithMetadata` now accept an optional `liftExerciseMap?: LiftExerciseMap` parameter. Source: [utils/movement-analytics.ts](utils/movement-analytics.ts) `fetchLiftExerciseMap()` joins `barbell_lifts.exercise_id` → `exercises` and returns `Map<lift_name_lower, exercise_display_name_lower>`. **If you add a new extractor call site, fetch this map and thread it through** — otherwise lifts whose catalog name differs from the linked exercise name (e.g. "Strict Overhead Shoulder Press" → "Strict OH Press") will silently miss from Movement Tracking, Planner gap analysis, Workouts search, and Exercise Frequency. Resolution order in the lift branch: **link → acronym → genericToCanonical → name match → fallback**. Link wins because it's the curated source of truth. Closes the long-standing S330 landmine.
- **`fetchLiftExerciseMap` must emit display_name, NOT raw `exercises.name` (S348 post-close).** [utils/movement-analytics.ts](utils/movement-analytics.ts). `knownExerciseNames` upstream (built in [components/coach/SearchPanel.tsx](components/coach/SearchPanel.tsx) `exerciseNamesSet` + [hooks/coach/useCoachData.ts](hooks/coach/useCoachData.ts) `fetchExerciseNames`) only adds `display_name`. Emitting raw `exercises.name` breaks the chain whenever name is slug-style (e.g. `barbell-strict-oh-press-ohp`). The helper now does `linked.display_name || linked.name`. **If you tweak this helper, keep the display-name preference** — and if you change `exerciseNames` to include `name` everywhere, that's a separate consideration but not load-bearing today.
- **Programming Notes preview relies on explicit `components` overrides for heading/list rendering (S348 post-close).** [components/coach/ProgrammingNotesTab.tsx](components/coach/ProgrammingNotesTab.tsx). The wrapper has `prose prose-sm` BUT prose's heading/list styles don't actually reach the rendered HTML — likely a specificity clash with the surrounding utility classes. Explicit Tailwind classes on `<h1>` / `<h2>` / `<h3>` / `<ul>` / `<ol>` / `<li>` in the ReactMarkdown `components` prop are doing the actual styling. **The `whitespace-pre-wrap` on the wrapper is intentional** — it preserves single-newline line breaks in paragraph text (matches "what you typed is what you see"). The list and heading components apply `whitespace-normal` to override it, otherwise the `\n` between rendered tags shows as visible blank lines. **If you simplify the components prop OR remove the wrapper's `whitespace-pre-wrap`, test both heading rendering AND paragraph line breaks in preview.**
- **Programming Notes textarea has an onKeyDown handler for Enter-continuation of bullet/numbered lists (S348 post-close).** [components/coach/ProgrammingNotesTab.tsx](components/coach/ProgrammingNotesTab.tsx). On plain Enter (not Shift+Enter), the handler reads the current line, matches `^- ` or `^\d+\. `, and either auto-inserts the next marker on a new line OR exits the list if the current item is empty. Numbered button in the toolbar also auto-increments based on the immediately-preceding line's number (so consecutive button clicks don't all emit `1.`). **If a future caller adds custom keyboard handling to this textarea, preserve the Enter handler** — and Shift+Enter is the documented escape hatch for users who want a manual line break inside a list item.
- **`promoteFromWaitlist` helper now takes optional `bookingId` (S348).** [lib/coach/promoteFromWaitlist.ts](lib/coach/promoteFromWaitlist.ts). Auto-promote callers (`/api/bookings/cancel`, `/api/bookings/toggle-og`) still call with `bookingId=undefined` for FIFO (longest-waiting first). The manual Promote button via new [app/api/coach/promote-waitlist/route.ts](app/api/coach/promote-waitlist/route.ts) (`requireCoach` + service-role) passes the specific id for the row the coach clicked. **If you add another caller that wants FIFO, omit the arg; for a specific row, pass it.** The endpoint validates the booking is in `status='waitlist'` before promoting — no double-fire if the row already moved.
- **Waitlist Promote button is capacity-gated (S348).** [components/coach/SessionManagementModal.tsx](components/coach/SessionManagementModal.tsx) ~line 404. Only renders when `nonOgConfirmed + trials < capacity`. A no_show booking is NOT counted in `confirmed` (its status is `no_show`), so marking someone no-show automatically opens the slot and surfaces the button. **If you ever change capacity-counting semantics (e.g., make no_show count toward capacity), the Promote button visibility will silently change.**
- **`personal_activity_custom_types` uses check-then-insert, not upsert (S348).** [hooks/athlete/usePersonalActivities.ts](hooks/athlete/usePersonalActivities.ts) `ensureCustomType`. The unique index is on `(user_id, LOWER(name))` — an expression-based index. Supabase's `.upsert()` `onConflict` can't target expression indexes, so the helper does an `ilike` SELECT first then INSERT only if no row found. **If you refactor this, keep the case-insensitivity** — `Klettern` and `klettern` must not coexist for the same user.
- **Custom activity types are dropdown entries only — past activities preserve their `activity_type` text (S348).** Deleting a custom type from the modal's chip-row removes the dropdown entry but does NOT touch existing `personal_activities` rows; they keep their text-stored type name. Athletes who want to clean up a typo'd activity also need to edit/delete the individual activity rows on the main list. Tradeoff: history is preserved, "delete" is a two-step operation if the user wants both gone.
- **Personal activities edit-modal detects three cases for `activity_type` (S348).** [components/athlete/personal/PersonalActivityModal.tsx](components/athlete/personal/PersonalActivityModal.tsx). On open with an existing row: if `activity_type` is in `PERSONAL_ACTIVITY_TYPES` → select as preset; if it matches a saved custom type → select directly from the optgroup; else fall back to "Sonstiges" + prefill the custom-name input. The third case happens when (a) a row pre-dates the custom-types table (legacy `activity_type='Klettern'` with no row in `personal_activity_custom_types`), or (b) the athlete deleted the custom type from the dropdown but kept the activity. **The useEffect dependency list MUST include `customTypes`** — otherwise the modal would race against fetch timing on first open.
- **German decimal comma input pattern (S348).** [components/athlete/RepMaxCalculatorModal.tsx](components/athlete/RepMaxCalculatorModal.tsx) (Weight) and [components/athlete/personal/PersonalActivityModal.tsx](components/athlete/personal/PersonalActivityModal.tsx) (Distance). `<input type='text' inputMode='decimal' value={state.replace('.', ',')}>` with onChange normalizing `,` → `.` before storage. Internal state is always period-separated so `parseFloat` works. Regex `^\d*\.?\d*$` rejects letters. **`type='number'` won't show comma in any major browser — don't try.** If you add another decimal field, copy this pattern.
- **Rep-max stepper hold-to-repeat uses pointer events + refs (S348).** [components/athlete/RepMaxCalculatorModal.tsx](components/athlete/RepMaxCalculatorModal.tsx). Initial fire on `onPointerDown`, then 400ms delay before 70ms-interval starts. `onPointerUp` / `onPointerLeave` / `onPointerCancel` + unmount cleanup all clear timers. `touch-none select-none` + `onContextMenu={preventDefault}` suppress iOS long-press callouts. **If you add another stepper, extract `startHold` / `stopHold` into a shared hook** — inlined currently because it's one component, but a second consumer should extract.
- **10-card hard-block is GONE on athlete-side booking (S347).** [app/api/bookings/create/route.ts](app/api/bookings/create/route.ts) line ~150. The `tenCardRemaining <= 0` 402-return was deleted; counter increments past total (no `Math.min` cap at line ~322). **Expired card is still a hard block.** Rationale: a card-full block prevented a mum from booking her kids when the counter had drifted; soft-limit + new "10-Card" Members tab is the safety net. **If you re-introduce a cap anywhere (coach-side booking helper, waitlist promo, etc.), keep them consistent with the API** — `lib/coach/promoteFromWaitlist.ts` + `hooks/coach/useBookingManagement.ts` already do `holderUsed + 1` without cap; matches the new athlete-API behavior.
- **`/auth/impersonate` page bypasses Supabase verify endpoint (S347).** [app/auth/impersonate/page.tsx](app/auth/impersonate/page.tsx) + [scripts/admin-magic-link.ts](scripts/admin-magic-link.ts). Admin `generateLink({type:'magiclink'})` returns a `hashed_token` that we pass directly to the page; the page calls `supabase.auth.verifyOtp({token_hash, type:'magiclink'})` client-side, sets cookies on our domain, and redirects by role. **Why this path:** Supabase's verify endpoint binds redirect_to into the token signature and falls back to Site URL (bare root) regardless of `options.redirectTo`. Our root page auto-signs-out any session that lands there, killing the flow. The hashed-token path side-steps all of it. **Security note:** anyone with the URL signs in as the matching user. Tokens are single-use + ~1h TTL (Supabase default). Don't paste the URL into Slack/notes; treat it like a password. Service role is required to mint one. The page is under `/auth/*` which middleware treats as public — fine because the token itself is the auth.
- **Supabase Redirect URLs: wildcard added (S347).** Auth → URL Configuration → Redirect URLs now includes `https://app.the-forge-functional-fitness.de/**`. Required for magic-link / impersonation; password-recovery flow worked without it (uses a specific `/auth/callback?next=/reset-password` URL that was already in the list). Keep the wildcard — removing it breaks the impersonation flow.
- **Athlete "Manage or Cancel Subscription" button only renders if `stripe_customer_id` is set (S347, baseline).** [components/athlete/AthletePagePaymentTab.tsx:242](components/athlete/AthletePagePaymentTab.tsx#L242). Cash-activated subs (zombies, permanent-comp accounts like Chris + Mimi) have no Stripe customer → button is hidden. Not a bug; they have nothing to cancel via Portal. Stripe-paid athletes see it. Restyled at S347 from subtle text to outlined teal button + relabelled to surface cancel intent.
- **`vercel.json` now exists; adding crons goes there, not a new file (S346).** [vercel.json](vercel.json). One Vercel cron schedule maps to exactly one path; no multiplexing. Each cron route must verify `Authorization: Bearer ${CRON_SECRET}` to reject public-internet calls (Vercel auto-attaches the header on cron-triggered requests). The `CRON_SECRET` env var is Production-only — if you add a second cron and test on Preview/Dev branches, calls will return 401 unless you also set CRON_SECRET there. Currently only one cron: `/api/cron/expire-memberships` at 06:00 UTC daily.
- **`gym_memberships` schema migration is gitignored (S346).** [database/20260510_session346_gym_memberships.sql](database/20260510_session346_gym_memberships.sql). The `*.sql` gitignore rule means schema changes are applied manually via Supabase SQL editor at deploy time. If you change the table shape (new column, constraint tweak), add a fresh `database/YYYYMMDD_*.sql` and tell Chris to apply it before redeploying — TS types in [types/membership.ts](types/membership.ts) need to mirror or the API will throw.

**Two booking-deletion paths still skip wsr/lift_records/reactions cleanup (S344 — fix carried to next session).** [`app/coach/admin/page.tsx:231`](app/coach/admin/page.tsx#L231) `handleDeleteIncident` deletes a no-show / late-cancel booking row directly via browser-side supabase — no wsr/lift_records cleanup AND it'll hit the same RLS-block problem as S344 once you fix that. [`hooks/coach/useWODOperations.ts:534`](hooks/coach/useWODOperations.ts#L534) `handleDeleteSession` deletes a session, FK cascade-deletes the bookings, but wsr/lift_records on those bookings stay because their FK is wod_id, not booking_id. **Neither path deletes `reactions`** either — that's a third gap, applies to ALL deletion paths including the S344 cancel endpoint. Forward fix shape: extract `handleDeleteIncident` to a `requireCoach` + service-role endpoint that mirrors `/api/coach/cancel-member-booking`'s cleanup; add wsr/lift_records cleanup in front of `handleDeleteSession`'s DELETE; add reactions DELETE step to ALL four cleanup paths (`/api/bookings/cancel`, `/api/coach/cancel-member-booking`, the new delete-incident endpoint, and the session-delete flow).

**WODSectionComponent's section-type `<select>` silently falls back to the first option when `section.type` isn't in `section_types` (S344).** [components/coach/WODSectionComponent.tsx](components/coach/WODSectionComponent.tsx) ~line 154. Browser default for `<select value="X">` where X matches no `<option>` is to display the first option but keep React state intact. With `section_types` ordered by `display_order`, that's "Whiteboard Intro" — so any renamed/deleted type displays as Whiteboard Intro in the editor while the underlying JSONB stays correct. **Data is preserved** (saving without touching the dropdown is safe), **but if a coach picks something else thinking they're "fixing" the wrong label, the original is overwritten.** S344 cleaned up the 2 known legacy strings via JSONB migration; if you ever rename a section_type row in DB or delete one referenced by past WODs, this bug will reappear. **Long-term fix would be to inject a fallback `<option value={section.type}>{section.type} (legacy)</option>` when the value isn't found** — deferred. Calendar card, PublishModal preview, and ConfigureLift/Benchmark modals all render `{section.type}` as plain text and are unaffected.

**Capacity calc must exclude is_og AND is_trial bookings, AND include `trial_names.length` (S343 + S351).** [app/api/bookings/create/route.ts](app/api/bookings/create/route.ts), [hooks/coach/useBookingManagement.ts](hooks/coach/useBookingManagement.ts), [components/coach/SessionManagementModal.tsx](components/coach/SessionManagementModal.tsx), [lib/coach/bookingHelpers.ts](lib/coach/bookingHelpers.ts) all filter `status='confirmed' && !is_og && !is_trial` then add `trial_names.length`. **If you add a fifth surface (new booking source, moveTo-session helper, admin reschedule), replicate both filters** — pre-S343 the public API let athletes self-book past cap when trials filled it; S351 added `is_trial` exclusion because trial-linked bookings shadow the trial_names slot they came from and would otherwise double-count. The set-of-counts pattern: confirmed-non-OG-non-trial = real seats taken; trial_names = also seats taken; OG bookings = off-capacity; is_trial bookings = off-capacity (slot already counted via trial_names); waitlist = doesn't count yet.

**Coach `handleAddTrialAthlete` does NOT check capacity (S343, deferred).** [hooks/coach/useBookingManagement.ts](hooks/coach/useBookingManagement.ts) ~line 137: a coach can add a trial name to a class that's already at confirmed cap, pushing it over. Athlete-side self-book is now guarded (S343 fix), but coach-side trial-add is still unguarded. **If Chris reports another 13/12 surfacing without an athlete self-book trail, this is the next thing to harden** — add a `confirmedCount + trialNames.length >= capacity` guard with confirmation prompt, or just block silently with a toast.

**Booking writes that mutate capacity state must run waitlist promotion (S343).** [lib/coach/promoteFromWaitlist.ts](lib/coach/promoteFromWaitlist.ts) is the canonical helper — promotes longest-waiting waitlister, cascades 10-card increment for ten_card payers (own card or shared parent card), fires `notifyWaitlistPromoted`. Currently called by: cancel route + toggle-og route. **If you add a new path that frees a confirmed slot** (e.g. a "convert booking to no-show" flow, a mass-cancel admin tool), call this helper or you'll re-create the S343 stuck-waitlist bug. The helper assumes you've already mutated the freeing booking and only handles the downstream promotion; it does NOT verify the slot is actually free, so the caller must decide *when* to invoke it.

**Subscription-expiry thresholds DIVERGE: banner is 7d, push notification is 14d (S342).** [components/coach/SubscriptionsDueBanner.tsx](components/coach/SubscriptionsDueBanner.tsx) shows rows whose `athlete_subscription_end` or `subscriptions.current_period_end` is within 7 days. Push notification logic in [hooks/coach/useMemberData.ts](hooks/coach/useMemberData.ts) `checkExpiringSubscriptions` (line ~368) and the receiving endpoint [app/api/notifications/subscription-expiring/route.ts](app/api/notifications/subscription-expiring/route.ts) (line ~37 `daysLeft > 14`) still use 14d. **If you change one threshold, decide whether the other should match** — currently they're intentionally different (push at 14d gives early heads-up; banner at 7d is the action-window). The window 8–14d shows no banner but DOES fire a push. If a coach reports "I got a push but the banner was empty", that's expected, not a bug.

**Section JSONB stores benchmark/forge `exercises[]` by snapshot at attach time (S340).** [components/coach/ConfigureBenchmarkModal.tsx](components/coach/ConfigureBenchmarkModal.tsx) / [components/coach/ConfigureForgeBenchmarkModal.tsx](components/coach/ConfigureForgeBenchmarkModal.tsx) copy `master.exercises` into the JSONB the moment a benchmark/forge is dragged into a section — same shape as `name`/`type`/`description`. **If you update a master row's exercises later, old WOD JSONB snapshots stay stale** — same drift class as the rest of the WOD JSONB convention. Re-saving the WOD in the editor would re-pull from master. **If you add another path that writes benchmarks/forge into section JSONB, copy `exercises` too** or planner coverage will silently miss those sections. Save validation in [hooks/coach/useBenchmarksCrud.ts](hooks/coach/useBenchmarksCrud.ts) / [hooks/coach/useForgeBenchmarksCrud.ts](hooks/coach/useForgeBenchmarksCrud.ts) forces non-empty exercises on master-row save — if you bypass that you'll get empty arrays in JSONB and silent coverage misses.

**Coach score-entry has TWO UIs sharing the `useScoreEntry` hook (S339-followup).** [components/coach/score-entry/ScoreEntryModal.tsx](components/coach/score-entry/ScoreEntryModal.tsx) is opened from `/coach` (the modal Chris uses day-to-day). [app/coach/score-entry/[sessionId]/page.tsx](app/coach/score-entry/[sessionId]/page.tsx) is the full-page route. **They share data fetching + save logic via `useScoreEntry`, but render JSX is duplicated.** Any visual change (chip rows, layout, section preview) MUST land in BOTH files. The S339 chip row was only added to the page on first pass; the modal showed nothing — exactly the symptom Chris reported on follow-up. If you find UI divergence between the two, treat it as a bug.

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

**Session 352 (2026-05-15 — Opus 4.7) — KIDS CALENDAR COLOR FIX + GLORIA STOFFER FAMILY→PRIMARY MERGE:**
- **Kids cards rendered as WOD teal-700 since 2026-04-20.** Root cause: [utils/card-utils.ts:44](utils/card-utils.ts#L44) `KIDS_KEYWORDS` matched via strict equality after lowercasing. Around S295 (2026-04-19/20), Chris + Mimi edited `workout_titles` to add age suffixes — "Kids & Teens 6-9", "FitKids Turnen 4-6", etc. — and none of those exact-match the 5 base keywords. Foundations was already robust because its branch used `lower === k || lower.startsWith(k)`. Fix: same `startsWith` pattern for kids. One-line change, commit `32f50d1`.
- **Gloria Stoffer family→primary profile merge.** She had a family-member row under Torben Stoffer (`cee4213e-9ebc-4439-a2c6-894dbed61186`) and registered her own standalone profile (`551e4612-a2a8-431f-8862-936f13205631`). 3-statement SQL transaction in Supabase: UPDATE `bookings.member_id` (old→new), UPDATE `wod_section_results.member_id` (old→new), DELETE old members row. Atomic; preserves original `bookings.created_at` and all score history. S351 trigger auto-resynced the new profile's 10-card counter via the member_id UPDATE.
- **Pre-flight duplicate check returned a false positive.** `GROUP BY session_id HAVING COUNT(*) > 1` flagged the 2026-05-14 10:00 session as a duplicate. Inspection revealed both rows were already on the NEW profile — a `coach_cancelled` row at 10:19 followed by a fresh `confirmed` row at 19:31. Normal cancel-and-rebook, not a cross-profile collision. The check is worth keeping in future merge SOPs but the row-inspection follow-up is mandatory before deleting anything.
- **Tables NOT migrated for Gloria (zero rows expected for family-member profiles):** `lift_records`, `benchmark_results`, `athlete_achievements`, `reactions` — all keyed off `auth.users.id`, and family-member profiles typically have no auth user. Verified before running the merge.
- **No new landmines introduced.** Both fixes are operational; no architectural changes; no schema migrations; no new RPCs or endpoints.

**Session 351 (2026-05-15 — Opus 4.7) — TRIAL-TO-MEMBER LINKING + PATH B DRIFT-PROOF 10-CARD TRACKING:**
- **Trial-to-member linking.** New `bookings.is_trial` + `linked_trial_name` columns; new [app/api/coach/link-trial-to-member/route.ts](app/api/coach/link-trial-to-member/route.ts) (`requireCoach` + service-role); UI in [components/coach/SessionManagementModal.tsx](components/coach/SessionManagementModal.tsx) renders a link icon on each trial chip → inline member-picker → creates a confirmed booking with `is_trial=true` + `linked_trial_name=<chip text>`. **`weekly_sessions.trial_names` is preserved** as Chris's historical record of every trial ever held — the linking adds a parallel attendance row without erasing the trial chip. Trial chip then shows a green `linked` badge; the linked booking row shows an amber `Trial` badge. Capacity calcs everywhere now exclude `is_trial` bookings (they shadow the trial_names slot).
- **+1 drift investigation (pre-S351 cause).** 11 of 29 ten-card holders drifting (38%). Patterns: legacy renewal carryover (Silvia +7, Hannah +6, Cleo +6 — counter wasn't reset when purchase_date moved forward), cancellation outside grace (Frieda et al, +2-3), missed-bump (Daniel et al, −1). Ran bulk reconcile to set everyone to current Recalc truth as Path B baseline.
- **Path B: trigger-based drift-proof tracking.** New `bookings.ten_card_consumed BOOLEAN` is the source of truth; DB trigger `bookings_ten_card_recompute` auto-syncs `members.ten_card_sessions_used` on any INSERT/UPDATE/DELETE. **Direct row deletions in Supabase Table Editor now adjust the counter automatically** — closes the S344-deferred bug class for 10-card hygiene (the wsr/lift_records cleanup gap is still separate). All four write paths refactored: `app/api/bookings/create`, `app/api/bookings/cancel`, `app/api/coach/cancel-member-booking`, `lib/coach/promoteFromWaitlist` — they set the boolean; the trigger handles the counter. Recalc button now reads `ten_card_consumed`, kept as manual force-sync.
- **Trigger bails when `purchase_date IS NULL`** — ~10 holders missing dates today; they're on legacy manual-counter regime until Chris enters dates (~2 days from real paper cards). Once set + Recalc, they join the auto-tracking system.
- **Diagnostic + reconcile tooling:** [scripts/probe-ten-card-drift.ts](scripts/probe-ten-card-drift.ts) (per-member detail + `--all` gym-wide scan), [scripts/reconcile-ten-card-counters.ts](scripts/reconcile-ten-card-counters.ts) (`--dry-run` / `--apply` bulk Recalc). Both keep working post-S351; reconcile becomes redundant for purchase-dated holders but still useful for ones without dates.

**Session 350 (2026-05-14 — Opus 4.7) — TEN-CARD / SUBSCRIPTION CLOSE-AND-RENEW LIFECYCLE + COACH-SIDE WARNING BADGES + CHIP TZ FIX:**
- **Full close-and-renew lifecycle for both payment systems.** Two new archive tables (`ten_card_archive`, `subscription_archive`) preserve closed-card/closed-sub history. Two new endpoints ([app/api/coach/close-ten-card/route.ts](app/api/coach/close-ten-card/route.ts), [app/api/coach/close-subscription/route.ts](app/api/coach/close-subscription/route.ts)) snapshot the active state + reset to a fresh one in one server-side transaction (`requireCoach` + service-role per the S344 rule).
- **Deferred-save UX pattern.** Clicking "Close & Issue New" (or "Close & Renew") sets `pendingClose` / `pendingSubClose`, projects the new values into the form fields for preview, and shows an amber "Close pending" banner with a Revert button. Save commits via the API; closing the modal or clicking Revert aborts cleanly. Caught a critical bug on first test where the API fired immediately on confirm — fix was to defer to Save like the rest of the modal already did.
- **Editable start dates.** API accepts `newPurchaseDate` / `newStartDate` / `newEndDate` etc., defaulting to today / today+12mo (cards) or today+1y (subs). Form fields are editable in pending mode so coach can defer the new card to tomorrow (Aline scenario: today's session is the last on the old card; new card shouldn't pick it up).
- **Notes — three new TEXT columns.** `members.ten_card_notes`, `members.subscription_notes`, plus the existing `ten_card_archive.notes` (already in schema) and new `subscription_archive.notes`. Active-card notes editable in modal, persist with Save. On Close & Issue New / Close & Renew, the OLD notes carry into the archive row's `notes`, NEW notes start blank. Archived notes are also editable inline — expand the closed-card/sub row, click Edit / Add note, save via PATCH endpoint. Empty save = delete.
- **Card History + Subscription History sections.** Collapsed rows showing `DD.MM.YY — DD.MM.YY · N/total` (cards) or `start — end · status (tier)` (subs). Click to expand → frozen bookings snapshot (cards) or notes-only (subs). Notes editable inline.
- **Coach-side 10-card warning badges on Session Management modal.** [components/coach/BookingListItem.tsx](components/coach/BookingListItem.tsx) + [hooks/coach/useSessionDetails.ts](hooks/coach/useSessionDetails.ts) `tenCardRemaining`. Four tiers: red `⚠ Over by N` / red `⚠ Card full` / red `⚠ 1 left` / amber `2 left`. Fires on confirmed AND waitlist rows. Attribution rule: badge fires only if session date >= active card's `purchase_date` — bookings before that fall on a previous (archived) card and don't show the badge. Tried an archive-fallback attribution; rolled it back because the archive only stores the frozen final count (10/10) and labeling 10 past sessions as "Card full" was misleading. Shared-card kids inherit the holder's remaining count.
- **Chip past/upcoming TZ fix.** [hooks/coach/useMemberData.ts](hooks/coach/useMemberData.ts) — past/upcoming split now uses `sessionStartInstant(date, time)` (Berlin TZ-safe) compared against `Date.now()` instead of date-only string comparison vs `new Date().toISOString().split('T')[0]`. A session today at 10:00 is correctly classified as "past" at 10:01 instead of staying "upcoming" until midnight. Closes the original Aline chip 9+1/10 bug from her last session this morning.
- **SQL applied manually** (per gitignore-on-SQL convention): `database/20260514_session350_ten_card_archive.sql`, `database/20260514_session350_subscription_archive.sql`, plus `ALTER TABLE members ADD COLUMN ten_card_notes/subscription_notes`, plus RLS SELECT policies for coaches on both archive tables.

**Session 349 (2026-05-13 — Opus 4.7) — 10-CARD CHIP FIX + POSTGREST 1000-ROW CAP AUDIT + SCALING PLAYBOOK:**
- **The visible bug.** Max & Ole Labudda's 10-card chip on Members page rendered `9/10 ⚠` (counter says 9, but past+upcoming attribution said 6). Two root causes stacked:
  1. **PostgREST 1000-row cap.** [hooks/coach/useMemberData.ts](hooks/coach/useMemberData.ts) fetched ALL active bookings system-wide (2,019 total) with no member-side filter. Supabase silently truncates at 1,000. The most-recent bookings — exactly the ones the chip needed — were pruned. Fixed by filtering `.in('member_id', [holders + sharers])`.
  2. **`ten_card_purchase_date` string-compare bug.** Column comes back as `'2026-04-20T00:00:00+00:00'`, but `weekly_sessions.date` is `'2026-04-20'`. In JS `'2026-04-20' < '2026-04-20T...'` is TRUE (prefix-shorter wins lexicographically), dropping the boundary-date booking. Fixed by `.split('T')[0]` before storing in the lookup Map.
- **Audit + preventive fixes.** Found four more queries with the same unbounded shape; all paginated:
  - [hooks/coach/useMovementTracking.ts](hooks/coach/useMovementTracking.ts) `computeGlobal` (almost certainly already truncating — stale Movement Tracking dots in production)
  - [hooks/coach/useCoachData.ts](hooks/coach/useCoachData.ts) `fetchTracksAndCounts` (search-panel count badges undercounting silently)
  - [app/coach/analysis/page.tsx](app/coach/analysis/page.tsx) `fetchMonthlyWODs` (defensive — would exceed 1000 at 1-year+ timeframes)
  - [app/coach/admin/page.tsx](app/coach/admin/page.tsx) `fetchIncidentStats` (would hit cap in 12-24 months)
- **Workout search safety patch.** [useCoachData.ts:searchWODs](hooks/coach/useCoachData.ts) — bumped hard limit 500 → 2000 (separate from the 1000-row cap; this is an intentional `.limit()`). Added `[search-limit-tripwire]` console.warn at ≥90% so we'll see it before older WODs start disappearing from unfiltered searches.
- **Durable references.**
  - **Hard rule promoted to [memory-bank/claude-rules.md](memory-bank/claude-rules.md):** "Never `.from(growing_table).select()` without a narrowing filter or pagination" with full checklist (decision tree, growing tables list, paginate-vs-SQL-aggregation guidance).
  - **NEW [memory-bank/database-and-growth.md](memory-bank/database-and-growth.md)** — Chris-readable + Claude-readable playbook. Covers the kitchen/dining-room analogy, S349 snapshot, decision tree, 4 search-UX options for when the tripwire fires (A: no cap; B: Load more; C: require filter; D: default date window), and a 7-category map of other scaling traps (missing indexes, N+1 queries, bundle size, image storage, cron drift, push deliverability, Stripe webhook race conditions).
- **Process notes:**
  - The S347 "chip 7+2 split for family-member kids" carry-over was based on a misdiagnosis. Max & Ole have `primary_payment_method='ten_card'` (not the assumed multi-types scenario). Real bugs were the two above; the carry-over is retired.
  - Wrote and used `scripts/probe-max-ole.ts` (now deleted) to compare service-role count (8 past + 1 upcoming = 9) against the browser hook's result (6 past + 0 upcoming = 6), making the truncation visible.
  - Three intermediate edits applied to `useMemberData.ts` before landing on the right fix; semantic refinements rolled back when the actual root cause turned out to be the row cap, not the filter shape.
- **Post-close docs reorg.** Chris asked for the filing system to be more navigable so he could find docs without re-asking. Three changes shipped:
  - **`memory-bank/` filename cleanup.** Renamed `memory-bank-activeContext.md` → `activeContext.md`, same for `techContext` and `systemPatterns`. Brings reality in line with what `CLAUDE.md` already referenced. Updated live references in workflow checklists, Chris Notes workflow docs, and the Forge login-recovery runbook. Project-history files left as-is (historical records).
  - **Scaling doc renamed.** `scaling-and-foundations.md` → `database-and-growth.md` because "Foundations" (class type) and "Scaling" (workout movement scaling) are both daily-use gym terms — the old name was confusing Chris.
  - **Project root cleaned.** 19 stale `.md` files moved to `Chris Notes/Archive/historical root docs/` (HANDOFF-*, PLAN.md, NEXT-SESSION-START-HERE.md, grok-tasks-*, EXERCISE_REFERENCE.md, etc.). Root is now 4 files: `README.md`, `CLAUDE.md`, `LICENSE`, new `WHERE-IS-EVERYTHING.md` (navigation map answering "I want to find X, where do I look?").
  - **Second hard rule in `claude-rules.md`:** documentation filing discipline — root for the 4 essentials only, decision tree for where new docs go by audience + lifetime, archival pattern, navigation map must be updated in the same commit as any rename.

**Session 348 (2026-05-12 — Opus 4.7) — MANUAL WAITLIST PROMOTE + REP-MAX MOBILE UX + PERSONAL ACTIVITIES UPGRADE:**
- **Manual waitlist promotion.** Coach can now promote a waitlister directly when a no-show frees a slot (no more bumping capacity to 11). New endpoint [app/api/coach/promote-waitlist/route.ts](app/api/coach/promote-waitlist/route.ts) (`requireCoach` + service-role) wraps the existing [lib/coach/promoteFromWaitlist.ts](lib/coach/promoteFromWaitlist.ts) helper — extended to accept optional `bookingId` (undefined = FIFO; set = specific row). Green Promote button on waitlist rows in [components/coach/SessionManagementModal.tsx](components/coach/SessionManagementModal.tsx), capacity-gated.
- **Rep-max calculator mobile.** [components/athlete/RepMaxCalculatorModal.tsx](components/athlete/RepMaxCalculatorModal.tsx) — three commits: (1) inline +/- stepper buttons (native browser spinners don't render on mobile); (2) width tuning so 3-digit / `70,5` fit + hold-to-repeat via pointer events (400ms delay, 70ms interval); (3) German decimal comma display (`type='text'` + `inputMode='decimal'`, internal state period-separated for `parseFloat`).
- **Personal activities (Logbook → Personal).** Four commits + two SQL migrations:
  - Distance (km) field added next to Duration (min). Migration [database/20260512_session348_personal_activity_distance.sql](database/20260512_session348_personal_activity_distance.sql) adds `distance_km NUMERIC(6,2)`.
  - "Sonstiges" picker now reveals a "Custom activity" text input — saves the name as the row's `activity_type` (column is TEXT per S332).
  - Preset list expanded: Inlinern, Gehen, Klettern. Alphabetised. Default = `'Laufen'` literal (was `PERSONAL_ACTIVITY_TYPES[0]`, which alpha-sort changed to "Anderes Studio").
  - Sonstiges option rendered as `+ Sonstiges (eigene)` in teal italic for cross-platform visual distinction.
  - **Custom names persist per-athlete.** Migration [database/20260512_session348_personal_activity_custom_types.sql](database/20260512_session348_personal_activity_custom_types.sql) — new table, case-insensitive unique index, RLS. Auto-insert on activity save, render via `<optgroup>` next time. Delete via X chip below the dropdown. Past activities preserve their text-stored type.
- **Earlier carry from same calendar-day:** `e9436b86 fix(session-348): TenCardModal recalc + bookings list walk shared-card debiters` (committed before this chat).
- **Coached Claudia (Stripe zombie) through the reactivation flow.** Impersonation diagnostic confirmed her Payment tab buttons render correctly; the issue was UX (she only clicked "Manage or Cancel Subscription" instead of scrolling to the subscribe section). New script [scripts/probe-member-subscription.ts](scripts/probe-member-subscription.ts) for inspecting any member's subscription state going forward.
- **Post-close additions:**
  - **Athlete Guide rewrite ([Chris Notes/Forge app documentation/Forge-Athlete-Guide.md](Chris%20Notes/Forge%20app%20documentation/Forge-Athlete-Guide.md))** — reframed as coach-driven ("your coach logs your results for you"), not athlete-led. Pricing corrected to current €8/€10 tier split, personal activity log added, family-shared 10-card surfaced, waitlist promotion push noted. Two project memories saved: coach-driven score entry is canonical, movement demos are coach-side-only by Chris's pedagogical choice.
  - **Movement extractor lift-link fix (closes S330 landmine).** Added `fetchLiftExerciseMap` in [utils/movement-analytics.ts](utils/movement-analytics.ts) that joins `barbell_lifts.exercise_id` → `exercises.display_name`. Threaded through 4 extractor call sites. Strict OHP was the trigger ("Strict Overhead Shoulder Press" in the Lifts catalogue, linked to display_name "Strict OH Press" — name-matching couldn't bridge them, so Movement Tracking showed stale 01.04 instead of Week 19). First attempt emitted `exercises.name` (slug-style for this row); follow-up corrected to `display_name || name`.
  - **Programming Notes ("My Notes" Coach Toolkit) formatting overhaul.** [components/coach/ProgrammingNotesTab.tsx](components/coach/ProgrammingNotesTab.tsx). Heading/list rendering wasn't reaching `<h1>` / `<ul>` / `<ol>` in preview (prose specificity clash with surrounding utilities). Fixed via explicit `components` overrides in ReactMarkdown with Tailwind classes. Added `whitespace-normal` on those elements to neutralize the wrapper's `whitespace-pre-wrap` (which is correct for paragraphs but caused blank lines inside lists/headings). Toolbar H1/H2/H3 buttons converted from indistinguishable Type icons to text labels. Enter auto-continues bullet/numbered lists (empty Enter exits the list). Numbered button increments from the previous line's number.

**Older sessions (57-347):** See `project-history/` folder.

---

## 🚨 Known Open Issues

- **Mac Chrome hang (recurring, system-level)** — Chris's Macbook: after working a while, apps bounce in dock but won't launch ("Google Chrome is not responding"). Only full Mac restart fixes it. Happens increasingly often. Directly affects Forge pushes: Chrome in half-dead state = stuck GCM "Connecting", so Mac push never arrives. Not a Forge code issue; dedicated session needed. Diagnostic starting points: Activity Monitor Memory Pressure, disk free %, Chrome Helper memory leaks, `~/Library/Logs/DiagnosticReports/` for spindumps. (Session 292.)
- **Mac push delivery (downstream of above)** — Mac never receives FCM pushes even with clean DB subs + healthy SW. `chrome://gcm-internals/` shows Connection State "Connecting". Will auto-resolve once the Chrome-hang root cause is fixed. Android push unaffected.
- **Test endpoint doesn't cleanup 410s** — `app/api/notifications/test/route.ts` bypasses `sendToSubscription` helper so expired subs aren't auto-deleted when you click Send Test. Low priority — production flows still clean up 410s. (Session 292.)
- **iPhone search bug (latent)** — same `readOnly` anti-autofill hack exists in `components/coach/SearchPanel.tsx:946` (Analysis page search). Deferred Session 282.
- **Workout search 2000-row limit (S349)** — `useCoachData.ts:searchWODs` caps results at 2000 (bumped from 500 in S349). A `[search-limit-tripwire]` console.warn fires at 90% of the limit so we'll see it before older WODs start disappearing from unfiltered searches. When the tripwire fires: see `memory-bank/database-and-growth.md` for the four UX options (A/B/C/D) and pick one.

**Pre-deployment:** All CRITICAL/HIGH/MEDIUM items done. LOW items (28 files >500 lines) deferred per Session 260.

**Exercise naming conventions (Session 149):**
- "Lunge Walking" (not "Walking Lunge")
- "Jump Rope Double-Unders (DUs)"
- KB Swing default = American (AKBS)
- Generic "Row" in benchmarks = C2 Rower

---

## 📋 Next Immediate Steps

0. **S351 paper-card sync (~2 days from now).** Enter `purchase_date` for the ~10 holders missing it; click Recalc + Save once each. From that moment on, trigger maintains their counter automatically. Until done, those holders are on legacy manual-counter regime.
0b. **S351 production verification.** After Vercel deploys the code: open `/coach/members` → confirm chips unchanged from pre-deploy. Run `npx tsx scripts/probe-ten-card-drift.ts --all` again to confirm 0 drifters (or all drifters are holders without purchase_date — expected). Test the linkage flow on a real new trial that becomes a member.
0c. **S346 gym memberships live-test on prod.** Add → Edit → Delete a contract; verify daily cron expired any rows past `end_date` at 06:00 UTC.
0d. **Recalc 10-card counter for Nico Enzmann (S345 carry).** TenCardModal → Recalc → Save. Kim Salzgeber's was resolved via S351 trial-link.
0e. **S344 deletion-paths forward fix.** Two paths still skip wsr/lift_records/reactions cleanup: (1) `handleDeleteIncident` in [app/coach/admin/page.tsx:231](app/coach/admin/page.tsx#L231), (2) `handleDeleteSession` in [hooks/coach/useWODOperations.ts:534](hooks/coach/useWODOperations.ts#L534). Plus reactions DELETE missing from all 4 cleanup paths. Build `/api/coach/delete-incident` mirroring S344's `/api/coach/cancel-member-booking` shape; add reactions cleanup to all 4. Re-run `npx tsx scripts/sweep-deletion-orphans.ts` post-ship (should still show 0).
0d. **Verify Subscriptions Due banner once Nikolina/Lisa enter 7d window (S342).** Cash-managed rows; renew buttons should call `/api/members/athlete-subscription` and shift end_date to now+30d.
0e. **Verify RM-test distinction on deploy (S341).** Toggle `[ All | RM Testing only ]` on the planner.
1. **Verify the AKBS Deadlift leaderboard fix on the production deploy (S338).** Open the WOD's leaderboard for "WOD Pt.3" — Chris (47/20) should rank above Madeleine (48/12). Spot-check Back Squat Testing, BFS 5x5, and Strict Movements/KBOHC.
1b. **Finish retroactive 10-card bookings for the 8 remaining athletes (S336 carry).** Run `npx tsx scripts/probe-unbooked-whiteboard-athletes.ts` for the per-athlete date list. Manually book each via the Session Management modal — counter increments correctly when status lands as `confirmed`. After each athlete, glance at the chip — ⚠ glyph means a mismatch with `ten_card_sessions_used`; open TenCardModal → Recalc → Save to clear (or leave as a documented override per Rosita's case).
1c. **Re-evaluate booking-window countdown thresholds (S335)** — currently amber under 2h, red under 30m on Book a Class cards. If athletes report the warning fires too early/late after a few days of real use, tune the breakpoints in [app/member/book/page.tsx](app/member/book/page.tsx) `renderBookingCountdown`.
1d. **Re-evaluate Statistics chip dimming thresholds after 1–2 weeks of use** — currently 10%/30% of max count in [components/coach/analysis/StatisticsSection.tsx](components/coach/analysis/StatisticsSection.tsx). If categories with one dominant exercise (e.g. Back Squat in Olympic Lifting) end up with most chips dimmed and the very-low tier loses signal, bump to 20%/50% or switch to quantile-based ranking.
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
- **Tech details:** `memory-bank/techContext.md`
- **Code patterns:** `memory-bank/systemPatterns.md`
- **Deployment plan:** `Chris Notes/Deployment/deployment-plan.md`
- **Orphan diagnostics:** `Chris Notes/Database & Supabase/supabase-orphan-check-queries.md`
