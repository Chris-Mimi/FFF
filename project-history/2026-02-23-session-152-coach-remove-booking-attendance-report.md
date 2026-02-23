# Session 152 — Coach Remove Booking + Attendance Behaviour Report

**Date:** 2026-02-23
**Model:** Sonnet 4.6

---

## Accomplishments

1. **Memory bank housekeeping**
   - Removed Google Calendar EMOM bug and analysis scroll jump from pending items (already resolved in Session 151)

2. **Coach "Remove" booking button in Session Management modal**
   - New `coach_cancelled` booking status distinguishes coach-removed bookings from member self-cancels
   - "Remove" button (gray, with X icon) appears on each confirmed booking row alongside Late Cancel and No-Show
   - Confirmation dialog: "This is for bookings made in error. 10-card session will be refunded if applicable."
   - Always refunds 10-card: fetches current `ten_card_sessions_used`, decrements by 1 if > 0
   - Member can be re-booked for the same session after removal (unique index updated to exclude `coach_cancelled`)
   - **DB migration required** before use: `supabase/migrations/20260223_add_coach_cancelled_status.sql`

3. **Attendance Behaviour report on Admin page (`/coach/admin`)**
   - New section below "Create Coach Account" with orange AlertTriangle icon
   - Fetches all bookings with status `coach_cancelled`, `late_cancel`, or `no_show`
   - Aggregates client-side by member: Coach Removed | Late Cancel | No-Show | Total
   - Only shows members with at least 1 incident
   - Sorted by Total (highest first) to surface patterns quickly
   - Late Cancel shown with purple chip, No-Show with orange chip
   - All-time data (no date filter — kept simple per user request)

---

## DB Migration

**File:** `supabase/migrations/20260223_add_coach_cancelled_status.sql`
**Status:** File created locally, NOT yet applied (migrations folder is gitignored)

**Run in Supabase SQL Editor:**
```sql
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('confirmed', 'waitlist', 'cancelled', 'no_show', 'late_cancel', 'coach_cancelled'));

DROP INDEX IF EXISTS unique_active_bookings;
CREATE UNIQUE INDEX unique_active_bookings
  ON bookings(session_id, member_id)
  WHERE status NOT IN ('cancelled', 'coach_cancelled');
```

---

## Files Changed

- `hooks/coach/useBookingManagement.ts` — Added `handleCancelBooking` function + interface
- `hooks/coach/useSessionDetails.ts` — Added `coach_cancelled` to Booking status union type
- `components/coach/BookingListItem.tsx` — Added `onCancelBooking` prop + "Remove" button
- `components/coach/SessionManagementModal.tsx` — Wired up `onCancelBooking` + `showCancelBtn`
- `app/coach/admin/page.tsx` — Added Attendance Behaviour report section
- `supabase/migrations/20260223_add_coach_cancelled_status.sql` — Migration (local only, gitignored)
- `memory-bank/memory-bank-activeContext.md` — Session 152 entry + migration pending item
