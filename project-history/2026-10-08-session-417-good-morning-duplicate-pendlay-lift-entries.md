# Session 417 — Good Morning duplicate, Pendlay Row accumulated-load Lifts entries (2026-10-07 → 10-08, Opus 5.5)

## Shipped
| Commit / action | What |
|:---|:---|
| `5df1b73` | Duplicate exercise name → readable toast on both save screens (`useExercisesCrud`, `MovementLibraryPopup`) |
| migration `20261007000000` (Chris ran it) | Unique index `exercises_display_name_unique` on `lower(btrim(coalesce(nullif(display_name,''), name)))` |
| DB | `barbell-good-morning` display → "Barbell Good Morning"; Pre-Workout `good-morning` → "Good Morning" |
| DB | New `barbell_lifts` row "Barbell Good Morning" (Pull, Barbell, linked to the exercise) |
| DB | Deleted 6 Pendlay Row 29.05 `lift_records` (accumulated totals); backup JSON in `backups/` |

## 1. Good Morning duplicate
Only duplicate visible name in 724 exercises. Nothing prevented it (no DB constraint, no app check). First rename ("Good Morning Bodyweight" → Chris: "Bodyweight Good Morning") did not fix the Planner: **the Planner matches exercises by searching workout TEXT** (`extractMovementsFromWod`, longest name wins), and ~38 workouts list a bare `* Good Morning` in warm-ups. Fix = swap: bare text → bodyweight; Chris already writes "Barbell Good Morning(s)" for the real thing. Verified with the real extractor before and after. "Good Morning with plates" = bodyweight (Chris). Planner checked OK by Chris (Planner shows unique workouts, so 15.04/17.04 appear once).
**Lesson:** renaming an exercise changes which past workouts count for it.

## 2. Pendlay Row 29.05 "220 kg / Est. 1RM 247.5"
Weekend WOD #26.14 WOD Pt.1: Pendlay Row 5x5 attached from the Lifts modal, load = total of last 3 sets. My S396 script wrote all 13 scores at 07:53 on 11.07 (no lift_records). At 08:27 the 17:15 session was re-saved in the coach modal → the save route created non-RM lift_records treating the total as one set's weight (7 athletes; Christian Tanner's 150 deleted 21–23.08 per backups — likely by him). 09:00 never re-saved → none.
My mistakes Chris corrected: said 6 athletes (14 did the workout — two sessions), treated "has login" as "has Athlete App" (only 6 of 13 have it; lift_records are created for anyone with a login).
Chris's workflow from now: **one set's weight → Lifts modal; total → Exercise Library + Load chip.** He swapped all 4 copies (29.05 09:00/17:15, 08.07, 17.07). Then 6 records deleted.

## 3. Found, not fixed — awaiting Chris
`enter-whiteboard-scores.ts` writes lift_records for RM sections only; the app also does non-RM lift sections. Gap across all workouts: 21 scores without Lifts entry — Pendlay ones are correct to omit; **Bench 5x5 08.04 (7) + 13.04 (4)** are real gaps if per-set. Parity check only covers `rm_test`. Three decisions in activeContext Kickoff.

## Rejected
- Converting the accumulated totals to per-set weights (÷3) — sets may differ; a guess.
- Asking athletes to delete their own entries — DB delete is central, athletes do nothing.
