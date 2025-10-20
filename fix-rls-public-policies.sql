-- Fix RLS policies to ensure PUBLIC access works for development
-- This will drop and recreate all PUBLIC policies

-- Drop all existing PUBLIC policies
DROP POLICY IF EXISTS "PUBLIC can view all athlete profiles" ON athlete_profiles;
DROP POLICY IF EXISTS "PUBLIC can insert athlete profiles" ON athlete_profiles;
DROP POLICY IF EXISTS "PUBLIC can update athlete profiles" ON athlete_profiles;
DROP POLICY IF EXISTS "PUBLIC can delete athlete profiles" ON athlete_profiles;

DROP POLICY IF EXISTS "PUBLIC can view all workout logs" ON workout_logs;
DROP POLICY IF EXISTS "PUBLIC can insert workout logs" ON workout_logs;
DROP POLICY IF EXISTS "PUBLIC can update workout logs" ON workout_logs;
DROP POLICY IF EXISTS "PUBLIC can delete workout logs" ON workout_logs;

DROP POLICY IF EXISTS "PUBLIC can view all benchmark results" ON benchmark_results;
DROP POLICY IF EXISTS "PUBLIC can insert benchmark results" ON benchmark_results;
DROP POLICY IF EXISTS "PUBLIC can update benchmark results" ON benchmark_results;
DROP POLICY IF EXISTS "PUBLIC can delete benchmark results" ON benchmark_results;

DROP POLICY IF EXISTS "PUBLIC can view all lift records" ON lift_records;
DROP POLICY IF EXISTS "PUBLIC can insert lift records" ON lift_records;
DROP POLICY IF EXISTS "PUBLIC can update lift records" ON lift_records;
DROP POLICY IF EXISTS "PUBLIC can delete lift records" ON lift_records;

-- Recreate PUBLIC policies for development
-- Athlete Profiles
CREATE POLICY "PUBLIC can view all athlete profiles" ON athlete_profiles
  FOR SELECT USING (true);

CREATE POLICY "PUBLIC can insert athlete profiles" ON athlete_profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "PUBLIC can update athlete profiles" ON athlete_profiles
  FOR UPDATE USING (true);

CREATE POLICY "PUBLIC can delete athlete profiles" ON athlete_profiles
  FOR DELETE USING (true);

-- Workout Logs
CREATE POLICY "PUBLIC can view all workout logs" ON workout_logs
  FOR SELECT USING (true);

CREATE POLICY "PUBLIC can insert workout logs" ON workout_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "PUBLIC can update workout logs" ON workout_logs
  FOR UPDATE USING (true);

CREATE POLICY "PUBLIC can delete workout logs" ON workout_logs
  FOR DELETE USING (true);

-- Benchmark Results
CREATE POLICY "PUBLIC can view all benchmark results" ON benchmark_results
  FOR SELECT USING (true);

CREATE POLICY "PUBLIC can insert benchmark results" ON benchmark_results
  FOR INSERT WITH CHECK (true);

CREATE POLICY "PUBLIC can update benchmark results" ON benchmark_results
  FOR UPDATE USING (true);

CREATE POLICY "PUBLIC can delete benchmark results" ON benchmark_results
  FOR DELETE USING (true);

-- Lift Records
CREATE POLICY "PUBLIC can view all lift records" ON lift_records
  FOR SELECT USING (true);

CREATE POLICY "PUBLIC can insert lift records" ON lift_records
  FOR INSERT WITH CHECK (true);

CREATE POLICY "PUBLIC can update lift records" ON lift_records
  FOR UPDATE USING (true);

CREATE POLICY "PUBLIC can delete lift records" ON lift_records
  FOR DELETE USING (true);
