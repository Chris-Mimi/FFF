# Session 341 — Planner viewing improvements + extractor longest-match fix + S340 backfill + RM-test distinction

**Date:** 2026-05-07 (Opus 4.7)

**Trigger:** Chris noticed two issues with the Programming Planner. (1) The grid only showed 6 weeks back / 12 weeks forward with no way to scroll or zoom, so he couldn't see January when he wanted to. (2) Clicking the Movement Patterns title row from the planner required jumping to a different section of the page. (3) Side-investigation: a Sumo Deadlift 10RM test was being reported in the planner as plain "Deadlift" — three patterns linked to Sumo Deadlift weren't lighting up because the extractor returned the shorter match. (4) He wanted to see at a glance which lifts in a given week were rep-max tests vs. WOD-context work, with a "show me only RM testing" filter.

Four work threads, two commits — checkpoint and close.

---

## Thread 1 — Extractor longest-substring-match fix

[utils/movement-extraction.ts:155-184](utils/movement-extraction.ts#L155-L184) `findMatchingExercise` step 4. Pre-S341 the substring loop returned the first known-name that matched the candidate, with iteration order dictated by Set insertion. For lift "Sumo Deadlift" the candidate was `"barbell sumo deadlift"`, both "Deadlift" and "Sumo Deadlift" were in the known list, and "Deadlift" won — emitted first.

Fix: collect every candidate in a single pass, return the longest. Existing `length < 4` filter and 60% candidate-length guard preserved. Cost is now O(n) instead of early-exit, but n is small (~hundreds of exercises) and runs only inside extractor calls. Same shape of fix would apply to "Press" inside "Bench Press" or any other strict-substring collision.

This was a planner correctness bug that nobody had caught because most exercises don't have shorter exercises as substrings.

---

## Thread 2 — S340 backfill applied

S340 added an `exercises[]` field to `benchmark_workouts` and `forge_benchmarks` master rows, with auto-suggest + required-on-save. The follow-up that S340 deferred: existing WOD JSONB snapshots predate the field, so historical WODs with benchmarks/forge configured (e.g. Nancy, DT, Karen, Isabel, Tabata This, Zachary Tellier, Filthy Fifty, the C2 Rower / SkiErg testing weeks) didn't have the new array.

Wrote [scripts/backfill-wod-benchmark-exercises.ts](scripts/backfill-wod-benchmark-exercises.ts) — service-role, dry-run-by-default, walks every `wods.sections[].benchmarks` and `forge_benchmarks` slot, looks up the master row by id, and copies `exercises[]` into the section JSONB. Flags: `--apply` (write), `--force` (overwrite already-populated). Reports per-WOD what changes.

Probe first ([scripts/probe-wods-with-benchmarks.ts](scripts/probe-wods-with-benchmarks.ts)) to scope: 29 of 284 WODs had at least one benchmark/forge configured, 37 slots total, 0 already populated. Dry run was clean → applied → 29 wrote, 0 failures.

---

## Thread 3 — Planner viewing improvements (zoom + scroll + inline expand)

**Date range UX.** Replaced hardcoded `PAST_WEEKS=6 / FUTURE_WEEKS=12` constants in [components/coach/analysis/PlannerSection.tsx](components/coach/analysis/PlannerSection.tsx) with view-state machine. Segmented control `[ 1mo | 3mo | 6mo | 12mo ]` (5 / 13 / 26 / 52 weeks total, centred on the current anchor). Prev/Today/Next buttons shift the anchor by half-view. `viewMonths` persists in localStorage (`planner-view-months`); anchor offset resets to 0 every load. `generateWeeks` gained an optional `anchorDate?: Date` so the helper stays general.

Data fetching re-runs on window change via a separate useEffect that's gated with a `useRef` to skip first render — mirrors the existing trackFilter effect.

**Inline pattern expand.** Clicking a pattern title in the Planning Grid now expands an inline row underneath it (full-width, spans every week column) showing the same date-coloured exercise chip grid as the upper Movement Patterns section. New shared [components/coach/analysis/PatternExerciseChips.tsx](components/coach/analysis/PatternExerciseChips.tsx) is the single source — used by both PatternManager (per-pattern chevron expansion) and PlanningGrid (inline expansion). PatternManager's `expandedPatternId` and `isPanelOpen` were lifted to PlannerSection as controlled props because an earlier failed attempt scrolled to PatternManager and forced it open — this turned out to be the wrong UX (Chris wanted inline, not jump-to-section), so the lifted state stayed but the scroll behavior was reverted.

---

## Thread 4 — Rep-max test distinction (option C)

**The data.** Lift slots in section JSONB already carry `rm_test: '1RM' | '3RM' | '5RM' | '10RM'`. The extractor was throwing this metadata away when emitting names.

**The new path.** Added `extractMovementsWithMetadata` in [utils/movement-extraction.ts](utils/movement-extraction.ts) — same lift/benchmark/forge/content extraction logic as `extractMovementsFromWod`, but returns `Map<string, { rmType? }>` instead of `Set<string>`. For each lift slot, the resolution path is run, the emitted name(s) are collected, and `rmType` is tagged onto each. Existing 5 callers of `extractMovementsFromWod` are untouched — the new variant is consumed only by `detectWeeklyCoverage`.

`PatternWeekCoverage.exercises` widened from `string[]` to `CoveredExercise[]` (`{ name, rmType? }`). New `RmTestType` and `CoveredExercise` types in [types/planner.ts](types/planner.ts).

**The UI.** [components/coach/analysis/PlanningGrid.tsx](components/coach/analysis/PlanningGrid.tsx) accepts `contentFilter: 'all' | 'rm-only'`. New `isWeekCovered` predicate replaces the inline `coverage.has(...)` check — in `rm-only` mode a pattern-week only counts as covered if at least one matched exercise has rmType. The dot-click bottom panel filters chips the same way and hides itself entirely if the filtered list is empty. RM chips render with an amber background + a `1RM` / `3RM` / `5RM` / `10RM` pill so they pop against plain chips.

**The control.** New `[ All | RM Testing only ]` segmented at the top of PlannerSection, intentionally non-persistent (resets to 'all' each load) — different from `viewMonths` which persists. The reasoning: RM-only is an analytical mode, not an everyday default, and persisting it could mask coverage gaps if a coach forgets they've toggled it on.

---

## Process moments worth remembering

- **Diagnosis-first probe before claim.** When Chris reported the Sumo Deadlift "doesn't show" issue, I traced the extractor logic step-by-step in my head before claiming the bug. The hypothesis ("longest match wins, but code returns first") matched the code. Wrote the fix immediately rather than investigating the wrong layer. Avoidance of S338's "two wrong theories" pattern.
- **Asked one tight question at the right moments.** Twice in this session: when Chris said "the title turns blue but nothing happens" (root cause was `isOpen` panel collapsed) and when he asked "is RM distinction too complicated?" (gave him a 4-option short list, didn't drift into design). Both unblocked progress in one round.
- **Mid-session checkpoint shipped at the right boundary.** A + B + extractor fix + backfill = one coherent "planner viewing + correctness" commit. C = different scope (extractor return-shape change + new feature) — clean to ship as its own commit. Matches the S336 / S340 checkpoint shape.
- **Reverted work without ego.** First B implementation auto-opened the upper Movement Patterns panel and scrolled there. Chris said "I meant for it to open in the same place." Reverted the scroll + auto-open path entirely, kept the lifted state for re-use, built inline-expand. No defensive "well, the original was also fine" — just reverted.
- **Extracted to a shared component before the second usage.** PatternExerciseChips landed in B because both PatternManager and the grid's inline expand needed the chips. Avoided the trap of inlining in the grid then "consolidating later" — the consolidation never happens.
- **Sibling extractor over breaking change.** Six callers of `extractMovementsFromWod` exist. Changing its return type from Set to Map would have required touching all six. New `extractMovementsWithMetadata` lets the planner consume metadata while the rest of the app stays as-is. Code duplication is contained (~50 lines, same logic) and is documented in a landmine.

---

## Files touched

| File | Change |
|:---|:---|
| `utils/movement-extraction.ts` | Longest-substring-match fix in `findMatchingExercise`. New `extractMovementsWithMetadata` + `MovementMetadata` + `RmTestType`. |
| `utils/pattern-analytics.ts` | `generateWeeks` gained `anchorDate?` param. `detectWeeklyCoverage` consumes metadata extractor and emits `CoveredExercise[]`. |
| `types/planner.ts` | New `RmTestType`, `CoveredExercise`. `PatternWeekCoverage.exercises` widened to `CoveredExercise[]`. |
| `components/coach/analysis/PlannerSection.tsx` | View-months state machine, anchor offset, content filter, controlled-prop wiring for PatternManager. |
| `components/coach/analysis/PlanningGrid.tsx` | View controls accept anchor date. `isWeekCovered` predicate honours `contentFilter`. Inline pattern-row expansion. RM-badge chip render. Title-click toggles inline expand. |
| `components/coach/analysis/PatternManager.tsx` | `expandedPatternId` + `isPanelOpen` are now controlled props. Inline chip-grid replaced by `<PatternExerciseChips>` import. |
| `components/coach/analysis/PatternExerciseChips.tsx` | New shared component — date-coloured exercise chip grid with empty-state link. |
| `scripts/backfill-wod-benchmark-exercises.ts` | New service-role one-shot. Dry-run-by-default + `--apply` + `--force`. |
| `scripts/probe-wods-with-benchmarks.ts` | New service-role probe — counts WODs needing backfill. |
| `scripts/probe-sumo-deadlift.ts` | New service-role probe — diagnoses Sumo Deadlift extractor issue. |
| `Chris Notes/Forge app documentation/Forge-Feature-Overview.md` | Planner bullet extended with view selector + inline pattern expand. |
| `memory-bank/memory-bank-activeContext.md` | Version 203; S341 entry; kickoff rewritten; S336 rotated to history; 5 new landmines. |

TS clean. Production build passes (twice — checkpoint + close).
