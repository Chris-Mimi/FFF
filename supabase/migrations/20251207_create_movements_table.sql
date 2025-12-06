-- Migration: Create Movements Table (Unified Movement Tracking)
-- Date: 2025-12-07
-- Description: Consolidates barbell_lifts, benchmark_workouts, forge_benchmarks into single movements table

-- Create movements table
CREATE TABLE IF NOT EXISTS movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,                    -- "Max Strict Push-Ups", "Fran", "Back Squat"
  category TEXT NOT NULL,                       -- 'lift' | 'benchmark' | 'forge_benchmark' | 'max_effort' | 'hold' | 'cardio'
  movement_type TEXT NOT NULL,                  -- 'for_time' | 'amrap' | 'max_weight' | 'max_reps' | 'max_hold' | 'max_distance'
  result_fields JSONB NOT NULL,                 -- {"time": true, "reps": true, "scaling": true}
  description TEXT,                             -- Full workout description
  has_scaling BOOLEAN DEFAULT FALSE,            -- Rx/Sc1/Sc2/Sc3 support
  is_barbell_lift BOOLEAN DEFAULT FALSE,        -- Special handling for lifts
  display_order INTEGER,                        -- Sort order in library
  source_exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL,  -- Link to exercises table (optional)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_category CHECK (category IN ('lift', 'benchmark', 'forge_benchmark', 'max_effort', 'hold', 'cardio')),
  CONSTRAINT valid_movement_type CHECK (movement_type IN ('for_time', 'amrap', 'max_weight', 'max_reps', 'max_hold', 'max_distance'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_movements_category ON movements(category);
CREATE INDEX IF NOT EXISTS idx_movements_name ON movements(name);
CREATE INDEX IF NOT EXISTS idx_movements_display_order ON movements(display_order);
CREATE INDEX IF NOT EXISTS idx_movements_source_exercise ON movements(source_exercise_id) WHERE source_exercise_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- All authenticated users can view movements
CREATE POLICY "Authenticated users can view movements"
  ON movements FOR SELECT
  TO authenticated
  USING (true);

-- Only authenticated users can create movements (for "Make Trackable" feature)
CREATE POLICY "Authenticated users can insert movements"
  ON movements FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only authenticated users can update movements
CREATE POLICY "Authenticated users can update movements"
  ON movements FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Only authenticated users can delete movements
CREATE POLICY "Authenticated users can delete movements"
  ON movements FOR DELETE
  TO authenticated
  USING (true);

-- Comments for documentation
COMMENT ON TABLE movements IS 'Unified table for all trackable movements (lifts, benchmarks, max efforts, holds, cardio)';
COMMENT ON COLUMN movements.name IS 'Unique movement name (e.g., "Fran", "Max Strict Push-Ups", "Back Squat")';
COMMENT ON COLUMN movements.category IS 'Movement category for organization and filtering';
COMMENT ON COLUMN movements.movement_type IS 'Scoring type that determines which result fields are used';
COMMENT ON COLUMN movements.result_fields IS 'JSONB defining which input fields to show athletes (time, reps, weight, distance, duration_seconds, scaling, rounds_reps)';
COMMENT ON COLUMN movements.has_scaling IS 'Whether this movement supports Rx/Sc1/Sc2/Sc3 scaling options';
COMMENT ON COLUMN movements.is_barbell_lift IS 'TRUE for barbell lifts that need special rep scheme handling (5x5, 1RM, etc)';
COMMENT ON COLUMN movements.source_exercise_id IS 'Optional link to exercises table if movement was created from an exercise';
