# Session 312 — Next-Week Release Gate (UI + API Enforcement)

**Date:** 2026-04-24
**Model:** Opus 4.7

---

## The Need

Coach wanted to publish next week's WODs in advance (often days early) without athletes seeing or booking them until Sunday afternoon. Default behavior: as soon as a session is `status='published'`, athletes see and book it.

## Design Choice: Time-Gate vs "Go Live" Button

**Considered:** a per-week "Go Live" / "Active" button the coach manually flips when ready.

**Rejected because:**
- Adds a recurring chore (every week, remember to flip the switch).
- Failure mode is loud (athletes see nothing until coach remembers).
- No mental anchor for athletes ("when can I book?" → variable).

**Shipped:** time-gated visibility. Two new `booking_rules` columns: `next_week_release_day_of_week` (0-6, JS getDay convention, default 0=Sunday) + `next_week_release_time` (TIME, default '14:00:00'). Pure helper `getMaxVisibleSessionDate(rules, now)` returns end-of-this-week normally, end-of-next-week once the release moment in the current ISO week has passed.

Athletes learn "next week always opens Sunday afternoon" — predictable and zero coach action per week.

## The Helper Logic

```ts
// ISO week (Mon-Sun) containing `now`
const dow = now.getDay();              // 0=Sun..6=Sat
const isoDay = dow === 0 ? 6 : dow - 1; // Mon=0..Sun=6
const thisMonday = new Date(now); thisMonday.setHours(0,0,0,0);
thisMonday.setDate(now.getDate() - isoDay);
const thisSunday = new Date(thisMonday); thisSunday.setDate(thisMonday.getDate()+6);
thisSunday.setHours(23,59,59,999);

// Release moment in this ISO week (could be any day, not just Sunday)
const releaseIsoDay = releaseDow === 0 ? 6 : releaseDow - 1;
const releaseDate = new Date(thisMonday);
releaseDate.setDate(thisMonday.getDate() + releaseIsoDay);
const [hh, mm, ss = 0] = releaseTime.split(':').map(Number);
releaseDate.setHours(hh, mm, ss, 0);

return now >= releaseDate
  ? new Date(thisSunday.getTime() + 7*24*3600*1000)  // next-week unlocked
  : thisSunday;
```

## Files (7)

1. **`database/20260424_add_next_week_release_gate.sql`** — adds 2 columns with defaults + CHECK on day-of-week.
2. **`lib/bookingRules.ts`** — extended interface + DEFAULT_BOOKING_RULES; SELECT lists factored to a `RULES_COLUMNS` constant; new pure helper `getMaxVisibleSessionDate()`. Pure (no DB access) so safe to import client-side.
3. **`app/api/admin/booking-rules/route.ts`** — PUT validates day (0-6 integer) + time (`HH:MM` or `HH:MM:SS` regex), normalizes 5-char input to `HH:MM:00`.
4. **`app/coach/admin/booking-rules/page.tsx`** — new "Next-week release time" section with day-of-week `<select>` + native `<input type='time'>`. Saved as part of the existing PUT.
5. **`app/api/booking-rules/public/route.ts`** (NEW) — lightweight GET, no auth, returns only the two release fields. Lets the athlete-side avoid pulling the full (admin-only) rules.
6. **`app/member/book/page.tsx`** — fetches the public config on mount, computes `maxVisibleDate`, adds `.lte('date', formatLocalDate(maxVisibleDate))` to the session query. Added `releaseConfig` to the fetchSessions effect deps so the filter applies once the config loads.
7. **`app/api/bookings/create/route.ts`** — added a server-side gate check after the existing rules load: rejects with 403 "This session is not yet open for booking" if the requested session's date is past `getMaxVisibleSessionDate(rules)`. Closes the dev-tools bypass.

## The "Just Display Filter Isn't Security" Conversation

After shipping the UI gate, mentioned in passing that the filter was "convenience only" — a determined athlete could:
1. Open browser console, query `weekly_sessions` directly via the supabase JS client (already authenticated, RLS lets them read published sessions), see hidden session IDs.
2. Replay `POST /api/bookings/create` with one of those IDs.

Chris asked "how?" — explained the two paths above. He asked to add the server-side check. Done in [app/api/bookings/create/route.ts](app/api/bookings/create/route.ts) — 5 lines, slotted right before the existing `advance_booking_days` cap. Same helper used both client-side (filter) and server-side (rejection), so the two are guaranteed in sync.

## Lesson

> "Display filter" and "access control" are different responsibilities. UI filters that aren't backed by server-side checks become bypassable the moment anyone opens dev tools. For a low-stakes gym booking flow this rarely matters — but flagging the gap explicitly to the user, then offering the airtight version as a 5-line addition, is cheap insurance.

The pure-function helper pattern (`getMaxVisibleSessionDate`) made the airtight version trivial — same code path, two callsites. If the logic had been inlined in the client query, server-side enforcement would have been a copy-paste begging to drift out of sync.
