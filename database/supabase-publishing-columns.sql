-- Add publishing and Google Calendar integration columns to wods table
-- These fields enable coaches to publish workouts to athletes and sync with Google Calendar

-- Publishing status
ALTER TABLE wods ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;

-- Array of section type names that should be visible to athletes (TEXT[] not INTEGER[])
ALTER TABLE wods ADD COLUMN IF NOT EXISTS publish_sections TEXT[];

-- Google Calendar integration
ALTER TABLE wods ADD COLUMN IF NOT EXISTS google_event_id TEXT;

-- Event scheduling
ALTER TABLE wods ADD COLUMN IF NOT EXISTS publish_time TEXT;
ALTER TABLE wods ADD COLUMN IF NOT EXISTS publish_duration INTEGER;

-- Create index for querying published workouts
CREATE INDEX IF NOT EXISTS idx_wods_is_published ON wods(is_published, date) WHERE is_published = TRUE;

-- Add comments
COMMENT ON COLUMN wods.is_published IS 'Whether this workout is published to athletes';
COMMENT ON COLUMN wods.publish_sections IS 'Array of section type names visible to athletes';
COMMENT ON COLUMN wods.google_event_id IS 'Google Calendar event ID for syncing';
COMMENT ON COLUMN wods.publish_time IS 'Time workout appears on calendar (HH:MM format)';
COMMENT ON COLUMN wods.publish_duration IS 'Duration of calendar event in minutes';
