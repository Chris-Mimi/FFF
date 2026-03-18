# Session 221 — Movement Demos Video Clip Matching Fix

**Date:** 2026-03-18
**AI:** Claude Opus 4.6

---

## What Was Done

### Bug Fix: Video clips disappearing when text typed before exercise name

**Problem:** On the Coach page, when an exercise with a video clip was loaded into a section, the clip appeared in the purple "Movement Demos" bar. However, typing ANY text before the exercise name (e.g., "3x Back Squat", "EMOM: Deadlift") caused the clip to disappear, even with a space separating the prefix from the exercise name.

**Root Causes (3 issues in `utils/section-video-matcher.ts`):**

1. **No leading prefix stripping** — The parser only stripped rep/set patterns from the END of lines (e.g., "Back Squat 3x10") but never from the START (e.g., "3x Back Squat").

2. **`startsWith` too restrictive** — The partial match only checked if the line started with the exercise name or vice versa. Any prefix text broke the match entirely.

3. **Parenthetical stripping broke exercise names** — Exercises like "90° Ext. Rotation (SU)" had their `(SU)` stripped by the trailing-parenthesis regex, then failed to match the full database name.

**Fixes Applied:**

1. Added leading prefix stripping regexes: `^\d+x\d*\s+` and `^\d+\s*(?:reps?|sets?)\s+`
2. Changed partial match from `startsWith` to `includes()` — exercise name can appear anywhere in line
3. Partial match now checks against **original line** (not stripped version) to preserve parenthetical parts of exercise names
4. Added **word boundary checking** — character before and after match must be whitespace or punctuation, preventing false positives like "xBack Squat"

### File Changed

- `utils/section-video-matcher.ts` — All changes in the `matchSectionExercises()` function

---

## Key Decisions

- Used `includes()` with boundary checking rather than regex word boundaries (`\b`) because exercise names contain special characters (°, parentheses, hyphens) that don't play well with `\b`
- Boundary chars allowed: `\s , ; : - – — / |` plus start/end of string
