-- Per-evening exceptions to the morning-lock time (S422).
-- Keys are the weekday of the EVENING the lock happens (JS getDay: "0"=Sunday … "6"=Saturday),
-- values are 'HH:MM:SS'. A missing key = use morning_lock_time.
-- Example: {"0": "20:00:00"} keeps Sunday evening at 20:00 (weekly schedule release)
-- while every other evening uses the default.
ALTER TABLE booking_rules
  ADD COLUMN IF NOT EXISTS morning_lock_time_by_day jsonb NOT NULL DEFAULT '{}'::jsonb;
