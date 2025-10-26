-- Create athlete_profiles table
CREATE TABLE IF NOT EXISTS athlete_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  date_of_birth DATE,
  phone_number TEXT,
  height_cm INTEGER,
  weight_kg DECIMAL(5,2),
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workout_logs table
CREATE TABLE IF NOT EXISTS workout_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  wod_id UUID REFERENCES wods(id) ON DELETE SET NULL,
  workout_date DATE NOT NULL,
  result TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create benchmark_results table
CREATE TABLE IF NOT EXISTS benchmark_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  benchmark_name TEXT NOT NULL,
  result TEXT NOT NULL,
  notes TEXT,
  workout_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create lift_records table
CREATE TABLE IF NOT EXISTS lift_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lift_name TEXT NOT NULL,
  weight_kg DECIMAL(6,2) NOT NULL,
  reps INTEGER NOT NULL DEFAULT 1,
  calculated_1rm DECIMAL(6,2),
  notes TEXT,
  lift_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_athlete_profiles_user_id ON athlete_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_id ON workout_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_date ON workout_logs(workout_date);
CREATE INDEX IF NOT EXISTS idx_benchmark_results_user_id ON benchmark_results(user_id);
CREATE INDEX IF NOT EXISTS idx_benchmark_results_name ON benchmark_results(benchmark_name);
CREATE INDEX IF NOT EXISTS idx_lift_records_user_id ON lift_records(user_id);
CREATE INDEX IF NOT EXISTS idx_lift_records_lift ON lift_records(lift_name);
CREATE INDEX IF NOT EXISTS idx_lift_records_date ON lift_records(lift_date);

-- Enable Row Level Security (RLS)
ALTER TABLE athlete_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmark_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE lift_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow users to manage their own data
-- Athlete Profiles
CREATE POLICY "Users can view their own profile" ON athlete_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON athlete_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON athlete_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile" ON athlete_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- Workout Logs
CREATE POLICY "Users can view their own workout logs" ON workout_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workout logs" ON workout_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout logs" ON workout_logs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workout logs" ON workout_logs
  FOR DELETE USING (auth.uid() = user_id);

-- Benchmark Results
CREATE POLICY "Users can view their own benchmark results" ON benchmark_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own benchmark results" ON benchmark_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own benchmark results" ON benchmark_results
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own benchmark results" ON benchmark_results
  FOR DELETE USING (auth.uid() = user_id);

-- Lift Records
CREATE POLICY "Users can view their own lift records" ON lift_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own lift records" ON lift_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lift records" ON lift_records
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lift records" ON lift_records
  FOR DELETE USING (auth.uid() = user_id);

-- Temporary PUBLIC policies for development (remove these in production!)
-- These allow anyone to access the data while we're still using sessionStorage auth
CREATE POLICY "PUBLIC can view all athlete profiles" ON athlete_profiles
  FOR SELECT USING (true);

CREATE POLICY "PUBLIC can insert athlete profiles" ON athlete_profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "PUBLIC can update athlete profiles" ON athlete_profiles
  FOR UPDATE USING (true);

CREATE POLICY "PUBLIC can delete athlete profiles" ON athlete_profiles
  FOR DELETE USING (true);

CREATE POLICY "PUBLIC can view all workout logs" ON workout_logs
  FOR SELECT USING (true);

CREATE POLICY "PUBLIC can insert workout logs" ON workout_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "PUBLIC can update workout logs" ON workout_logs
  FOR UPDATE USING (true);

CREATE POLICY "PUBLIC can delete workout logs" ON workout_logs
  FOR DELETE USING (true);

CREATE POLICY "PUBLIC can view all benchmark results" ON benchmark_results
  FOR SELECT USING (true);

CREATE POLICY "PUBLIC can insert benchmark results" ON benchmark_results
  FOR INSERT WITH CHECK (true);

CREATE POLICY "PUBLIC can update benchmark results" ON benchmark_results
  FOR UPDATE USING (true);

CREATE POLICY "PUBLIC can delete benchmark results" ON benchmark_results
  FOR DELETE USING (true);

CREATE POLICY "PUBLIC can view all lift records" ON lift_records
  FOR SELECT USING (true);

CREATE POLICY "PUBLIC can insert lift records" ON lift_records
  FOR INSERT WITH CHECK (true);

CREATE POLICY "PUBLIC can update lift records" ON lift_records
  FOR UPDATE USING (true);

CREATE POLICY "PUBLIC can delete lift records" ON lift_records
  FOR DELETE USING (true);
