-- Time-gate next week's sessions from athletes until a configurable moment.
-- Defaults to Sunday 14:00 (coach can program/publish during the week without
-- athletes seeing or booking the upcoming week until Sunday afternoon).
-- Day-of-week uses JS Date.getDay() convention: 0=Sunday, 1=Monday, ..., 6=Saturday.

ALTER TABLE booking_rules
  ADD COLUMN IF NOT EXISTS next_week_release_day_of_week SMALLINT NOT NULL DEFAULT 0
    CHECK (next_week_release_day_of_week BETWEEN 0 AND 6),
  ADD COLUMN IF NOT EXISTS next_week_release_time TIME NOT NULL DEFAULT '14:00:00';
