# Session 227 — Scaling 2 Dual Scaling Option (2026-03-21)

**Model:** Claude Opus 4.6 (Claude Code)

## Accomplishments

1. **Scaling 2 scoring option** — Mirrors the Load 2 pattern exactly. Coaches can enable a second scaling dropdown per section when the primary Scaling is enabled. Labels change to "Scaling 1" / "Scaling 2" when both active, and S1/S2 labels appear in score entry inputs.
2. **Full pipeline coverage** — Type definitions, workout modal chips, score entry (coach + athlete logbook), API save route, leaderboard query + display, all updated.
3. **Migration applied** — `scaling_level_2 text` column added to `wod_section_results`.

## Files Changed

- `types/movements.ts` — Added `scaling_2?: boolean` to scoring_fields
- `components/coach/WODSectionComponent.tsx` — Scaling 2 chip + auto-disable + label rename
- `components/athlete/logbook/ScoringFieldInputs.tsx` — S1/S2 labels + second dropdown
- `components/coach/score-entry/AthleteScoreRow.tsx` — scoring_2 + scaling_level_2 pass-through
- `hooks/coach/useScoreEntry.ts` — All interfaces, prefill, empty check, save
- `hooks/athlete/useAthleteLogbookState.ts` — SectionResult interface
- `app/api/score-entry/save/route.ts` — ScoreEntry interface, empty check, both record builders
- `utils/leaderboard-utils.ts` — RawSectionResult + LeaderboardEntry + mapping
- `components/athlete/LeaderboardView.tsx` — SELECT query + badge display
- `utils/logbook/loadingLogic.ts` — SectionResult interface, select query, prefill
- `utils/logbook/savingLogic.ts` — SectionResult interface, empty check, upsert
- `components/athlete/AthletePageLogbookTab.tsx` — SectionResult interface, hasResult check
- `supabase/migrations/20260321000000_add_scaling_level_2.sql` — New column

## Key Decisions

- **Leaderboard sorts by primary scaling only** — `scaling_level_2` is display-only in leaderboard (badge shown but not used for ranking), same pattern as `weight_result_2`.
- **Backward compatible** — Existing workouts have no `scaling_2` in scoring_fields JSONB, so second dropdown never appears. Column defaults NULL.
- **Mirrors Load 2 exactly** — Same chip visibility logic (only when parent enabled), same auto-disable when parent unchecked, same label pattern (S1/S2 vs L1/L2).
