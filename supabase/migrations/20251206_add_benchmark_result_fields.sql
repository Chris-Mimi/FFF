-- Migration: Add Time/Reps/Weight Fields to Benchmark Results
-- Date: 2025-12-06
-- Description: Adds separate time_result, reps_result, weight_result columns to benchmark_results table

-- Add new columns
ALTER TABLE benchmark_results
ADD COLUMN IF NOT EXISTS time_result TEXT,
ADD COLUMN IF NOT EXISTS reps_result INTEGER,
ADD COLUMN IF NOT EXISTS weight_result NUMERIC(6,2);

-- Make result_value nullable (now optional since we have separate fields)
ALTER TABLE benchmark_results
ALTER COLUMN result_value DROP NOT NULL;

-- Comments
COMMENT ON COLUMN benchmark_results.time_result IS 'Time result in mm:ss format';
COMMENT ON COLUMN benchmark_results.reps_result IS 'Reps completed (for AMRAP or rep-based benchmarks)';
COMMENT ON COLUMN benchmark_results.weight_result IS 'Weight used in kilograms';
COMMENT ON COLUMN benchmark_results.result_value IS 'Legacy result field (now optional, use time/reps/weight instead)';
