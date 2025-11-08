-- Remove ALL PUBLIC RLS policies for production security
-- Run this script in Supabase SQL Editor before production deployment
-- Date: 2025-11-08
--
-- CRITICAL: This migration removes unauthenticated access to all tables.
-- Only authenticated users will be able to access data (except member registration).
--
-- ============================================
-- CATEGORY 1: Remove PUBLIC CRUD (Athlete Data)
-- ============================================

-- Athlete Profiles
DROP POLICY IF EXISTS "PUBLIC can view all athlete profiles" ON athlete_profiles;
DROP POLICY IF EXISTS "PUBLIC can insert athlete profiles" ON athlete_profiles;
DROP POLICY IF EXISTS "PUBLIC can update athlete profiles" ON athlete_profiles;
DROP POLICY IF EXISTS "PUBLIC can delete athlete profiles" ON athlete_profiles;

-- Workout Logs
DROP POLICY IF EXISTS "PUBLIC can view all workout logs" ON workout_logs;
DROP POLICY IF EXISTS "PUBLIC can insert workout logs" ON workout_logs;
DROP POLICY IF EXISTS "PUBLIC can update workout logs" ON workout_logs;
DROP POLICY IF EXISTS "PUBLIC can delete workout logs" ON workout_logs;

-- Benchmark Results
DROP POLICY IF EXISTS "PUBLIC can view all benchmark results" ON benchmark_results;
DROP POLICY IF EXISTS "PUBLIC can insert benchmark results" ON benchmark_results;
DROP POLICY IF EXISTS "PUBLIC can update benchmark results" ON benchmark_results;
DROP POLICY IF EXISTS "PUBLIC can delete benchmark results" ON benchmark_results;

-- Lift Records
DROP POLICY IF EXISTS "PUBLIC can view all lift records" ON lift_records;
DROP POLICY IF EXISTS "PUBLIC can insert lift records" ON lift_records;
DROP POLICY IF EXISTS "PUBLIC can update lift records" ON lift_records;
DROP POLICY IF EXISTS "PUBLIC can delete lift records" ON lift_records;

-- WODs
DROP POLICY IF EXISTS "PUBLIC can view all wods" ON wods;
DROP POLICY IF EXISTS "PUBLIC can insert wods" ON wods;
DROP POLICY IF EXISTS "PUBLIC can update wods" ON wods;
DROP POLICY IF EXISTS "PUBLIC can delete wods" ON wods;

-- ============================================
-- CATEGORY 2: Replace PUBLIC Read-Only (Reference Data)
-- ============================================

-- Forge Benchmarks: Change from USING (true) to authenticated users only
DROP POLICY IF EXISTS "Public can view forge benchmarks" ON forge_benchmarks;
CREATE POLICY "Authenticated users can view forge benchmarks"
  ON forge_benchmarks FOR SELECT
  TO authenticated
  USING (true);

-- Benchmark Workouts: Change from USING (true) to authenticated users only
DROP POLICY IF EXISTS "Public can view benchmark workouts" ON benchmark_workouts;
CREATE POLICY "Authenticated users can view benchmark workouts"
  ON benchmark_workouts FOR SELECT
  TO authenticated
  USING (true);

-- Barbell Lifts: Change from USING (true) to authenticated users only
DROP POLICY IF EXISTS "Public can view barbell lifts" ON barbell_lifts;
CREATE POLICY "Authenticated users can view barbell lifts"
  ON barbell_lifts FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- CATEGORY 3: Update Booking System Policies
-- ============================================

-- Session Templates: Change from active=true to authenticated users
DROP POLICY IF EXISTS "Public can view active templates" ON session_templates;
CREATE POLICY "Authenticated users can view active templates"
  ON session_templates FOR SELECT
  TO authenticated
  USING (active = true);

-- Weekly Sessions: Change from status='published' to authenticated users
DROP POLICY IF EXISTS "Public can view published sessions" ON weekly_sessions;
CREATE POLICY "Authenticated users can view published sessions"
  ON weekly_sessions FOR SELECT
  TO authenticated
  USING (status = 'published');

-- Members: KEEP "Public can register" for signup flow
-- This is the ONLY remaining public policy - allows unauthenticated registration
-- Policy already exists: "Public can register" ON members FOR INSERT WITH CHECK (status = 'pending')

-- ============================================
-- VERIFY: Ensure User-Based Policies Exist
-- ============================================

-- Athlete Profiles: User-based policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'athlete_profiles'
    AND policyname = 'Users can view their own profile'
  ) THEN
    CREATE POLICY "Users can view their own profile" ON athlete_profiles
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'athlete_profiles'
    AND policyname = 'Users can insert their own profile'
  ) THEN
    CREATE POLICY "Users can insert their own profile" ON athlete_profiles
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'athlete_profiles'
    AND policyname = 'Users can update their own profile'
  ) THEN
    CREATE POLICY "Users can update their own profile" ON athlete_profiles
      FOR UPDATE TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'athlete_profiles'
    AND policyname = 'Users can delete their own profile'
  ) THEN
    CREATE POLICY "Users can delete their own profile" ON athlete_profiles
      FOR DELETE TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Workout Logs: User-based policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'workout_logs'
    AND policyname = 'Users can view their own workout logs'
  ) THEN
    CREATE POLICY "Users can view their own workout logs" ON workout_logs
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'workout_logs'
    AND policyname = 'Users can insert their own workout logs'
  ) THEN
    CREATE POLICY "Users can insert their own workout logs" ON workout_logs
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'workout_logs'
    AND policyname = 'Users can update their own workout logs'
  ) THEN
    CREATE POLICY "Users can update their own workout logs" ON workout_logs
      FOR UPDATE TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'workout_logs'
    AND policyname = 'Users can delete their own workout logs'
  ) THEN
    CREATE POLICY "Users can delete their own workout logs" ON workout_logs
      FOR DELETE TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Benchmark Results: User-based policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'benchmark_results'
    AND policyname = 'Users can view their own benchmark results'
  ) THEN
    CREATE POLICY "Users can view their own benchmark results" ON benchmark_results
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'benchmark_results'
    AND policyname = 'Users can insert their own benchmark results'
  ) THEN
    CREATE POLICY "Users can insert their own benchmark results" ON benchmark_results
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'benchmark_results'
    AND policyname = 'Users can update their own benchmark results'
  ) THEN
    CREATE POLICY "Users can update their own benchmark results" ON benchmark_results
      FOR UPDATE TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'benchmark_results'
    AND policyname = 'Users can delete their own benchmark results'
  ) THEN
    CREATE POLICY "Users can delete their own benchmark results" ON benchmark_results
      FOR DELETE TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Lift Records: User-based policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'lift_records'
    AND policyname = 'Users can view their own lift records'
  ) THEN
    CREATE POLICY "Users can view their own lift records" ON lift_records
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'lift_records'
    AND policyname = 'Users can insert their own lift records'
  ) THEN
    CREATE POLICY "Users can insert their own lift records" ON lift_records
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'lift_records'
    AND policyname = 'Users can update their own lift records'
  ) THEN
    CREATE POLICY "Users can update their own lift records" ON lift_records
      FOR UPDATE TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'lift_records'
    AND policyname = 'Users can delete their own lift records'
  ) THEN
    CREATE POLICY "Users can delete their own lift records" ON lift_records
      FOR DELETE TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- FINAL VERIFICATION
-- ============================================

-- Show all remaining PUBLIC policies (should only be "Public can register" on members)
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE policyname ILIKE '%public%'
ORDER BY tablename, policyname;

-- Show all policies for critical tables
SELECT
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename IN (
  'athlete_profiles',
  'workout_logs',
  'benchmark_results',
  'lift_records',
  'wods',
  'forge_benchmarks',
  'benchmark_workouts',
  'barbell_lifts',
  'session_templates',
  'weekly_sessions',
  'members'
)
ORDER BY tablename, policyname;

-- ============================================
-- SUMMARY
-- ============================================

-- REMOVED (Category 1 - Full PUBLIC CRUD):
--   ✓ athlete_profiles (4 policies)
--   ✓ workout_logs (4 policies)
--   ✓ benchmark_results (4 policies)
--   ✓ lift_records (4 policies)
--   ✓ wods (4 policies)
--
-- RESTRICTED (Category 2 - Now Authenticated Only):
--   ✓ forge_benchmarks (SELECT)
--   ✓ benchmark_workouts (SELECT)
--   ✓ barbell_lifts (SELECT)
--
-- RESTRICTED (Category 3 - Now Authenticated Only):
--   ✓ session_templates (SELECT active)
--   ✓ weekly_sessions (SELECT published)
--
-- KEPT PUBLIC:
--   ✓ members (INSERT for registration only)
--
-- ENSURED USER-BASED POLICIES:
--   ✓ athlete_profiles (4 policies)
--   ✓ workout_logs (4 policies)
--   ✓ benchmark_results (4 policies)
--   ✓ lift_records (4 policies)
