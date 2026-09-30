# Movement Recency Queries — agreed basics (S414)

Chris asks planning questions like *"which lifts haven't we done for 2 months?"* or *"which staple movements haven't appeared in a WOD for 6 weeks?"*. Answer from the DB (the same data the Planner uses), not from screenshots. Read this file on demand when such a question comes up.

**Goal over time:** the questions repeat. Log each new question shape in the table at the bottom so the next session knows exactly what Chris means without re-asking.

---

## Section scopes (18 section types exist in `section_types`)

| Scope | Sections |
|:---|:---|
| **In a WOD** | `WOD`, `WOD Pt.1`–`WOD Pt.6` |
| **Trained at all** | the above + `WOD movements`, `Strength`, `Olympic Lifting`, `Gymnastics`, `Skill`, `Accessory`, `Finisher/Bonus!` |
| **Warm-up / cool-down** | `Warm-up`, `Cool Down` — excluded from WOD and trained-at-all questions, but **in scope when Chris asks for one** (e.g. "give me a warm-up featuring underused movements") |
| **Never** | `Whiteboard Intro`, `Final prep/Info` |

- `Finisher/Bonus!` = edge case; counts under "trained at all", not "in a WOD".
- ⚠️ The Planner's own frequency (`getExerciseFrequency` in `utils/movement-analytics.ts`) does **not** filter by section type — it counts warm-ups too. Don't copy its numbers; filter sections yourself. (Making the Planner do this = a code change, only if Chris asks.)

## Staples

Tool: `scripts/movement-recency.ts` (read-only; `--scope wod|trained|warmup`, `--weeks`, `--staple`, `--months`, `--kids`). Counts distinct dates, not class times.

- **Staple** = appeared in an **In a WOD** section at least **10 times in the last 10 months** ( nearly once a month).
- **Overdue** = no appearance for the period Chris names.

## Lifts and name variants — depend on the question

- **Lifts:** no single rule. Ask or infer which of these he means, e.g. *RM/testing lifts* (sections with an `rm_test` lift) vs *barbell lifts inside WODs*. Build the standard-question list below as they come up.
- **Name variants** (Pull-up / Pull-ups / Pull-up Strict): merge into a family by default for broad questions; keep separate when the question is specific (e.g. "strict vs kipping"). If unclear, state which way you did it — don't block on it.

## Sessions

- **Adults by default.** Exclude `Kids & Teens` and `Diapers & Dumbbells` unless asked.
- Published workouts only; exclude `weekly_sessions.is_private`.

## Output

- Numbered list (Chris replies `<n> OK`), grouped by movement pattern, each with last date + weeks ago.
- Report "never" only for exercises that sit in a movement pattern — the ~716-row library is full of never-intended entries.

---

## Standard questions (grow this as Chris asks)

| # | Question as Chris phrases it | Interpretation |
|:---|:---|:---|
| 1 | "Which (barbell) lifts haven't we done for N weeks/months?" | S414 answer: the 20 lifts in `barbell_lifts` (via `exercise_id` link), last date in **trained-at-all** scope, with a second column for **in a WOD**. Run the script twice (`--scope trained --staple 0 --json`, `--scope wod --staple 0 --json`) and join on `exercise_id`. Group by lift category. **Also check the exercise-level variants** (Hang Power Clean/Snatch, etc. aren't in `barbell_lifts`) before claiming a family gap — S414 I said "no power snatch since April" while Hang Power Snatch was on 14.07 (Chris caught it in the Movement Tracker). |
| 2 | "Which staple movements haven't appeared in a WOD for N weeks?" | `npx tsx scripts/movement-recency.ts --weeks N` (defaults: wod scope, staple ≥10 in 10 mo). Then cross-check variants in the "fresh staples" list and report family status per item. First run S414: 6 overdue. |
| 3 | "Give me a warm-up featuring underused movements" | Warm-up scope; rank by longest since last use in warm-ups |
