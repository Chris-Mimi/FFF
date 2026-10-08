# Session 418 — Lift-entry cleanup, Week 41 whiteboard, kids' athlete pages (2026-10-08, Opus 5.5)

## Shipped
| Commit / action | What |
|:---|:---|
| `65e280b` | Whiteboard writer writes `lift_records` for non-RM lift sections too (same rep_scheme / dedupe key as the save route) |
| `ab544a4` | Parity check covers non-RM lift sections; `.error` checked on every query |
| `01ed913` | Temporary failing workflow → GitHub failure email confirmed at chris@, then removed |
| DB | 22 paused Bench Press 5x5 Lifts entries deleted (Chris swapped lift → exercise on 5 wods) |
| DB | 30 duplicate Clean & Jerk 5x5 Lifts entries deleted (each had a 5RM twin) |
| `1580952`, `468fdcf` | Week 41.1 + 41.2 boards — 97 WSR, 33 lift_records, 3 bookings; writer `no_lift_record` option |
| `82cf768` | Save route: kids' benchmark / lift entries keyed by member id |
| DB | 8 kids' benchmark entries backfilled |

## 1. S417 lift-entry decisions
- **Writer parity:** approved, done.
- **Bench Press 5x5 backfill → reversed.** The text said "Record heaviest set", so per-set — but it was *Bench Press with Pause*. Chris: paused loads are much lighter, so they mislead the Bench Press history, and the Planner shows Lifts vs Exercise origin. He swapped the lift for the existing exercise "Bench Press with Pause" on all 5 copies (08.04 ×2, 13.04, 18.06, 19.06); I deleted all 22 entries (backup in `backups/`). The 11 "missing" ones were the correct state.
- **Parity extension:** done; run clean.

## 2. Clean & Jerk 27.04–04.05
Section held C&J 5x5 when scored, then Chris changed it to 5RM on 07.05 → 5RM entries created (07.05 + S385 rebuild 21.06), 5x5 ones never removed. 30 athletes had the same weight twice. Deleted the 5x5 copies after verifying each had a 5RM twin (same user/date/wod/weight). **Lesson: changing a lift on a scored section never cleans up old Lifts entries.**

## 3. GitHub notifications
Chris received nothing from the monthly check — correct, every run (Jul–Oct) passed. Tested a deliberately failing workflow. My detour: runs showed actor `Percepto25`, I assumed emails went elsewhere; Percepto25 is Chris's own login (Chris-Mimi owns the repo) and the email did arrive at chris@. Chris deleted the repo-level "email on every push" setting. He asked for the *why* when I send him into settings — saved as a preference.

## 4. Week 41.1 + 41.2
- 41.1 (board "28.09.26 (05.10.26)"): 05.10 10:00 DL 10RM + 13-min KB AMRAP. Michi had self-entered his AMRAP (member_id NULL) → left out to avoid a duplicate. Mimi's Run → 800m Airbike as a modified note.
- 41.2: Pendlay 10RM + Burpee Pull-up + Bear Crawl across 05.10 17:15/18:30, 06.10 18:30, 07.10 09:30. Burpee "Sc" → Sc1 (one scaled option).
- Booked: Anja Götte (picked over Anja Biechele — Tobias Götte in class; Chris OK), Jan Huelbig 06.10 (his 05.10 no-show also used his card; Chris OK), Mimi.
- Corrections: I read Dave's "Raised" as "Paused" — it means bar raised for mobility; note fixed + Lifts entry added. Anfisa "—" → 5m. Sven: Mimi overwrote his row with his improved repeat score; left on 05.10.
- I listed Mimi's booking as a question although memory says she's Chris's wife / co-coach — avoidable.
- CF Kids 1km Rower: Chris entered it himself → led to §5.

## 5. Kids' scores not on athlete pages
Neo's rower time saved in the modal but not on his Forge Benchmarks page. Family members have no email → the save route's email→auth lookup found nobody → benchmark_results / lift_records silently skipped for **every child**. The athlete app shows a child under their member id, and `benchmark_results.user_id` has no FK, so `resolveUserId()` now falls back to the member id for family members (no email + `primary_member_id`). WSR `user_id` set the same way so deletions clean up. Backfilled 05.10 rower ×4, 06.07 rower ×3 (Neo, Luis Bielenski, Lenny Kleinert), 25.05 Neo Murph.
`neo@the-forge-functional-fitness.de` = Chris's test account (pending, no data) — leave it.

## Rejected
- Making the parity check ignore "modified" scores to accommodate Dave — moot once "Raised" was understood.
- Moving Sven's scores to 07.10 — Chris: doesn't matter, he did it twice.
