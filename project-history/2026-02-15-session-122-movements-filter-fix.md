# Session 122 — Movements Filter Bug Fix (INCOMPLETE)

**Date:** 2026-02-15
**AI:** Claude Opus 4.6
**Focus:** Fix movements filter in Workouts tab (coach login)

---

## Problem Reported

The movements filter in the Workouts tab was matching against raw section content text instead of actual exercise names. Issues:
1. Non-exercise text appearing in movements list ("try to add weight each round", "sets", "Work")
2. Partial matches from parenthetical content ("Using Fractionals)", "KB Unilateral Carry in")
3. Session type "Endurance" finding unrelated "Work" text
4. Exercise name fragments instead of full names ("Arch Stretch" instead of "Partner Arch Stretch")

## Changes Made

### File 1: `utils/movement-extraction.ts` (full rewrite)

**What was done:**
- Added structured data extraction: `section.lifts[].name`, `section.benchmarks[].name + .exercises[]`, `section.forge_benchmarks[].name + .exercises[]`
- Exported new `extractMovementsFromWod(wod)` function for per-WOD matching
- Added instruction phrase detection ("try to", "add weight", etc.) — skips entire lines
- Strip instruction parentheticals BEFORE comma splitting (fixes "(3 positions, 15 reps each)" fragment issue)
- Bullet pattern changed to greedy capture (full exercise name after `*` or `•`)
- Content-extracted movements require 2+ valid words (single words handled by structured data)
- Expanded excludeWords with units ("metres", "metre") and instruction words ("using", "positions")
- Word validation rejects digit+unit combos ("50kg", "15m", "3rm")
- Truncate movement text at closing equipment parenthetical (e.g., "KB Carry (unilateral)" not "KB Carry (unilateral) Around A Block")

### File 2: `hooks/coach/useCoachData.ts` (line 288-295)

**What was done:**
- Import `extractMovementsFromWod` from movement-extraction
- Movements filter now uses `extractMovementsFromWod(wod)` with exact Set membership instead of `\b` regex against raw `s.content`

## What's Still Broken

The content text parsing still produces incorrect results:
- **"warm-up 8-12"** — Section type headers being captured as movements
- **"Lock Shoulder Routine"** — Digit "3" from "Lock 3 Shoulder routine" filtered out by `isValidMovementWord` (rejects pure digits), losing part of the exercise name
- Other oddities from free-text parsing

## Root Cause Analysis

The fundamental challenge: workout content is free-form text where exercises are written in many formats. Regex-based extraction is an arms race — each fix creates new edge cases.

**Better approach to consider for next session:**
1. **Cross-reference against exercises table** — The app has an `exercises` table with all known exercise names. Extract candidate text, then fuzzy-match against known exercises. Only include matches. This would eliminate all noise.
2. **Alternatively**: Only show structured data (lifts/benchmarks/forge_benchmarks) in the movements filter, and drop content-text parsing entirely. Simpler but loses exercises that aren't in structured arrays.

## Key Decisions & Lessons

- Removed "partner", "lock", "hold", "touch" from excludeWords — they're legitimate exercise name parts; 2-word minimum already prevents single-word noise
- Instruction parentheticals must be stripped BEFORE comma splitting to avoid fragment artifacts
- Lazy regex terminators that include `\d` break on exercise names containing digits (e.g., "Lock 3 Shoulder routine")
- The greedy bullet pattern works better than lazy for `*`/`•` prefixed exercise lists

## Files Changed

- `utils/movement-extraction.ts` — Full rewrite (extraction logic + new export)
- `hooks/coach/useCoachData.ts` — Import + filter logic change (lines 5, 288-295)

---

## Next Steps (Priority)

1. **Fix remaining content parsing issues** — Consider database cross-reference approach
2. Continue with #10 Color contrast audit after filter is fixed
