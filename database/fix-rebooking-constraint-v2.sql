-- Re-tighten unique_active_bookings after S318 over-broad migration.
--
-- Earlier migration excluded both 'late_cancel' and 'coach_cancelled' from the
-- partial unique index. That allows duplicate (session_id, member_id) rows
-- when one is late_cancel + another is confirmed.
--
-- Correct rule:
--   - 'late_cancel' has an Undo button (handleUndoLateCancel) -> the existing
--      row is flipped back to 'confirmed', no new INSERT is needed. Therefore
--      late_cancel SHOULD be covered by the unique index.
--   - 'coach_cancelled' has no undo path; re-adding a coach-cancelled member
--      requires a new INSERT. Therefore coach_cancelled MUST be excluded.
--
-- Run in Supabase SQL Editor.

DROP INDEX IF EXISTS unique_active_bookings;

CREATE UNIQUE INDEX unique_active_bookings
  ON bookings(session_id, member_id)
  WHERE status NOT IN ('cancelled', 'coach_cancelled');
