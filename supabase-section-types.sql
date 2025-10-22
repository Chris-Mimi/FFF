-- Create section_types table
-- This table stores the available WOD section types (e.g., Warm-up, Strength, WOD, etc.)
-- These replace the previously hardcoded SECTION_TYPES array in WODModal.tsx

CREATE TABLE IF NOT EXISTS section_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default section types (migrated from hardcoded values)
INSERT INTO section_types (name, description, display_order) VALUES
  ('Whiteboard Intro', 'Introduction and overview of the workout', 1),
  ('Warm-up', 'General warm-up to prepare for the workout', 2),
  ('Skill', 'Skill practice and development', 3),
  ('Gymnastics', 'Gymnastics-focused training', 4),
  ('Accessory', 'Accessory work and supplemental exercises', 5),
  ('Strength', 'Strength training and heavy lifting', 6),
  ('WOD Preparation', 'Specific preparation for the WOD', 7),
  ('WOD', 'Workout of the Day (main conditioning piece)', 8),
  ('Cool Down', 'Cool down and mobility work', 9)
ON CONFLICT (name) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE section_types ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public read access for all authenticated users
CREATE POLICY "section_types_select_policy"
  ON section_types
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Only authenticated users can INSERT/UPDATE/DELETE (for future admin UI)
CREATE POLICY "section_types_insert_policy"
  ON section_types
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "section_types_update_policy"
  ON section_types
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "section_types_delete_policy"
  ON section_types
  FOR DELETE
  TO authenticated
  USING (true);

-- Create index on display_order for efficient ordering
CREATE INDEX IF NOT EXISTS idx_section_types_display_order ON section_types(display_order);
