-- Performance indexes for scalability
-- These prevent full table scans on frequently queried columns

-- Bookings: filtered by member_id, session_id, and status in nearly every query
CREATE INDEX IF NOT EXISTS idx_bookings_member_id ON bookings(member_id);
CREATE INDEX IF NOT EXISTS idx_bookings_session_id ON bookings(session_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- Composite index for the most common booking query pattern (member + status)
CREATE INDEX IF NOT EXISTS idx_bookings_member_status ON bookings(member_id, status);

-- WODs: filtered by publish status in every search/analysis query
CREATE INDEX IF NOT EXISTS idx_wods_workout_publish_status ON wods(workout_publish_status);

-- Weekly sessions: ordered by date in calendar, search, and analysis queries
CREATE INDEX IF NOT EXISTS idx_weekly_sessions_date ON weekly_sessions(date);
