-- Exercises Table Schema Extension
-- Adds fields to support comprehensive exercise library with 400+ exercises
-- Date: 2025-11-21

-- Step 1: Add new columns to exercises table
ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS subcategory TEXT,
  ADD COLUMN IF NOT EXISTS equipment TEXT[], -- Array of equipment types (barbell, dumbbell, kettlebell, bodyweight, etc.)
  ADD COLUMN IF NOT EXISTS body_parts TEXT[], -- Array of body parts worked (full-body, legs, shoulders, etc.)
  ADD COLUMN IF NOT EXISTS difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced') OR difficulty IS NULL),
  ADD COLUMN IF NOT EXISTS is_warmup BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_stretch BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS search_terms TEXT;

-- Add tsvector column for full-text search
-- This column is auto-updated via trigger (see below)
ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Step 2: Add UNIQUE constraint on name (prevent duplicate exercises)
-- First check if constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'exercises_name_unique'
  ) THEN
    ALTER TABLE exercises ADD CONSTRAINT exercises_name_unique UNIQUE (name);
  END IF;
END $$;

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercises_subcategory ON exercises(subcategory);
CREATE INDEX IF NOT EXISTS idx_exercises_difficulty ON exercises(difficulty) WHERE difficulty IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exercises_warmup ON exercises(is_warmup) WHERE is_warmup = true;
CREATE INDEX IF NOT EXISTS idx_exercises_stretch ON exercises(is_stretch) WHERE is_stretch = true;

-- Step 3b: Create trigger function to auto-update search_vector
-- This function updates the search_vector whenever name, tags, or search_terms change
CREATE OR REPLACE FUNCTION exercises_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.search_terms, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS exercises_search_vector_trigger ON exercises;

-- Create trigger that fires on INSERT or UPDATE
CREATE TRIGGER exercises_search_vector_trigger
  BEFORE INSERT OR UPDATE ON exercises
  FOR EACH ROW
  EXECUTE FUNCTION exercises_search_vector_update();

-- Full-text search GIN index on the search_vector column
DROP INDEX IF EXISTS idx_exercises_search;
CREATE INDEX idx_exercises_search ON exercises USING GIN (search_vector);

-- Step 4: Update RLS Policies (everyone reads, authenticated adds, admin only deletes)
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "exercises_select_policy" ON exercises;
DROP POLICY IF EXISTS "exercises_insert_policy" ON exercises;
DROP POLICY IF EXISTS "exercises_update_policy" ON exercises;
DROP POLICY IF EXISTS "exercises_delete_policy" ON exercises;

-- Enable RLS
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Public read access for all authenticated users
CREATE POLICY "exercises_select_policy"
  ON exercises
  FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can INSERT (coaches adding exercises)
CREATE POLICY "exercises_insert_policy"
  ON exercises
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can UPDATE (coaches editing exercises)
CREATE POLICY "exercises_update_policy"
  ON exercises
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Only specific admin users can DELETE
-- NOTE: For now, only Chris (primary admin) can delete via Supabase dashboard
-- This policy blocks all deletes via client (frontend)
CREATE POLICY "exercises_delete_policy"
  ON exercises
  FOR DELETE
  TO authenticated
  USING (false); -- Blocks all client-side deletes

-- Step 5: Add helpful comments
COMMENT ON COLUMN exercises.display_name IS 'Human-readable name for UI display (may differ from unique name)';
COMMENT ON COLUMN exercises.subcategory IS 'Optional subcategory under main category (e.g., "Clean Variations" under "Olympic Lifting")';
COMMENT ON COLUMN exercises.equipment IS 'Array of equipment needed (barbell, dumbbell, kettlebell, bodyweight, etc.)';
COMMENT ON COLUMN exercises.body_parts IS 'Array of body parts worked (full-body, legs, shoulders, back, etc.)';
COMMENT ON COLUMN exercises.difficulty IS 'Optional difficulty level: beginner, intermediate, advanced';
COMMENT ON COLUMN exercises.is_warmup IS 'Flag indicating if exercise is typically used in warm-ups';
COMMENT ON COLUMN exercises.is_stretch IS 'Flag indicating if exercise is a stretching/mobility movement';
COMMENT ON COLUMN exercises.search_terms IS 'Concatenated search-optimized string for full-text search';
COMMENT ON COLUMN exercises.search_vector IS 'Tsvector column for full-text search (auto-updated by trigger from name, tags, search_terms)';

-- Migration complete!
-- Next step: Import sample exercises from exercises-import-sample.json
