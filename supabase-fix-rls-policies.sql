-- Fix RLS Policies: Remove PUBLIC policies and ensure proper authentication
-- This migration removes overly permissive PUBLIC policies and ensures
-- authenticated users can only access their own data (plus coach access)

-- ============================================
-- DROP ALL EXISTING POLICIES
-- ============================================

-- Athlete Profiles - Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON athlete_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON athlete_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON athlete_profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON athlete_profiles;
DROP POLICY IF EXISTS "PUBLIC can view all athlete profiles" ON athlete_profiles;
DROP POLICY IF EXISTS "PUBLIC can insert athlete profiles" ON athlete_profiles;
DROP POLICY IF EXISTS "PUBLIC can update athlete profiles" ON athlete_profiles;
DROP POLICY IF EXISTS "PUBLIC can delete athlete profiles" ON athlete_profiles;

-- Workout Logs - Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own workout logs" ON workout_logs;
DROP POLICY IF EXISTS "Users can insert their own workout logs" ON workout_logs;
DROP POLICY IF EXISTS "Users can update their own workout logs" ON workout_logs;
DROP POLICY IF EXISTS "Users can delete their own workout logs" ON workout_logs;
DROP POLICY IF EXISTS "PUBLIC can view all workout logs" ON workout_logs;
DROP POLICY IF EXISTS "PUBLIC can insert workout logs" ON workout_logs;
DROP POLICY IF EXISTS "PUBLIC can update workout logs" ON workout_logs;
DROP POLICY IF EXISTS "PUBLIC can delete workout logs" ON workout_logs;

-- Benchmark Results - Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own benchmark results" ON benchmark_results;
DROP POLICY IF EXISTS "Users can insert their own benchmark results" ON benchmark_results;
DROP POLICY IF EXISTS "Users can update their own benchmark results" ON benchmark_results;
DROP POLICY IF EXISTS "Users can delete their own benchmark results" ON benchmark_results;
DROP POLICY IF EXISTS "PUBLIC can view all benchmark results" ON benchmark_results;
DROP POLICY IF EXISTS "PUBLIC can insert benchmark results" ON benchmark_results;
DROP POLICY IF EXISTS "PUBLIC can update benchmark results" ON benchmark_results;
DROP POLICY IF EXISTS "PUBLIC can delete benchmark results" ON benchmark_results;

-- Lift Records - Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own lift records" ON lift_records;
DROP POLICY IF EXISTS "Users can insert their own lift records" ON lift_records;
DROP POLICY IF EXISTS "Users can update their own lift records" ON lift_records;
DROP POLICY IF EXISTS "Users can delete their own lift records" ON lift_records;
DROP POLICY IF EXISTS "PUBLIC can view all lift records" ON lift_records;
DROP POLICY IF EXISTS "PUBLIC can insert lift records" ON lift_records;
DROP POLICY IF EXISTS "PUBLIC can update lift records" ON lift_records;
DROP POLICY IF EXISTS "PUBLIC can delete lift records" ON lift_records;

-- ============================================
-- ENSURE RLS IS ENABLED ON ALL TABLES
-- ============================================

ALTER TABLE athlete_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmark_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE lift_records ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ATHLETE PROFILES POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "athlete_profiles_select_own"
  ON athlete_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "athlete_profiles_insert_own"
  ON athlete_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "athlete_profiles_update_own"
  ON athlete_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own profile
CREATE POLICY "athlete_profiles_delete_own"
  ON athlete_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Coaches can view all athlete profiles
CREATE POLICY "athlete_profiles_select_coach"
  ON athlete_profiles FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  );

-- ============================================
-- WORKOUT LOGS POLICIES
-- ============================================

-- Users can view their own workout logs
CREATE POLICY "workout_logs_select_own"
  ON workout_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own workout logs
CREATE POLICY "workout_logs_insert_own"
  ON workout_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own workout logs
CREATE POLICY "workout_logs_update_own"
  ON workout_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own workout logs
CREATE POLICY "workout_logs_delete_own"
  ON workout_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Coaches can view all workout logs
CREATE POLICY "workout_logs_select_coach"
  ON workout_logs FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  );

-- ============================================
-- BENCHMARK RESULTS POLICIES
-- ============================================

-- Users can view their own benchmark results
CREATE POLICY "benchmark_results_select_own"
  ON benchmark_results FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own benchmark results
CREATE POLICY "benchmark_results_insert_own"
  ON benchmark_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own benchmark results
CREATE POLICY "benchmark_results_update_own"
  ON benchmark_results FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own benchmark results
CREATE POLICY "benchmark_results_delete_own"
  ON benchmark_results FOR DELETE
  USING (auth.uid() = user_id);

-- Coaches can view all benchmark results
CREATE POLICY "benchmark_results_select_coach"
  ON benchmark_results FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  );

-- ============================================
-- LIFT RECORDS POLICIES
-- ============================================

-- Users can view their own lift records
CREATE POLICY "lift_records_select_own"
  ON lift_records FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own lift records
CREATE POLICY "lift_records_insert_own"
  ON lift_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own lift records
CREATE POLICY "lift_records_update_own"
  ON lift_records FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own lift records
CREATE POLICY "lift_records_delete_own"
  ON lift_records FOR DELETE
  USING (auth.uid() = user_id);

-- Coaches can view all lift records
CREATE POLICY "lift_records_select_coach"
  ON lift_records FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  );

-- ============================================
-- VERIFICATION QUERIES (Run these after migration)
-- ============================================

-- To verify policies are working, run these queries as a logged-in user:
-- SELECT * FROM athlete_profiles WHERE user_id = auth.uid();
-- INSERT INTO athlete_profiles (user_id, full_name, email) VALUES (auth.uid(), 'Test Name', 'test@example.com');

-- To see all active policies:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
