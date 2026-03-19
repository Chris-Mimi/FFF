# Session 225 — Track Feature Fixes (2026-03-19)

**Model:** Claude Opus 4.6 (Claude Code)

## Accomplishments

1. **Memory Bank updated** — Session 224b summary integrated into activeContext (track feature, migration status, next steps).
2. **Track column missing from leaderboard query** — Added `track` to the Supabase `.select()` in LeaderboardView's content section results query. Data was being ranked and displayed but never fetched.
3. **Leaderboard sort priority fixed** — Changed ranking from Track > Scaling to **Scaling > Track**. Rx always beats Scaled regardless of track number.
4. **Leaderboard display order fixed** — Scaling badge now renders before track badge in the Scale column.

## Files Changed

- `components/athlete/LeaderboardView.tsx` — Added `track` to select query; swapped scaling/track badge order
- `utils/leaderboard-utils.ts` — Reordered sort: scaling first, then track, then scoring type
- `memory-bank/memory-bank-activeContext.md` — Session 224b updates + migration marked applied

## Key Decisions

- **Sort hierarchy:** Scaling > Track > Score. This matches CrossFit convention where Rx always outranks Scaled, regardless of which track the workout was on.
