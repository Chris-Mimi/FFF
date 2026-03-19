# Session 226 — Track Scoring Toggle (2026-03-19)

**Model:** Claude Opus 4.6 (Claude Code)

## Accomplishments

1. **"Trk" checkbox in Workout modal** — Added `track?: boolean` to `scoring_fields` in WODSection type and a "Trk" checkbox chip in the scoring configuration row (alongside Time, Reps, Load, Scaling, etc.).
2. **Conditional track selector in score entry** — Track buttons (1/2/3) in AthleteScoreRow now only render when `scoring_fields.track === true`. Name column width adjusts dynamically (9rem with track, 6rem without).
3. **No data confusion** — When Trk is off, all scores save `track: NULL`, leaderboard sorts purely by scaling + score. Track dimension is invisible for non-track workouts.

## Files Changed

- `types/movements.ts` — Added `track?: boolean` to scoring_fields interface
- `components/coach/WODSectionComponent.tsx` — Added "Trk" checkbox after Task✓
- `components/coach/score-entry/AthleteScoreRow.tsx` — Conditional track button rendering + dynamic width

## Key Decisions

- **Toggle per-section, not per-workout** — Track is a scoring_fields option (JSONB), so each section independently controls whether tracks appear. Consistent with how all other scoring options work.
- **No migration needed** — `track` in scoring_fields is stored in existing JSONB column on `wods.sections`. The `track` column on `wod_section_results` (SMALLINT) already exists from Session 224b.
