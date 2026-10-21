# Session 422 — Booking Rules: evening exceptions + workout reveal time (2026-10-21, Opus 5.5, Windows PC)

## Shipped
| Commit | What |
|:---|:---|
| `83047fc` | Morning-lock exceptions by evening (`morning_lock_time_by_day`) |
| docs | One plain command per tool call (claude-rules + session-start file) |
| chore | `Read(~/.claude/**)` allowed in project settings |
| feat | Workout reveal time + exceptions by day; Leaderboard respects it; Booking Rules sections fold away |
| this close | Memory bank, history, Feature Overview |

## 1. PC housekeeping
- `git pull` refused: 4 modified + 7 untracked files. All 11 byte-identical to `origin/main` (Synology copies of Mac work) → `git reset --hard origin/main`.
- GitHub said the repo moved → PC remote set to `https://github.com/Chris-Mimi/FFF.git`. Mac not checked yet.
- **7 permission prompts** in one session despite `Bash` + `PowerShell` allowed. My commands were compound (`a; b`, `$(…)`, `>` redirects, `sed -i` on a scratchpad file). After switching to single commands, stage/commit/push ran without prompts — confirmed by Chris. Rule written to claude-rules (also replaces the `build > log; echo $?` advice).
- "Allow reading from …" = a Read outside the project (`~/.claude/settings.json`). Chris: "I only ever say yes" → `Read(~/.claude/**)` added to `.claude/settings.json` (git-tracked, both machines).

## 2. Morning lock — exceptions by evening
- Chris moved the default lock 20:00 → 18:00 but needs Sunday later (weekly schedule release). His first save hadn't stuck (DB still 20:00) — checked the row before building.
- Why Sunday matters: release 15:00, Wellpass-restricted offset 180 min → restricted members open at 18:00, exactly when an 18:00 lock would close Monday mornings.
- First proposal was one "release-day lock time" field; Chris asked for **any day**, with a "Default" choice like the Split Times bulk edit ("keep as is").
- `booking_rules.morning_lock_time_by_day jsonb` — key = JS getDay of the **evening the lock happens**, value `HH:MM:SS`. `sessionAutoLockInstant` picks the override for the previous calendar day, so the booking page, create/cancel guards and coach badges stay identical.
- UI: one dropdown per evening (Monday → Sunday), "Default (18:00)" + half-hour steps 12:00–23:30, teal when set.
- Tested: Mon 09:00 → Sun 20:00, Tue 09:00 → Mon 18:00, across the 25.10 DST change.
- DB now holds `{"0":"21:00:00"}` — Chris picked 21:00, not 20:00 as discussed. Ask.

## 3. Workout reveal time
- Question: when do paying athletes see a published workout? Answer from code: **2 h before class, booked classes only**, hard-coded in `AthletePageWorkoutsTab.tsx` and `useLogbookData.ts`. No coach UI.
- **Found a leak:** `LeaderboardView.loadWods` lists every published workout Mon–Sun of the selected week, future days included, and shows the selected section's full text. No reveal or booking check.
- Chris chose option 3 (setting + Leaderboard follows it), with per-day exceptions like the evening ones.
- `workout_reveal_minutes int default 120` + `workout_reveal_minutes_by_day jsonb` (key = getDay of the **class** day, value minutes). `workoutRevealInstant()` + `loadWorkoutRevealConfig()` (one fetch of `/api/booking-rules/public` per page load, falls back to 120).
- Leaderboard: a workout is listed once **any** of its sessions has passed its reveal time (17:15 shows once 09:30 is revealed — same text). Filtered before the sibling grouping; no results exist for unrevealed workouts, so pooling is unaffected.
- Left alone: the grouped date range ("12 Oct – 2 Nov") still hints that a workout repeats. Text isn't shown.
- Admin UI: "Show workout to booked athletes" (minutes) + folded "Exceptions by day" (Default, At class start, 15 min … 2 days). "Auto-lock lead time by session type" and "Exceptions by evening" are now `<details>`, closed by default, with a teal "(N set)" count.

## Lessons
- **New `booking_rules` columns: SQL before push.** `getBookingRules()` selects a fixed column list; a missing column errors and the app silently falls back to `DEFAULT_BOOKING_RULES` — which has the morning lock OFF. Both migrations this session were run and verified (service-role read) before pushing.
- **Check the saved value before building on it** — Chris's 18:00 change wasn't in the DB.
- **Read the other views of the same data.** The question was about the Workouts tab; the Leaderboard showed the same text with no gate.
- **Compound shell commands prompt even when the tool is allowed.** One command per call; independent ones in parallel.
