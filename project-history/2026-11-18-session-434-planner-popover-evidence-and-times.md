# Session 434 — Planner popover: counting line + class times (2026-11-18, Opus 5.5, Mac)

## Shipped
| Commit | What |
|:---|:---|
| `dbd88f0` | Last-5-unique-workouts popovers show the line that got each workout counted; Open #26.2 text fix |
| `d5f330e` | Same popovers show the class time(s) |

Housekeeping: deleted 2 merged `ccr-*` branches (`ccr-1262e94f-lkb06b`, `ccr-d585e40e-b7d2c5`). No unmerged phone branches.

## 1. "Snatch" chip listed DB Snatch workouts
- Chris: Snatch popover showed Open #26.2 and the 9.10 kids workout — both DB Snatch.
- Cause: bare word "Snatch" (= library `barbell-snatch`, display "Snatch") in the text: 26.2 "Work up to WOD weight for Lunge & **Snatch** …", 9.10 "Clap, Slap, Jump, **Snatch** game". Lines saying "DB Alternating Snatch" already count only as that (longest match wins).
- The 3-monthly false-flag audit doesn't catch these — "& Snatch" / "Snatch game" pass its PROGRAMMED pattern.
- Fixes: Chris changed 9.10 to "Grab". 26.2 → "Lunge & DB Alternating Snatch" via `rewrite-workout-lines.ts` (`renames/2026-11-18-open-26-2-snatch-line.json`, 6 wods, Planner diff = LOST Snatch only).

## 2. Rename to "Barbell Snatch"? — rejected
- Scanned every library name that sits inside a longer one, across 656 workouts, flagging workouts that also credit the longer variant.
- Snatch: 16 credited, only 26.2 wrong. Clean: 30, one doubtful ("Do NOT try to Clean the bar" in C&J Testing). Split Jerk / Deadlift / Bench Press / (Hang) Power Clean: all real.
- Rename would force "Barbell Snatch" in every future workout + rewriting all past bare "Snatch" — too much cost for ~2 stray lines. Non-lift names (Leg Swing, Burpee, Wall Walk…) flag a lot but are genuine "both programmed".

## 3. Popover evidence line
- `utils/movement-extraction.ts`: `extractMovementsFromWod(…, evidence?)`, `extractMovementsFromText(…, evidence?, label?)`. Evidence mode runs each line / lift / benchmark into a fresh set and merges back (same union), recording `"<section>: <line>"`.
- Priority: Lift slot 3 > line starting with bullet/number 2 > anything else 1; ties keep the earliest. First version (first-line-wins) showed "The slow-motion snatch is a simple technique…" for Snatch Testing — hence the priority.
- `getExerciseFrequency` passes a per-workout map; `ExerciseFrequencyWorkout.evidence`. Rendered as `↳ …` in `PlanningGrid.tsx` + `PatternExerciseChips.tsx`.
- Verified: 730 wods, 0 count differences with vs without evidence; 2 movements without evidence (implied movements — no line, shows nothing).

## 4. Class times
- `fetchPublishedWorkouts` selects `weekly_sessions.time`; `lastUniqueWorkouts` returns `times[]` = every class time of that workout on its most recent date, sorted ("· 17:15, 18:30").

## Open (asked at session start, no reply yet)
- Salma Berraho (Guardian Only) confirmed booking 13.11 15:00.
- Release-window 10-card block hits since 8.11? Foundations OK for Magdalena; unclear Bianca?
- Align "schreib uns" refused messages.

## Learnings
- Wrong Planner credits come from single shorthand/prose lines, not ambiguous library names — make them visible (evidence line) and fix the text.
- `const` Set captured by closures can be swapped via `let` to collect a sub-source's credits without refactoring every `.add`.
