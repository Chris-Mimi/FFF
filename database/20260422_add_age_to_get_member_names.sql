-- Extend get_member_names RPC to return age (integer years) alongside names/gender.
-- Age is derived from date_of_birth so the raw DOB is never exposed to other athletes.
-- NULL age for members without DOB set.

-- Return type changed (added age column) — DROP required before CREATE.
DROP FUNCTION IF EXISTS get_member_names(UUID[]);

CREATE FUNCTION get_member_names(member_ids UUID[])
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  name TEXT,
  gender TEXT,
  age INT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    m.id,
    m.display_name,
    m.name,
    m.gender,
    CASE
      WHEN m.date_of_birth IS NULL THEN NULL
      ELSE DATE_PART('year', AGE(m.date_of_birth))::INT
    END AS age
  FROM members m
  WHERE m.id = ANY(member_ids);
$$;

REVOKE ALL ON FUNCTION get_member_names(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_member_names(UUID[]) TO authenticated;
