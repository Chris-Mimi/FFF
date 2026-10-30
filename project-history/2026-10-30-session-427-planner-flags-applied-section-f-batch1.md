# Session 427 — Planner flags applied, generic defaults removed, Section F batch 1 (2026-10-30, Opus 5.5, Mac)

_Closed retroactively in S428 from git history + `memory-bank/planner-false-flags-todo.md` (S427 section)._

## Shipped
| Commit | What |
|:---|:---|
| `2e68b69` | S426 21-item list applied — library names in 72 wods; generic Pull-up/Push-up/HSPU/Sit-up/Row defaults dropped from `genericToCanonical`; NEW `scripts/rewrite-workout-lines.ts` |
| `26c8753` | Clean & Jerk also credits a Clean (`IMPLIES` in `utils/movement-extraction.ts`); plural + wallball progression fixes |
| `081700b` | Round 3 + Section F batch 1 (F1–F25) applied — 40 wods, 2 new library entries |

## 1. Round 1 — the S426 list (72 wods, backup taken first)
- Items 1–8, 11–21 + Bear Crawl → Bear Crawl Forwards + every "400m/800m/1600m Run" → "Run 400m" etc.
- Endurance #26.15 fully on library names (Wallball Shot, C2 SkiErg, Sandbag Walking Lunge, KB Farmers Carry, Sled Pull/Drag, C2 Rower).
- KB Bent Over Row → KB Bent Over Row Unilateral everywhere (Chris renamed it in the library; old text was credited as the barbell Bent Over Row).
- New library: Strict Rings Hanging L-Sit High Raise, DB Bent Over Row Double. Item 19 already fixed by Chris.
- **Defaults removed:** Pull-up(s), Push-up(s), HSPU, Sit-up(s), Row/Rowing — the text names the library variant now. Diff after text fixes: only 22 + 27 Apr "Strict Movements" loses a (wrong) Pull-up Kipping credit.
- Not changed (Chris): items 9, 10 — Clean credit in C&J workouts is right.

## 2. Round 2
- Every "Clean & Jerk" also counts a Clean — only 15 Mar + 4 May gained one.
- Plurals fixed only where the movement had no other credit in the WOD (Chris's rule): Ring Dip (29 May, 8 + 17 Jul), Burpee Broad Jump + Shuttle Run (7 Sep).
- 18 Aug progression → Wallball Deadlift (new library) / Wallball Front Squat / Wallball: MB/WB Clean. 4 May → "5m Bear Crawl Forwards to WB".

## 3. Round 3 + Section F batch 1 (40 wods)
- 8 Mar → "2x Hang Power Clean"; 16 + 23 Sep → "FULL CLNs NOT PCs" / "PCs will be marked as scaled".
- F1–F25: Skater → DB Single Leg Squat (Skater); Scorpion Stretch (cool-down) vs Dynamic Scorpion (warm-up); Couch Stretch; Battle Rope Power Slam; DB Flat Bench Pullover; World's Greatest + Samson; Lizard Stretch; Bicycle Knees to Elbows (9 + 12 Jan; D&D 28 Sep untouched); Weight Plate Deep Squat 90° Hold; Ring M-Up Drill: Ring Swing.
- New library: Push-Up Bottom Position Hold, High Frogger.
- Leave (Chris): F1/F2 Lu Raise + Triceps Push-back (part of the Lu Xiaojun Shoulder Warm-up); F15 "4 x HPS" (shorthand, Hang Power Snatch counted elsewhere in the WOD).

## Open
- 7 Oct 17:15 + 18:30 Whiteboard Intro "Pendlay Rows" muscle notes → credits Pendlay Row, but the 10RM test was the 09:30 class. Chris deleted the same text on 12 Oct — ask about 7 Oct.
- Section F batch 2 (F26–F97).

## Lessons
- **Some workout lines contain a non-breaking space (U+00A0)** — exact-line rewrites must include it or they silently miss.
- **Plural fixes only where the movement has no other credit in the WOD** — otherwise leave Mimi's text alone.
- **Scorpion rule:** Scorpion Stretch = cool-down, Dynamic Scorpion = warm-up.
- S427 didn't close (no history file / activeContext update) — closed from git history in S428.
