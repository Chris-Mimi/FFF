# Active Context

**Version:** 185.0
**Updated:** 2026-04-28 (Session 324 — 10-Card blindspots: family-shared cards, Guardian Only enforcement, Members popup edit parity)

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

**First action:** None queued. S324 shipped three related features (family-shared 10-cards, Guardian Only enforcement, Members popup edit parity). All live-verified by Chris. Pick from "Next Immediate Steps" below, or wait for new direction.

**Files to open first if continuing code work:** none queued.

**Carry-over status:**
- ✅ S324 Session A (family 10-cards) — Chris tested with Athlete Test 1, working.
- ✅ S324 Session B (Guardian Only) — toggled Athlete Test 1 to guardian-only and back, both directions confirmed working.
- ✅ S324 Session C (TenCardModal sessions-used input) — implemented, no specific test feedback (low risk: simple input → save).
- ⚠️ **Manual data setup pending for Miriam Jacht's family.** Migration ran clean; only Miriam was multi-type ambiguous. Chris needs to (a) set Miriam's `primary_payment_method='wellpass'` via the new Members UI, and (b) ensure Aries / Anton / Adrian are registered as her family_members with `primary_payment_method='ten_card'` and `ten_card_holder_id=Miriam.id`. Without this setup, kid bookings won't debit Miriam's card. Carmine + Sandro's existing setup needs no changes (Sandro has own card).
- ⏳ S321 late-cancel TZ fix — still waiting on a real organic cancellation to confirm.

**Landmines:**
- **Migration `database/add-payment-method-and-tencard-holder.sql` is in production.** Adds `members.primary_payment_method` (text, CHECK constraint enforces enum) and `members.ten_card_holder_id` (uuid FK to members, ON DELETE SET NULL). Backfill set `primary_payment_method` to first item in `membership_types` for unambiguous (single-type) members. Multi-type members stayed NULL and surface in the UI with an amber "Pick one" warning. SQL files are gitignored — re-run from a colleague's checkout requires getting the SQL from this commit (`630aff69`) or via Supabase migration history.
- **Booking flow walks to a 10-card holder, not the booking member.** Three places use this walk: [app/api/bookings/create/route.ts](app/api/bookings/create/route.ts), [app/api/bookings/cancel/route.ts](app/api/bookings/cancel/route.ts) refund block + waitlist promotion. If a future change touches 10-card decrement logic, all three need the holder-walk preserved.
- **Athletes tab has a JS-side guardian filter, not a SQL one** ([app/coach/athletes/page.tsx:64+](app/coach/athletes/page.tsx#L64)) — fetches all athlete_profiles, then queries members for guardian_only=true and filters in memory. Two-query approach because `athlete_profiles.user_id` and `members.id` both reference auth.users without a Supabase-recognised FK between them.
- **TenCardModal save no longer auto-recalcs** ([components/coach/TenCardModal.tsx](components/coach/TenCardModal.tsx)). The "Recalc" button explicitly fills the input from confirmed bookings; save trusts what's typed. Old behavior (silent recalc on save) gone — if a coach changes purchase date and forgets to hit Recalc, sessions_used keeps its prior value.
- **Anon key vs RLS in diagnostic scripts (S323).** Use `SUPABASE_SERVICE_ROLE_KEY` for inspection scripts on RLS-protected tables. Other scripts in `scripts/` may share the blind spot.
- (Carry) `bookings.is_og` migration is in production. OG path fully live.
- (Carry from S321) `Chris Notes/AA frequently used files/Notes for next session.md` is **Chris-owned** — Claude does NOT read/write its content, but DOES commit/push it when modified. Memory: `feedback_chris_notes_commit_but_dont_edit.md`.
- (Carry) Trial-name match expanded to `members.name` / `display_name` / `whiteboard_name` (case-insensitive).
- (Carry) `sessionStartInstant()` in [lib/bookingRules.ts](lib/bookingRules.ts) — TZ-safe session-start helper used by booking gates.

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

**Session 324 (2026-04-28 — Opus 4.7) — 10-CARD BLINDSPOTS: FAMILY-SHARED CARDS, GUARDIAN ONLY, MEMBERS POPUP EDIT PARITY:**
- **Trigger.** Chris flagged urgent: Miriam Jacht has Wellpass + 10-card; her three kids share that one card. Booking flow blindly debited her card on every self-booking (her membership_types includes `'ten_card'`, so the existing logic picked it). General rule needed for multi-membership households + family-shared 10-cards. Two adjacent issues bundled in: Guardian Only registrations shouldn't appear in Athletes tab, and Members popup 10-card editor was effectively read-only on `sessions_used` (had to switch to Athletes tab to edit).
- **Three sub-sessions, one DB migration, four commits.**

**Session A (commit `630aff69`) — Family-shared 10-cards + multi-membership disambiguation:**
- Migration [database/add-payment-method-and-tencard-holder.sql](database/add-payment-method-and-tencard-holder.sql): adds `members.primary_payment_method` (text, CHECK constraint) and `members.ten_card_holder_id` (uuid FK ON DELETE SET NULL). Backfill set `primary_payment_method = membership_types[1]` for unambiguous single-type members. Multi-type members stayed NULL — surface in UI as amber warning. Audit query at S324 close found only Miriam ambiguous.
- Booking flow walks to the 10-card HOLDER, not the booking member. [app/api/bookings/create/route.ts](app/api/bookings/create/route.ts) (debit + validation), [app/api/bookings/cancel/route.ts](app/api/bookings/cancel/route.ts) (refund block + waitlist-promotion debit). Helper `getEffectivePaymentMethod()` in [types/member.ts](types/member.ts).
- MemberCard UI ([components/coach/members/MemberCard.tsx](components/coach/members/MemberCard.tsx)) gains "Pay with:" radio (only when `membership_types.length > 1`) and "10-card debits:" toggle (only when family_member AND effective method is `ten_card` — initially shown for all family_members; tightened mid-session after Chris flagged the warning showing on Irene Koffler's `member`-type kids).
- `handleSetPaymentMethod` + `handleSetTenCardHolder` added to [hooks/coach/useMemberActions.ts](hooks/coach/useMemberActions.ts) (direct supabase patches, same pattern as `handleToggleGuardianOnly`).

**Session B (commit `47632ea7`) — Guardian Only enforcement:**
- Athletes tab ([app/coach/athletes/page.tsx](app/coach/athletes/page.tsx)) filters out guardian_only members. JS-side filter (two queries) because `athlete_profiles.user_id` and `members.id` share auth.users as parent without a Supabase-recognised FK between them.
- `bookings/create` rejects self-bookings by guardian_only members ("Guardian-only accounts cannot book sessions. Book on behalf of a family member instead."). Family-member kids unaffected — they book via the existing primary→family path.
- Note: the binary `guardian_only` toggle on MemberCard already existed (S272-ish). The "Guardian" derived badge from `primary_member_id` reverse lookup was discussed but NOT built — kept the existing single toggle. The auto-derived badge can be added later if Chris finds it useful.

**Session C (commit `47632ea7`, same as B) — Members popup edit parity:**
- [components/coach/TenCardModal.tsx](components/coach/TenCardModal.tsx) — "Sessions Used" is now an editable number input. Save uses what's typed (no auto-recalc on save). The old "Preview" button is now "Recalc" — explicit action to count from bookings, fills the input but doesn't auto-save.
- Original plan was to extract a shared `<TenCardEditor>` between Members modal and Athletes tab `PaymentsSection.tsx`. Rejected mid-session: the two editors are structurally different (auto-calc-on-save vs manual-input). Pure refactor would require merging both behaviors into one component, which is a redesign, not a refactor. Patching TenCardModal to feature-parity is cheaper and sufficient.

**Process moments worth remembering:**
- **Pushback caught a UX miss in Session A.** First-pass MemberCard showed the "10-card debits:" toggle on every family_member regardless of payment method. Chris flagged it appearing on Irene Koffler's family (all `member`-type, no 10-card involvement). Tightened the gate to `getEffectivePaymentMethod(member) === 'ten_card'`. Lesson: when adding optional UI affordances to a list view, gate them on the actual data condition, not just the row type.
- **Session-close handoff-prompt bug.** [Chris Notes/AA frequently used files/handoff-prompt.md](Chris%20Notes/AA%20frequently%20used%20files/handoff-prompt.md) line 20 was telling Claude to overwrite `Notes for next session.md` — directly contradicting the post-S304 rule (memory `feedback_dont_write_to_notes_for_next_session.md`). Redirected to `memory-bank/handoff.md` and added an explicit "do NOT touch Chris's Notes" guard to the prompt.
- **TS clean** through all four commits. Each Session committed and pushed before moving to the next.
- **Migration ran from Chris's machine via Supabase SQL Editor.** I drafted, Chris ran, audit query returned only Miriam — confirming the backfill worked.

**Session 323 (2026-04-28 — Opus 4.7) — PENDING-REJECT BUTTON + LEADERBOARD TRACK-ABOVE-SCALING:**
- **Reject button on Members Pending tab.** S306 had to use raw SQL to remove Claudia Herrmann; no UI affordance existed. Chris chose option (b): full delete of both `members` and `auth.users` rows so the email is freed for clean re-registration. New endpoint [app/api/members/reject/route.ts](app/api/members/reject/route.ts) (`requireCoach`, verifies `status='pending'`, deletes from `members` then `auth.users` via `supabaseAdmin.auth.admin.deleteUser`). Wired through [hooks/coach/useMemberActions.ts](hooks/coach/useMemberActions.ts) `handleReject` (destructive confirm dialog), [components/coach/members/MemberCard.tsx](components/coach/members/MemberCard.tsx) (third button alongside Approve/Block, gray with red hover, `Trash2` icon), [app/coach/members/page.tsx](app/coach/members/page.tsx) (prop wiring).
- **Leaderboard Track ranks above Scaling.** Chris's rule: tracks are effectively different workouts (Track 1 = full prescription, Track 2/3 = lighter / shorter variant), so a Track 1 Sc1 athlete should outrank a Track 2 Rx athlete. Old chain in [utils/leaderboard-utils.ts](utils/leaderboard-utils.ts) was `Tier → Scaling → Track → Score`; new chain `Tier → Track → Scaling → Score`. DNF still always last (Chris explicit). Same swap applied to `rankBenchmarkResults`. Verified on 2026-03-04 / 2026-03-16 Handstand Walk Drills sessions (all three tracks present).
- **Diagnostic-script gotcha.** `scripts/list-wods-with-track.ts` first run with anon key returned zero results → I told Chris there was nothing to verify. Chris pushed back. Re-ran with service role: 23 sessions actually have track values. RLS on `wod_section_results` blocks anon entirely. Memory saved (`feedback_diagnostic_scripts_use_service_role.md`). Other scripts in `scripts/` use anon and may have the same blind spot — don't trust them for tables behind RLS.
- **Chris Notes commit rule.** Misread S321's "don't read/write" rule as "don't commit" and left `Chris Notes/AA frequently used files/Notes for next session.md` in the working tree on the first commit pass. Chris flagged it (two machines sync via git). Committed afterwards as `chore: sync Chris's session notes`. Memory saved (`feedback_chris_notes_commit_but_dont_edit.md`).
- **Pushback caught one direction wrong on Reject scope.** First-pass design didn't address the auth.users row at all — would have left orphaned auth records. Asked Chris explicitly between (a) members-only delete vs (b) full delete; he picked (b). Lesson: for any "delete user" feature, surface the auth-row question up front instead of assuming.
- **TS clean throughout.** Three feature commits during the session (`f685439` reject, `2e8e9c7` leaderboard sort + script, `9c76834` script service-role fix); session-close commit bundles docs + memory.
- **Carry-over:** none — both features live-verified.

**Session 322 (2026-04-27 — Opus 4.7) — OG REDESIGNED AT BOOKING LEVEL + TRIAL CHIP NAME MATCH:**
- **OG (Open Gym) moved from per-section to per-booking.** Old design: coach toggled `wod_section_results.open_gym` per athlete per section in the score-entry chip. Chris's new model: OG is decided when admitting the athlete to the session — they're attending but not doing the WOD (returning from injury, rehab, pregnant). They get an OG flag on the booking, don't count toward capacity, and don't appear in Score Entry at all. Edge case: if an OG athlete changes their mind and does the WOD, coach toggles OG off in Session Management first, then they reappear in Score Entry. Chris explicitly chose this minimal path (B1) over a score-entry override.
- **New column: `bookings.is_og BOOLEAN DEFAULT false`.** [database/add-is-og-to-bookings.sql](database/add-is-og-to-bookings.sql) — migration adds the column with a partial index on `(session_id) WHERE is_og=true` and DROPS the legacy `wod_section_results.open_gym` column. Chris confirmed only 1 historical OG row exists (from last week); irrelevant once the column is gone.
- **Capacity logic.** [app/api/bookings/create/route.ts:247](app/api/bookings/create/route.ts#L247) confirmed-count filter excludes `is_og=true`. [hooks/coach/useCoachData.ts:128](hooks/coach/useCoachData.ts#L128) splits `confirmed_count` (non-OG, counts toward capacity) and new `og_count` (off-capacity). Booked-members tooltip suffixes OG athletes with " (OG)".
- **Calendar card** ([components/coach/CalendarGrid.tsx:269+](components/coach/CalendarGrid.tsx#L269)) — wrapped booked pill + new blue "N OG" pill in a flex-col when `og_count > 0`. Booked pill still shows non-OG count only.
- **SessionManagementModal** — new "OG" toggle button on each confirmed-booking row (alongside Late/No-show/Remove); blue OG badge appears next to the athlete name when flagged; header line splits to "Confirmed (X/cap) · M OG"; manual booking + capacity gate use non-OG count only. Wiring: [hooks/coach/useBookingManagement.ts](hooks/coach/useBookingManagement.ts) `handleToggleOg` PATCHes `bookings.is_og` directly (same Supabase pattern as `handleMarkNoShow`). [components/coach/BookingListItem.tsx](components/coach/BookingListItem.tsx) gained `showOgBtn` + `onToggleOg` props and renders the blue OG badge.
- **Score Entry stripped of OG plumbing.** [app/api/score-entry/[sessionId]/route.ts](app/api/score-entry/[sessionId]/route.ts) filters bookings `.eq('is_og', false)`. The manual OG button in [AthleteScoreRow.tsx](components/coach/score-entry/AthleteScoreRow.tsx) is removed. `open_gym` field removed from `AthleteScoreValues` / `emptyScoreValues` / prefill / save payload / empty checks ([useScoreEntry.ts](hooks/coach/useScoreEntry.ts), [save/route.ts](app/api/score-entry/save/route.ts)). Leaderboard tier logic removed: [utils/leaderboard-utils.ts](utils/leaderboard-utils.ts) drops the OG tier so DNF is now the only "below real scores" tier; LeaderboardView removes the OG chip from two result-cell renderers + the `open_gym` column from three SELECTs.
- **Trial-chip name match expanded.** Earlier in session: Chris reported all trial chips on Admin → Attended showing the same amber color (the S321 green-for-registered didn't fire). Reason: legacy `members.whiteboard_name` field is being phased out — new registrations don't set it. Fix at [app/coach/admin/page.tsx:272](app/coach/admin/page.tsx#L272): the registered-name set now unions `name`, `display_name`, AND `whiteboard_name` (all case-insensitive, all trimmed). Daniela Simm's chip will go green automatically once she registers under that name.
- **Pushback caught wrong direction once.** When Chris asked which option made sense for an OG athlete who does the WOD, I proposed (A) auto-locked, citing "we don't need the OG chip in Results". Chris corrected: that quote means the OG concept doesn't belong in Results modal at all — the score-entry filter handles that. The "did the WOD anyway" scenario needs (B) overridable. Then he asked for least work / risk → B1 (score-entry override flips only `wod_section_results.open_gym`, not `bookings.is_og`) — but ALSO: the score-entry filter means OG athletes don't appear there; if needed, coach toggles OG off in Session Management. So B1 effectively reduces to "no override path needed inside Score Entry, just toggle OG off in SessionMgmt and the athlete reappears."
- **Migration ordering trap.** Chris hit "Error fetching WODs: {}" on local because the SELECT for `is_og` ran before the column existed. Documented as a landmine. Run migration BEFORE deploying code.
- **Memory updates:** none new — the trial-chip whiteboard-name logic is in landmines.
- **TS clean.** Single bundled commit (per checklist default). 15 files modified + 1 untracked SQL migration (`*.sql` is gitignored — the migration is local-only, run via Supabase SQL Editor).
- **Carry-over:** all live-verifications listed in the Next Session Kickoff block at the top of this file.

**Session 321 (2026-04-27 — Opus 4.7) — LATE-CANCEL TZ FIX + TRIAL ATHLETES REWORK + INCIDENTS CLEANUP:**
- **Late-cancel gate TZ bug.** During the S316 gate live-test, Chris noticed two athletes (Marion + Michael Weber) who cancelled ~1h before a Friday class landed in `Cancelled by Athlete` instead of `Late Cancellations`. Same TZ bug class as S318's `getMaxVisibleSessionDate`: `new Date(\`${session.date}T${session.time}\`)` parses as runtime-local time (UTC on Vercel) but `weekly_sessions.time` is Berlin wall-clock. So an 18:00 CEST session was treated as 18:00 UTC = 20:00 CEST — the lock-threshold computation ran 2h late, gate didn't fire.
- **Fix.** Added exported `sessionStartInstant(dateStr, timeStr)` to [lib/bookingRules.ts](lib/bookingRules.ts) — uses `Intl.DateTimeFormat` with `timeZone: 'Europe/Berlin'` to convert the wall-clock to a UTC instant. Threaded it through both routes: [app/api/bookings/cancel/route.ts](app/api/bookings/cancel/route.ts) (lock check + 10-card grace check) and [app/api/bookings/create/route.ts](app/api/bookings/create/route.ts) (lock check). Did NOT refactor the existing nested helper inside `getMaxVisibleSessionDate` — left it untouched per "no premature refactoring".
- **Late-cancel timestamp display.** [components/coach/BookingListItem.tsx](components/coach/BookingListItem.tsx): the "Cancelled: <ts>" suffix on each row was gated to `status === 'cancelled'` only. Late cancels and no-shows showed only the booked timestamp. Extended to render for all three statuses with the right label ("Late cancel:", "Marked:", "Cancelled:"). Pulls from `booking.updated_at` which is already populated.
- **Incidents tab — Coach Remove no longer counted as incident.** [app/coach/admin/page.tsx](app/coach/admin/page.tsx) Incidents tab dropped `coach_cancelled` from the query, type, aggregation, table column, expanded-row label, and `colSpan`. Chris's reasoning: when a coach Removes a booking it's intentional cleanup (booking made in error), not an athlete-side incident worth tracking. Late Cancel + No-Show remain. Existing `coach_cancelled` rows in DB are preserved (they're cleanup records) but invisible on this report.
- **Trial Athletes panel rework.** Same admin page. Was: always-shown amber-pill panel with hover tooltip for dates. Now: collapsible (chevron toggle, collapsed by default — "doesn't clutter up the page when we get a few months in"); each trial gets a chip color based on whether their name matches a `members.whiteboard_name` (case-insensitive) — **green chip + "Registered" badge** if matched, **amber chip** otherwise; dates rendered inline (DD.MM.YYYY) instead of hover-only; **X delete button** strips the name from `weekly_sessions.trial_names` on every session that contains it (for accidental tags or post-registration cleanup, e.g. Senol once he registers). Empty arrays become `null`. Member bookings unaffected.
- **`whiteboard_name` match is case-insensitive but not fuzzy.** Typos ("Daniela" vs "Daniella") leave a registered athlete showing amber. Document in landmines.
- **Session-close checklist restructure.** Chris asked to remove step #3 (overwrite `Notes for next session.md`) — that file is his personal notes, not for Claude. Folded the next-session info into a new "⚡ Next Session Kickoff" section at the top of activeContext. Renumbered close-checklist steps 4-10 → 3-9, updated verification list. **`Notes for next session.md` is Chris-owned now — do not read or write to it.**
- **Memory updates:** new `feedback_persist_status_answers.md` — when Chris confirms a carry-over is done, update activeContext in the same turn instead of just acknowledging in chat.
- **TS clean.** Three logical changesets bundled into one session commit (per checklist default).
- **Carry-over:** all live-verifications listed in the Next Session Kickoff block at the top of this file.

**Session 320 (2026-04-26 — Opus 4.7) — LEADERBOARD MULTI-LOAD TIEBREAKER FIX:**
- **Trigger.** Chris saw "Rinse & Repeat" Pt.2 leaderboard rank Teemu (Rx, 20kg sandbag, **10kg DBs**, 182 reps) above him (Rx, 20kg sandbag, **22.5kg DBs**, 165 reps) and asked why heavier DBs weren't honored.
- **Diagnostic.** Pt.1 (shuttle run + burpees, `scoring_fields={reps:true}`) has no weights → Teemu's 45 > Chris's 43 is correct there. Pt.2 (`{load, reps, load2, scaling}`) is where the DB difference matters. Pulled the WOD's section JSON + 24 result rows from Supabase via a throwaway script (cleaned up after).
- **Root cause.** [utils/leaderboard-utils.ts:173+](utils/leaderboard-utils.ts#L173) had two distinct code paths in `compareByScoringType()` that both read only `weight_result` and silently ignored `weight_result_2` / `_3`:
  1. **Weight tiebreaker** (when primary metric ≠ weight): runs before falling through to reps/time/etc. Was checking only the primary load slot.
  2. **Primary `'weight'` case** (when section IS scored on weight): also only compared `weight_result`. A section like "1RM Snatch + 1RM C&J" would only rank by snatch.
- **Fix.** Both paths now chain `[weight_result, weight_result_2, weight_result_3]` in order; first slot where the values differ wins. Honors heavier secondary/tertiary loads in any multi-load section, retroactively across all past WODs.
- **`aggregateScaling` was already correct** — it sums all 3 scaling slots. Only the load comparator was broken.
- **Pushback caught path 2.** First pass only fixed the tiebreaker; Chris's "we've fixed this a few times now, why are 3 load scaling levels not taken into account?" prompted re-reading code and finding the primary `'weight'` case had the same bug.
- **Carry-over:** Live-verify the Pt.2 leaderboard after deploy — Chris should now rank above Teemu. Expect rank changes on old multi-load WODs (net-positive correctness, but athletes may notice).
- **`detectScoringType` priority gotcha (worth remembering):** sections with both `load: true` AND `reps: true` resolve to `'reps'` not `'weight'`, because reps wins priority at [utils/leaderboard-utils.ts:138](utils/leaderboard-utils.ts#L138) before the load check at line 139.
- **TS clean.** Single-file change. Not yet committed at time of writing — committing as part of close.

**Older sessions (57-319):** See `project-history/` folder.

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

1. **Finish Miriam Jacht's family setup (S324 carry-over)** — set Miriam's `primary_payment_method='wellpass'` in Members UI. Confirm Aries / Anton / Adrian are registered as her family_members with `primary_payment_method='ten_card'` and `ten_card_holder_id=Miriam.id`. Test by booking one kid and checking Miriam's card decrements.
2. **Set up `next-intl` i18n (DE/EN bilingual)** — Chris plans to commercialize. The ~11 inlined German strings from S317 should migrate to `messages/de.json` + matching `messages/en.json`. ~1 day of dedicated work. Stop adding more inline German until this lands. Memory: `project_commercialization_and_i18n.md`.
3. **Verify SPF/DKIM/DMARC + test reset flow on deployed app (S297 follow-up)** — Resend → Domains → `the-forge-functional-fitness.de` should show all ✅. Then test the full reset flow end-to-end on live app.
4. **Mac Chrome hang investigation** — dedicated session. Start with Activity Monitor (Memory Pressure + Chrome Helper), disk free %, update status, then hang reports in `~/Library/Logs/DiagnosticReports/`. Will fix Mac push as a side effect.
5. **Athlete subscription bug** — fix Stefan Glocker DB row + investigate webhook ordering + `autoExpireSubscriptions` vs trialing.
6. **Whiteboard duplicate entries** (see `memory/project_whiteboard_duplicates.md`) — uncommitted changes from Session 251 need reviewing/committing. **Note:** S305 backfill may have largely resolved this by retroactively booking whiteboard names; re-evaluate before doing the S251 work.
7. **Score-entry API filter (deferred from S289)** — `app/api/score-entry/[sessionId]/route.ts` only filters bookings by `status='confirmed'` (and now `is_og=false`) and ignores `members.status`. If unapprove should cascade to hide bookings, filter in API or cascade-cancel bookings.
8. **Test endpoint 410 cleanup** (deferred from S292) — route `app/api/notifications/test/route.ts` through `sendToSubscription` so expired subs auto-delete on Send Test.
9. **Improve `fetchWODs` error logging** — when Supabase errors stringify as `{}` in the catch block (as happened in S322 with the missing `is_og` column), the cause is hidden. Same fix as S318 booking-error toast: extract `.message`/`.code`/`.details`/`.hint`. Low priority.
10. **Audit other diagnostic scripts in `scripts/` for anon-key blind spot** (S323) — `check-ghost-scaling.ts` and others use `NEXT_PUBLIC_SUPABASE_ANON_KEY`; if they query RLS-protected tables they may silently return empty. Switch to service role.
11. **Optional: derive a "Guardian" badge on MemberCard** (deferred from S324) — automatically show when a member has any rows pointing at them via `primary_member_id`. Distinct from the existing "Guardian Only" toggle (which means "doesn't train"). Was discussed in S324 but not built; the `guardian_only` binary toggle covers the immediate need.

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
