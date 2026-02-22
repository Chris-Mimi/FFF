# Session 151 — Bug Fixes & Housekeeping

**Date:** 2026-02-22
**Model:** Sonnet 4.6

---

## Accomplishments

1. **Google Calendar EMOM bug fix**
   - Root cause: Workout Type dropdown in `WODSectionComponent.tsx` was gated to WOD/WOD Pt.x sections only
   - Stale `workout_type_id` on Skill/WOD Movements sections couldn't be cleared via UI → published to Google Cal with wrong suffix
   - Fix: Removed section-type condition — Type dropdown now shown on all section types
   - To fix "The Ghost" (2025-12-01): open workout, clear Type on Skill & WOD Movements sections, save, re-publish

2. **Analysis page scroll jump fix**
   - Root cause: Chip section shrinking below current scroll offset caused browser to snap up
   - Fix: `min-height: 150vh` on Statistics panel (`StatisticsSection.tsx`) prevents panel ever being shorter than 1.5x viewport
   - Multiple approaches attempted: `useLayoutEffect` scroll restore (no effect), `100vh` (too short), `200vh` (too much), `150vh` (correct)

3. **Housekeeping**
   - Confirmed `get_public_tables()` RPC working — removed from pending migrations
   - Confirmed Athletes page benchmarks/lifts issue resolved — removed from known issues
   - Cleaned up activeContext known issues

---

## Files Changed

- `components/coach/WODSectionComponent.tsx` — Workout Type dropdown shown on all section types
- `components/coach/analysis/StatisticsSection.tsx` — `min-height: 150vh` on panel
- `memory-bank/memory-bank-activeContext.md` — Session 151 entry, issues resolved
