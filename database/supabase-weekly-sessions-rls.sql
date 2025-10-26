-- Add RLS Policies for weekly_sessions table
-- Execute in Supabase SQL Editor

-- Temporary: Allow authenticated users (coaches) to manage weekly sessions
-- TODO: Replace with proper coach-only access later

CREATE POLICY "Authenticated users can view all sessions"
  ON weekly_sessions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert sessions"
  ON weekly_sessions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update sessions"
  ON weekly_sessions FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete sessions"
  ON weekly_sessions FOR DELETE
  USING (auth.uid() IS NOT NULL);
