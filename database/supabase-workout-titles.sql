-- Create workout_titles table
-- This table stores the standardized workout title options used across the application

CREATE TABLE IF NOT EXISTS workout_titles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_workout_titles_display_order ON workout_titles(display_order);
CREATE INDEX IF NOT EXISTS idx_workout_titles_active ON workout_titles(active);

-- Enable RLS
ALTER TABLE workout_titles ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow all authenticated users to read
CREATE POLICY "Authenticated users can view workout titles"
  ON workout_titles
  FOR SELECT
  TO authenticated
  USING (true);

-- Only authenticated users can insert/update/delete (coaches manage these)
CREATE POLICY "Authenticated users can manage workout titles"
  ON workout_titles
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert initial workout titles from existing hardcoded options
INSERT INTO workout_titles (name, display_order, active) VALUES
  ('WOD', 1, true),
  ('Foundations', 2, true),
  ('Endurance', 3, true),
  ('Kids', 4, true),
  ('Kids & Teens', 5, true),
  ('ElternKind Turnen', 6, true),
  ('FitKids Turnen', 7, true),
  ('Diapers & Dumbbells', 8, true)
ON CONFLICT (name) DO NOTHING;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_workout_titles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workout_titles_updated_at
  BEFORE UPDATE ON workout_titles
  FOR EACH ROW
  EXECUTE FUNCTION update_workout_titles_updated_at();
