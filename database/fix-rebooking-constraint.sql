-- Fix Rebooking 500 Error - Replace UNIQUE Constraint with Partial Index
-- Execute in Supabase SQL Editor
--
-- Issue: The UNIQUE(session_id, member_id) constraint prevents rebooking
-- after cancellation because the cancelled booking record still exists.
--
-- Solution: Replace with a partial unique index that only applies to
-- active bookings (status != 'cancelled'). This allows multiple cancelled
-- bookings while preventing duplicate active bookings.

-- Step 1: Drop the existing UNIQUE constraint
ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_session_id_member_id_key;

-- Step 2: Create partial unique index for active bookings only
-- This prevents duplicate bookings EXCEPT when status is 'cancelled'
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_bookings
  ON bookings(session_id, member_id)
  WHERE status != 'cancelled';

-- Verification query (should show the new index):
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'bookings'
-- AND indexname = 'unique_active_bookings';
