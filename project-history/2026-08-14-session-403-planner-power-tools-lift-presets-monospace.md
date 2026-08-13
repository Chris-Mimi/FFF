# Session 403 — 2026-08-14 (Opus 4.8)

**Planner power-tools batch + per-lift rep-scheme presets + per-section monospace table toggle. 13 commits, all pushed, tsc + build clean, no DB-data risk.** Everything was coach-facing and Chris tested each feature live as it shipped — no prod-verification carry-over from S403. Two SQL objects, one run by Chris (`lift_rep_scheme_presets`); the section flag is JSONB so no migration.

## What shipped

### 1. Planner "last 5 unique workouts" popovers (`7a5c8de`, `402be07`, `15dbd31`)
The Planning Grid's past-dot detail panel listed a pattern's exercises + programmed dates. Made those exercise chips clickable → a popover with the **last 5 UNIQUE workouts** the exercise appeared in (deduped by `workout_name`, most-recent first — a workout run at 5 class times counts once). Reused the same popover from three places: the past-dot detail panel, the expanded-group chips in the grid, and the Movement Patterns panel chips.

- Started at last-3, changed to last-5 on request; extracted a shared `lastUniqueWorkouts(workouts, limit)` helper in `movement-analytics.ts`.
- Full programming history is fetched **once** (lazy on first click, later made eager — see §2) via `getExerciseFrequency()` (no date filter) so "last 5" is true regardless of how far back.

**The Good Morning bug (`402be07`).** A grey chip showed "No programming history found" while the same dot's popover proved it *was* programmed. Root cause: the popover looked up history by **exercise id**, but the library has TWO "Good Morning" records — `barbell-good-morning` (linked to the pattern) and `good-morning`. `getExerciseFrequency` keys `exercisesByName` by lowercased name/display_name, so whichever record wins the name lookup is the id credited — not necessarily the one the pattern links. The coverage dot matches by NAME, so it lit up; the id-based popover missed. **Fix:** `ExerciseFrequency` now carries `display_name`; the history map is keyed by lowercased name **and** display_name, and the popover looks up by chip name — mirroring how the coverage dot matches. Verified the duplicate with a service-role script.

### 2. Chip staleness from full history + new colour bands (`56d91ff`)
Chris noticed grey ("Never") chips that had in fact been programmed this year. The chip colour came from `computePatternGaps`, whose lookback is only the grid window (`max(16, weeksBackToGridStart)` ≈ 16wk near today), so anything older read as undefined → grey "Never". Switched the chip's authoritative date to the **full-history** map (same source as the popover), loaded **eagerly** on Planner mount, with a fallback to the gap date if not yet loaded. New bands (Chris's spec): ≤14 green / 15–28 yellow / 29–60 orange / 61–90 red / **90+ light-grey** / **Never = faded dark-grey + white text** (a deliberate "retire this exercise" cue).

### 3. Movement Patterns move tools (`7f6c097`, `3352103`, `a85bfc2`, `c329ef1`)
- **Drag-to-move:** each chip gets a drag handle (on hover); drag onto another pattern's row to move it (insert into target, then delete from source — never orphaned). Distinct from the existing pattern-reorder drag on the same rows (separate `draggedExercise` state; drop handler checks it first).
- **Multi-select:** a **Select** toggle (next to Sort) turns chips into checkboxes — resolves the click=popover conflict by only selecting in Select mode. Tick several → **Move | Copy** toggle → "…to [group]" dropdown applies to all. Move removes from source; Copy keeps the originals (patterns may legitimately share an exercise).
- **Sort toggle:** per-group recent-first ↔ stale/never-first.
- **Scaling note (Chris's concern):** all of this touches only `movement_patterns` + `movement_pattern_exercises` — bounded config tables sized by the exercise library, NOT by gym usage. No pagination/growth risk; a move is one junction-row swap plus the recompute that already runs on any pattern edit.

Also wired the Movement Patterns chips to the history props (they used the same component but never received them, so they looked clickable but did nothing).

### 4. Collapsible Planning Grid (`856f6ed`)
Chevron on the grid header hides the grid **and** its date-window / RM-filter controls (lifted `gridOpen` to `PlannerSection`), leaving just the header — more room for the Movement Patterns / Uncategorised panels while categorising. Persisted (`localStorage 'planner-grid-open'`).

### 5. Adults session sub-filter (`6fe0fa6`)
Second toggle in the Adults track: **All / WOD / Foundations** (Foundations = `Foundations` + `Foundations/WOD`). Implemented by extending the existing `excludeSessionTypes` list in `computeAnalysis`. Hidden on the Kids track (everything there is the single `Kids & Teens` type — nothing to sub-divide). Confirmed with Chris.

### 6. Per-lift rep-scheme presets (`439650e`)
`ConfigureLiftModal` gets a **Saved presets** row. Save the current scheme (constant / variable / RM test) under a name, scoped to that lift; re-apply in one click; delete via the chip ×. New table **`lift_rep_scheme_presets`** (id, user_id, lift_id text, name, config jsonb; RLS per user; unique/​upsert on `user_id,lift_id,name`). Hook `lib/lift-preset-storage.ts`. **Chris ran the SQL and confirmed working.** Scope decided via AskUserQuestion → per-lift (matches how he names them).

### 7. Per-section "Keep table layout (monospace)" toggle (`f50aa01`, `401f1db`)
Chris pastes strength-scheme tables from Claude Desktop into a Strength section's content and shows them on the gym screen during the workout (TV/calendar), NOT the athlete app. The content stores fine (whitespace preserved) but renders in a proportional font, so space/tab-aligned columns collapse visually. Added an opt-in `section.monospace` flag: when on, that section's `content` renders `font-mono` on **all** display surfaces (coach calendar, TV `/tv`, athlete workouts/logbook, leaderboard, publish/search previews). Off by default → every existing workout unchanged. Field added to all section type variants (`types/movements`, `hooks/coach/useWorkoutModal`, `utils/logbook-utils`, and the two athlete-local interfaces).

The editor textarea is *already* monospace, so the checkbox showed no effect while editing (Chris compared two sections in the modal and saw no difference). Added a **live preview** under the checkbox that renders the content in the **display** (proportional) font, flipping to monospace when ticked — shown when content looks tabular (`/\t|  +|\|/`) or the box is on. Also advised the copy-side format: ask Claude for a space-padded (not tab-separated) table in a code block, short row labels.

## Docs
- Planner "How it works" modal updated (clickable chips, colour bands, sort toggle, drag + multi-select move/copy, session sub-filter).
- `Forge-Feature-Overview.md` updated with the new Planner + programming features.

## Notes / rejected
- Drag from Uncategorised into a group: **not** built — that panel already has a per-row "Move to…" button, and cross-panel drag (Uncategorised sits far below Movement Patterns) would be worse UX.
- Global markdown/monospace rendering of all section content: rejected — would change the look of every existing workout; the opt-in per-section flag was the non-breaking choice Chris wanted.
