-- Add per-member dismiss timestamp for the Subscriptions Due lapsed banner.
-- Filter logic: hide if dismissed_at > the row's effective lapse end-date.
-- Cash-lapsed: members.athlete_subscription_end
-- Stripe-lapsed: subscriptions.current_period_end
-- New lapse end-date (after a renewal + re-lapse) will exceed dismissed_at,
-- causing the row to reappear automatically.

ALTER TABLE members
ADD COLUMN IF NOT EXISTS lapsed_banner_dismissed_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN members.lapsed_banner_dismissed_at IS
  'Timestamp when coach dismissed this member from the Subscriptions Due lapsed banner. Banner re-shows if a new lapse occurs (lapse end-date > dismissed_at).';
