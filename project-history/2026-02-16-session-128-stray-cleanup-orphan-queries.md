# Session 128 — Stray Record Cleanup + Orphan Check Queries

**Date:** 2026-02-16
**Model:** Opus 4.6

## What Was Done

### 1. Database Cleanup (from Session 126 prep)
- Ran `npm run backup` (27 tables, 65 wod_section_results)
- Executed `npx tsx scripts/cleanup-stray-results.ts --delete` — removed 33 stray records
- Table reduced from 65 → 32 legitimate records
- Verified with health check query: `stray_section_results = 0`

### 2. User Testing — Leaderboard Scaling Bug VERIFIED FIXED
- User changed scaling on workouts from 2025-12-01 and 2025-12-03
- Both appeared correctly on Leaderboard
- Bug is confirmed resolved (Sessions 125-127 code fix + Session 128 cleanup)

### 3. Created Orphan Check SQL Reference
- New file: `Chris Notes/supabase-orphan-check-queries.md`
- Quick health check query (single row, all orphan counts)
- 10 detailed sections covering all table relationships
- Iteratively fixed the "unbooked results" query:
  - v1: Used `auth.users.email` → `members.email` lookup (missed family members)
  - v2: Added `primary_member_id` lookup (still missed — family members' user_id isn't in auth.users)
  - v3: Added direct `b.member_id = r.user_id` match — works correctly for family members where user_id = member_id

### Key Learning
- Family members (like Neo) have `user_id` in `wod_section_results` that equals their `members.id`, NOT an `auth.users.id`
- Booking lookups must account for this by checking `member_id = user_id` directly, not just via email chain

## Files Changed
- `Chris Notes/supabase-orphan-check-queries.md` (new — SQL reference)
- `memory-bank/memory-bank-activeContext.md` (updated — Session 127 status + verified fix)

## No Code Changes
This was a cleanup/documentation session only. No application code was modified.
