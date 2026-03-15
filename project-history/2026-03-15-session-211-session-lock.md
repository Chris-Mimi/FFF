# Session 211 — Session Booking Lock/Unlock (2026-03-15)

**Model:** Claude Opus 4.6

## Accomplishments

1. **Added `is_locked` column to `weekly_sessions`** — Tri-state boolean: NULL (auto-lock at start time), true (manually locked), false (manually unlocked/coach override).
2. **Booking API lock check** — `app/api/bookings/create/route.ts` rejects bookings on effectively locked sessions (403).
3. **Coach lock/unlock toggle** — `useSessionEditing.ts` computes `isEffectivelyLocked` and provides `handleToggleLock()`. Button in SessionManagementModal footer (amber=locked/Unlock, gray=unlocked/Lock).
4. **Athlete booking page** — Shows "Locked" with lock icon instead of Book button for locked sessions.
5. **Migration applied** — `20260315000000_add_session_lock.sql`
6. **Future task plan** — Created `Chris Notes/Planning/backfill-historical-bookings.md` for populating historical bookings from Whiteboard Intro short names.

## Files Changed
- `supabase/migrations/20260315000000_add_session_lock.sql` — new migration
- `app/api/bookings/create/route.ts` — lock check before booking
- `hooks/coach/useSessionEditing.ts` — handleToggleLock + isEffectivelyLocked
- `hooks/coach/useSessionDetails.ts` — added is_locked to SessionDetails interface
- `components/coach/SessionManagementModal.tsx` — lock/unlock button in footer
- `app/member/book/page.tsx` — fetch is_locked, compute effective lock, show locked state
- `Chris Notes/Planning/backfill-historical-bookings.md` — future task plan
- `memory-bank/memory-bank-activeContext.md` — updated

## Key Decisions
- Tri-state NULL/true/false chosen over simple boolean to support auto-lock (no cron needed) with manual override capability
- Lock check is both client-side (UI) and server-side (API) for defense in depth
