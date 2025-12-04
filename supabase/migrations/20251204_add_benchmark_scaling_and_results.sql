-- Migration: Add Benchmark Scaling and Results Tracking
-- Date: 2025-12-04
-- Description: Adds has_scaling field to benchmarks and creates benchmark_results table

-- ============================================
-- PART 1: Add has_scaling field to benchmark_workouts
-- ============================================

ALTER TABLE benchmark_workouts
ADD COLUMN IF NOT EXISTS has_scaling BOOLEAN DEFAULT true;

COMMENT ON COLUMN benchmark_workouts.has_scaling IS 'Whether this benchmark has scaling options (Rx/Sc1/Sc2/Sc3)';

-- ============================================
-- PART 2: Add has_scaling field to forge_benchmarks
-- ============================================

ALTER TABLE forge_benchmarks
ADD COLUMN IF NOT EXISTS has_scaling BOOLEAN DEFAULT true;

COMMENT ON COLUMN forge_benchmarks.has_scaling IS 'Whether this benchmark has scaling options (Rx/Sc1/Sc2/Sc3)';

-- ============================================
-- PART 3: Create benchmark_results table
-- ============================================

-- Drop table if it exists from previous attempts
DROP TABLE IF EXISTS benchmark_results CASCADE;

CREATE TABLE benchmark_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  benchmark_id UUID, -- References benchmark_workouts(id)
  forge_benchmark_id UUID, -- References forge_benchmarks(id)
  benchmark_name TEXT NOT NULL, -- Denormalized for easier queries
  benchmark_type TEXT NOT NULL, -- 'For Time', 'AMRAP', 'Max Weight', etc
  result_value TEXT NOT NULL, -- Time (mm:ss), reps, weight, etc
  scaling_level TEXT CHECK (scaling_level IN ('Rx', 'Sc1', 'Sc2', 'Sc3') OR scaling_level IS NULL),
  notes TEXT,
  result_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraint: Either benchmark_id OR forge_benchmark_id must be set, not both
  CONSTRAINT benchmark_xor CHECK (
    (benchmark_id IS NOT NULL AND forge_benchmark_id IS NULL) OR
    (benchmark_id IS NULL AND forge_benchmark_id IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_benchmark_results_user_id ON benchmark_results(user_id);
CREATE INDEX IF NOT EXISTS idx_benchmark_results_benchmark_id ON benchmark_results(benchmark_id);
CREATE INDEX IF NOT EXISTS idx_benchmark_results_forge_benchmark_id ON benchmark_results(forge_benchmark_id);
CREATE INDEX IF NOT EXISTS idx_benchmark_results_date ON benchmark_results(result_date DESC);
CREATE INDEX IF NOT EXISTS idx_benchmark_results_user_name ON benchmark_results(user_id, benchmark_name, result_date DESC);

-- RLS policies
ALTER TABLE benchmark_results ENABLE ROW LEVEL SECURITY;

-- Users can view their own benchmark results
CREATE POLICY "Users can view own benchmark results"
  ON benchmark_results FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own benchmark results
CREATE POLICY "Users can insert own benchmark results"
  ON benchmark_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own benchmark results
CREATE POLICY "Users can update own benchmark results"
  ON benchmark_results FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own benchmark results
CREATE POLICY "Users can delete own benchmark results"
  ON benchmark_results FOR DELETE
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE benchmark_results IS 'Athlete benchmark workout results (times, scores, reps)';
COMMENT ON COLUMN benchmark_results.benchmark_id IS 'References benchmark_workouts for CrossFit Girls/Heroes';
COMMENT ON COLUMN benchmark_results.forge_benchmark_id IS 'References forge_benchmarks for gym-specific benchmarks';
COMMENT ON COLUMN benchmark_results.result_value IS 'Workout result: time (mm:ss), reps, weight, etc';
COMMENT ON COLUMN benchmark_results.scaling_level IS 'Rx (prescribed) or Sc1/Sc2/Sc3 (scaled options)';
