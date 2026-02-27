# Session 161 — Google Calendar Duplicate Fix

**Date:** 2026-02-27
**Model:** Opus 4.6

---

## Accomplishments

1. **Cleaned up old backups:**
   - Deleted old backup files, keeping Dec 23, Jan 13, and last 7 days
   - 988 → 221 files, 48MB → 12MB

2. **Fixed Google Calendar duplicate events on publish:**
   - **Root cause (layer 1):** Copy-workout cleanup sometimes failed silently, leaving orphaned WODs with stale `google_event_id` in DB. Publish endpoint created new events without cleaning these.
   - **Root cause (layer 2):** Even when DB was clean, "ghost" events existed on Google Calendar with no DB reference (from previous failed deletions).
   - **Fix:** Publish endpoint now does TWO cleanup passes before creating a new event:
     1. DB orphan cleanup: finds WODs on same date with `google_event_id` but no `weekly_session` link, deletes their calendar events
     2. Google Calendar direct query: lists events at the exact start time, deletes any that don't belong to active sessions (catches ghosts)
   - **Files:** `app/api/google/publish-workout/route.ts` (lines 288-361)

3. **Cleaned up 34 DB orphans + 6 ghost calendar events:**
   - Script `cleanup-gcal-orphans.ts`: nulled `google_event_id` on 34 orphaned WOD records, deleted 5 stale calendar events
   - Script `find-ghost-gcal-events.ts`: found 14 unmatched events, identified 4 as workout ghosts (rest were personal calendar entries), deleted them
   - Manually deleted 2 ghost events on 22.02 ("Rings Hold..." and "Tabata This")

4. **Expanded orphan health check SQL:**
   - Added 6 new checks to Quick Health Check query: `gcal_orphan_wods`, `results_deleted_wods`, `orphan_bookings_no_member`, `duplicate_section_results`, `duplicate_benchmarks`, `duplicate_lifts`
   - **File:** `Chris Notes/supabase-orphan-check-queries.md`

---

## Files Changed

- `app/api/google/publish-workout/route.ts` — Dual-layer orphan cleanup (DB + Google Calendar API) before publish
- `Chris Notes/supabase-orphan-check-queries.md` — 6 new health check columns
- `scripts/cleanup-gcal-orphans.ts` — NEW: one-time cleanup of DB orphans + their calendar events
- `scripts/find-ghost-gcal-events.ts` — NEW: finds/deletes ghost events on Google Calendar with no DB match

---

## Key Decisions

- **Dual cleanup approach:** DB-only orphan detection missed "ghost" events where the `google_event_id` was already nulled but the calendar event persisted. Querying Google Calendar directly at the exact time slot catches both cases.
- **Keep active session events:** The `keepEventIds` set ensures legitimate same-day events at different times are never deleted.
- **Ghost event script filters personal entries:** The shared Google Calendar has personal events (birthdays, appointments) — the script identifies workout events by DB cross-reference, not title pattern.

---

## Lessons Learned

- **Ghost events:** When a Google Calendar delete fails silently AND the DB reference is cleared, the event becomes invisible to DB-only cleanup. Must query the calendar API directly to catch these.
- **Same-date != same-session:** First fix deleted ALL same-date events, breaking multi-session days. Must filter by session link.

---

## Testing Done

- User stress-tested copy/paste/delete/republish flow
- Verified 22.02 shows correct events (no duplicates) after cleanup
- Ghost event scan across Dec 2025 - Feb 2026 found and cleaned all orphans
