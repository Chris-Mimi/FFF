# Session 216 — Whiteboard Score Entry Bugfixes (2026-03-16)

## Accomplishments

1. **CHECK constraint bug fixed** — Whiteboard-only scores were failing to save (only 1 of 10 saved). Root cause: Session 203 migration added `chk_user_or_member` constraint (`user_id IS NOT NULL OR member_id IS NOT NULL`), but Session 215 migration only dropped `wod_section_results_user_or_member` (wrong name). The old constraint blocked inserts where both `user_id` and `member_id` are NULL. Fixed by dropping `chk_user_or_member` in Supabase SQL Editor. Migration file updated to drop both constraint names.

2. **Dedup logic improved** — Anneke appeared twice in coach score entry (once as booked member, once as whiteboard-only). Root cause: dedup only compared against `members.whiteboard_name` field, which was NULL for Anneke. Fix: now compares Whiteboard Intro names against booked member first name, full name, AND `whiteboard_name`.

3. **Leaderboard whiteboard support** — Whiteboard-only athletes showed as "Unknown" in athlete leaderboard. Root cause: query only fetched `user_id`, name lookup failed for NULL user_id. Fix: query now fetches `whiteboard_name`, ranking utils use it as fallback display name, `bestResultPerUser` keys by `wb:name` when `user_id` is null.

4. **Andreas Keip duplicate cleaned** — Deleted orphan whiteboard-only rows from `wod_section_results` (created before he was added as booked member).

## Files Modified
- `database/20260316_add_whiteboard_name_to_section_results.sql` — Added `DROP CONSTRAINT IF EXISTS chk_user_or_member`
- `app/api/score-entry/[sessionId]/route.ts` — Dedup now uses `bookedNamesSet` (first name + full name + whiteboard_name)
- `utils/leaderboard-utils.ts` — Added `whiteboard_name` to `RawSectionResult`, updated `bestResultPerUser` and `rankSectionResults`
- `components/athlete/LeaderboardView.tsx` — Query now includes `whiteboard_name`

## Key Decisions
- Dedup by first name: Whiteboard Intro typically uses first names only (e.g., "Anneke"), so we split booked member names and add first name to the dedup set
- Leaderboard shows whiteboard_name directly — no member lookup needed for non-registered athletes

## DB Changes Applied (Supabase SQL Editor)
- `ALTER TABLE wod_section_results DROP CONSTRAINT IF EXISTS chk_user_or_member`
- `DELETE FROM wod_section_results WHERE whiteboard_name = 'Andreas Keip'`
