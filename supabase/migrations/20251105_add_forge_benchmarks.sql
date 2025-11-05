-- Migration: Add Forge Benchmarks Table
-- Date: 2025-11-05
-- Description: Creates table for gym-specific benchmark workouts

CREATE TABLE IF NOT EXISTS forge_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL, -- 'For Time', 'AMRAP', 'Max Weight', etc
  description TEXT, -- Workout details
  display_order INTEGER DEFAULT 0, -- For custom ordering
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for ordering
CREATE INDEX IF NOT EXISTS idx_forge_benchmarks_display_order
ON forge_benchmarks(display_order);

-- RLS policies for forge_benchmarks
ALTER TABLE forge_benchmarks ENABLE ROW LEVEL SECURITY;

-- Everyone can view forge benchmarks
CREATE POLICY "Public can view forge benchmarks"
  ON forge_benchmarks FOR SELECT
  USING (true);

-- Coaches can insert forge benchmarks
CREATE POLICY "Coaches can insert forge benchmarks"
  ON forge_benchmarks FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  );

-- Coaches can update forge benchmarks
CREATE POLICY "Coaches can update forge benchmarks"
  ON forge_benchmarks FOR UPDATE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  );

-- Coaches can delete forge benchmarks
CREATE POLICY "Coaches can delete forge benchmarks"
  ON forge_benchmarks FOR DELETE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  );

COMMENT ON TABLE forge_benchmarks IS 'Gym-specific benchmark WODs for Forge Functional Fitness';
COMMENT ON COLUMN forge_benchmarks.display_order IS 'Custom ordering for display in athlete UI';
