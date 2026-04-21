-- Migration: timer_presets table for athlete Intervals timer routines
-- Date: 2026-04-21
-- Context: Cross-device sync of named Intervals routines (Session 298 follow-up to S296).

CREATE TABLE IF NOT EXISTS timer_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  intervals JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS timer_presets_user_id_idx ON timer_presets(user_id);

ALTER TABLE timer_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own timer presets"
  ON timer_presets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own timer presets"
  ON timer_presets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own timer presets"
  ON timer_presets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own timer presets"
  ON timer_presets FOR DELETE
  USING (auth.uid() = user_id);
