-- Fix Session Templates RLS Policies
-- Add policies for coaches to manage templates
-- Execute in Supabase SQL Editor

-- Temporary: Allow any authenticated user to manage session templates
-- TODO: Replace with proper coach-only access later

CREATE POLICY "Authenticated users can insert templates"
  ON session_templates FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update templates"
  ON session_templates FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete templates"
  ON session_templates FOR DELETE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view all templates"
  ON session_templates FOR SELECT
  USING (auth.uid() IS NOT NULL);
