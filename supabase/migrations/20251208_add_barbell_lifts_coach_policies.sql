-- Add coach policies for barbell_lifts table
-- Allows coaches to create, update, and delete barbell lifts

-- Coaches can insert barbell lifts
CREATE POLICY "Coaches can insert barbell lifts"
  ON barbell_lifts FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  );

-- Coaches can update barbell lifts
CREATE POLICY "Coaches can update barbell lifts"
  ON barbell_lifts FOR UPDATE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  );

-- Coaches can delete barbell lifts
CREATE POLICY "Coaches can delete barbell lifts"
  ON barbell_lifts FOR DELETE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  );
