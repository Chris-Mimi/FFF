-- Migration: Add workout_publish_status column to wods table
-- Date: 2025-11-09
-- Purpose: Separate workout publishing for athlete logging from session booking status

-- Add workout_publish_status column to wods table
ALTER TABLE wods ADD COLUMN IF NOT EXISTS workout_publish_status TEXT DEFAULT 'draft'
  CHECK (workout_publish_status IN ('draft', 'published'));

-- Update existing published workouts
UPDATE wods SET workout_publish_status = 'published' WHERE is_published = true;

-- Set empty sessions (no content) to NULL status
UPDATE wods
SET workout_publish_status = NULL
WHERE (sections = '[]' OR sections IS NULL OR jsonb_array_length(sections) = 0);

-- Note: Keep is_published for backward compatibility during transition
-- Future cleanup can remove is_published column once all code is updated
