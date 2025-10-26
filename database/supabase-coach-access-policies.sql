-- Add RLS policies to allow coaches to view and manage all athlete data

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Coaches can view all athlete profiles" ON athlete_profiles;
DROP POLICY IF EXISTS "Coaches can update all athlete profiles" ON athlete_profiles;
DROP POLICY IF EXISTS "Coaches can view all workout logs" ON workout_logs;
DROP POLICY IF EXISTS "Coaches can insert workout logs" ON workout_logs;
DROP POLICY IF EXISTS "Coaches can update workout logs" ON workout_logs;
DROP POLICY IF EXISTS "Coaches can delete workout logs" ON workout_logs;
DROP POLICY IF EXISTS "Coaches can view all benchmark results" ON benchmark_results;
DROP POLICY IF EXISTS "Coaches can insert benchmark results" ON benchmark_results;
DROP POLICY IF EXISTS "Coaches can update benchmark results" ON benchmark_results;
DROP POLICY IF EXISTS "Coaches can delete benchmark results" ON benchmark_results;
DROP POLICY IF EXISTS "Coaches can view all lift records" ON lift_records;
DROP POLICY IF EXISTS "Coaches can insert lift records" ON lift_records;
DROP POLICY IF EXISTS "Coaches can update lift records" ON lift_records;
DROP POLICY IF EXISTS "Coaches can delete lift records" ON lift_records;

-- Athlete Profiles - Coach Access
CREATE POLICY "Coaches can view all athlete profiles" ON athlete_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'coach'
    )
  );

CREATE POLICY "Coaches can update all athlete profiles" ON athlete_profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'coach'
    )
  );

-- Workout Logs - Coach Access
CREATE POLICY "Coaches can view all workout logs" ON workout_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'coach'
    )
  );

CREATE POLICY "Coaches can insert workout logs" ON workout_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'coach'
    )
  );

CREATE POLICY "Coaches can update workout logs" ON workout_logs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'coach'
    )
  );

CREATE POLICY "Coaches can delete workout logs" ON workout_logs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'coach'
    )
  );

-- Benchmark Results - Coach Access
CREATE POLICY "Coaches can view all benchmark results" ON benchmark_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'coach'
    )
  );

CREATE POLICY "Coaches can insert benchmark results" ON benchmark_results
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'coach'
    )
  );

CREATE POLICY "Coaches can update benchmark results" ON benchmark_results
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'coach'
    )
  );

CREATE POLICY "Coaches can delete benchmark results" ON benchmark_results
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'coach'
    )
  );

-- Lift Records - Coach Access
CREATE POLICY "Coaches can view all lift records" ON lift_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'coach'
    )
  );

CREATE POLICY "Coaches can insert lift records" ON lift_records
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'coach'
    )
  );

CREATE POLICY "Coaches can update lift records" ON lift_records
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'coach'
    )
  );

CREATE POLICY "Coaches can delete lift records" ON lift_records
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'coach'
    )
  );
