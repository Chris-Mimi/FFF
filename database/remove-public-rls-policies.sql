-- Remove PUBLIC RLS policies and enable proper user-based security
-- Run this script in Supabase SQL Editor after Supabase Auth is fully implemented and tested

-- ===================================
-- 1. REMOVE PUBLIC POLICIES (Athlete Tables)
-- ===================================

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

-- ===================================
-- 2. REMOVE PUBLIC POLICIES (WODs Table)
-- ===================================

DROP POLICY IF EXISTS "PUBLIC can view all wods" ON wods;
DROP POLICY IF EXISTS "PUBLIC can insert wods" ON wods;
DROP POLICY IF EXISTS "PUBLIC can update wods" ON wods;
DROP POLICY IF EXISTS "PUBLIC can delete wods" ON wods;

-- ===================================
-- 3. VERIFY USER-BASED POLICIES EXIST
-- ===================================

-- Check athlete_profiles policies
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'athlete_profiles'
ORDER BY policyname;

-- Check workout_logs policies
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'workout_logs'
ORDER BY policyname;

-- Check benchmark_results policies
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'benchmark_results'
ORDER BY policyname;

-- Check lift_records policies
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'lift_records'
ORDER BY policyname;

-- Check wods policies
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'wods'
ORDER BY policyname;

-- ===================================
-- 4. ADD MISSING POLICIES IF NEEDED
-- ===================================

-- The user-based policies should already exist from supabase-athlete-tables.sql
-- If they don't exist, they will be created here

-- Athlete Profiles (if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'athlete_profiles'
    AND policyname = 'Users can view their own profile'
  ) THEN
    CREATE POLICY "Users can view their own profile" ON athlete_profiles
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'athlete_profiles'
    AND policyname = 'Users can insert their own profile'
  ) THEN
    CREATE POLICY "Users can insert their own profile" ON athlete_profiles
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'athlete_profiles'
    AND policyname = 'Users can update their own profile'
  ) THEN
    CREATE POLICY "Users can update their own profile" ON athlete_profiles
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'athlete_profiles'
    AND policyname = 'Users can delete their own profile'
  ) THEN
    CREATE POLICY "Users can delete their own profile" ON athlete_profiles
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Workout Logs (if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'workout_logs'
    AND policyname = 'Users can view their own workout logs'
  ) THEN
    CREATE POLICY "Users can view their own workout logs" ON workout_logs
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'workout_logs'
    AND policyname = 'Users can insert their own workout logs'
  ) THEN
    CREATE POLICY "Users can insert their own workout logs" ON workout_logs
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'workout_logs'
    AND policyname = 'Users can update their own workout logs'
  ) THEN
    CREATE POLICY "Users can update their own workout logs" ON workout_logs
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'workout_logs'
    AND policyname = 'Users can delete their own workout logs'
  ) THEN
    CREATE POLICY "Users can delete their own workout logs" ON workout_logs
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Benchmark Results (if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'benchmark_results'
    AND policyname = 'Users can view their own benchmark results'
  ) THEN
    CREATE POLICY "Users can view their own benchmark results" ON benchmark_results
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'benchmark_results'
    AND policyname = 'Users can insert their own benchmark results'
  ) THEN
    CREATE POLICY "Users can insert their own benchmark results" ON benchmark_results
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'benchmark_results'
    AND policyname = 'Users can update their own benchmark results'
  ) THEN
    CREATE POLICY "Users can update their own benchmark results" ON benchmark_results
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'benchmark_results'
    AND policyname = 'Users can delete their own benchmark results'
  ) THEN
    CREATE POLICY "Users can delete their own benchmark results" ON benchmark_results
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Lift Records (if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'lift_records'
    AND policyname = 'Users can view their own lift records'
  ) THEN
    CREATE POLICY "Users can view their own lift records" ON lift_records
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'lift_records'
    AND policyname = 'Users can insert their own lift records'
  ) THEN
    CREATE POLICY "Users can insert their own lift records" ON lift_records
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'lift_records'
    AND policyname = 'Users can update their own lift records'
  ) THEN
    CREATE POLICY "Users can update their own lift records" ON lift_records
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'lift_records'
    AND policyname = 'Users can delete their own lift records'
  ) THEN
    CREATE POLICY "Users can delete their own lift records" ON lift_records
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ===================================
-- FINAL VERIFICATION
-- ===================================

-- List all policies for verification
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('athlete_profiles', 'workout_logs', 'benchmark_results', 'lift_records', 'wods')
ORDER BY tablename, policyname;
