-- Create user_exercise_favorites table for persistent favorites across devices
CREATE TABLE IF NOT EXISTS user_exercise_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, exercise_id)
);

-- Enable RLS
ALTER TABLE user_exercise_favorites ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view/edit their own favorites
CREATE POLICY "Users manage own favorites"
  ON user_exercise_favorites FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for quick lookups by user_id
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id
  ON user_exercise_favorites(user_id);

-- Index for quick lookups by exercise_id (for checking if exercise is favorited)
CREATE INDEX IF NOT EXISTS idx_user_favorites_exercise_id
  ON user_exercise_favorites(exercise_id);

-- Comments for documentation
COMMENT ON TABLE user_exercise_favorites IS 'Stores user favorite exercises for quick access in Movement Library';
COMMENT ON COLUMN user_exercise_favorites.user_id IS 'References auth.users - coach who favorited the exercise';
COMMENT ON COLUMN user_exercise_favorites.exercise_id IS 'References exercises table - favorited exercise';
COMMENT ON COLUMN user_exercise_favorites.created_at IS 'Timestamp when exercise was favorited';
