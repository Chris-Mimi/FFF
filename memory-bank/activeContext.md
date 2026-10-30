# Active Context

**Version:** 296
**Updated:** 2026-10-30 (Session 428 — Opus 5.5, Mac. **Closed S427 retroactively from git history: Planner flags rounds 1–3 + Section F batch 1 applied, generic Planner defaults removed.** Previous: S426 — activeContext trim, homepage timetable link, Planner flags re-check.)

---

## 🖥️ DEV ENVIRONMENT (read first, every session)

**Chris works on TWO machines, with the project folder synced via Synology Drive:**

- **Macbook** = primary development machine. Code is written, committed, and **pushed to GitHub** there.
- **Windows PC** (this machine, path `c:\Users\Chris\SynologyDrive\AI Development\forge-functional-fitness`) = secondary, used for sessions like this one.

**Source of truth = GitHub `origin/main`**, NOT the local working tree on Windows.

Synology Drive syncs files in the background and is **not git-aware**. When Chris pushes from the Macbook and then opens a session on the Windows PC, Synology may not have finished syncing — so `git status` on Windows shows ghost "uncommitted changes" (modifications, deletions, untracked files) that are really just stale sync artifacts predating the Macbook push.

**Session-start workflow on Windows:**

1. `git fetch origin`
2. If `git status` shows local changes Chris didn't make in *this* session, they're sync artifacts — run `git reset --hard origin/main && git clean -fd` to discard them and match remote exactly. Confirm with Chris first only if there's genuine uncertainty.
3. Then proceed as normal.

**Do NOT** treat ghost local changes as a merge conflict to resolve — that wastes a session diagnosing nothing. Trust GitHub.

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

_Updated at every session close. The "first 5 minutes of tomorrow" — read this immediately after the regular activeContext + latest project-history file._

**S427 (2026-10-30, Mac) — Planner flags applied (closed in S428):** S426 list + runs + Section F batch 1 (F1–F25) done; generic Pull-up/Push-up/HSPU/Sit-up/Row defaults gone; C&J also credits a Clean. Rewrite tool: `scripts/rewrite-workout-lines.ts` (exact-line, Planner before/after per workout — watch for U+00A0 non-breaking spaces in lines).
- **Next: Planner flags** — (1) 7 Oct "Pendlay Rows" notes: Chris already deleted ✅ (S428). (2) Section F batch 2 ✅ done S428 (33 wods, 5 new library entries). (3) Defaults (item 21) ✅ removed S428 — no generic-word translations left. (4) Diapers & Dumbbells: Chris to choose "treat like Turnen" vs "fix like other classes". Detail: S427 section of `memory-bank/planner-false-flags-todo.md`. Plural fixes only where the movement has no other credit in the WOD.

**S426 (2026-10-30, Mac) — Chris's answers to the S425/S424 lists:** `/stundenplan` is live on the website ✅ · home-page "Hier" link → `/training-kurs-buchen#stundenplan` (Chris added `<div id="stundenplan" style="scroll-margin-top:100px;"></div>` above the iframe in the Squarespace Code block) · fra1 speed: "not sure" yet · Planner Benchmarks: he'll check · mobile Athletes list ✅ · Wed 28.10 18:00 WOD: deleted by Chris · S424 eyeball (dusty-gold cards, Custom Movements labels, Session Types survive close) ✅ · activeContext trimmed (466 lines → this; old entries were all in `project-history/`).
- Planner flags rules: show Planner old-vs-new diff before writing (S240 batch rule). **Never check FitKids Turnen / Eltern-Kind-Turnen** (Mimi's notes). Shorthand is fine if the library name is elsewhere in the same WOD. Write dates as "9 Feb", not "09.02".

**S425 carry-forward:**
- **First action: 28.10 17:15 + 18:30 boards (+ rest of Week 44) when Chris uploads.** Scored through 28.10 09:30.
- **`/stundenplan`** (`app/stundenplan/page.tsx`): only that path is framable (`next.config.ts` CSP frame-ancestors: website + `*.squarespace.com`). **Chris once asked for FAKE attendance numbers — declined (UWG misleading advertising); badge only when true (≥70% "Nur noch wenige Plätze", full "Ausgebucht – Warteliste").** Don't build fake social proof if asked again. Side-by-side offset classes (≤10 min apart) merge into the quarter-hour one.
- **Slowness:** functions now fra1 (`9e08abb`). If a page is still slow, count its browser-direct Supabase queries.
- **Writer (`scripts/enter-whiteboard-scores.ts`) writes `benchmark_results`** for benchmark / forge-benchmark sections, like the save route. Times with tenths stored as written.
- **A coach on the board in another class's block trained there** — board position is the truth for coaches, even if booked elsewhere.

**Still-live working rules (detail in claude-rules / `memory-bank/whiteboard-score-entry-protocol.md` / project-history):**
- **WRITE FIRST, REPORT AFTER** on ambiguous board data; hand Chris a short numbered list of what was uncertain. Safe enabling changes (switching a scoring field ON) are mine — say so. Destructive still needs asking.
- **Whiteboard tools:** `scripts/whiteboard-preflight.ts <date> [time] [--photos] [--full]` → `scripts/enter-whiteboard-scores.ts <board.json> [--commit]`. Never a bespoke per-board script. Protocol covers coverage sweep, dash rule ("—" = modified + "Did not score"), `"book": true`, Endurance `Nx` = N × 10m, crossed 7s.
- **Photo labels can be swapped, and one photo can hold two sessions** — open the photos before saying "no photo".
- **Parity check has 1 expected flag:** Martina Fenster 20.10 FS 5RM 35 kg (half squat, `modified`, no Lifts entry on purpose). Anything else is new.
- **`track` is a silent leaderboard lever** — unmarked on a board that marks any `Trk2` = Track 1, fill them. `scoring_fields.track` gates the modal, not the save route.
- **Changing a lift on a scored section never removes the old Lifts entries** — clean up by hand. Don't recreate Lifts entries for paused bench or Weekend WOD #26.14 Pendlay.
- **Board quirk:** an improved repeat score overwrites the original row — no second row.
- **Reading digits:** count strokes, not closures — Chris's 8 can have an unjoined bottom loop.
- **`\b` in a search pattern breaks on a non-word first char** (`#`, `(`, umlauts) — use `utils/search-pattern.ts`.
- **Don't widen a guard rail nobody asked about** — ship the ask.
- **Exercise rename:** `scripts/rename-exercise.ts "<old>" "<new>" [--also "<alias>"] [--commit]` (refuses unless the Planner diff is exactly the swap).
- **Booking rules per-day maps:** `morning_lock_time_by_day` (key = getDay of the LOCK EVENING), `workout_reveal_minutes_by_day` (key = getDay of the CLASS day). **New `booking_rules` columns: SQL first, then push** — a missing column silently falls back to defaults (morning lock OFF).
- **Custom Movements gotcha:** `exercise_groups.exercise_ids` only render if each id is also in `coach_tracked_exercises` (add with `active:false`).
- **Split Times:** stats + time cap from Rx only, cap built on the fastest, members only (5 "(ex)" legacy rows until Chris deletes them).

**Open with Chris — don't chase:**
- **Jan Huelbig:** 11.10 in-app 10-card purchase blocked by Stripe's own risk filter (no charge). Waiting for Jan. If blocked again → cash/transfer + **Close & Issue New**.
- **Michael Weber:** on Marion's Wellpass. When he returns to the 10-card: switch Pay with back + enter the purchase date.
- **Stoffer:** parked by Chris (Torben's old Wellpass link).
- **S424 uncertain list** only if Chris raises it: Mimi 23.10 GHD 66, Carmine 21.10 Row 25 cals, Lena FS 5RM 47.5 > Feb 1RM 45, Anja booked 21.10 18:30 by guess.
- **Decided, don't revisit:** delete-session notification = NO; 15.08 Endurance block = Chris himself; Wellpass manual-link button = NO (I add links in the DB and tell him).
- **Not translated yet:** `components/ui/NotificationPrompt.tsx` preference labels + non-10-card booking messages.

**Chris's Mac (not project work, only if he raises it):** disk is NOT full (~400 GB effectively free). Capture script at `~/mac-incident-data/capture.sh` — run it when the next app-launch/auth freeze hits.


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

**Session 427 (2026-10-30 — Opus 5.5, Mac) — PLANNER FLAGS APPLIED + SECTION F BATCH 1 (all pushed; closed in S428)**
- S426 21-item list + Bear Crawl Forwards + all "400m Run"-style lines → library names in 72 wods (`2e68b69`); NEW `scripts/rewrite-workout-lines.ts`.
- Generic Pull-up/Push-up/HSPU/Sit-up/Row defaults removed from the Planner detector — text names the library variant now.
- Clean & Jerk also credits a Clean (`26c8753`); plural fixes only where no other credit in the WOD; 18 Aug wallball progression on library names.
- Round 3 + Section F F1–F25 in 40 wods (`081700b`); new library: Strict Rings Hanging L-Sit High Raise, DB Bent Over Row Double, Wallball Deadlift, Push-Up Bottom Position Hold, High Frogger.
- Open: 7 Oct evening "Pendlay Rows" Intro notes (ask Chris), Section F batch 2 (F26–F97).

**Session 425 (2026-10-26→30 — Opus 5.5, Mac) — RECENCY BANDS, FRA1 REGION, PLANNER BENCHMARKS, PUBLIC TIMETABLE, WEEK 44 (all pushed, build clean)**
- Recency bands 21/42/63/84 days (+ grey 12 wk+) everywhere incl. Movement Tracking; legends in weeks (`31630ce`, `337dbd8`, `3825533`).
- Vercel functions iad1 → fra1 (`9e08abb`). NEW Planner **Benchmarks** panel: last programmed, count in view period + total, every date → calendar, click name = description (`4efc123`, `149f819`).
- Rename "Dead Stop Knees to Bar (BMU drill)" → "BMU Drill: Dead Stop Knees to Bar" (library + 12 wods incl. 4 short spellings); `scripts/rename-exercise.ts "<old>" "<new>" [--also]` (`cab9c80`).
- Whiteboard: 44.1 KB ladder, 44.2 speed test (5 sessions), 25.10 couplets from 43.4 (Track 1) — 65 WSR + 30 Forge Benchmark entries; fixes Chris/Magdalena/Track.
- Mobile Athletes list fills screen until an athlete is picked (`9086ad7`). NEW public `/stundenplan` for the website (`4b4493b`, `e220ed0`).

**Session 424 (2026-10-24 — Opus 5.5, Mac) — WEEK 43 WHITEBOARD DONE, DASH RULE, 3 COACH UI FIXES (all pushed, build exit 0)**
- 10 under-used warm-ups for a Push Press / KB Clean & Press / Roll-out / Inverted Goblet Squat WOD (recency query #4 shape, Planner Pre-Workout group + KB groups).
- Week 43 rest: 21.10 17:15 FS (Lena/Valerie/Lukas + 3 lift entries), 21.10 17:10 metcon, 3-station HSPU board (21.10 18:30, 23.10 09:00 + 18:30), 23.10 17:15 KB ladder — 89 WSR; Anja booked. Parity: only Martina (expected).
- Dash rule + 8 rows flagged "Did not score" (`c286662`).
- Specialty/Party/Other calendar cards: amber → dusty gold `#b08d57` (`c54fc89`).
- Custom Movements: "N groups" / red "no group" label per tracked exercise — the X removes from groups too (`3e8d9ce`). Box Jump + Squat Box Jump = no group.
- Workouts panel close no longer clears Session Types (`ce38067`).

**Session 423 (2026-10-21 — Opus 5.5, Mac) — WEEK 43.1–43.2 WHITEBOARD, EXERCISE RENAME, CARRY-OVERS CLOSED (all pushed, build exit 0)**
- Mac: 9 Synology ghost-modified files (empty diff) restored; remote already Chris-Mimi/FFF. S420–S422 checks confirmed; Sunday evening lock 21:00 intended.
- Week 43.1: FS 5RM + 12-min AMRAP across 19.10 17:15/18:30, 20.10 17:15/18:30, 21.10 09:30 — 76 WSR + 36 lift entries; metcon fields switched on + Ham Curl "(Scaling 2)"; Anfisa booked.
- Week 43.2: 19.10 10:00 repeat of the 17.10 endurance AMRAP, 8 WSR (R+R only; Chris added loads/scaling himself).
- Deleted Chris's stray FS 5RM 12 kg (20.04 lift entry + its WSR — he wasn't booked in that class).
- Renamed "Handstand 2-Footed Kick-Up" → "Handstand Kick-Up: 2-Footed" (library + 10 wods, Planner diff verified).

**Session 422 (2026-10-21 — Opus 5.5, Windows PC) — BOOKING RULES: EVENING EXCEPTIONS + WORKOUT REVEAL TIME (all pushed, build exit 0)**
- Morning lock: per-evening exceptions (`83047fc`) — Sunday stays later so Wellpass-restricted members (release 15:00 + 180 min = 18:00) can still book Monday mornings.
- Workout reveal: was hard-coded 2 h in two athlete files; now a setting + per-day exceptions. Leaderboard listed every published workout of the week incl. future days with full section text → now hidden until reveal time.
- Admin → Booking Rules: session-type lead times, evening exceptions and day exceptions fold away with a "(N set)" count.
- PC: stale Synology copies reset to origin; remote → Chris-Mimi/FFF; one-command rule; `Read(~/.claude/**)` allowed.

**Older sessions (57-421):** See `project-history/` folder.

---

## 🚨 Known Open Issues

- **"Dead tabs" root cause found S419 (12.10) — NOT a login problem; the "stale-login" label below was wrong.** With the Workouts → Athletes filter **muted**, [app/coach/page.tsx](app/coach/page.tsx) passed a fresh `[]` to `useCoachData` every render → its search effect re-fired every render and set new empty state → endless re-render with no network traffic → `router.push` (a low-priority transition) never committed, so every header tab was dead while Workouts (plain state) worked. `coach_selected_athletes_muted` lives in localStorage, hence: survives hard refresh, cured by clearing site data, fine in Incognito. Introduced by the S397 mute feature (`8dce682`, 14.07); first freeze S398 (18.07). Evidence from Chris's broken tab: typed `/coach/members` loads fine (server accepts login), the tab click's request returns normally (304 + page script), console clean. Fix: shared `NO_MEMBERS` constant + the empty-filter branch keeps the same state object. **✅ Confirmed by Chris 12.10: filter was muted; clicking unmute instantly completed a queued tab click (landed on Schedule); after deploy (`108ae5f`) muting no longer kills the tabs.** Surfshark VPN was on throughout and played no part. The S398 "corrupted cookie" diagnosis and the S400 middleware self-heal were aimed at the wrong cause (self-heal is harmless, leave it).

- **Partial `track` columns silently demote athletes (S411)** — `leaderboard-utils.ts:380-382` compares track *before* scaling and treats a missing track as `4`. If a session has tracks on some athletes and not others, the unmarked ones rank below everyone marked. Convention: unmarked on a board that marks any `Trk2` = Track 1, so **fill the blanks**. Not a code bug — a data-entry hazard.
- **Cancelling a pre-booked session after a renewal can show `-1/10` (S416)** — when the old card was filled by future bookings, the new card's offset is negative; an in-time cancel of one of those makes Sessions Used −1. Numbers are right (11 available), display odd. Offered to tidy, not asked for.
- **`ten_card_purchase_date` missing on 19 of 75 card holders (S411, recount S416)** — any logic gated on "is this session inside the card's window" silently excludes a third of them. The 10-card chip now falls back to "today onwards", but new code touching card windows must handle the null. Root cause is the parked paper-card backlog (Next Steps 0e).
- **Deleting a session notifies nobody (S410 — Chris decided S412: leave as is; S416: use Cancel Session when athletes are booked — it notifies AND refunds 10-cards)** — `app/api/coach/delete-session/route.ts` imports no notification helper, so a coach deleting a session silently removes every booking (cascade FK) with no message to the athletes. Removing a *single* booking DOES notify. Hit live in S410: 12 athletes booked into 20.09 10:00, session deleted, nobody told. Fix is a notify loop over the bookings before the delete — needs Chris's go-ahead on wording.
- **`notification_log` is incomplete as a booking record (S410)** — only 4 of 12 bookings for the deleted session left a trace, despite the coach-booking path logging its own message. Unexplained; don't rely on it for recovery without caveating.
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

1. **Whiteboard Week 44** — next = 28.10 17:15/18:30 + rest of the week (when Chris uploads).
2. **S425 checks still open (Chris):** pages faster after fra1? (not sure yet) · Planner Benchmarks panel numbers (he'll check). Everything else from S424/S425 confirmed (S426).
3. **Planner false flags — in progress (S427):** S426 list, runs and Section F (both batches, S427/S428) done. Defaults removed (S428). Left: Diapers & Dumbbells — Chris to choose treat-like-Turnen vs fix (`--exclude`/`--only` take a regex). Detail: S427 section of `memory-bank/planner-false-flags-todo.md`.
4. **Planner flags audit — RECURRING every 3 months (Chris, S428). Next due: end of Jan 2027** (then end Apr, Jul, Oct). Two commands, both with `--exclude "turnen|diapers" --since 2026-10-30` (then the date of the last audit): `npx tsx scripts/audit-movement-false-flags.ts` (false credits) and the same with `--uncounted` (programmed lines that count as nothing). Also check library names for stray spaces (S428 found 3 — "Supine Pigeon Piriformis " never matched). Fix text to library names / add library entries, numbered list → Chris OKs → `scripts/rewrite-workout-lines.ts`. Remind Chris at session start when due. Last done: S426–S428 (Oct 2026).
5. **Sunday Wellpass sync (weekly, Chris):** `/coach/members` → Wellpass → Sync from Excel before sessions go live. Skim `blocks_applied`/`blocks_cleared`.
6. **Optional, only if Chris asks:** delete the 5 "(ex)" Split Times scores · X-on-grouped-exercise warning · tidy Box Jump + Squat Box Jump (no group) · confirm/undo guard for copy-over of a published single-session WOD · deeper pale palette picks (`#C2DFFF`,`#F4CDE0`,`#E8F86D`).
7. **S410 optional follow-ups:** (a) `notification_log` held only 4 of 12 bookings for a deleted session — understand before trusting it for recovery. (b) Unpublishing still clears `publish_sections` (deliberate). (c) Chip noise from naming variants ("Pull-up"/"Pull-ups"/"Pull-up Strict") — fix names, not code.
8. **Paper-card sync remainders (~12 holders)** — parked pending parent contact. `npx tsx scripts/list-ten-card-no-purchase-date.ts`. Frida Engels has a duplicate row from a parent-kid mix-up.
9. **Retroactive 10-card bookings for 8 athletes (S336 carry)** — `npx tsx scripts/probe-unbooked-whiteboard-athletes.ts` for the list; book via Session Management, check the chip (⚠ = mismatch → TenCardModal → Recalc → Save).
10. **Old prod checks never confirmed:** S372 Logbook multi-scale (20.02.26 17:15 "Tabata This" shows 3 scales + loads) · S371 athlete Benchmarks leaderboard (Best + Last, default Last) · S341 Planner `[ All | RM Testing only ]` · S338 AKBS Deadlift "WOD Pt.3" (Chris 47/20 above Madeleine 48/12). Ask Chris once whether to check or drop.
11. **Next-intl i18n (DE/EN)** — for commercialization; ~1 day. Stop adding inline German until then. Memory: `project_commercialization_and_i18n.md`.
12. **SPF/DKIM/DMARC + reset-flow test (S297)** — Resend → Domains should be all ✅, then test reset end to end.
13. **Mac Chrome hang** — only if Chris raises it (capture script above).
14. **Low-priority code backlog:** score-entry API ignores `members.status` (S289) · test-push endpoint doesn't clean 410s (S292) · `fetchWODs` error logging shows `{}` (S322) · anon-key diagnostic scripts (S323) · optional derived "Guardian" badge (S324) · re-tune booking countdown (amber 2h / red 30m) and Statistics chip dimming (10%/30%) if anyone complains.

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
