-- Pause Wellpass tracking for a household (injury, vacation, etc.).
-- Effects of a non-null paused_at:
--   1. WellpassTab shows the row faded with a "Paused" badge; Score is hidden.
--   2. /api/coach/wellpass/import recompute skips the identity (no block applied).
--   3. /api/bookings/create skips the 1-booking-per-week restriction for the
--      booking member's household if ANY of their linked identities is paused.
-- Resume = set paused_at back to NULL.

ALTER TABLE wellpass_identities
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS pause_reason TEXT NULL;

COMMENT ON COLUMN wellpass_identities.paused_at IS
  'When set, Wellpass tracking for this household is paused — Score/block-status calc are skipped, and the 1/week booking restriction is lifted.';
COMMENT ON COLUMN wellpass_identities.pause_reason IS
  'Free-text reason for the pause (e.g. "injured shoulder", "summer vacation").';
