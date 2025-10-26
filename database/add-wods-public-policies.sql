-- Add PUBLIC policies for the wods table to allow joins in queries
-- This is needed for coach athletes page when fetching workout logs

-- First check if policies already exist
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'wods';

-- Drop existing PUBLIC policies if they exist
DROP POLICY IF EXISTS "PUBLIC can view all wods" ON wods;
DROP POLICY IF EXISTS "PUBLIC can insert wods" ON wods;
DROP POLICY IF EXISTS "PUBLIC can update wods" ON wods;
DROP POLICY IF EXISTS "PUBLIC can delete wods" ON wods;

-- Create PUBLIC policies for development
CREATE POLICY "PUBLIC can view all wods" ON wods
  FOR SELECT USING (true);

CREATE POLICY "PUBLIC can insert wods" ON wods
  FOR INSERT WITH CHECK (true);

CREATE POLICY "PUBLIC can update wods" ON wods
  FOR UPDATE USING (true);

CREATE POLICY "PUBLIC can delete wods" ON wods
  FOR DELETE USING (true);
