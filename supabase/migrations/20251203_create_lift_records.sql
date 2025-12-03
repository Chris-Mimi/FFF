-- Migration: Create Lift Records Table
-- Date: 2025-12-03
-- Description: Creates table for athlete lift records from workouts and PR testing

CREATE TABLE IF NOT EXISTS lift_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lift_name TEXT NOT NULL,
  weight_kg NUMERIC(6,2) NOT NULL CHECK (weight_kg > 0),
  reps INTEGER NOT NULL CHECK (reps > 0),
  calculated_1rm NUMERIC(6,2),
  -- rep_max_type is for actual RM tests (1RM, 3RM, 5RM, 10RM)
  rep_max_type TEXT CHECK (rep_max_type IN ('1RM', '3RM', '5RM', '10RM') OR rep_max_type IS NULL),
  -- rep_scheme is for workout rep patterns (e.g., '5x5', '3x10', '21-15-9')
  rep_scheme TEXT,
  notes TEXT,
  lift_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraint: Either rep_max_type OR rep_scheme should be set, not both
  CONSTRAINT rep_type_xor CHECK (
    (rep_max_type IS NOT NULL AND rep_scheme IS NULL) OR
    (rep_max_type IS NULL AND rep_scheme IS NOT NULL) OR
    (rep_max_type IS NULL AND rep_scheme IS NULL)
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lift_records_user_id ON lift_records(user_id);
CREATE INDEX IF NOT EXISTS idx_lift_records_lift_name ON lift_records(lift_name);
CREATE INDEX IF NOT EXISTS idx_lift_records_date ON lift_records(lift_date DESC);
CREATE INDEX IF NOT EXISTS idx_lift_records_user_lift ON lift_records(user_id, lift_name, lift_date DESC);

-- RLS policies
ALTER TABLE lift_records ENABLE ROW LEVEL SECURITY;

-- Users can view their own lift records
CREATE POLICY "Users can view own lift records"
  ON lift_records FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own lift records
CREATE POLICY "Users can insert own lift records"
  ON lift_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own lift records
CREATE POLICY "Users can update own lift records"
  ON lift_records FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own lift records
CREATE POLICY "Users can delete own lift records"
  ON lift_records FOR DELETE
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE lift_records IS 'Athlete lift performance records from workouts and PR testing';
COMMENT ON COLUMN lift_records.rep_max_type IS 'For actual RM tests: 1RM, 3RM, 5RM, 10RM';
COMMENT ON COLUMN lift_records.rep_scheme IS 'For workout rep patterns: 5x5, 3x10, 21-15-9, etc';
COMMENT ON COLUMN lift_records.calculated_1rm IS 'Estimated 1RM using Epley formula';
