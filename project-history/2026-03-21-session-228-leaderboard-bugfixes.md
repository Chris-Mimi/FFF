# Session 228 — Leaderboard Bugfixes (2026-03-21)

**Model:** Claude Opus 4.6 (Claude Code)

## Accomplishments

1. **Fix duplicate reps display** — When scoring type is `time` or `max_time` and an athlete has no time result (only reps as fallback primary), reps appeared twice in the display (e.g., "336 reps · 30/125 kg · 336 reps"). Added `'time'` and `'max_time'` to the reps exclusion list in `formatResult` extras logic.

2. **Fix gender filter for whiteboard athletes** — Expanded `WHITEBOARD_GENDERS` map from 42 entries to ~95 entries covering all adults from the booking list. Previously missing athletes (Petra, Bodo, MichaelM, AnnaHa, AnnaHo, and many others) were invisible when M/F filter was applied.

## Files Changed

- `utils/leaderboard-utils.ts` — Expanded WHITEBOARD_GENDERS map (all adults); added `'time'`/`'max_time'` to reps exclusion in formatResult

## Key Decisions

- **All adults added to map** — Rather than just fixing the 5 reported names, added every adult from the booking list to prevent future missing-gender issues.
- **Map is still temporary** — Will be removed once all athletes have registered accounts with gender set in `members` table.
