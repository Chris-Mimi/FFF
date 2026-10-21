# Session 423 — Week 43.1–43.2 whiteboard, exercise rename, carry-overs closed (2026-10-21, Opus 5.5, Mac)

## Shipped
| Commit | What |
|:---|:---|
| `c4829f6` | activeContext: S420–S422 carry-overs closed |
| `80a28f9` | Week 43.1 — FS 5RM + AMRAP, 5 sessions (76 WSR, 36 lift entries); preflight `--full` |
| `f05ab7e` | Week 43.2 — 19.10 10:00 endurance repeat (8 WSR) |
| `e975c87` | Chris's stray FS 5RM 12 kg deleted; protocol: never flag 1-vs-7 |
| `0d02479` | Rename Handstand 2-Footed Kick-Up → Handstand Kick-Up: 2-Footed |
| this close | Memory bank, history |

## 1. Mac housekeeping
- `git pull` fast-forwarded S422. 9 files showed `M` but `git diff` (incl. whitespace) was empty — Synology stat artifacts. `git restore` on the 9 → clean. Lost nothing.
- Mac remote already `Chris-Mimi/FFF` (pull URL) — S422 check closed.
- Chris confirmed: Sunday evening lock **21:00** intended; Leaderboard reveal check passed; Split Times OK; S420 checks OK; Week 42 uncertain cells OK.

## 2. Week 43.1 — Front Squat 5RM + 12-min AMRAP
- One board, 38 athletes over 5 sessions: 19.10 17:15 (7) + 18:30 (9), 20.10 17:15 (5) + 18:30 (11), 21.10 09:30 (6). Counts matched bookings exactly; Anfisa (18:30, unbooked) → `book: true`.
- **Chris had left the metcon's scoring fields off** (said so mid-task). New `scripts/week43-1-enable-metcon-fields.ts` switched on load/scaling/scaling_2/rounds_reps on all 5 wods and appended "(Scaling 2)" to both Ham Curl lines (Dec. P-up already said "(Scaling 1)").
- Mapping: 5RM → RM section load + lift_records; DB → Load 1 (Rx = 15/22.5 by gender); Dec. P-up → Scaling 1; Ham Curl → Scaling 2; R+R → rounds + reps.
- **Franzi** already had a 20.10 FS 5RM 35 kg Lifts entry (self-logged) → `no_lift_record`. **Martina** 35 kg "Half squat" → `modified` + note, no Lifts entry → **parity check flags her on purpose**.
- History cross-check (`scripts/week43-1-fs-history.ts`) surfaced Chris's own FS 5RM **12 kg** on 20.04 → deleted later on request.
- Chris's answers on my uncertain list: 1–5 OK as written (Toni 7+24, Carla "Sc"→Sc2, Wayne "Sc2-Footed"→Sc2, Dinny "Rx!"→Rx, AnnaK 11). #6 (Thomas S 11+1 vs 17+7): **"7s are always crossed, there's no reason to mistake a 1 for a 7"** → protocol now says never list 1-vs-7. #7 (5RM jumps Carmine/Julia/Susi): he'll check.

## 3. Week 43.2 — 19.10 10:00
- "Endurance from 17.10.26" repeated Monday 10:00 — the session I'd flagged as having no board in 43.1. 8 names = 8 bookings, R+R only.
- 17.10 rows carry DB load + scaling; this board didn't. Wrote R+R only and asked — **Chris fixed the loads/scaling himself.**

## 4. Stray 12 kg Front Squat
- `scripts/delete-chris-fs-12kg.ts`: the lift_record had a paired WSR (20.04 18:15 FS 5RM section, 12 kg). Chris wasn't booked into that class → deleted both, otherwise the leaderboard keeps 12 kg and parity flags it. Guarded to exactly 1 row each.

## 5. Exercise rename
- "Handstand 2-Footed Kick-Up" → "Handstand Kick-Up: 2-Footed". `scripts/rename-handstand-kick-up.ts`:
  - changes `display_name` only — slug `name` (`handstand-2-footed-kick-up`) kept so pattern/group/tracked links are untouched;
  - rewrites every wod section containing the old name (10 wods / 5 unique, incl. 3 "same as …" mentions);
  - runs the Planner detector old library+text vs new library+text per wod and refuses to write unless the diff is exactly the name swap (S419 rule). All 10 clean — the colon in the new name is no problem.
- Reusable template for future renames.

## Lessons
- **Empty `git diff` + `M` in status = stat-only Synology artifact.** `git restore` is lossless; no need for `reset --hard`.
- **Check the history before writing an RM board** — it found a pre-existing self-logged entry (Franzi) and a stray (12 kg). Writer would have duplicated Franzi's.
- **A stray lift entry usually has a paired WSR** — delete both or parity/leaderboard still show it.
- **1-vs-7 is never uncertain on Chris's boards.** Don't spend his attention on it.
