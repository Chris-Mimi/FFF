# Session 426 — activeContext trim, homepage timetable link, Planner flags re-check (2026-10-30, Opus 5.5, Mac)

## Shipped
| Commit | What |
|:---|:---|
| `8305bc2` | `activeContext.md` 466 → 249 lines; Chris's S424/S425 answers recorded |
| `7413eb6` | `planner-false-flags-todo.md` S426 section + section F; audit `--exclude`/`--only` take a regex |

## 1. Website
- Homepage "Hier findest du unser Programm" → link `/training-kurs-buchen#stundenplan`. Anchor = `<div id="stundenplan" style="scroll-margin-top:100px;"></div>` above the iframe in the Squarespace Code block (Chris did it).
- Kurs buchen page path is `/training-kurs-buchen` (not `/kurs-buchen`).

## 2. Chris's answers
- `/stundenplan` live ✅ · mobile Athletes list ✅ · Wed 28.10 18:00 WOD deleted by Chris · S424 eyeball ✅.
- Open: fra1 speed ("not sure"), Planner Benchmarks numbers (he'll check).

## 3. Planner false flags — re-check
- **Chris's rules:** FitKids Turnen + Eltern-Kind-Turnen are Mimi's own notes → never check them. Shorthand ("SkiErg", "Row") is fine when the library name is programmed elsewhere in the same WOD. Plurals in Mimi's old text are a red flag (library = singular).
- **Checked:** the detector already tolerates plurals ("Wallball Shots" → Wallball Shot). Item 5 (9–11 Feb L-Sit Hold) and 7 were note headings — nothing to do.
- Approved, not applied: Bear Crawl → **Bear Crawl Forwards** (8.06 Kids & Teens, 18–19.09 WOD).
- New 21-item list given to Chris (in the todo file). Awaiting `<n> OK`.
- **Runs:** library = "Run 400m"; 11 workouts write "400m Run" (12×) / "1600m Run" (6×) / "800m Run" (6×) / "200m Run" → never counted.
- **Section F:** new scan of programmed-looking lines (bullet / count / distance first) that count as nothing → 97 texts / ~167 lines (Lu Raise, Triceps Push-back, DB Skater Squat, Scorpion, Couch, Battle Rope Slam, HPS, Swiss Ball moves, Sledge Pull, Sandbag Lunges…). Mostly missing library entries or other names.

## Scratch tools (not committed — in the session scratchpad, rebuild if needed)
- Old-vs-new extractor diff: `git show ecd63d5:utils/movement-extraction.ts` = pre-"no guessing" version.
- "Uncounted lines" scan logic: line matches a lead (bullet / `\d+x` / `\d+m` / cals), not in Intro/Info, extractor finds no library name, core words not inside any movement credited in the WOD; group by core text. Worth promoting into `scripts/audit-movement-false-flags.ts` as `--uncounted` next session.

## Lessons
- **Check what the Planner credits for the whole workout before declaring a miss** — I wrongly said "Wallball Shots" wasn't counted; one per-line credit dump showed it was, and showed the real gaps.
- **Old-vs-new diffs only find what the old code caught.** Missing coverage needs its own scan (programmed lines that credit nothing).
- **Write dates out ("9–11 Feb")** — "09–11.02" confused Chris.
