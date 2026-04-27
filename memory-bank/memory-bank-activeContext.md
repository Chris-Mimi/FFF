# Active Context

**Version:** 183.0
**Updated:** 2026-04-27 (Session 322 — Open Gym redesigned at booking level + trial-chip name match expanded)

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

**First action:** Build Reject/Delete button on Members Pending tab (Chris pulled this off backlog at S323 start — no UI affordance currently to remove pending members; S306 had to use SQL to clean up Claudia Herrmann).

**Files to open first if continuing code work:** Members Pending tab — start at [app/coach/members/page.tsx](app/coach/members/page.tsx).

**Carry-over status:**
- ✅ S322 OG flow live-verified (Chris confirmed S323 — tested working).
- ⏳ S321 late-cancel TZ fix — Chris waiting on a real cancellation organically.
- ❌ Membership-type confirm guard extension to class types — Chris declined (not necessary).

**Open questions still unanswered:** none active.

**Landmines:**
- **Migration must run before deploy.** Code at [hooks/coach/useCoachData.ts:58](hooks/coach/useCoachData.ts#L58) and elsewhere SELECTs `is_og`. Without the column, the query fails silently (Supabase error stringifies as `{}`) and no WODs load. Symptom Chris hit during build: "Error fetching WODs: {}". Run the SQL first.
- **`open_gym` column dropped.** [utils/leaderboard-utils.ts](utils/leaderboard-utils.ts) and [components/athlete/LeaderboardView.tsx](components/athlete/LeaderboardView.tsx) no longer reference it. The 1 historical OG row vanishes with the column drop — Chris confirmed it's of no consequence.
- **OG athletes are filtered out of Score Entry server-side** in [app/api/score-entry/[sessionId]/route.ts](app/api/score-entry/[sessionId]/route.ts) via `.eq('is_og', false)`. If an OG athlete decides to do the WOD, coach toggles OG off in Session Management first → they reappear in Score Entry. Edge case per Chris's design (B1 — minimal risk, score-entry override path not built).
- Trial-name match expanded to `members.name` / `display_name` / `whiteboard_name` (case-insensitive). New registrations don't set `whiteboard_name` so the broader match is required for green chips going forward.
- TZ fix from S321 added `sessionStartInstant()` in [lib/bookingRules.ts](lib/bookingRules.ts). If anything booking-related regresses, suspect that helper.
- `Chris Notes/AA frequently used files/Notes for next session.md` is **Chris-owned** as of S321. Do NOT read or write to it.

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

**Session 319 (2026-04-26 — Opus 4.7) — REBOOKING CONSTRAINT CORRECTION + CASH-MONTHLY ACTIVATION:**
- **Rebooking unique-index correction.** S318 had drafted a migration that excluded both `late_cancel` AND `coach_cancelled` from the partial unique index on bookings. Chris ran a v1 of that, then realised the system was already working as intended for `late_cancel` — the coach UI has an Undo button (`handleUndoLateCancel`) that flips the existing row back to `confirmed`, so a fresh INSERT was never needed. Broadening the index for `late_cancel` would allow duplicate (session_id, member_id) rows. `coach_cancelled` has NO undo path, so it must remain excluded. Wrote [database/fix-rebooking-constraint-v2.sql](database/fix-rebooking-constraint-v2.sql) with the correct rule: `WHERE status NOT IN ('cancelled', 'coach_cancelled')`. Chris ran it. Carole Schultz was already re-booked (Undo did the work).
- **Cash-monthly activation path (new feature).** Diagnosed three intertwined symptoms: Nikolina's card said "30 days left" with no start date while Andreas (1yr cash) said "Subscribed: today + Active (1yr)"; both showed "No active subscriptions" on the Athletes coach tab; no renewal reminder would fire for Nikolina. Root cause: the codebase only had Start Trial (`status='trial'`) and Activate 1yr / ∞ (`status='active'`) — no path for paying-cash-monthly customers. Coaches were forced to use Start Trial for cash-monthly people, which left them in `'trial'` status (excluded from the expiring-soon notification filter; "Subscribed: <date>" line on MemberCard is gated to `status === 'active'` only). Five files: [app/api/members/athlete-subscription/route.ts](app/api/members/athlete-subscription/route.ts) new `activate_monthly` action, [hooks/coach/useMemberActions.ts](hooks/coach/useMemberActions.ts) new `handleActivateMonthly`, [components/coach/members/MemberCard.tsx](components/coach/members/MemberCard.tsx) new "30d" lime button alongside 1yr / ∞, [app/coach/members/page.tsx](app/coach/members/page.tsx) wires the prop, [types/member.ts](types/member.ts) `getTrialStatus` distinguishes Cash Monthly vs Cash 1yr via `end - start ≤ 45d` heuristic and shows "Active — Cash Monthly (Xd left)".
- **Athletes tab subscription clarity.** [components/coach/athletes/PaymentsSection.tsx](components/coach/athletes/PaymentsSection.tsx) only queried Stripe `subscriptions` table — coach-activated members showed "No active subscriptions" even when they had a coach-managed plan. Now extends the SELECT to include `athlete_subscription_status/start/end`, and when no Stripe row exists but the member has `'active'` or `'trial'` athlete subscription, renders a coach-managed card with label, dates, days-left, and a small note "Coach-managed access (no Stripe subscription on file)". Empty-state copy clarified for the truly-no-access case.
- **Renewal reminder** for Nikolina once she's moved to `status='active'` (cash monthly): the existing 14-day expiring-soon notification flow ([useMemberData.ts:319+](hooks/coach/useMemberData.ts#L319)) already covers `status='active'` + `athlete_subscription_end`. No code change needed.
- **TS clean.** Three feature commits: `523c1266` (rebooking constraint v2), `50590328` (cash-monthly path), `6df9e45a` (Athletes tab clarity).
- **Carry-over:** Chris still needs to click the new 30d button on Nikolina's card to migrate her from `'trial'` to `'active'` (her existing trial row will be overwritten with start=today, end=today+30).

**Session 318 (2026-04-26 — Opus 4.7) — MULTI-FIX (CHANGE-PASSWORD, SEARCH, TZ, SUBSCRIPTION GATE, REORG):**
- **Athlete Change Password** — button on athlete Security tab was a stub with no `onClick`. Wired it up via `supabase.auth.updateUser` mirroring the coach profile pattern. Inline expand within the tab. [components/athlete/AthletePageSecurityTab.tsx](components/athlete/AthletePageSecurityTab.tsx)
- **Coach Members live search** — added a search input above the member grid (filters by name/display_name/email, case-insensitive substring, combines with existing tab/membership/class/age filters). [hooks/coach/useMemberData.ts](hooks/coach/useMemberData.ts) + [app/coach/members/page.tsx](app/coach/members/page.tsx)
- **CRLF/Synology line-endings fix** — diagnosed 358-file phantom diff. Created `.gitattributes` with `* text=auto eol=lf` + ran `git add --renormalize .` (430 files normalized in one commit). NOTE: `.gitattributes` was initially missed by the renormalize commit because it was untracked; the follow-up commit `3032a35` actually added it to the repo.
- **Next-week release timezone fix** — `getMaxVisibleSessionDate` in [lib/bookingRules.ts](lib/bookingRules.ts) was using `new Date()/getDay()/setHours()` which run in server-local time = UTC on Vercel. A release time of `16:00` was being interpreted as UTC = 18:00 CEST, blocking next-week bookings for an extra 2h every Sunday. Now uses `Intl.DateTimeFormat` with `timeZone: 'Europe/Berlin'` to evaluate "now" and convert wall-time → UTC instant. Works across CET/CEST. **CHRIS BAND-AID:** dropped release time to `14:00` to unblock today's bookings while the fix deployed; needs to reset to `16:00` in Admin → Booking Rules before next Sunday or release will fire 4h early.
- **Athlete subscription gate fix** — Aline von Rüden (10-card holder) couldn't subscribe to the Athlete App; saw "Membership type not assigned. Please contact your coach." Old gate required `member` or `wellpass` in `membership_types`. Chris's actual rule: only `member` (regular gym members) gets the discount Member tier (€8/mo); everyone else (`wellpass`, `10`, `Hf`, `Di`) pays the Wellpass tier (€10/mo). Touches 3 files: [components/athlete/AthletePagePaymentTab.tsx](components/athlete/AthletePagePaymentTab.tsx) (gate + section title "Standard Plan"), [app/api/stripe/create-checkout/route.ts](app/api/stripe/create-checkout/route.ts) (server validation), [components/coach/members/MemberCard.tsx](components/coach/members/MemberCard.tsx) (1yr/∞ activation buttons require any ticked type, not specifically Mb/Wp; orange hint changed to "Tick a membership type first").
- **Stripe fees doc** — Chris asked about Stripe fees on €100/yr and €8/mo plans. Wrote `Chris Notes/Deployment/stripe-fees-athlete-app.md` with both tier comparisons. Key insight: monthly billing nets ~€13–17 more per athlete than yearly because the fixed €0.25 fee is a much smaller % of monthly charges + the lower yearly price wipes out fee efficiency.
- **Chris Notes folder reorg** — added `.md` extensions to 10 files; created `Workflow & Git/`, `Deployment/`, `Database & Supabase/`, `Archive/` folders; moved 23 files in. Activated path updates in this file. **STAGING MISTAKE:** the booking-error patch (commit `d53bae8`) accidentally bundled the reorg renames because they were already staged from `git mv`. Functionally fine, but the commit message says only "fix(coach): expose real Supabase error" while the changeset includes 24 file renames.
- **Booking error toast clarity** — generic "Failed to book member" was hiding the real Supabase error. Now extracts `.message`/`.details`/`.hint`/`.code` from the Supabase error object and detects the `unique_active_bookings` violation specifically. Required two attempts: first attempt did `String(error)` which produced `[object Object]` because Supabase errors are plain objects, not Error instances. Fixed in commit `1153275`.
- **C. Schultz booking blocker (RESOLVED in S319):** initial diagnosis was wrong; the system was working as intended via the Undo button on late_cancel rows. See S319 entry for details.
- **OG attendance flow design — DEFERRED:** Chris wants OG-attended athletes to still appear booked. Three options proposed (A: new `attended_og` status, B: just allow re-book to confirmed, C: separate OG session type). Decision pending.
- **Memory updates:** none new this session — issue causes are documented inline above.

**Older sessions (57-317):** See `project-history/` folder.

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

1. **Live-verify OG flow on deployed app** (migration already run S322; see Next Session Kickoff at top for verification steps).
2. **Set up `next-intl` i18n (DE/EN bilingual)** — Chris plans to commercialize. The ~11 inlined German strings from S317 should migrate to `messages/de.json` + matching `messages/en.json`. ~1 day of dedicated work. Stop adding more inline German until this lands. Memory: `project_commercialization_and_i18n.md`.
3. **Decide whether to extend the membership-type confirm guard to class types** (EKT / Tu / CFK / CFT) — same accidental-click risk applies to kids' class assignments. Chris not asked yet.
4. **Build Reject/Delete button on Members Pending tab** — currently no UI affordance to remove pending members; only Approve/Unapprove. S306 had to use SQL to clean up Claudia Herrmann.
5. **Verify SPF/DKIM/DMARC + test reset flow on deployed app (S297 follow-up)** — Resend → Domains → `the-forge-functional-fitness.de` should show all ✅. Then test the full reset flow end-to-end on live app.
6. **Mac Chrome hang investigation** — dedicated session. Start with Activity Monitor (Memory Pressure + Chrome Helper), disk free %, update status, then hang reports in `~/Library/Logs/DiagnosticReports/`. Will fix Mac push as a side effect.
7. **Athlete subscription bug** — fix Stefan Glocker DB row + investigate webhook ordering + `autoExpireSubscriptions` vs trialing.
8. **Whiteboard duplicate entries** (see `memory/project_whiteboard_duplicates.md`) — uncommitted changes from Session 251 need reviewing/committing. **Note:** S305 backfill may have largely resolved this by retroactively booking whiteboard names; re-evaluate before doing the S251 work.
9. **Score-entry API filter (deferred from S289)** — `app/api/score-entry/[sessionId]/route.ts` only filters bookings by `status='confirmed'` (and now `is_og=false`) and ignores `members.status`. If unapprove should cascade to hide bookings, filter in API or cascade-cancel bookings.
10. **Test endpoint 410 cleanup** (deferred from S292) — route `app/api/notifications/test/route.ts` through `sendToSubscription` so expired subs auto-delete on Send Test.
11. **Improve `fetchWODs` error logging** — when Supabase errors stringify as `{}` in the catch block (as happened in S322 with the missing `is_og` column), the cause is hidden. Same fix as S318 booking-error toast: extract `.message`/`.code`/`.details`/`.hint`. Low priority.

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
