-- Migration: Create Movement Results Table (Unified Results Tracking)
-- Date: 2025-12-07
-- Description: Consolidates lift_records, benchmark_results, wod_section_results into single table

-- Create movement_results table
CREATE TABLE IF NOT EXISTS movement_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_id UUID NOT NULL REFERENCES movements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Multi-field results (null if not applicable to movement type)
  time_result TEXT,                             -- "5:23" (mm:ss format)
  reps_result INTEGER,                          -- 156 reps (total or max)
  weight_result NUMERIC(6,2),                   -- 80.5 kg
  distance_result NUMERIC(8,2),                 -- 245 meters
  duration_seconds INTEGER,                     -- 45 seconds (for hold movements)
  rounds_result INTEGER,                        -- Complete rounds (for AMRAP with rounds+reps)
  scaling_level TEXT CHECK (scaling_level IN ('Rx', 'Sc1', 'Sc2', 'Sc3')),

  -- Lift-specific fields
  rep_scheme TEXT,                              -- '5x5' | '1RM' | '3RM' | '5RM' | '10RM' | '21-15-9'
  calculated_1rm NUMERIC(6,2),                  -- Estimated 1RM using Epley formula: weight * (1 + reps/30)

  notes TEXT,                                   -- Athlete notes/feedback
  result_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one result per user per movement per date per rep_scheme
  -- (rep_scheme allows same lift on same day with different schemes: 5x5 vs 1RM)
  UNIQUE(user_id, movement_id, result_date, rep_scheme)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_movement_results_user ON movement_results(user_id);
CREATE INDEX IF NOT EXISTS idx_movement_results_movement ON movement_results(movement_id);
CREATE INDEX IF NOT EXISTS idx_movement_results_date ON movement_results(result_date DESC);
CREATE INDEX IF NOT EXISTS idx_movement_results_user_movement ON movement_results(user_id, movement_id, result_date DESC);
CREATE INDEX IF NOT EXISTS idx_movement_results_user_date ON movement_results(user_id, result_date DESC);

-- Enable Row Level Security
ALTER TABLE movement_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own results
CREATE POLICY "Users can view own movement results"
  ON movement_results FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own results
CREATE POLICY "Users can insert own movement results"
  ON movement_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own results
CREATE POLICY "Users can update own movement results"
  ON movement_results FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own results
CREATE POLICY "Users can delete own movement results"
  ON movement_results FOR DELETE
  USING (auth.uid() = user_id);

-- Comments for documentation
COMMENT ON TABLE movement_results IS 'Unified table for all movement results (lifts, benchmarks, max efforts, holds, cardio)';
COMMENT ON COLUMN movement_results.time_result IS 'Time in mm:ss format (e.g., "5:23", "DNF", "Cap+12")';
COMMENT ON COLUMN movement_results.reps_result IS 'Total reps completed or max reps achieved';
COMMENT ON COLUMN movement_results.weight_result IS 'Weight in kilograms';
COMMENT ON COLUMN movement_results.distance_result IS 'Distance in meters';
COMMENT ON COLUMN movement_results.duration_seconds IS 'Hold time in seconds (for L-sit, plank, etc)';
COMMENT ON COLUMN movement_results.rounds_result IS 'Complete rounds for AMRAP workouts (use with reps_result for rounds+reps)';
COMMENT ON COLUMN movement_results.scaling_level IS 'Rx, Sc1, Sc2, or Sc3 scaling level';
COMMENT ON COLUMN movement_results.rep_scheme IS 'For barbell lifts: workout pattern (5x5, 3x10) or max rep test (1RM, 3RM, 5RM, 10RM)';
COMMENT ON COLUMN movement_results.calculated_1rm IS 'Estimated 1RM calculated from weight and reps using Epley formula';
