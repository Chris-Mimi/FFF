-- Add coach_notes column to wods table
-- This field will store coach's private notes about the workout for future reference and searchability

ALTER TABLE wods ADD COLUMN IF NOT EXISTS coach_notes TEXT;

-- Create GIN index for full-text search on coach_notes
CREATE INDEX IF NOT EXISTS idx_wods_coach_notes_search ON wods USING gin(to_tsvector('english', coach_notes));

-- Create GIN index for full-text search on title
CREATE INDEX IF NOT EXISTS idx_wods_title_search ON wods USING gin(to_tsvector('english', title));

-- Note: sections field already exists as JSONB and can be searched using JSONB operators
-- The existing sections field combined with coach_notes, title, track, and workout_type will enable comprehensive WOD search functionality
