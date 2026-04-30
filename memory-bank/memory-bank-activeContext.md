# Active Context

**Version:** 187.0
**Updated:** 2026-04-30 (Session 326 — lift_records cascade, Apply-to-Sessions removed, 13 orphan WODs cleaned)

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

**First action:** None queued. S326 extended cascade-delete to lift_records, removed the buggy "Apply to Sessions" picker, and cleaned 13 orphan WODs. Pick from "Next Immediate Steps" or wait for direction.

**Files to open first if continuing code work:** none queued.

**Carry-over status:**
- ✅ S326 lift_records cascade — confirm dialog now counts both `wod_section_results` and `lift_records`; tuple-matching with kept-section subtraction. Live-verified by Chris.
- ✅ S326 Apply-to-Sessions removal — picker UI gone from WorkoutModal; drag-and-drop / copy-paste remain (already orphan-safe).
- ✅ S326 orphan WOD cleanup — 13 phantom WODs deleted across 5 dates (2026-04-20, -22, -27, -28, -29). 0 orphans remaining as of close.
- ⏳ S321 late-cancel TZ fix — still waiting on a real organic cancellation to confirm.

**Landmines:**
- **WOD-edit cascade-delete dialog now counts BOTH tables.** [hooks/coach/useWODOperations.ts](hooks/coach/useWODOperations.ts) `handleSaveWOD` builds `(lift_name, RM:<rm_test>)` or `(lift_name, RS:<rep_scheme>)` tuple keys for removed-vs-kept sections; deletes only orphan tuples. Lift records that are still represented in a kept section are preserved (defensive — same lift can appear in multiple sections of one WOD).
- **"Apply to Sessions" no longer exists.** [components/coach/WorkoutModal.tsx](components/coach/WorkoutModal.tsx) and [components/coach/WorkoutFormFields.tsx](components/coach/WorkoutFormFields.tsx) no longer render the picker; [hooks/coach/useWorkoutModal.ts](hooks/coach/useWorkoutModal.ts) no longer ships `selectedSessionIds`/`otherSessions`/`applySessionsOpen`/`handleSessionSelectionToggle`; [hooks/coach/useWODOperations.ts](hooks/coach/useWODOperations.ts) `handleSaveWOD` no longer has the `selectedSessionIds` branches. Fan-out workflow is now drag-and-drop or copy-paste only — both already orphan-safe via `handleCopyWOD`'s explicit cleanup at lines 768-798.
- **`scripts/audit-sibling-wods.ts`** (new diagnostic) — finds dates with 3+ sibling WODs and flags orphans (no sessions, no scores, no lifts). Run via `npx tsx`, service-role.
- **`scripts/cleanup-orphan-wods.ts`** (rewritten) — generic orphan-WOD sweep, dry-run by default, `--apply` to delete. Re-verifies each row at delete-time, never trusts the audit. (Old S113 one-shot was overwritten — only S113 history references it.)
- **`scripts/find-wod-with-lifts.ts`** (new) — service-role lookup for WODs with `lift_records`, used to pick test candidates for the cascade dialog.
- (Carry from S325) WOD save cascade-deletes scored sections that are removed; confirm dialog gates the destructive write. Pure rename/reorder/scoring_fields edit is a no-op (UUID stable).
- (Carry from S325) Leaderboard's grouped-mode sibling lookup uses ONLY the selected section's UUID. Section UUIDs are reused across legitimate copies, so the exact-UUID filter still aggregates cross-week scores correctly.
- (Carry from S325) `formatResult` accepts optional `scoringFields` — gates extras (weight/metres/reps/cals) on the section's current scoring config.
- (Carry from S325) Coach manual booking walks to the 10-card holder in `useBookingManagement.ts` `handleManualBooking` / `handleCancelBooking`.
- (Carry from S324) Migration `database/add-payment-method-and-tencard-holder.sql` is in production. SQL files are gitignored.
- (Carry from S324) Booking flow walks to a 10-card holder, not the booking member, in `/api/bookings/create`, `/api/bookings/cancel`.
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

**Session 325 (2026-04-29 — Opus 4.7) — COACH 10-CARD PARITY + LEADERBOARD ORPHAN-SECTION BUG + WOD-EDIT CASCADE:**
- **Trigger.** Chris flagged that adding Adrian Jacht (Miriam's son, family-shared 10-card) to a workout from Session Management didn't decrement Miriam's card. S324 fixed `/api/bookings/create` but missed the coach-side direct-supabase path in [hooks/coach/useBookingManagement.ts](hooks/coach/useBookingManagement.ts).
- **Fix 1 (commit `7ae38b1`, pushed).** `handleManualBooking` and `handleCancelBooking` now resolve effective payment method and walk to `ten_card_holder_id` before debit/refund. Mirrors API logic via `getEffectivePaymentMethod`. `useSessionDetails.Member` and `lib/coach/bookingHelpers` Member interface both gained `primary_payment_method` + `ten_card_holder_id`. Verified: Adrian booking now decrements Miriam.
- **Fix 2 (commit `8cfd416`, push pending).** Score-entry API ([app/api/score-entry/[sessionId]/route.ts](app/api/score-entry/[sessionId]/route.ts)) sorts athletes F → M → null by gender, then alphabetical name. Pulls `members.gender`, carries through booked/whiteboard/trial entries. Matches Chris's whiteboard writing order.
- **Fix 3 (uncommitted at trigger, bundled in close).** Leaderboard `formatResult` ([utils/leaderboard-utils.ts](utils/leaderboard-utils.ts)) gains optional `scoringFields` param. When passed, gates extras (weight/metres/reps/cals) on section's current scoring config. Stops stale fields from prior section edits surfacing as `· 50 kg · 200 m · 25 cal` extras after a section's scoring_fields was narrowed.
- **Fix 4 (the deeper one).** Triggered by Chris seeing 11 athletes uniformly show "46 reps Rx" on Push-up Strict leaderboard while Score Entry showed correct varied values. Diagnostic script ([scripts/diagnose-mon-wod-46reps.ts](scripts/diagnose-mon-wod-46reps.ts)) revealed: 7 sibling WODs all named "WOD - Strict Movements..." for 2026-04-22; the leaderboard's grouped-mode logic walked `sections[sectionIndex]` per sibling, and sibling `11d9690d` had a different section (`section-1765536331392`, the orphan-46-reps section) sitting at the same array index. Fix: [components/athlete/LeaderboardView.tsx](components/athlete/LeaderboardView.tsx) line ~884 — always query `wod_section_results` by the selected WOD's exact `contentSectionId`, never positional. Section UUIDs are reused across legitimate copies, so cross-week aggregation still works.
- **Fix 5 (the structural one).** Root cause of orphan rows: when a coach removes a section from a WOD, `wod_section_results` rows for that section_id are NEVER cleaned up — they sit forever, ready to surface via some future query path. Layer 1 fix: [hooks/coach/useWODOperations.ts](hooks/coach/useWODOperations.ts) `handleSaveWOD` UPDATE branch — fetch old sections, compute removed IDs, query `wod_section_results` for matching rows, show destructive confirm ("Saving will delete N scores from M athletes — continue?"). Cancel aborts save entirely; confirm deletes rows then saves. Drafting workflow unaffected (no rows → no dialog).
- **Data cleanup (one-shot, applied).** [scripts/cleanup-orphan-section-results.ts](scripts/cleanup-orphan-section-results.ts) sweeps all WODs for `wod_section_results` whose `section_id` no longer matches a current section. Default dry-run; `--apply` deletes; `--wod=<id>` limits. Ran with `--apply`: deleted 93 orphan rows across 4 WODs (66 in `e525ad95`, 11 in `3dfa23cd`, 10 in `725bf793`, 6 in `64b90a43`). Verification re-run shows 0 orphans remaining.
- **Process moments worth remembering:**
  - **My fix 3 exposed bug 4.** The leaderboard "all 11 athletes show 46" symptom was actually pre-existing duplication that the random-extras suffix was visually masking (each row looked unique because of varying stale kg/m/cal). Once I gated extras on `scoring_fields`, the underlying uniform "46 reps" became visible. Lesson: when a display fix makes things look "worse", check if the new view is actually exposing data the old view was hiding.
  - **Pushback caught wrong direction once.** I initially asked Chris to verify in Supabase Dashboard ("filter by member_id") but he hit zero results because `member_id` and `user_id` are different UUID columns in `wod_section_results`. Switched to a service-role diagnostic script (per `claude-rules.md`), which also caught the sibling-index bug systematically.
  - **Layered fix scoping.** Chris asked "will this stop it happening in future?" — pushed me to articulate that layer 2 (positional fix) and layer 3 (cleanup) only address symptoms; layer 1 (cascade-delete on edit) is the only structural prevention. Sequence: ship layer 2 first (stops symptom), then layer 3 (cleans existing damage), then layer 1 (stops recurrence). Each can be tested independently.
- **TS clean.** Five logical changesets, two commits already in (7ae38b1, 8cfd416), session-close commit bundles the rest.
- **Carry-over:** none — all 5 fixes verified by Chris.

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

**Older sessions (57-321):** See `project-history/` folder.

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

1. **Set up `next-intl` i18n (DE/EN bilingual)** — Chris plans to commercialize. The ~11 inlined German strings from S317 should migrate to `messages/de.json` + matching `messages/en.json`. ~1 day of dedicated work. Stop adding more inline German until this lands. Memory: `project_commercialization_and_i18n.md`.
2. **Verify SPF/DKIM/DMARC + test reset flow on deployed app (S297 follow-up)** — Resend → Domains → `the-forge-functional-fitness.de` should show all ✅. Then test the full reset flow end-to-end on live app.
3. **Mac Chrome hang investigation** — dedicated session. Start with Activity Monitor (Memory Pressure + Chrome Helper), disk free %, update status, then hang reports in `~/Library/Logs/DiagnosticReports/`. Will fix Mac push as a side effect.
4. **Athlete subscription bug** — fix Stefan Glocker DB row + investigate webhook ordering + `autoExpireSubscriptions` vs trialing.
5. **Whiteboard duplicate entries** (see `memory/project_whiteboard_duplicates.md`) — uncommitted changes from Session 251 need reviewing/committing. **Note:** S305 backfill may have largely resolved this by retroactively booking whiteboard names; re-evaluate before doing the S251 work.
6. **Score-entry API filter (deferred from S289)** — `app/api/score-entry/[sessionId]/route.ts` only filters bookings by `status='confirmed'` (and now `is_og=false`) and ignores `members.status`. If unapprove should cascade to hide bookings, filter in API or cascade-cancel bookings.
7. **Test endpoint 410 cleanup** (deferred from S292) — route `app/api/notifications/test/route.ts` through `sendToSubscription` so expired subs auto-delete on Send Test.
8. **Improve `fetchWODs` error logging** — when Supabase errors stringify as `{}` in the catch block (as happened in S322 with the missing `is_og` column), the cause is hidden. Same fix as S318 booking-error toast: extract `.message`/`.code`/`.details`/`.hint`. Low priority.
9. **Audit other diagnostic scripts in `scripts/` for anon-key blind spot** (S323) — `check-ghost-scaling.ts` and others use `NEXT_PUBLIC_SUPABASE_ANON_KEY`; if they query RLS-protected tables they may silently return empty. Switch to service role.
10. **Optional: derive a "Guardian" badge on MemberCard** (deferred from S324) — automatically show when a member has any rows pointing at them via `primary_member_id`. Distinct from the existing "Guardian Only" toggle (which means "doesn't train"). Was discussed in S324 but not built; the `guardian_only` binary toggle covers the immediate need.

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
