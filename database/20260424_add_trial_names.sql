-- Trial-athlete tracking on weekly_sessions.
-- Pre-known trial athletes (not registered as members yet) get added by name only.
-- The names flow through Score Entry's existing whiteboard_name pathway and link
-- back to a member after they register (matching members.whiteboard_name).

ALTER TABLE weekly_sessions
ADD COLUMN IF NOT EXISTS trial_names TEXT[] DEFAULT '{}' NOT NULL;
