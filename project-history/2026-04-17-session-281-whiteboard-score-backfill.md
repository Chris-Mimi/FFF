# Session 281 — Whiteboard Score Backfill

**Date:** 2026-04-17
**Model:** Opus 4.7
**Goal:** Link existing unlinked whiteboard scores to registered members so leaderboards show full registered names instead of coach-typed aliases.

---

## Context

The app has two separate columns named `whiteboard_name`:

1. **`wod_section_results.whiteboard_name`** — stored on each score row. Whatever the coach typed when recording the score (e.g. "Steven", "AnjaG"). The leaderboard displays this string for rows where `member_id IS NULL`.
2. **`members.whiteboard_name`** — stored on member profile. An *alias* used only by the approval flow to retro-link legacy scores.

These do not auto-sync. Approving a member only migrates old scores if the coach entered a `whiteboard_name` at approval time. Members approved before that feature shipped (Session 278) never got the alias set, so their old whiteboard scores stayed orphaned on the leaderboard.

Trigger: Steven Zaft's leaderboard entries were showing "Steven" instead of "Steven Zaft" — he had been approved but his old whiteboard-only scores were never migrated.

---

## What Was Built

### `scripts/link-whiteboard-scores.ts`

One-time backfill. Dry-run default, `--apply` to write.

**Logic:**
1. Fetch all `members` where `whiteboard_name IS NOT NULL` → build map `{whiteboard_name → member}`.
2. Fetch all `wod_section_results` where `whiteboard_name IS NOT NULL AND member_id IS NULL`.
3. Bucket unlinked rows by match status:
   - Exactly one member matches → **link** (set `member_id`, `user_id`, clear `whiteboard_name`, stamp `updated_at`). Mirrors [app/api/members/approve/route.ts:86-94](../app/api/members/approve/route.ts#L86).
   - Multiple members share that whiteboard_name → **skip** (ambiguous).
   - No member matches → **skip** (genuine unregistered drop-in).
4. Print blast-radius summary before writing. Per-name results after.

**Safety:** exact-match only (no fuzzy matching), `.is('member_id', null)` guard on every update prevents overwriting already-linked rows.

---

## What Happened

### Dry-run 1
- 621 unlinked score rows
- 19 members had `whiteboard_name` set
- Only 23 rows matched → Steven (19 scores) was in the "NO MATCH" list

### Diagnostic
Steven Zaft's `members.whiteboard_name` was `null`. Also 7 other members: Alex Terbrack, Anneke Spegele, Athlete Test 1, Cody Sky Hiles, Neo Blue Hiles, Torben Stoffer, and one nameless family-member row.

### Manual Fixes (Supabase Dashboard)
Chris set `whiteboard_name` on two members who had unlinked scores:
- Steven Zaft → `Steven`
- Anneke Spegele → `Anneke`

Others either no longer in the gym (Alex), no scores to link (Torben, the kids), or test/data-hygiene issue (Test account, null-name member).

### Dry-run 2
- 45 rows now matched across 12 members.

### Apply
- **44 / 45 linked successfully.**
- **1 error:** "Mimi" → Mimi Hiles — unique-key collision on `(user_id, wod_id, section_id, workout_date)`. Mimi had entered a whiteboard score (Sc1, weight 4, no reps) at 16:12 on 2026-04-12 for WOD dated 2026-03-04, then recorded a registered score (Rx, 172 reps, weight 6) for the same WOD 2 minutes later at 16:14. The registered score was the real one; the whiteboard entry was a superseded draft.

### Orphan Cleanup
Deleted the orphan Mimi whiteboard row. Registered entry kept.

### Final Counts
| | Rows |
|---|---|
| Linked | 44 |
| Duplicate deleted | 1 |
| Genuinely unregistered (skipped) | 576 |

---

## Key Learning

**Two same-named columns with different purposes is a sharp edge.** The leaderboard name displayed for an unlinked row comes from `wod_section_results.whiteboard_name` (coach-typed), not from `members.whiteboard_name` (member alias). A member can have a whiteboard score showing their name without having any alias on their profile.

The approval flow at `app/api/members/approve/route.ts` uses `.eq('whiteboard_name', whiteboardName)` to migrate — which means the coach must enter it at approval time or old scores stay orphaned forever (unless backfilled).

---

## Files Changed

- **New:** `scripts/link-whiteboard-scores.ts`

## Database Changes

- `wod_section_results`: 44 rows updated (`member_id`, `user_id` set; `whiteboard_name` cleared; `updated_at` bumped to 2026-04-17).
- `wod_section_results`: 1 row deleted (orphan Mimi duplicate, id `ad84091d-f888-4d3b-aac2-858eaa856f5e`).
- `members`: 2 rows updated via Dashboard (Steven Zaft, Anneke Spegele → `whiteboard_name` set).

## Separate Observation (not actioned)

Some registered athletes have `members.gender = null` because the signup dropdown is optional. Chris can set `'M'` or `'F'` directly in Dashboard; leaderboard picks it up immediately.

## Next Session
No follow-up required for the backfill itself. The script stays in the repo as reference and could be re-run later if additional legacy members have `whiteboard_name` populated retroactively.
