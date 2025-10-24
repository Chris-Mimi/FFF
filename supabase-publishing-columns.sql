-- Add publishing and Google Calendar integration columns to wods table
-- These fields enable coaches to publish workouts to athletes and sync with Google Calendar

-- Publishing status
ALTER TABLE wods ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT FALSE;
ALTER TABLE wods ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;

-- Array of section IDs that should be visible to athletes
ALTER TABLE wods ADD COLUMN IF NOT EXISTS published_section_ids INTEGER[];

-- Google Calendar integration
ALTER TABLE wods ADD COLUMN IF NOT EXISTS calendar_event_id TEXT;

-- Event scheduling
ALTER TABLE wods ADD COLUMN IF NOT EXISTS event_time TIME DEFAULT '09:00';
ALTER TABLE wods ADD COLUMN IF NOT EXISTS event_duration_minutes INTEGER DEFAULT 60;

-- Create index for querying published workouts
CREATE INDEX IF NOT EXISTS idx_wods_published ON wods(published, date) WHERE published = TRUE;

-- Add comment
COMMENT ON COLUMN wods.published IS 'Whether this workout is published to athletes';
COMMENT ON COLUMN wods.published_section_ids IS 'Array of section IDs visible to athletes';
COMMENT ON COLUMN wods.calendar_event_id IS 'Google Calendar event ID for syncing';
COMMENT ON COLUMN wods.event_time IS 'Time workout appears on calendar';
COMMENT ON COLUMN wods.event_duration_minutes IS 'Duration of calendar event in minutes';
