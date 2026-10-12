# Planner movement flags — to work through (from S419, 2026-10-12)

**What this is:** every workout line where the Planner's movement detection was or still is wrong. Chris's rule: **workout text must use the exact library name; the app does not guess.** He corrects text by hand, or asks Claude to do a batch.

**How it was found:** `npx tsx scripts/audit-movement-false-flags.ts` (read-only). Flags: `--group`, `--cat FUZZY|PREFIX|PROSE|NEGATION|INFO|PARTWORD`, `--exclude "Diapers & Dumbbells"`, `--only "Diapers & Dumbbells"`, `--out file.tsv`. Re-run it after corrections; the lists below should shrink.

**Reply format:** `<number> OK` = corrected / agreed. Cross items off here as they're done.

---

## A. No longer counted since S419 — text is not a library name

The old "guess" credited these to the movement in brackets. Now they count as nothing until the text uses a library name. Decide per line: rewrite with the right library name, or leave uncounted.

| # | Text in the workout | Was counted as | Workout (class times) — section |
|:--|:--|:--|:--|
| 1 | `Bear Crawl` | WB Bear Crawl | 20.05 15:00 FitKids: Bänke, Rad — Warm-up |
| 2 | `10m Bear Crawl` | WB Bear Crawl | 08.06 16:00 Kids & Teens: Sidestep, 1-arm, KB Swing, OH Carry, Push-up, Bear Crawl — WOD |
| 3 | `• Bear Crawl` | WB Bear Crawl | 17.06 15:00 FitKids: Airtrack Bahnen & Felgaufschwung — Warm-up |
| 4 | `20m Bear Crawl`, `30m Bear Crawl` | WB Bear Crawl | 18.09 09:00 / 17:15 / 18:30, 19.09 09:00 Run, T2B, Burpee, Bear Crawl, WB Shot — WOD |
| 5 | `L-Sit Hold` | Rings L-Sit Hold | 09.02 17:15 / 18:30, 10.02 17:15 / 18:30, 11.02 09:30 OHP & PP Testing 3 & 1RM, L-Sit, Hollow & Superman Rock, BBJ — WOD |
| 6 | `L-Sit Hold` | Rings L-Sit Hold | 30.09 15:00 FitKids: Bänke, Ringe — Skill |
| 7 | `L-Sit Hold:` | Rings L-Sit Hold | 07.10 17:15 / 18:30, 12.10 10:00 Barbell GM, Airbike, Hanging L-Sit Raise, Push-up, Thruster — WOD Pt.2 |
| 8 | `…KBOHC metres + SkiErg + Rower Calories` | C2 SkiErg | 22.04 17:15 / 18:30, 27.04 10:00 Strict Movements, Push-up, Pull-up, L-Sit, KBOHC, MetCon — WOD Pt.3 |
| 9 | `1000m SkiErg`, `100 for Row, SkiErg, Lunges, FC & Sledge` | C2 SkiErg | 15.08 09:00, 19.09 09:05 Endurance #26.15 — WOD |
| 10 | `200m Farmers Carry (2x16/24kg) (Scaling 3)` | KB Farmers Carry | 15.08 09:00, 19.09 09:05 Endurance #26.15 — WOD |
| 11 | `Skin the cat` | Rings Skin The Cat | 13.05 15:00 FitKids Ringe & WB — Skill; 30.09 15:00 FitKids: Bänke, Ringe — Skill |
| 12 | `Goblet Squats` | Goblet Squat on Wedge | 20.05 15:00 FitKids: Bänke, Rad — WOD |
| 13 | `Squats` | Squat Jump | 20.05 15:00 FitKids: Bänke, Rad — WOD |
| 14 | `* KB RDL 1-Leg, 2-Handed L` / `R` | KB RDL 1-Leg, 1-Hand | 28.09 17:15 / 18:30, 29.09 17:15 / 18:30, 05.10 10:00 Deadlift Testing 10rm, KB Press, Row, Push-up, 400m run — Warm-up |
| 15 | `* KB Front Squat` | Double KB Front Squat (and still Front Squat — see 30) | 12.04 10:00 KB 1-Arm Swing, Lunge, Squat, T2B — Skill |
| 16 | `PVC Pipe` | PVC Pipe OHS | 06.04 10:00, 08.04 10:00, 07.04 18:30 CrossFit Quarter Finals 2024 Workout 1 — Olympic Lifting |
| 17 | `8x PVC Pipe`, `4x Stability balls` (equipment list) | PVC Pipe OHS, Stability Ball Roll-out | 22.07 08:00 Sommersportfest Neo's school — Whiteboard Intro |
| 18 | `Parcours, Handstand practice` | Team: Parcours | 11.02 16:00 Kids & Teens: Parcours, Handstand practice — Accessory |
| 19 | `Strength building exercise for Pull-ups, Muscle-Ups, Ring work etc` | Ring Muscle-Up | 01.04 17:15 / 18:30, 17.08 10:00 Row Cindy Row + Muscle-up Drills; 29.06 17:15 / 18:30, 30.06 17:15 / 18:30, 01.07 09:30 M-Up Drills, BJ, KBC&P, H2H, Rope Climb — Gymnastics |
| 20 | `L-Sit:` (a heading) | Wall Sit | 21.01 17:15 / 18:30, 26.01 10:00 Hang Hold + MetCon Chipper — Final prep/Info |
| 21 | `…5m forwards, 5m backwards` | Backwards Walk | 14.08 09:00 / 17:15 BOR Testing 5RM, Pinch-grip carry, Russian Twist, Front Raise — WOD |

Rows 17 and 19–21 were plain wrong and need nothing. Rows 1–16 are real movements that now want a library name.

## B. Diapers & Dumbbells — no longer counted (Mimi's free text)

For the planned D&D session: Claude proposes the library name for each, Chris/Mimi confirm, Claude edits the text (batch approval first — S240 rule).

| # | Text | Was counted as | Workout |
|:--|:--|:--|:--|
| 22 | `* Reverse Hyper`, `* Table Top` | GHD Reverse Hyper, Table Top Hold | 12.01 09:00 (no name) — Warm-up |
| 23 | `Mountain climbers`, `Patrick steps` | Spiderman Mountain Climber, ATG Patrick Step Up | 04.05 09:00 — WOD |
| 24 | `* Box Step-Ups`, `* Farmers Carry`, `* Ring Rows`, `* Side Plank`, `Rings:` | DB Box Step-Up, KB Farmers Carry, Archer Ring Row, Side Plank Twist, Ring Dip | 11.05 09:00 — WOD |
| 25 | `* Battle Rope`, `* Superman`, `* hanging knee raises`, `* side plank`, `* table top` | Battle Rope Clap, Superman Rock, Bar Hanging Knee Raise with Kip, Side Plank Twist, Table Top Hold | 18.05 09:00 DD Box Circuit — WOD |
| 26 | `Goblet Squats`, `Ring Rows`, `Rings:` | Goblet Squat on Wedge, Archer Ring Row, Ring Dip | 15.06 09:00 — Whiteboard Intro |
| 27 | `Step-Up`, `Superman` | Box Step Up, Superman Rock | 06.07 09:00 Box in the Box — Skill / WOD |
| 28 | `* Hanging knee raises` | Bar Hanging Knee Raise with Kip | 20.07 09:00 Box, KB RDL — WOD |
| 29 | `Deep squat`, `Bear Crawl` | Deep Squat Hold, WB Bear Crawl | 24.08 09:00 — Gymnastics / Warm-up |
| 29a | `Mountain climbers`, `Patrick steps` | Spiderman Mountain Climber, ATG Patrick Step Up | 21.09 09:00 Gymball — WOD |
| 29b | `12x Goblet Squat`, `Scap Push-Up` | DB Goblet Squat, Scap Push-Up Circle | 28.09 09:00 Diapers & Dumbbells Heavy KB — Strength / WOD |
| 29c | `Goblet Squats`, `Table Top`, `OH Lunges` | Goblet Squat on Wedge, Table Top Hold, Samson OH Lunge | 12.10 09:00 DBs — Strength / WOD / Warm-up |

D&D has not had the full audit yet (`--only "Diapers & Dumbbells"`); this is only what the guess removal exposed.

## C. Still wrongly counted (non-D&D) — a library name inside a longer phrase

| # | Text | Counted as | Workout — section |
|:--|:--|:--|:--|
| 30 | `* KB Front Squat` | Front Squat | 12.04 KB 1-Arm Swing, Lunge, Squat, T2B — Skill |
| 31 | `Medball/Wallball Clean (10 mins)` | Clean | 18.08 Ring Row, WB Shot, BJ — WOD movements |
| 32 | `* Wall-Facing Handstand Hollow Hold` | Hollow Hold | 04.03 (two versions), 22.03 Handstand Walk Drills #26.x — Gymnastics |
| 33 | `3 x 3 Low Bar Muscle-Up` | Bar Muscle-up | 18.05 Strict Toes to Bar, KB OHC… — Gymnastics |
| 34 | `Strict Rings Hanging L-Sit High Raise` | Rings Hang | 07.10, 12.10 Barbell GM, Airbike, Hanging L-Sit Raise… — WOD movements |
| 35 | `Jump feet forward and perform a squat clean (hips below knees)` | Clean | 21.08, 23.09 DB Man Maker, Hang Snatch, Lunge, GHDSU, Bear Crawl — WOD movements |
| 36 | long game description mentioning "Sqmize plates" | Overhead Med Ball Throw, Wallball Thruster | 05.10 Kids: Rower 1km, Bumper Plate Frog Catcher — WOD Pt.2 |
| 37 | `12x Superman to Hollow Hold Push-up` | Hollow Hold | not looked up — find with `--cat PREFIX` |

## D. Still wrongly counted (non-D&D) — sentences

Fix = reword, or use an abbreviation (the Planner never reads abbreviations from text).

| # | Sentence | Counted as | Workout — section |
|:--|:--|:--|:--|
| 38 | `Performing a front squat followed by any style of jerk … is NOT allowed.` | Front Squat | 16.03, 17.03 CrossFit Open #26.3 — Final prep/Info |
| 39 | `Any style of clean, except a hang clean, is permitted.` | Hang Clean | 16.03, 17.03 CrossFit Open #26.3 — Final prep/Info |
| 40 | `No Push Jerk allowed, any re-bending of the knees on the PP is a no-rep!` | Push Jerk | 09.02, 10.02 OHP & PP Testing 3 & 1RM… — Strength |
| 41 | `NOTE: Do NOT try to Clean the bar, the weight should be relatively heavy` | Clean | 27.04 Clean & Jerk Testing 5RM (two versions) — Olympic Lifting |
| 42 | `Aim for about 40-50% of your 1RM Back Squat in the latter sets…` | Back Squat | 15.04, 17.04 Barbell GM, KB C&PP, KB Ro… — Strength |
| 43 | `NOTE: Barbell must be cleaned from the ground to rack position…` | Clean | 13.07 C&J, V-up, Burpee, Split Jerk — WOD |

## E. Open decision — built-in defaults still active

`genericToCanonical` in `utils/movement-extraction.ts` deliberately translates some generic words. Chris has not yet said whether these stay:

- `Row` / `Rowing` → C2 Rower
- `Sit-ups` → AbMat Sit-up
- `Pull-ups` → Pull-up Kipping (5 workouts: 22.04, 27.04, 06.05, 01.07, 19.08)
- `Push-ups` → Push-up Strict (3 workouts)
- `Handstand Push-ups` → Handstand Push-up Kipping
- plus barbell shorthand (`Clean` → Barbell Clean, etc.), only where such a library name exists
