# Session 421 — PC catch-up + Toolkit Split Times (2026-10-17→18, Opus 5.5)

## Shipped
| Commit | What |
|:---|:---|
| `e523b89` | Session-start file: no `cd … &&` chains; Windows reminder retired |
| `538178c` | Toolkit tab (then "Pacing") + tables + note import script |
| `add38ee` | Renamed to **Split Times**; Feature Overview section |
| `ec3897b` | Time cap built on the fastest + adjustable margin |
| `694fb6e` | Stats + cap from Rx scores only; scaled listed below |
| `e1571a7` | Round + place-in-round, one-workout entry form, bulk edit |
| this close | Memory bank + history |

## 1. Windows PC brought level with the Mac
- VS Code user settings: only `claudeCode.initialPermissionMode: acceptEdits` was missing → added ("Edit automatically" confirmed).
- `~/.claude/settings.json`: added `effortLevel` + `agentPushNotifEnabled`, kept the PC's `PowerShell` allow.
- "Two Claude Codes" = one extension with two chat views, not a double install.
- `.env.local` on the PC had 3 of 18 keys → replaced via a temp Synology folder, then deleted. **The SynologyDrive root does not sync to the PC; the AI Development folder does** (auto-memory note added).
- 42 auto-memory notes copied the same way; the PC's own `dev_environment_synology_sync.md` brought back to the Mac.
- PC kept prompting because its Claude prefixed `cd "/c/…" && …` — compound `cd` chains always prompt. Rule added to the session-start file.
- 9 code files show `M` on the Mac but are byte-identical to HEAD (Synology touched them at 14:30) — left alone.

## 2. Split Times (Toolkit)
Replaces the Aids note "Endurance scores for reference": times for PARTS of WODs, used when writing for-time workouts.
- **Tables:** `pacing_tasks`, `pacing_scores`; coach-only RLS (pattern from `coach_member_notes`); anon read returns 0.
- **Cards:** fastest / median / slowest with names, dot strip, ♀/♂ amounts shown separately (gender from `members.gender`).
- **Rules from Chris:**
  - Members only. Ex-athletes from the note are kept as `legacy_name` "(ex)" until he deletes them.
  - Program for the fastest: cap = fastest total + transitions + margin (default 10%). First version used slowest + 10% — wrong.
  - Scaled never ranks above Rx: stats from Rx (unmarked = Rx); scaled listed after Rx in grey.
  - Dates matter: date opens `/coach?date=` (existing deep link).
  - "When" = round (1st / middle / last / no rounds) × place in round (first task / mid-round / last task). Freshness colours: teal fresh, amber in between, orange tired.
  - He enters one WOD at a time → shared date/round/place/scale at the top, then name + time rows; tick boxes for bulk edit/delete.
- **Import** (`scripts/import-pacing-from-note.ts`, dry run by default, refuses a second run): 13 tasks, 107 scores. Date on a line carries down to later lines in the section (Chris's rule); header dates as defaults; two times = 1st/last round. JürgenB SkiErg last round "?" skipped. Later Chris supplied 23.05.23 for the three undated tasks (35 rows updated).
- **Library names:** Run 400m / Run 1600m are library exercises, so amount is left empty; Bear Crawl → "Bear Crawl Forwards" (no plain Bear Crawl) — Chris may change it.

## Lessons
- **Ask how the coach programs before inventing a formula.** "Slowest + 10%" looked sensible but contradicts CrossFit practice (cap for the fastest, the rest scale).
- **Scaled vs Rx belongs in any ranking-style number**, not just leaderboards.
- **`*.sql` is gitignored** — migrations need `git add -f`, as older ones were.
- **`console.log` treats `%d` in a string as a format token** — a diagnostic printed garbage for an ILIKE pattern `%dele%`. Don't put `%` patterns in the first argument.
- A mock-up with the user's real data got quick, concrete feedback (name, Rx rule, dates, when-criteria all came after seeing it live).

## 3. Week 42 whiteboard (continued 20–21.10)
Coverage sweep clean (kids / D&D / Thursday skipped). Boards `boards/2026-W42-1.json`, `-2b`, `-3`, `-4`; 90 WSR across 9 sessions, parity OK.
- **42.1** KB AMRAP 12.10 17:15 + 18:30 (Track 1) and 13.10 18:30 Foundations (Trk2; Amelie + Christian T Trk1). Right-column arrows carry a value down to the arrow head. Impossible Plank → `scaling_3` switched on.
- **42.2b** 14.10 endurance chipper: lunge load + time; capped athletes = cap time + "!" note listing what was missed.
- **42.3** 16.10 3×5-min AMRAP (score = sum of AMRAPs, three loads + two scalings) + 17.10 endurance AMRAP (Chris booked in).
- **42.4** 18.10 AMRAP; 11:00 trials AnnaM + Ferdy.
- **Mistake 1:** booked parked member Anna Maria Baur for "AnnaM", who was a listed trial. Cause: I grepped the preflight output and dropped its trial-names line. Undone; protocol rule added.
- **Mistake 2 (not mine, but worth knowing):** after I wrote 14.10 18:30 (Sled = Load 1, Lunge = Load 2), Chris aligned the section with 17:15 (Lunge = Load 1, Load 2 off). Turning Load 2 off wiped the weights → restored into Load 1.
