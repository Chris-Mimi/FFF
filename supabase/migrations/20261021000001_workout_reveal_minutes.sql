-- When booked athletes get to see a published workout (S422).
-- workout_reveal_minutes: minutes before class start (was hard-coded 2 hours).
-- workout_reveal_minutes_by_day: per-day exceptions keyed by the CLASS weekday
-- (JS getDay: "0"=Sunday … "6"=Saturday), value = minutes. Missing key = default.
ALTER TABLE booking_rules
  ADD COLUMN IF NOT EXISTS workout_reveal_minutes integer NOT NULL DEFAULT 120,
  ADD COLUMN IF NOT EXISTS workout_reveal_minutes_by_day jsonb NOT NULL DEFAULT '{}'::jsonb;
