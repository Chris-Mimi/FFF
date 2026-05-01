# Session 330 — Planner past-week drill-in + Monday TZ fix + current-week coverage day-by-day

**Date:** 2026-05-01 (Opus 4.7)
**Trigger:** Chris asked what the colored dots in the coach Analysis → Planner grid mean and whether they encode plan-vs-execution. Mid-session: he wanted past-week dots to show *which* exercises lit them up; he flagged a programmed Clean & Jerk (27.04) hadn't lit anything by 01.05; and he noticed week labels start on Sunday but the gym programs Monday → Sunday.

---

## What the dots already meant

Past weeks: solid filled circle = at least one exercise from the pattern's linked list appeared in a published WOD that week (auto-detected via `extractMovementsFromWod`). Empty gray = no match. **Not clickable.**

Current/future weeks: outline + light fill + tick = planned (entry exists in `programming_plan_items`). Dashed empty = unplanned. Click to toggle.

So past = execution evidence; future = planning intent. Cleanly separated. The user-facing question Chris asked was answered just by reading [PlanningGrid.tsx](../components/coach/analysis/PlanningGrid.tsx): the past dots **are** the "did my plan get executed" check.

---

## Fix 1 — past-week drill-in (the original ask)

[utils/pattern-analytics.ts](../utils/pattern-analytics.ts) `detectWeeklyCoverage` previously returned `Map<weekMonday, Set<patternId>>` — just enough for the dot to render but no detail behind it. Changed return type to `WeeklyCoverageMap = Map<weekMonday, Map<patternId, {exercises[], dates[]}>>`. The matching loop already iterated each pattern's exercises against extracted movements; just kept the matched names and the workout date instead of discarding them after the early `some()` check.

Output is sorted (`exercises.sort((a,b) => a.localeCompare(b))`, `dates.sort()`) before return so the UI doesn't have to.

[PlanningGrid.tsx](../components/coach/analysis/PlanningGrid.tsx) past colored dots became `<button>`s with a `selectedPast` state. Click sets `{patternId, patternName, color, weekStart, weekLabel}`. A details panel below the table (still inside the same white card) renders chips for each matched exercise plus "Programmed on: Tue 22 Apr, Thu 24 Apr…". Selected dot gets a `ring-2 ring-offset-1 ring-gray-700` so you see which one is open. Click again or X button to close.

Type additions in [types/planner.ts](../types/planner.ts): `PatternWeekCoverage` and `WeeklyCoverageMap`. State type in [PlannerSection.tsx](../components/coach/analysis/PlannerSection.tsx) bumped accordingly.

---

## Fix 2 — Monday-vs-Sunday label TZ bug

Symptom: Chris's first row label was Sunday's date, not Monday's. Root cause: `monday.toISOString().split('T')[0]` in two places (`generateWeeks`, `detectWeeklyCoverage`'s workout-Monday computation). `getMonday()` returns a Date set to local midnight; `.toISOString()` converts to UTC; Germany is currently CEST (UTC+2), so local midnight Monday → UTC 22:00 Sunday → Sunday's date string.

Same TZ class as S321 late-cancel, S324 booking gates, etc. Codebase already has `formatDate(d)` in [utils/date-utils.ts](../utils/date-utils.ts) — uses local component getters (`getFullYear()`, `getMonth()`, `getDate()`) so it's TZ-safe by construction. Both call sites switched to it.

**Functional impact: zero.** Both the grid keys and the coverage map keys had the same offset, so lookups still matched — the bug was purely visual labeling. But left as-is, anyone reading the grid would think the gym programs Sunday → Saturday.

**Lesson promotion-worthy:** any time `.toISOString().split('T')[0]` appears on a local-time Date in this codebase, suspect it. The pattern is bait. Reach for `formatDate()` instead.

---

## Fix 3 — current week shows coverage day-by-day

Symptom: Chris programmed C&J on 27.04 (a Monday). By Friday 01.05, the dot still hadn't filled. Reason: `week.isPast = ws < currentMonday` is strictly less-than, so the **current** Monday's row was treated as "future/planning" and never showed coverage. Coverage only flips on after `currentMonday` advances past it (next Monday).

This made the planner useless mid-week as an "is the plan being executed?" check. Fix: extend coverage view to past + current. For the current week:
- If covered → solid filled (drill-in button, same as past).
- If not covered yet → fall back to the planning circle, so the coach can still toggle plan intent for the week in progress.

Implementation extracted `renderCovered` and `renderPlanningButton` const elements inside the cell map, then branched: `showCoverageView ? (isCovered ? renderCovered : isCurrent ? renderPlanningButton : <gray empty>) : renderPlanningButton`. Future weeks unchanged. Past + uncovered unchanged (gray empty, non-clickable).

---

## The Clean & Jerk dot — open thread

Chris's dot may *still* not light up after the S330 reload. If so, the next layer of diagnosis is the extractor canonical-name mapping at [utils/movement-extraction.ts:50-53](../utils/movement-extraction.ts#L50-L53):

```ts
'clean & jerk': 'barbell clean & jerk',
'clean and jerk': 'barbell clean & jerk',
```

When source 1 (structured `lifts[]`) sees `Clean & Jerk`, it maps to canonical `barbell clean & jerk` — **but only emits that canonical name if `knownLower?.has(canonical)` returns true**. If the exercises library only has `Clean & Jerk` (no Barbell prefix), the canonical guard fails, falls through to fuzzy-match (`findMatchingExercise`), and may emit a different name than what the pattern's linked exercise has.

Chris confirmed that auto-detect should be the source of truth ("If the auto-detector is running properly, there is no chance that I need to override it"). So a manual-override option was explicitly rejected — fix the extractor instead if needed.

**Diagnostic plan (if needed next session):** service-role script that picks the 27.04 WOD by date, runs `extractMovementsFromWod()` on it, prints the emitted movement names, then prints the linked-exercise names for every pattern. Look for case/prefix mismatches. Probably <50 lines.

---

## Process moments worth remembering

- **Asked option-A/B/C before building.** When Chris said "I can't click past dots", three readings were plausible: (A) toggle plan retroactively, (B) override coverage manually, (C) layered. He picked "neither — fix auto-detect instead." Saved building the wrong thing. The `feedback_ask_when_unsure.md` rule paid off here: ambiguous request → one short clarifying question, not a multi-option investigation plan.

- **TZ bug pattern recognition.** Spotted the Sunday-vs-Monday issue from the symptom alone. Same shape as several previous incidents. `.toISOString().split('T')[0]` on a local-midnight Date is a code smell in this codebase — worth a periodic grep + cleanup pass.

- **"Auto-detect or nothing" is a stronger constraint than I initially proposed.** Option 2 (manual override past dots) was a reasonable fallback if the detector fails. Chris's response — "if it's running properly, no chance I need to override it" — reframes it: the detector IS the contract. If it's wrong, fix the detector. Don't add escape hatches that muddle the data model.

---

## Files touched

| File | Change |
|:---|:---|
| `types/planner.ts` | New `PatternWeekCoverage` + `WeeklyCoverageMap` types |
| `utils/pattern-analytics.ts` | `detectWeeklyCoverage` returns richer map with matched exercises + dates per (week, pattern); `generateWeeks` + workout-Monday computation use `formatDate()` for TZ-safe labels |
| `components/coach/analysis/PlannerSection.tsx` | Coverage state type bumped to `WeeklyCoverageMap` |
| `components/coach/analysis/PlanningGrid.tsx` | `currentMonday` uses `formatDate(getMonday(now))`; past + current week both render coverage view; current week falls back to planning circle when uncovered; past colored dots are `<button>`s; `selectedPast` state + details panel below table |
| `memory-bank/memory-bank-activeContext.md` | Bumped 189→190; rewrote Next Session Kickoff for S330; added S330 to Last 5 Sessions; dropped S325 |

Single commit per close-session checklist default.
