-- Add score_recorded notification preference column
-- Run in Supabase SQL Editor
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS score_recorded BOOLEAN NOT NULL DEFAULT true;
