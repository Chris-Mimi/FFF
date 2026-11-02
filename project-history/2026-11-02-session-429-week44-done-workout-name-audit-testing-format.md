# Session 429 — Week 44 whiteboard done, workout-name audit, Testing Format A (2026-11-01→02, Opus 5.5, Mac)

## Shipped
| Commit | What |
|:---|:---|
| `53796dd` | Board 44.3 — 28.10 17:15/18:30, 30.10 09:00, 1.11 10:00/11:00 (42 rows) |
| `109ba6b` | Board 44.4 — 29.10 17:15 KB ladder + 17:20 couplet (7 rows) |
| `1d77d56` | NEW `scripts/audit-workout-names.ts` + `scripts/rename-workouts.ts`; 24 names get missing movements (73 workouts) |
| `a7997ee` | Workout-name audit joins the 3-monthly check |
| (close) | 34 names → Testing Format A + extras (111 workouts); `anyType` flag for kids renames |

## 1. Backups folder
- Chris asked whether old backups could go. `backup-critical-data.ts` already keeps the newest 40 runs (S409 reasoning: ~2× the S385 detection lag). 426 MB on a disk with ~400 GB free → Chris: leave it.

## 2. Whiteboard 44.3 + 44.4
- 44.3 held three sessions of the DB Snatch / BJ / WB Shot + Lunge workout plus both 1.11 HPS classes. WB Rx = 6/9 kg (every past WOD prescription). Red "!" + "Sc1" after a WB load → `modified` "WB Shot + Lunge Sc1" (Dinny, Thomas G).
- 30.10 block: values sat half a row below the names — paired by count (7 names / 7 value rows).
- "Michi S." in the black-ink 30.10 block = Michael Städele 30.10 09:00 (booked there, not at 18:30). Stefan G (member "Stefan G", whiteboard "Stefan") booked in by the writer. Daniela = Struben (booked) not Simm (name map).
- 44.4: board column "Reps" = total reps on a ladder of 8n reps per round → converted to R+R via 4k(k+1) to pool with the 26.10 rows.
- 30.10 17:30 (empty workout) = Open Gym (Chris). Week 44 complete.

## 3. Workout-name audit
- Chris: "if a Push-up was done in a WOD it should say so in the name" — short forms, not library names.
- Matcher (lenient on purpose): library tag, upper-case initials of 2+ consecutive words (BBJ, BOR; compounds split so HSPU/WB work), one distinctive word with prefix match (Row↔Rower), short caps prefix (DB SN). Scaling variants sharing the first word of a named movement are suppressed (Russian swing beside AKBS).
- Sections: Skill, Gymnastics, Strength, Olympic Lifting, WOD/WOD Pt.N, Finisher/Bonus!, Accessory. Skipped: warm-up, cool-down, intro, WOD movements; kids/Turnen/D&D/Open Gym/party types; private sessions.
- 328 workouts → 129 names flagged; after removing "MetCon" (= Row/Ski/Airbike choice) and benchmark names, 25 real gaps + 13 minor ones. Chris approved all except #29 (Plank) and #37/#38 (drill sections, no change); #2 "? Ask Mimi…" he renamed himself; #28 = "P-90X Core Finisher".
- **Undecided:** Endurance #26.x / Weekend WOD #26.x names (number only). I recommended adding movements; benchmarks stay as they are.

## 4. Testing Format A (Chris chose A over "5RM Back Squat" / "Back Squat 5RM Test")
- `<Lift> Testing <n>RM, …` — RM capitals joined to the number, "3RM & 1RM", nothing between Testing and RM, lifts spelled out (Deadlift, Sumo Deadlift, Strict OHP), tags after the RM. Speed tests: "… 1km Speed Test".
- Two names were Kids & Teens classes (Bench Press 5RM & 1RM 27.02, Swiss Ball / C2 Rower 1km Speed Test 06.07) — Chris: include. Rename tool got a per-entry `anyType` flag.

## 5. Google Calendar
- `publish-workout` builds the event title from `workout_name` at publish time. A DB rename updates the app only; Calendar keeps the old title until the workout is published again. All renamed workouts were in the past — left alone.

## Lessons
- **A whiteboard column header can change meaning between boards** — 26.10 was R+R, 29.10 "Reps" was a total. Check the header before copying the previous board's shape.
- **Every audit needs a `--since`-style exemption list agreed with Chris** (MetCon, benchmarks) — otherwise the noise hides the 25 real gaps.
- **PostgREST `.or()` ilike needs `*` wildcards, not `%`** — `%` returns a PGRST100 parse error.
