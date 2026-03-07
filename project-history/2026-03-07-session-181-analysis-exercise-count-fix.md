# Session 181 - Analysis Page Exercise Count Fix (2026-03-07)

## Summary
Fixed Analysis page exercise frequency counts being wrong/missing by replacing duplicate regex extraction logic with the shared `extractMovementsFromWod` function that already works correctly in the Workouts tab.

## Problem
- "World's Greatest Stretch + Samson" showed "not used yet" (0 count) despite being in 9 workouts (6 unique)
- "Glute Bridge Reach Over" showed 3x when it appears in 17 workouts (6 unique)
- Many other exercises likely undercounted

## Root Cause
`getExerciseFrequency()` in `utils/movement-analytics.ts` had its own ~250-line regex-based extraction logic that was inferior to the shared `extractMovementsFromWod()` in `utils/movement-extraction.ts`. The duplicate code lacked:
- `findMatchingExercise` with substring matching and plural tolerance
- `genericToCanonical` mapping (e.g., "deadlift" -> "barbell deadlift")
- Proper handling of `+` in exercise names (tried full-line match before splitting)
- Instruction line filtering
- Equipment parenthetical handling

## Fix
Replaced the entire extraction section of `getExerciseFrequency()` with a call to `extractMovementsFromWod()`, matching how `useMovementTracking.ts` already works successfully.

## Files Changed
- `utils/movement-analytics.ts` — Replaced ~250 lines of duplicate regex extraction with shared `extractMovementsFromWod` call. Added imports for `extractMovementsFromWod` and `WODFormData`.

## Status
- Code change complete, TypeScript compiles clean
- **NOT YET TESTED** by user (ran out of usage time)
