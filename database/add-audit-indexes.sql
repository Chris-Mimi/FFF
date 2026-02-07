-- Add missing indexes identified in pre-deployment audit (#12)
-- Run this in Supabase SQL Editor

-- Benchmark results (queried by user_id + result_date in logbook)
CREATE INDEX IF NOT EXISTS idx_benchmark_results_user_id ON benchmark_results(user_id);
CREATE INDEX IF NOT EXISTS idx_benchmark_results_user_date ON benchmark_results(user_id, result_date);

-- Lift records (queried by user_id + lift_date in logbook)
CREATE INDEX IF NOT EXISTS idx_lift_records_user_id ON lift_records(user_id);
CREATE INDEX IF NOT EXISTS idx_lift_records_user_date ON lift_records(user_id, lift_date);

-- Workout logs (queried by user_id + workout_date)
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_id ON workout_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_date ON workout_logs(user_id, workout_date);

-- WOD section results (queried by user_id + workout_date in logbook)
CREATE INDEX IF NOT EXISTS idx_wod_section_results_user_id ON wod_section_results(user_id);
CREATE INDEX IF NOT EXISTS idx_wod_section_results_user_date ON wod_section_results(user_id, workout_date);

-- Whiteboard photos (queried by workout_week)
CREATE INDEX IF NOT EXISTS idx_whiteboard_photos_week ON whiteboard_photos(workout_week);

-- Athlete profiles (queried by user_id)
CREATE INDEX IF NOT EXISTS idx_athlete_profiles_user_id ON athlete_profiles(user_id);

-- Subscriptions (queried by member_id)
CREATE INDEX IF NOT EXISTS idx_subscriptions_member_id ON subscriptions(member_id);

-- Update query planner statistics
ANALYZE benchmark_results;
ANALYZE lift_records;
ANALYZE workout_logs;
ANALYZE wod_section_results;
ANALYZE whiteboard_photos;
ANALYZE athlete_profiles;
ANALYZE subscriptions;
