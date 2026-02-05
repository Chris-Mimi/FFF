-- Add critical performance indexes if they don't exist
-- Run this in Supabase SQL Editor to fix slow query performance

-- Weekly sessions indexes (for date filtering)
CREATE INDEX IF NOT EXISTS idx_weekly_sessions_date ON weekly_sessions(date);
CREATE INDEX IF NOT EXISTS idx_weekly_sessions_workout_id ON weekly_sessions(workout_id);
CREATE INDEX IF NOT EXISTS idx_weekly_sessions_status ON weekly_sessions(status);

-- Bookings indexes (for attendance queries)
CREATE INDEX IF NOT EXISTS idx_bookings_session_id ON bookings(session_id);
CREATE INDEX IF NOT EXISTS idx_bookings_member_id ON bookings(member_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);

-- Members indexes
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_primary_member_id ON members(primary_member_id);

-- WODs indexes (for workout queries)
CREATE INDEX IF NOT EXISTS idx_wods_workout_publish_status ON wods(workout_publish_status);
CREATE INDEX IF NOT EXISTS idx_wods_track_id ON wods(track_id);

-- Composite index for common query pattern (session bookings by date range)
CREATE INDEX IF NOT EXISTS idx_sessions_date_status ON weekly_sessions(date, status);

-- Analyze tables to update query planner statistics
ANALYZE weekly_sessions;
ANALYZE bookings;
ANALYZE members;
ANALYZE wods;
