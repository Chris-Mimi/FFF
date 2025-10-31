-- Add No-Show Status to Bookings
-- Execute in Supabase SQL Editor
--
-- Purpose: Allow coaches to mark members who booked but didn't attend.
-- No-shows still count toward 10-card usage (they reserved a slot) but
-- don't count toward attendance statistics.
--
-- Booking Status Meanings:
-- - 'confirmed': Member booked and attended (counts for 10-card AND attendance)
-- - 'waitlist': Member on waitlist, not yet confirmed
-- - 'cancelled': Member cancelled, refunded (doesn't count for 10-card or attendance)
-- - 'no_show': Member booked but didn't attend (counts for 10-card, NOT for attendance)

-- Step 1: Drop the existing CHECK constraint
ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_status_check;

-- Step 2: Add the new CHECK constraint with 'no_show' status
ALTER TABLE bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('confirmed', 'waitlist', 'cancelled', 'no_show'));

-- NOTE: The get_member_attendance_count function already only counts 'confirmed' status,
-- so no-shows will automatically be excluded from attendance tracking.
-- 10-card tracking counts both 'confirmed' AND 'no_show' (handled in app logic).

-- Verification query (should show the new constraint):
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'bookings'::regclass
-- AND conname = 'bookings_status_check';
