-- Create naming_conventions table
CREATE TABLE IF NOT EXISTS naming_conventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('equipment', 'movementTypes', 'anatomicalTerms', 'movementPatterns')),
  abbr TEXT NOT NULL,
  full_name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create resources table
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  url TEXT,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE naming_conventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Coaches can manage, athletes can read
CREATE POLICY "Coaches can manage naming conventions"
  ON naming_conventions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = auth.users.id
      AND (auth.users.raw_user_meta_data->>'role' = 'coach')
    )
  );

CREATE POLICY "Everyone can view naming conventions"
  ON naming_conventions FOR SELECT
  USING (true);

CREATE POLICY "Coaches can manage resources"
  ON resources FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = auth.users.id
      AND (auth.users.raw_user_meta_data->>'role' = 'coach')
    )
  );

CREATE POLICY "Everyone can view resources"
  ON resources FOR SELECT
  USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_naming_conventions_category
  ON naming_conventions(category);

CREATE INDEX IF NOT EXISTS idx_resources_category
  ON resources(category);

-- Comments
COMMENT ON TABLE naming_conventions IS 'Stores programming naming conventions and abbreviations';
COMMENT ON TABLE resources IS 'Stores programming resources and references';
