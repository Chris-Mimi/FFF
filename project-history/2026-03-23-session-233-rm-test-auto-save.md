# Session 233 — RM Test Auto-Save Lift Records

**Date:** 2026-03-23
**AI:** Claude Opus 4.6 (Claude Code)
**Focus:** Auto-save lift records from coach Score Entry for RM test sections

---

## What Was Done

### 1. RM Test → Lift Records Auto-Save

When a WOD section has a configured lift with `rm_test` (1RM, 3RM, 5RM, or 10RM), the Score Entry modal now:
- **Auto-shows a weight input** for that section (no need to manually check scoring field boxes)
- **Labels the score column** with the lift name + RM type (e.g., "Back Squat 1RM")
- **Auto-creates `lift_records`** on save with:
  - Correct `lift_name`, `weight_kg`, `reps`, `rep_max_type`
  - Epley `calculated_1rm` (weight × 36 / (37 - reps))
  - Upsert logic (no duplicates if coach re-saves)
  - PR detection + push notification

### 2. Score Entry Icon Fix

Calendar card ClipboardList icon now shows when sections have rm_test lifts, even without manually checked scoring fields.

### 3. Percentage Cap Raised

ConfigureLiftModal percentage inputs (both constant and variable reps) now allow up to 120% (was capped at 100%). Supports programming above 100% of 1RM.

### Files Changed

- `hooks/coach/useScoreEntry.ts` — Extended `WodSection` with `lifts[]`, added `getRmTestLift()` helper, `scorableSections` now includes rm_test sections with auto-synthesized `load` scoring, `saveScores` passes `rmTestLifts` map to API
- `components/coach/score-entry/ScoreEntryGrid.tsx` — Score column header shows lift name + RM type for rm_test sections
- `components/coach/CalendarGrid.tsx` — Score Entry icon condition extended to check for rm_test lifts
- `app/api/score-entry/save/route.ts` — Added `RmTestLift` interface, Epley formula, lift_records upsert with PR detection after saving wod_section_results
- `components/coach/ConfigureLiftModal.tsx` — Percentage `max` changed from 100 to 120 (two inputs)
- `Chris Notes/Forge app documentation/Forge-Feature-Overview.md` — Documented new feature

### Key Design Decisions

- **No new scoring fields needed** — rm_test sections auto-synthesize `{ load: true }` in `scorableSections`, reusing existing ScoringFieldInputs component
- **Upsert not insert** — Checks for existing lift_record (same user + lift + rm_type + date) to prevent duplicates on re-save
- **PR detection reuses existing pattern** — Same logic as `/api/lift-records` POST: compare against previous best, fire `notifyPrAchieved`
- **Whiteboard-only athletes skipped** — No `user_id` = no lift_records (they don't have app accounts)

### Coach Workflow

1. Program strength section with variable reps (warmup/working sets)
2. Add 3RM section → configure lift with `rm_test: '3RM'`
3. Add 1RM section → configure lift with `rm_test: '1RM'`
4. Open Score Entry → weight inputs auto-appear
5. Enter each athlete's weight → Save
6. Athlete opens app → lift records already there + PR notification if applicable
