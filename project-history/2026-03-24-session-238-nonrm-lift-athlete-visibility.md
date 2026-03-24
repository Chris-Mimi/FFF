# Session 238 — Non-RM Lift Athlete App Visibility (Partial Fix)

**Date:** 2026-03-24
**AI:** Opus 4.6
**Status:** NOT WORKING YET

---

## Goal

Fix non-RM lift scores (5x5 Snatch etc.) not appearing on athlete app (logbook/lifts/leaderboard).

## Files Changed

| File | Change |
|:---|:---|
| `hooks/coach/useScoreEntry.ts` | Added `getNonRmLift()` helper + `nonRmLifts` map in save payload alongside `rmTestLifts` |
| `app/api/score-entry/save/route.ts` | Added `NonRmLift` interface + auto-creates `lift_records` with `rep_scheme` for non-RM lifts on save (mirrors RM test pattern) + cleanup on deletion |
| `utils/logbook/loadingLogic.ts` | Changed `loadSectionResults` to query by `.or(user_id, member_id)` instead of just `user_id` |

## Key Findings

- **Workouts tab works** — queries `wod_section_results` by BOTH `user_id` AND `member_id`
- **Logbook didn't work** — only queried by `user_id` (fixed to `.or()` but still not showing)
- **Leaderboard** — requires `is_published = true` on WOD (may be a blocker, not confirmed)
- **extractLeaderboardItems logic** — traced; non-RM lift sections with `scoring_fields` SHOULD create content items — code logic looks correct

## Uninvestigated Leads (Next Session)

1. **RLS policies on `wod_section_results`** — `.or()` query might be blocked if policy only allows `user_id = auth.uid()`
2. **Is the WOD published?** — Leaderboard filters `is_published = true`. Score Entry doesn't set this flag.
3. **Check actual DB data** — Query `wod_section_results` directly to verify `user_id` and `member_id` values
4. **Logbook section key format** — Logbook UI reads `:::lift-0` keys for lift sections, but `loadSectionResults` creates `:::content-0` keys. `loadLiftResultsToSection` populates `:::lift-0` from `lift_records` — verify these records exist.
5. **Dev server hot reload** — Confirm API route changes are actually running (API routes may need server restart)

## Next Steps

- Add `console.log` to `loadSectionResults` and `loadLiftResultsToSection` to trace returns
- Check Supabase `wod_section_results` directly for test workout
- Check RLS policies for `member_id` access
- Verify `is_published` status
- Commit once fix is confirmed
