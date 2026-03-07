-- Add track column to movement_patterns (adults vs kids)
ALTER TABLE movement_patterns
  ADD COLUMN IF NOT EXISTS track TEXT NOT NULL DEFAULT 'adults';

-- Drop old unique constraint and create new one including track
ALTER TABLE movement_patterns DROP CONSTRAINT IF EXISTS movement_patterns_user_id_name_key;
ALTER TABLE movement_patterns ADD CONSTRAINT movement_patterns_user_id_name_track_key UNIQUE(user_id, name, track);

-- Index for filtering by track
CREATE INDEX IF NOT EXISTS idx_movement_patterns_track ON movement_patterns(user_id, track);

COMMENT ON COLUMN movement_patterns.track IS 'Programming track: adults or kids';
