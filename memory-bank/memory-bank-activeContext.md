# Active Context

**Version:** 178.0
**Updated:** 2026-04-25 (Session 317 — Anja rescue + German login error specificity)

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

**Session 317 (2026-04-25 — Opus 4.7) — ANJA RESCUE + LOGIN ERROR SPECIFICITY:**
- **Anja Götte couldn't log in after re-registration.** Diagnostic walkthrough confirmed auth row + member row both healthy (`last_sign_in_at` set, `confirmed_at` set, `members.status='active'`) — issue was password typing on her side, NOT deliverability or approval flow. Reset password manually via Supabase admin API.
- **New script: [scripts/admin-set-password.ts](scripts/admin-set-password.ts)** — one-off rescue tool. Looks up `members.id` by email, calls `auth.admin.updateUserById(id, { password })`. Use when normal recovery email isn't reaching the user. Verified by logging in as Anja in incognito + logging out.
- **Login error specificity refactor: [app/login/page.tsx](app/login/page.tsx).** Catch block now always calls `/api/members/check-status` (previously only when error was "email not confirmed") and branches on `(exists, status, isEmailNotConfirmed)`:
  - `!exists` → "Kein Konto mit dieser E-Mail-Adresse gefunden..."
  - `pending` → "Dein Konto wartet auf die Freigabe..."
  - `blocked` → "Dein Konto wurde gesperrt..."
  - `isEmailNotConfirmed` → "Bitte überprüfe deine E-Mails..."
  - else (email valid + auth fail) → "E-Mail-Adresse erkannt, aber das Passwort ist falsch. Nutze „Passwort vergessen?", um es zurückzusetzen."
  - check-status errors → fallback to raw Supabase message.
  - Plus `reset_link_invalid` URL-param message translated.
- **Why German for these 5+1 strings only:** rest of app stays English; login is the highest-friction moment. Chris reviewed + corrected wording (`Neuen` capitalisation, dropped `unten` in #5).
- **Memory updated:** `project_registration_vs_athlete_subscription.md` — registration ≠ paid athlete subscription. `athlete_subscription_status='expired'` is the default for non-subscribed members and does NOT block login or class booking. (Misdiagnosed once this session; saved so it doesn't happen again.)
- **Resend SPF/DKIM/DMARC still unverified** (Next Step #4 carries over) — wasn't the cause of Anja's issue but remains the open item from S313.
- **Not yet live-tested in prod** — login change committed but new error messages need verification on `app.the-forge-functional-fitness.de` after deploy.

**Session 316 (2026-04-24 — Opus 4.7) — CLEANUP + LATE-CANCEL GATE:**
- **Cleanup pass:** closed activeContext Next Steps 1 (historical lifts tab — no bug, records surface under athlete **Records** tab, not Lifts tab), 2 (Sonja Hujo re-entry — S305 didn't log the slot, not worth chasing), 3 (OG chip live-test), 3b (Trial Athletes flow live-test), 6 (Intervals timer live-test) — all confirmed done/working by Chris.
- **Late-cancel gate (new feature):** confirmed bookings cancelled past the auto-lock threshold now land in `late_cancel` status instead of `cancelled`. Rationale: `late_cancel` enum already existed + rendered coach-side (BookingListItem, SessionManagementModal, Admin attendance rollup) but was only set by coach-side actions; the athlete-initiated cancel route always wrote `cancelled` regardless of timing. Mirrors the `/api/bookings/create` lock logic exactly (manual `is_locked=true` OR past `auto_lock_lead_minutes` threshold, per-session-type override wins).
- **Files (2):**
  1. [app/api/bookings/cancel/route.ts](app/api/bookings/cancel/route.ts) — imports `getLockLeadMinutesForSessionType`, moves session fetch (now includes `workout_type` + `is_locked`) before the UPDATE, computes `newStatus: 'cancelled' | 'late_cancel'`. Waitlist cancels always stay `cancelled` (no penalty for dropping waitlist). Response includes `status` field.
  2. [app/member/book/page.tsx](app/member/book/page.tsx) — branches cancel toast on `data.status`: late cancels get `toast.warning('Booking cancelled. This is past the lock time, so it is recorded as a late cancel.')`.
- **Design choices:** rejected hard-block (Option A) — athletes still need a way to free the slot for waitlisters in genuine emergencies. Rejected soft pre-warn dialog (Option C) — server message is sufficient, client-side warning would need to expose lead-minutes publicly. 10-card non-refund (separate `ten_card_refund_hours` rule) handles the money side independently.
- **TS clean.** No schema change. No migration. Coach-side rendering already exists.

**Session 315 (2026-04-24 — Sonnet 4.6) — HISTORICAL LIFT RECORDS IMPORT (27 ATHLETES):**
- Received corrected master JSON (27 athletes) from Chris. Wrote 27 individual JSON files and ran import script.
- 689 historical lift records inserted (686 + 3 for Petr Bezdek). 0 errors. 26 athletes imported (Peter Kroll not yet registered).
- Name mapping non-obvious: Michael Städele (not Michi), Peresyov Dimitar (reversed), Daniel Braatz (double-z), Stefan G (initial only), Petr  Bezdek (double space — Chris fixing manually).
- All 27 JSONs moved to `data/athletes/processed/`.
- **Open issue:** Historical records not showing in athlete Lifts tab. Manually-entered records do show. Records confirmed in DB via service role. Root cause not found — session ended. Next session: check browser console + network tab on Lifts tab.
- No app code changed.

**Session 314 (2026-04-24 — Sonnet 4.6) — HISTORICAL LIFT RECORDS IMPORT:**
- Created `data/athletes/` folder as structured seed-data store for athlete lift history.
- Created JSON files for 8 athletes (Michi Städele, Chris Hiles, Thomas Spegele, Tobias Götte, Denis Koffler, Jürgen Bizjak, Paul Bielenski, Wayne Lucas) — all imported + moved to `data/athletes/processed/`.
- Created `scripts/import-athlete-lift-records.ts` — dry-run-first import script. Resolves `user_id` via `members.name`, parses lift keys into `lift_name + reps + rep_max_type`, Epley 1RM, deduplication. 582 records inserted.
- Fixed: "Overhead Press" → "Strict Overhead Shoulder Press" (50 records updated + script corrected). Fixed 8 duplicate OHP records for Chris.
- 8 more athlete JSONs staged in `data/athletes/` for next session: Zoran Vrbanic, Lukas Simnacher, David Montgomery, Tobias Baumstark, Christian Müller, Daniel Bratz, Dimitar Peresyov, Stefan Glocker. Christian Tanner data still missing.
- No app code changed.

**Session 313 (2026-04-24 — Opus 4.7) — HOUSEKEEPING + S312 MIGRATION RUN + LIVE TEST:**
- **Carla Rydval duplicate cleanup (Next Step #1 closed):** deleted `carla-muecke@web.de` primary + its 2 kid rows + auth.users row. Had 0 bookings / 0 scores; `c.rydval@web.de` retained (already active, not pending).
- **Stray whiteboard row deleted:** single `whiteboard_name='Anja'` row (workout_date 2026-04-01, id `7890b9e5-…`) neither matched Anja Götte (always `AnjaG`, not in DB) nor Anja Biechele (`AnjaB`). Coach-entry typo. Deleted by id.
- **S312 migration was missing on this DB** — generic "Failed to update booking rules" 500 while testing the next-week release gate turned out to be `column does not exist`. Ran `20260424_add_next_week_release_gate.sql` (idempotent via `IF NOT EXISTS`). Then hit a stale-JWT "Authentication required" on the retry; logout→login fixed it. Gate then confirmed working end-to-end.
- **Password-reset complaints triaged (no code touched):** flow code is clean. Prime suspect is Resend SPF/DKIM/DMARC for `the-forge-functional-fitness.de` still unverified (Next Step #7). Other likely causes: 1hr link expiry, one-time code re-clicks, silent success on typo'd email (Supabase-security behavior), email-gateway link-preview scanners burning the code.
- **Process lesson:** when S312 was pulled from the other machine, activeContext didn't flag its migration as unrun on this side. Going forward, migration "run-status per machine" needs to be explicit in session entries. (Logged in the project-history file.)
- No application code changed.

**Older sessions (57-312):** See `project-history/` folder.

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

1. **Live-test the German login error messages (S317)** — after deploy: incognito → login page → try (a) non-existent email expect "Kein Konto..."; (b) real email + wrong password expect "E-Mail-Adresse erkannt, aber das Passwort ist falsch..."; pending/blocked branches unchanged logic (just translated).
2. **Set up `next-intl` i18n (DE/EN bilingual)** — Chris plans to commercialize the app. The ~11 inlined German strings from S317 should migrate to `messages/de.json` + matching `messages/en.json`. Default locale = German now, English toggle available for commercialization. ~1 day of dedicated work. Stop adding more inline German until this lands. Memory: `project_commercialization_and_i18n.md`.
3. **Live-test the late-cancel gate (S316)** — pick a booking on a locked-window session (or set `auto_lock_lead_minutes` to push "now" inside the window), cancel from the athlete app, confirm distinct warning toast + purple Late Cancel chip in coach SessionManagementModal + correct attendance-rollup count.
4. **Decide whether to extend the membership-type confirm guard to class types** (EKT / Tu / CFK / CFT) — same accidental-click risk applies to kids' class assignments. Chris not asked yet.
5. **Build Reject/Delete button on Members Pending tab** — currently no UI affordance to remove pending members; only Approve/Unapprove. S306 had to use SQL to clean up Claudia Herrmann. Future feature.
6. **Verify SPF/DKIM/DMARC + test reset flow on deployed app (S297 follow-up)** — Resend → Domains → `the-forge-functional-fitness.de` should show all ✅. Then test the full reset flow end-to-end on live app (should now show "Updating password for [email]" above form).
7. **Mac Chrome hang investigation** — dedicated session. Start with Activity Monitor (Memory Pressure + Chrome Helper processes), disk free %, update status, then hang reports in `~/Library/Logs/DiagnosticReports/`. Will fix Mac push as a side effect.
8. **Athlete subscription bug** — fix Stefan Glocker DB row + investigate webhook ordering + `autoExpireSubscriptions` vs trialing.
9. **Whiteboard duplicate entries** (see `memory/project_whiteboard_duplicates.md`) — uncommitted changes from Session 251 need reviewing/committing. **Note:** S305 backfill may have largely resolved this by retroactively booking whiteboard names; re-evaluate before doing the S251 work.
10. **Score-entry API filter (deferred from S289)** — `app/api/score-entry/[sessionId]/route.ts:48-56` only filters bookings by `status='confirmed'` and ignores `members.status`. If unapprove should cascade to hide bookings, filter in API or cascade-cancel bookings.
11. **Test endpoint 410 cleanup** (deferred from S292) — route `app/api/notifications/test/route.ts` through `sendToSubscription` so expired subs auto-delete on Send Test.

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
