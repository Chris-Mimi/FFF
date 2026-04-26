# Active Context

**Version:** 179.0
**Updated:** 2026-04-26 (Session 318 — multi-fix: change-password, search, TZ, subscription gate, reorg)

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

**Session 318 (2026-04-26 — Opus 4.7) — MULTI-FIX (CHANGE-PASSWORD, SEARCH, TZ, SUBSCRIPTION GATE, REORG):**
- **Athlete Change Password** — button on athlete Security tab was a stub with no `onClick`. Wired it up via `supabase.auth.updateUser` mirroring the coach profile pattern. Inline expand within the tab. [components/athlete/AthletePageSecurityTab.tsx](components/athlete/AthletePageSecurityTab.tsx)
- **Coach Members live search** — added a search input above the member grid (filters by name/display_name/email, case-insensitive substring, combines with existing tab/membership/class/age filters). [hooks/coach/useMemberData.ts](hooks/coach/useMemberData.ts) + [app/coach/members/page.tsx](app/coach/members/page.tsx)
- **CRLF/Synology line-endings fix** — diagnosed 358-file phantom diff. Created `.gitattributes` with `* text=auto eol=lf` + ran `git add --renormalize .` (430 files normalized in one commit). NOTE: `.gitattributes` was initially missed by the renormalize commit because it was untracked; the follow-up commit `3032a35` actually added it to the repo.
- **Next-week release timezone fix** — `getMaxVisibleSessionDate` in [lib/bookingRules.ts](lib/bookingRules.ts) was using `new Date()/getDay()/setHours()` which run in server-local time = UTC on Vercel. A release time of `16:00` was being interpreted as UTC = 18:00 CEST, blocking next-week bookings for an extra 2h every Sunday. Now uses `Intl.DateTimeFormat` with `timeZone: 'Europe/Berlin'` to evaluate "now" and convert wall-time → UTC instant. Works across CET/CEST. **CHRIS BAND-AID:** dropped release time to `14:00` to unblock today's bookings while the fix deployed; needs to reset to `16:00` in Admin → Booking Rules before next Sunday or release will fire 4h early.
- **Athlete subscription gate fix** — Aline von Rüden (10-card holder) couldn't subscribe to the Athlete App; saw "Membership type not assigned. Please contact your coach." Old gate required `member` or `wellpass` in `membership_types`. Chris's actual rule: only `member` (regular gym members) gets the discount Member tier (€8/mo); everyone else (`wellpass`, `10`, `Hf`, `Di`) pays the Wellpass tier (€10/mo). Touches 3 files: [components/athlete/AthletePagePaymentTab.tsx](components/athlete/AthletePagePaymentTab.tsx) (gate + section title "Standard Plan"), [app/api/stripe/create-checkout/route.ts](app/api/stripe/create-checkout/route.ts) (server validation), [components/coach/members/MemberCard.tsx](components/coach/members/MemberCard.tsx) (1yr/∞ activation buttons require any ticked type, not specifically Mb/Wp; orange hint changed to "Tick a membership type first").
- **Stripe fees doc** — Chris asked about Stripe fees on €100/yr and €8/mo plans. Wrote `Chris Notes/Deployment/stripe-fees-athlete-app.md` with both tier comparisons. Key insight: monthly billing nets ~€13–17 more per athlete than yearly because the fixed €0.25 fee is a much smaller % of monthly charges + the lower yearly price wipes out fee efficiency.
- **Chris Notes folder reorg** — added `.md` extensions to 10 files; created `Workflow & Git/`, `Deployment/`, `Database & Supabase/`, `Archive/` folders; moved 23 files in. Activated path updates in this file. **STAGING MISTAKE:** the booking-error patch (commit `d53bae8`) accidentally bundled the reorg renames because they were already staged from `git mv`. Functionally fine, but the commit message says only "fix(coach): expose real Supabase error" while the changeset includes 24 file renames.
- **Booking error toast clarity** — generic "Failed to book member" was hiding the real Supabase error. Now extracts `.message`/`.details`/`.hint`/`.code` from the Supabase error object and detects the `unique_active_bookings` violation specifically. Required two attempts: first attempt did `String(error)` which produced `[object Object]` because Supabase errors are plain objects, not Error instances. Fixed in commit `1153275`.
- **C. Schultz booking blocker (NOT FIXED — carries to next session):** she late-cancelled a WOD on 2026-04-23 then did Open Gym instead. Her row stayed with `status='late_cancel'`. The unique-active-bookings partial index excludes only `cancelled` (not `late_cancel`), so she can't be re-booked. **The unique index needs updating** to also exclude `late_cancel` and `coach_cancelled`. Migration drafted in Notes for next session. Carole's row also needs manual fix in Supabase (change to `cancelled` or `confirmed`).
- **OG attendance flow design — DEFERRED:** Chris wants OG-attended athletes to still appear booked. Three options proposed (A: new `attended_og` status, B: just allow re-book to confirmed, C: separate OG session type). Decision pending.
- **Memory updates:** none new this session — issue causes are documented inline above.

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

**Older sessions (57-313):** See `project-history/` folder.

---

## 🚨 Known Open Issues

- **`unique_active_bookings` partial index excludes only `cancelled`** (S318) — needs to also exclude `late_cancel` and `coach_cancelled`, otherwise athletes who late-cancel or are coach-removed cannot be re-booked. Affects Session Management modal + any coach-side booking re-add. Migration drafted, not yet run.
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

1. **PRIORITY — Fix unique-active-bookings constraint (S318 carry-over).** S316 introduced `late_cancel` but the partial unique index on `bookings(session_id, member_id) WHERE status != 'cancelled'` was never updated. Athletes who late-cancel can't be re-booked. Migration:
   ```sql
   DROP INDEX IF EXISTS unique_active_bookings;
   CREATE UNIQUE INDEX unique_active_bookings
     ON bookings(session_id, member_id)
     WHERE status NOT IN ('cancelled', 'late_cancel', 'coach_cancelled');
   ```
   Save as `database/fix-late-cancel-rebooking.sql`. Chris runs in Supabase SQL Editor.
2. **Manual fix Carole Schultz** — Supabase `bookings` table → her `late_cancel` row for 2026-04-23 WOD → change `status` to `cancelled` or `confirmed`. (Skip if Chris already did it.)
3. **Discuss OG (Open Gym) attendance flow with Chris** — three options proposed (A: new `attended_og` status; B: just allow re-book to confirmed; C: separate OG session type). Decision pending.
4. **Confirm Chris reset next-week release time to `16:00`** in Admin → Booking Rules. He set it to `14:00` as band-aid this session. The TZ fix is live (Berlin wall-clock interpretation), so leaving `14:00` would fire 4h early next Sunday.
5. **Live-test German login error messages (S317)** — incognito → login page → try (a) non-existent email expect "Kein Konto..."; (b) real email + wrong password expect "E-Mail-Adresse erkannt..."; pending/blocked branches unchanged logic (just translated).
6. **Set up `next-intl` i18n (DE/EN bilingual)** — Chris plans to commercialize. The ~11 inlined German strings from S317 should migrate to `messages/de.json` + matching `messages/en.json`. ~1 day of dedicated work. Stop adding more inline German until this lands. Memory: `project_commercialization_and_i18n.md`.
7. **Live-test the late-cancel gate (S316)** — cancel a confirmed booking past auto-lock threshold from athlete app, confirm distinct warning toast + purple Late Cancel chip in coach SessionManagementModal + correct attendance-rollup count.
8. **Decide whether to extend the membership-type confirm guard to class types** (EKT / Tu / CFK / CFT) — same accidental-click risk applies to kids' class assignments. Chris not asked yet.
9. **Build Reject/Delete button on Members Pending tab** — currently no UI affordance to remove pending members; only Approve/Unapprove. S306 had to use SQL to clean up Claudia Herrmann.
10. **Verify SPF/DKIM/DMARC + test reset flow on deployed app (S297 follow-up)** — Resend → Domains → `the-forge-functional-fitness.de` should show all ✅. Then test the full reset flow end-to-end on live app.
11. **Mac Chrome hang investigation** — dedicated session. Start with Activity Monitor (Memory Pressure + Chrome Helper), disk free %, update status, then hang reports in `~/Library/Logs/DiagnosticReports/`. Will fix Mac push as a side effect.
12. **Athlete subscription bug** — fix Stefan Glocker DB row + investigate webhook ordering + `autoExpireSubscriptions` vs trialing.
13. **Whiteboard duplicate entries** (see `memory/project_whiteboard_duplicates.md`) — uncommitted changes from Session 251 need reviewing/committing. **Note:** S305 backfill may have largely resolved this by retroactively booking whiteboard names; re-evaluate before doing the S251 work.
14. **Score-entry API filter (deferred from S289)** — `app/api/score-entry/[sessionId]/route.ts:48-56` only filters bookings by `status='confirmed'` and ignores `members.status`. If unapprove should cascade to hide bookings, filter in API or cascade-cancel bookings.
15. **Test endpoint 410 cleanup** (deferred from S292) — route `app/api/notifications/test/route.ts` through `sendToSubscription` so expired subs auto-delete on Send Test.

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
