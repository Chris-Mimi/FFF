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

**S427:** Pull-up / Push-up / HSPU / Sit-up / Row defaults removed. **S428 check:** the barbell + Muscle-up entries are dead (no "Barbell …" / "Ring Muscle-up (Kipping)" in the library — text matches the plain library name directly). Only 5 defaults still act: Knees to Elbows → Bar Hanging Knees to Elbows · KB Swing → KB Swing American · Back Extension → GHD Back Extension · Double-Unders → Jump Rope Double-Unders · Walking Lunge → Lunge Walking.
**✅ DECIDED S428 (Chris: "wouldn't be necessary if the exercises were written correctly"):** `genericToCanonical` removed entirely. Only 1 line depended on it (30 Jul Hyrox warm-up "Walking Lunges" → "Lunge Walking", rewritten). Old-vs-new Planner diff: 671 wods, 0 differ.


---

## S426 re-check (2026-10-30) — supersedes the numbering above

**Scope:** FitKids Turnen + Eltern-Kind-Turnen excluded for good (Mimi's notes for herself, not library exercises). D&D still separate. Rule (Chris): shorthand like "SkiErg" is fine when the library name is programmed elsewhere in the same WOD. Plurals are already tolerated by the detector ("Wallball Shots" → Wallball Shot).

**Approved, not yet applied:** Bear Crawl → Bear Crawl Forwards (8.06 Kids & Teens, 18–19.09 WOD).

**Open list (A–D above, renumbered 1–21 in the S426 chat):** 1–2 Endurance #26.15 SkiErg / Farmers Carry · 3 12.04 KB Front Squat · 4 PVC Pipe · 5–12 abbreviation rewrites (Clean Basics info, No PJ, Open 26.3, 1RM BS, CLN, "brought", squat CLN, WW line) · 13–16 exact library names (Superman to Inverted Hollow Push-up, Handstand Hold (hollow body), Low Bar Muscle-Up (drill), Wallball: MB/WB Clean) · 17–19 add to library (Strict Rings Hanging L-Sit High Raise, DB Bent Over Row, Team: Cone Snatch Rotation) · 20 14–15.06 Burpees? · 21 defaults (Push-up / Pull-Ups / Row).

**Runs:** library has "Run 400m" etc.; 11 workouts write "400m Run" (12×), "1600m Run" (6×), "800m Run" (6×), "200m Run" (1×) → none counted.

### F. Programmed-looking lines that count as nothing (S426 scan)

Lines starting with a bullet / count / distance, outside Whiteboard Intro + Final prep/Info, that credit no library movement and aren't covered by a library name elsewhere in the WOD. Structure lines ("4 rounds for time", "1 min REST") filtered out; some noise remains. Count = distinct workout texts.

| # | n | Example line | Dates |
|:--|:--|:--|:--|
| F1 | 6 | `15 x Lu Raise` | 04.02.26,06.02.26,20.09.26,21.09.26… |
| F2 | 6 | `15 x Triceps Push-back` | 04.02.26,06.02.26,20.09.26,21.09.26… |
| F3 | 5 | `10 reps as warm-up then 5 sets of 5 reps (approx. 1 set every 2 minutes)` | 08.04.26,13.04.26,18.06.26,19.06.26 |
| F4 | 5 | `4-5 sets of DB Skater Squat:` | 08.07.26,10.07.26,12.07.26,12.10.26… |
| F5 | 4 | `* Scorpion` | 03.12.25,22.04.26,27.04.26 |
| F6 | 4 | `* Couch` | 03.12.25,22.04.26,27.04.26 |
| F7 | 4 | `* Kneeling Glute Squeeze Lean/BC sequence` | 18.01.26,19.01.26,21.01.26 |
| F8 | 4 | `* Battle Rope Slam (Medium Rope)` | 01.02.26,20.02.26,23.02.26 |
| F9 | 4 | `10m Bear Crawl` | 08.06.26,18.09.26,19.09.26 |
| F10 | 3 | `* DB Flat Bench Pull Over` | 06.02.26,24.04.26 |
| F11 | 3 | `5 secs push, relax, 5 secs hold` | 11.02.26,21.06.26,22.06.26 |
| F12 | 3 | `* Push-Up Bottom Position Hold` | 22.05.26,25.09.26 |
| F13 | 3 | `20 secs slow warm-up pace 10 secs REST` | 21.09.26,22.09.26,28.09.26 |
| F14 | 3 | `20 secs all-out 10 secs REST` | 21.09.26,22.09.26,28.09.26 |
| F15 | 2 | `4 x HPS` | 09.12.25,26.06.26,29.06.26,14.07.26 |
| F16 | 2 | `* Scorpion Twist` | 26.12.25,11.04.26,22.04.26 |
| F17 | 2 | `* World's Greatest (WG) + Samson` | 27.12.25,14.02.26 |
| F18 | 2 | `* Lizard` | 27.12.25,14.02.26 |
| F19 | 2 | `* Bicycle` | 09.01.26,12.01.26 |
| F20 | 2 | `4 sets of 6-10 reps slow and controlled` | 14.01.26,16.01.26 |
| F21 | 2 | `1 x Warm-up set 8-12 reps` | 20.01.26 |
| F22 | 2 | `* Deep Squat 90° Plate Hold` | 20.02.26,23.02.26 |
| F23 | 2 | `* High Frogger` | 04.03.26,16.03.26 |
| F24 | 2 | `3x 3-5 reps Ring Swing - shallow (small swing)` | 20.03.26,16.08.26 |
| F25 | 2 | `3x 3 reps Ring Swing - shallow + 3 reps - deep (large swing)` | 20.03.26,16.08.26 |
| F26 | 2 | `6-10x Ring M-Up Drill Hips to Rings (2-3 Swings + 1x Hips to Rings)` | 20.03.26,16.08.26 |
| F27 | 2 | `1. 15 secs Athlete 1: Skierg, Athlete 2: Rest` | 27.03.26,30.03.26 |
| F28 | 2 | `* Push-Up Hold in deepest position` | 24.04.26 |
| F29 | 2 | `1. 1cm off the floor` | 27.04.26,28.04.26 |
| F30 | 2 | `2. just under the knee` | 27.04.26,28.04.26 |
| F31 | 2 | `3. mid-thigh` | 27.04.26,28.04.26 |
| F32 | 2 | `* Wrist Warm-Up on the floor` | 10.06.26,05.07.26 |
| F33 | 2 | `* Split hold` | 18.07.26,26.09.26 |
| F34 | 2 | `* Sledge pull (+20/40kg) on the black mats` | 18.07.26,26.09.26 |
| F35 | 2 | `30 seconds 20kg/15kg Barbell hand to hand turning` | 05.08.26 |
| F36 | 2 | `1. Rig:` | 10.08.26,25.08.26 |
| F37 | 2 | `3. Bench` | 10.08.26,25.08.26 |
| F38 | 2 | `1x KB Complex Left: KB in Left Hand!` | 27.09.26,09.10.26 |
| F39 | 2 | `3 mins per couplet, with 1 min rest between movements:` | 09.10.26,25.10.26 |
| F40 | 2 | `10x HBCGDBFP` | 17.10.26,19.10.26 |
| F41 | 2 | `5x DB BSU L + 5x DB BSU R` | 17.10.26,19.10.26 |
| F42 | 1 | `2 x Chest Touch Bear Crawl over the Bar (1 x fwds, 1 x bwds. Start in Bear Crawl` | 09.12.25 |
| F43 | 1 | `2 x OHS` | 09.12.25 |
| F44 | 1 | `1 min plus 10 secs rest of each exercise` | 28.12.25 |
| F45 | 1 | `* Scapular Pull-up` | 05.01.26 |
| F46 | 1 | `* DB Flat Bench Pull Over (10/15kg) x 40 (Load 1)` | 24.01.26 |
| F47 | 1 | `* KB Flat Back Pull Over` | 25.01.26 |
| F48 | 1 | `* KB Flat Back Pull Over x 5 (Load 1)` | 25.01.26 |
| F49 | 1 | `20 secs on/10 secs off` | 01.02.26 |
| F50 | 1 | `* Dumbbell Biceps Curl` | 06.02.26 |
| F51 | 1 | `20 mins AMRAP Ascending Chipper` | 17.04.26,26.08.26 |
| F52 | 1 | `* Piriformis supine` | 26.04.26,29.04.26 |
| F53 | 1 | `5m Bear Crawl to WB` | 04.05.26 |
| F54 | 1 | `10 metres forwards & 10 metres backwards every set` | 08.05.26 |
| F55 | 1 | `* Straight legged Toes to wrist touches (hands on the line, upper back against t` | 10.06.26 |
| F56 | 1 | `* Leg hops/floats back on the wall` | 10.06.26 |
| F57 | 1 | `* 1 leg up, shift weight forward` | 10.06.26 |
| F58 | 1 | `* both legs up (walk away or come down)` | 10.06.26 |
| F59 | 1 | `* Head Stand, controlled up and down` | 10.06.26 |
| F60 | 1 | `2x HPS, 2x P-up to Bbl, 2x Roll-out, 2x SMC` | 26.06.26,29.06.26,14.07.26 |
| F61 | 1 | `* Swiss Ball Balance Roll` | 06.07.26 |
| F62 | 1 | `* Swiss Ball OHS` | 06.07.26 |
| F63 | 1 | `* Swiss Ball OHS with Side to Side Lean` | 06.07.26 |
| F64 | 1 | `* Decline Push-up Feet on Swiss Ball` | 06.07.26 |
| F65 | 1 | `* Swiss Ball Hamstring Curl` | 06.07.26 |
| F66 | 1 | `* Swiss Ball Hamstring Curl Single Leg` | 06.07.26 |
| F67 | 1 | `3x Dip Squat` | 13.07.26 |
| F68 | 1 | `1. Ring Toss` | 22.07.26 |
| F69 | 1 | `3. Parallet tuck hold` | 22.07.26 |
| F70 | 1 | `4. Sack hopping` | 22.07.26 |
| F71 | 1 | `5. Ring hang` | 22.07.26 |
| F72 | 1 | `6. Egg balance game` | 22.07.26 |
| F73 | 1 | `7. Weight plate pull` | 22.07.26 |
| F74 | 1 | `5m Lunges, change hands, return to start` | 05.08.26 |
| F75 | 1 | `* Ski 400m` | 08.08.26 |
| F76 | 1 | `1000m SkiErg` | 15.08.26,19.09.26 |
| F77 | 1 | `100m Sandbag Lunges (10/20kg) (Scaling 2)` | 15.08.26,19.09.26 |
| F78 | 1 | `200m Farmers Carry (2x16/24kg) (Scaling 3)` | 15.08.26,19.09.26 |
| F79 | 1 | `10x Sledge Pull (+80/125kg) (Load 1)` | 15.08.26,19.09.26 |
| F80 | 1 | `100 for Row, SkiErg, Lunges, FC & Sledge` | 15.08.26,19.09.26 |
| F81 | 1 | `10,15,20,30 seconds holds` | 19.08.26 |
| F82 | 1 | `3x 5x DB OHP` | 30.09.26 |
| F83 | 1 | `* 3-point-jump` | 04.10.26 |
| F84 | 1 | `* Cartwheel` | 04.10.26 |
| F85 | 1 | `* 10m Bear Crawl Wallball Push/Roll` | 04.10.26 |
| F86 | 1 | `2 mins on each incl. explanation & demo` | 09.10.26 |
| F87 | 1 | `3 mins on Deck Squat to estimate WOD weight (usually the Deck Squat is the decid` | 09.10.26 |
| F88 | 1 | `1. C&P the KB from the ground` | 09.10.26 |
| F89 | 1 | `2. Bring it down to the rack position` | 09.10.26 |
| F90 | 1 | `3. Lunge backwards left, backwards right` | 09.10.26 |
| F91 | 1 | `4. Bring the KB down to the side` | 09.10.26 |
| F92 | 1 | `* M-up Drill: Hip Pop to Wall` | 26.10.26,27.10.26,28.10.26 |
| F93 | 1 | `1. Top tap L, top tap R` | 29.10.26 |
| F94 | 1 | `2. Inside L, inside R, side to side` | 29.10.26 |
| F95 | 1 | `3. Roll L, Roll R, side to side 1 touch` | 29.10.26 |
| F96 | 1 | `4. Roll L, Roll R, side to side 2 touches` | 29.10.26 |
| F97 | 1 | `5. Laces roll back L, Laces roll back R` | 29.10.26 |

## S427 (2026-10-30) — S426 list applied

**Done (72 wods, `scripts/rewrite-workout-lines.ts`, backup 2026-10-30 first):** items 1–8, 11–21 + Bear Crawl Forwards + all "400m/800m/1600m Run" → "Run 400m" etc. Endurance #26.15 fully on library names (Wallball Shot singular, C2 SkiErg, Sandbag Walking Lunge, KB Farmers Carry, Sled Pull/Drag, C2 Rower). KB Bent Over Row → KB Bent Over Row Unilateral everywhere (Chris renamed it in the library; old text was being credited as the barbell Bent Over Row). New library: Strict Rings Hanging L-Sit High Raise, DB Bent Over Row Double. Item 19 already fixed by Chris (Team: 2-Colour Cone Grab).
**Defaults removed** from `genericToCanonical`: Pull-up(s), Push-up(s), HSPU, Sit-up(s), Row/Rowing. Diff after the text fixes: only 22 + 27 Apr "Strict Movements" loses Pull-up Kipping (wrong credit). Turnen/D&D not diffed.
**Not changed (Chris):** 9, 10 — C&J workouts: a Clean credit there is right.

**Round 2 done:** every "Clean & Jerk" now also counts a Clean (`IMPLIES` in the extractor — only 15.03 + 04.05 gained one). Plurals fixed only where the movement had no other credit in the WOD (Chris's rule): Ring Dip (29.05, 8.07, 17.07), "M Burpee Broad Jump" + "Shuttle Run" (7.09). 18.08 progression → Wallball Deadlift (new library) / Wallball Front Squat / Wallball: MB/WB Clean. 4.05 → "5m Bear Crawl Forwards to WB".

**Round 3 done (40 wods):** 8.03 → "2x Hang Power Clean"; 16 + 23.09 → "FULL CLNs NOT PCs" / "PCs will be marked as scaled". Section F batch 1 (F1–F25): Skater → DB Single Leg Squat (Skater); Scorpion (Cool Down) → Scorpion Stretch; Scorpion Twist → Dynamic Scorpion (rule: Scorpion Stretch = cool-down, Dynamic Scorpion = warm-up); Couch Stretch; Kneeling Glute Squeeze Lean Hip Opener sequence; Battle Rope Power Slam; DB Flat Bench Pullover; World's Greatest stretch + Samson; Lizard Stretch; Bicycle Knees to Elbows (9 + 12 Jan; D&D 28.09 not touched); Weight Plate Deep Squat 90° Hold; Ring M-Up Drill: Ring Swing. New library: Push-Up Bottom Position Hold, High Frogger (text unchanged, now counted).
**Leave (Chris):** F1/F2 Lu Raise + Triceps Push-back = part of the Lu Xiaojun Shoulder Warm-up, always done together. F15 "4 x HPS" — Hang Power Snatch already counted from the Olympic Lifting section (shorthand rule).

**Still open:**
- ~~7.10 17:15 + 18:30 "Pendlay Rows" Intro notes~~ — Chris already deleted them (S428).
- ~~Section F batch 2 (F26–F97)~~ — done S428 (below).

## S428 (2026-10-30) — Section F batch 2 applied

**Done (33 wods, backup first, Planner diff: nothing lost):** Ring M-Up Drill: Hips to Rings; C2 SkiErg (27 + 30 Mar, 8 Aug "Ski 400m" → "C2 SkiErg 400m"); Push-Up Bottom Position Hold (24 Apr); Sledge pull → Sled Pull/Drag (18 Jul, 26 Sep); Barbell Hand To Hand Rotations; Pull-up Scapular; KB Flat Back Pullover; DB Biceps Curl; Active Supine Piriformis; Swiss Ball → Stability Ball (6 Jul Kids, 6 lines); Parallettes Tuck Hold + Rings Hang (22 Jul FitKids); M-up Drill: Hip Pop to Wall → BMU Drill: Hip Pop to Wall (8 classes); Bear Crawl Slamball Push/Roll (4 Oct); DB OHP → DB Strict OH Press (30 Sep Kids); Head Stand → Headstand; 3-point-jump → 3-Point Jump.
**New library:** Split Hold, Headstand, Dip Squat (also now counts on 27/28 Apr + 4 May), 3-Point Jump, Cartwheel. Split Hold + 3-Point Jump have no description (meaning not verified — Chris to fill in).
**Leave (Chris):** Wrist Warm-Up on the floor, Weight plate pull, Ring Toss / Sack hopping / Egg balance game (FitKids games); all cue / structure / shorthand lines.
**Library naming oddity (not touched):** "M-up Drill: Hip Pop to WB" sits next to "BMU Drill: Hip Pop to Wall".
**Defaults (item 21):** decided + removed (see section E).
**Recurring (Chris, S428):** repeat this audit every 3 months — next end of Jan 2027 — on workouts written since the last one, so wrong / superfluous text never piles up again. Last full pass: S426–S428. Commands: `npx tsx scripts/audit-movement-false-flags.ts --exclude "turnen|diapers" --since <last audit date>` and the same with `--uncounted` (S428: the Section F scan is now built in). After S428 the full `--uncounted` run shows 51 texts — all cues / shorthand Chris chose to leave, so `--since` keeps the next run to new workouts only.
**S428 extras:** "Athlete 2: Skierg" (27 + 30 Mar) → C2 SkiErg; 3 library display names had stray spaces (" Single Leg Seated Toes to Bar (drill)", " M-Up/Pull-up Drill: Pull Up Negative/Weighted", "Supine Pigeon Piriformis ") — trimmed, so text now matches them.
**Next:** Diapers & Dumbbells — Chris to choose: treat like Turnen (never check) or fix like the other classes.
- Gotcha: some lines contain a non-breaking space (U+00A0) — exact-line edits must include it.
