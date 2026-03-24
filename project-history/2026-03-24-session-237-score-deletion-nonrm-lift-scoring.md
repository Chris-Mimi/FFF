# Session 237 — Score Deletion Cleanup, Non-RM Lift Leaderboard + Score Entry Display

**Date:** 2026-03-24
**Model:** Claude Opus 4.6

---

## Changes

### Score Deletion Detection (`hooks/coach/useScoreEntry.ts`)
- Deletion detection for cleared scores: compares current scores to `existingResults`
- Matches by `member_id`, `user_id`, OR `whiteboard_name`
- Sends `deletions` array to save API

### Score Deletion API (`app/api/score-entry/save/route.ts`)
- Processes deletions: removes `wod_section_results` + associated `lift_records`
- Falls back to `user_id` match when `member_id` match fails

### Non-RM Lift Leaderboard (`components/athlete/LeaderboardView.tsx`)
- Removed non-RM lifts from lift leaderboard
- Allowed content-scoring path for sections with non-RM lifts
- Label shows lift name + rep scheme

### Score Entry Display
- **ScoreEntryModal.tsx** — Section preview shows lift name + rep scheme (bold) above content text
- **ScoreEntryGrid.tsx** — Grid header shows lift name + rep scheme for non-RM lifts

---

## Key Decisions
- Non-RM lifts use content-scoring path on leaderboard (not lift-specific entries)
- Score deletion detects cleared fields by comparing current scores to existingResults
- API deletion falls back to user_id match when member_id match fails

## Known Issues
- **Non-RM lift scores (Constant/Variable rep schemes like 5x5 Snatch) don't appear on the athlete app** (logbook/lifts). Athlete-side components currently only look at `lift_records`, need to also query `wod_section_results` for these.

## Next Steps
1. Fix non-RM lift scores not appearing on athlete app
2. Test full flow end-to-end (Score Entry → Leaderboard → Athlete app)
3. Account-linking script planning
