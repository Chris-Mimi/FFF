-- Add late_cancel and no_show status to bookings table
-- Late cancellations count toward 10-card usage but NOT toward attendance stats
-- No-shows count toward 10-card usage but NOT toward attendance stats

-- Update the CHECK constraint to include new status values
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('confirmed', 'waitlist', 'cancelled', 'no_show', 'late_cancel'));
