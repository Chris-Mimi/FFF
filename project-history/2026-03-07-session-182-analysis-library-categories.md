# Session 182 - Analysis Library Categories + Extraction Fix (2026-03-07)

## Summary
Added collapsible category groups to the Exercise Library popup on the Analysis page, and fixed a text extraction bug where exercises with mid-name parentheticals (like "Slamball (WB) Wall Throw") showed 0 count.

## Changes

### 1. Exercise Library Collapsible Categories
- Exercises grouped by category in workout-flow order (Warm-up → Olympic Lifting → Compound → Gymnastics → Core → Cardio → Strength → Recovery)
- Each category has a clickable header with chevron + exercise count
- Click to expand/collapse (all start expanded)
- Exercises sorted alphabetically within each category
- Works on both mobile and desktop layouts
- Extracted shared `ExerciseButton` component to avoid duplicating card markup

### 2. Mid-Name Parenthetical Extraction Fix
- **Bug:** `extractMovementsFromText` truncated text at the first closing parenthesis via `^(.*?\([^)]+\))` regex
- **Effect:** "Slamball (WB) Wall Throw" became "Slamball (WB)" which failed to match (too short for 60% substring threshold)
- **Fix:** Both extraction points now try **full text first**, then paren-truncated as fallback
- **Impact:** Fixes all exercises with parentheticals mid-name (equipment/variant labels like "(WB)", "(KB)", "(DB)")

## Files Changed
- `components/coach/analysis/ExerciseLibraryPanel.tsx` — Complete rewrite: added category grouping, collapse state, alphabetical sort, shared ExerciseButton component
- `utils/movement-extraction.ts` — Two extraction points changed: try full text before paren-truncated fallback (lines ~270 and ~296)

## Status
- TypeScript compiles clean
- Needs user testing
