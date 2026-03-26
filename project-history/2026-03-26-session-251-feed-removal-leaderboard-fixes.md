# Session 251 — Feed Removal, Leaderboard Fixes, Whiteboard Duplicate Bug

**Date:** 2026-03-26
**AI:** Claude Opus 4.6 (Claude Code)

## Accomplishments

1. **Removed Feed view** — `AthletePageCommunityTab.tsx` stripped from 459 lines to 16. Leaderboard renders directly without Feed/Leaderboard toggle. Feed was unused social activity feed showing recent results from all members.

2. **Added date column to WOD section leaderboard** — Added `resultDate` to `rankSectionResults` output and date column to WOD leaderboard table, matching the benchmark leaderboard pattern.

3. **"CAP" → "Time Cap"** — Updated `formatResult` (WOD) and `formatBenchmarkResult` (benchmark) to show "Time Cap" prefix for capped results (no time but has rounds/reps).

4. **member_id dedup improvements** — Added `member_id` to `RawSectionResult` interface, updated `bestResultPerUser` dedup key to include `member_id`, updated content section query to fetch `member_id`, added `member_id` name resolution via `get_member_names` RPC.

5. **Manual backups discussion** — Confirmed 40 manual backups are redundant (git + GitHub + SynologyDrive). `.env.local` verified against Vercel dashboard (15 vars match, Vercel has 2 extra: EMAIL_FROM, RESEND_API_KEY).

## Bug Discovered: Whiteboard Duplicates

**Issue:** "AndreasK" (whiteboard entry) appears alongside "Andreas Keip" (registered athlete) on Open #26.2 and Weekend WOD #26.7 leaderboards. Whiteboard entry has wrong scores and only 1 scaling level.

**Root cause:** 3 `wod_section_results` rows with `whiteboard_name='AndreasK'`, `user_id=null`, `member_id=null` — not linked to registered athlete. These are stale coach-entered whiteboard entries.

**Fix pending:** Delete bad rows + broader scan for duplicates.

## Files Changed
- `components/athlete/AthletePageCommunityTab.tsx` — Gutted to just render LeaderboardView
- `components/athlete/LeaderboardView.tsx` — Added date column, member_id to content query + name resolution
- `utils/leaderboard-utils.ts` — member_id in RawSectionResult, dedup key, rankSectionResults name/userId, Time Cap formatting
