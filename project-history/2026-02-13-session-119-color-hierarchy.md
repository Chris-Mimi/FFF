# Session 119 — Color Hierarchy Refinement

**Date:** 2026-02-13
**AI:** Claude Opus 4.6
**Focus:** 3-tier teal hierarchy + session-type card colors + darker background

---

## Changes Made

### 1. 3-Tier Teal Hierarchy (eliminates "wall of teal")

Previously header, week banners, and session cards all used identical `#178da6` (teal-600).

| Element | Before | After |
|---|---|---|
| **Header** (CoachHeader.tsx) | `bg-[#178da6]` (teal-600) | `bg-teal-800` (`#105e73`) |
| **Week banners** (CalendarGrid.tsx) | `bg-[#178da6]` (teal-600) | `bg-teal-700` (`#14758c`) |
| **Published cards** (card-utils.ts) | `bg-teal-600` | `bg-teal-600` (unchanged) |

### 2. Session-Type Card Color Tiers

Added session-type awareness to `utils/card-utils.ts`. Cards now vary by workout type:

| Session Type | Color | Hex |
|---|---|---|
| WOD, Endurance (+ default) | `bg-teal-600` | `#178da6` |
| Foundations, Foundations/WOD, Diapers & Dumbbells | `bg-teal-500` | `#20a5bf` |
| Kids, Kids & Teens, FitKids Turnen, ElternKind Turnen | `bg-teal-400` | `#38bfd8` |

Implementation: `getCardClasses()` now accepts optional `title` parameter. `getSessionTier()` categorizes by keyword matching.

### 3. Darker Page Background

- `app/coach/page.tsx`: `bg-gray-200` → `bg-gray-300` for better contrast with white day columns.

## Files Changed

- `components/coach/CoachHeader.tsx` — header background color
- `components/coach/CalendarGrid.tsx` — week banner/day header colors, pass title to getCardClasses
- `utils/card-utils.ts` — session-type color tier logic
- `app/coach/page.tsx` — page background color
