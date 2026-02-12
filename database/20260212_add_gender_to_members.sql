-- Add gender column to members table
ALTER TABLE members ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('M', 'F'));

-- Update get_member_names RPC to include gender (must drop first to change return type)
DROP FUNCTION IF EXISTS get_member_names(UUID[]);
CREATE OR REPLACE FUNCTION get_member_names(member_ids UUID[])
RETURNS TABLE (id UUID, display_name TEXT, name TEXT, gender TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT m.id, m.display_name, m.name, m.gender
  FROM members m
  WHERE m.id = ANY(member_ids);
$$;
