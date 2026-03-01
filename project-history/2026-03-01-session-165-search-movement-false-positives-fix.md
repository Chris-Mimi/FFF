# Session 165 — Search Movement False Positives Fix

**Date:** 2026-03-01
**Model:** Sonnet 4.6

---

## Bug Report

When searching for an athlete name on the Coach Workouts page, the movements sidebar showed exercises that did not appear anywhere in the workout content:
- "Advanced-tuck-planche" (with dashes — wrong format)
- "Dynamic-scorpion"
- "ATG Peterson Step-Up" (matched because athlete name "Peter" was a substring)

## Root Cause

Two issues in the movement extraction system:

### 1. Dashed technical names loaded into exercise lookup
`fetchExerciseNames` in `useCoachData.ts` was adding both the `name` field (dashed slug format like `advanced-tuck-planche`) and `display_name` (readable format like `Advanced Tuck Planche`). The slug names caused dashed display in the movements list.

### 2. Overly loose reverse substring matching
`findMatchingExercise()` step 4 in `movement-extraction.ts` checked if a candidate word from workout content appeared as a substring of ANY known exercise name. A single word like "advanced" (from scaling description text) would match "advanced tuck planche" because `"advanced tuck planche".includes("advanced")` is true.

## Fix

### File 1: `hooks/coach/useCoachData.ts`
- Removed `ex.name` (slug) from the exercise names set
- Only `ex.display_name` is added now

### File 2: `utils/movement-extraction.ts`
- Added 60% length ratio requirement to reverse substring matching
- Candidate must be at least 60% of the exercise name's length
- "advanced" (8 chars) vs "advanced tuck planche" (21 chars) = 38% → blocked
- "arch stretch" (12 chars) vs "partner arch stretch" (20 chars) = 60% → still works

## Key Decisions

- 60% threshold chosen to preserve legitimate partial matches (e.g., "Arch Stretch" → "Partner Arch Stretch") while blocking single-word false positives
- Slug names completely excluded from exercise lookup — they serve no purpose in movement extraction
