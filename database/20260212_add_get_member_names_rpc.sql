-- RPC function: get_member_names
-- Returns id, display_name, name for a list of member UUIDs.
-- Callable by any authenticated user (community leaderboard / feed).
-- Only exposes names — no email, status, or other sensitive fields.

CREATE OR REPLACE FUNCTION get_member_names(member_ids UUID[])
RETURNS TABLE (id UUID, display_name TEXT, name TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT m.id, m.display_name, m.name
  FROM members m
  WHERE m.id = ANY(member_ids);
$$;

-- Grant execute to authenticated users only
REVOKE ALL ON FUNCTION get_member_names(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_member_names(UUID[]) TO authenticated;
