-- Update attendance RPCs to ALSO count sessions where member's whiteboard_name
-- appears as free text in the Whiteboard Intro section content (session 284).
--
-- Background: coaches record attendance by typing names in the Whiteboard Intro
-- section content. For pre-launch members this is often the only record —
-- there's no booking and no structured wod_section_results row.
--
-- Matching uses POSIX word boundaries (\y) so "Paul" won't match "Paula" or
-- "Pauline". Case-insensitive via ~*.

CREATE OR REPLACE FUNCTION get_all_members_attendance(
  p_member_ids UUID[],
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE(member_id UUID, attendance_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  WITH attended AS (
    -- 1. Confirmed bookings
    SELECT b.member_id, ws.id AS session_id
    FROM bookings b
    JOIN weekly_sessions ws ON b.session_id = ws.id
    WHERE b.member_id = ANY(p_member_ids)
      AND b.status = 'confirmed'
      AND ws.date <= CURRENT_DATE
      AND (
        p_days_back IS NULL
        OR ws.date >= CURRENT_DATE - (p_days_back || ' days')::INTERVAL
      )

    UNION

    -- 2. Structured score rows linked to member
    SELECT wsr.member_id, ws.id AS session_id
    FROM wod_section_results wsr
    JOIN weekly_sessions ws ON ws.workout_id = wsr.wod_id
    WHERE wsr.member_id = ANY(p_member_ids)
      AND wsr.member_id IS NOT NULL
      AND ws.date <= CURRENT_DATE
      AND (
        p_days_back IS NULL
        OR ws.date >= CURRENT_DATE - (p_days_back || ' days')::INTERVAL
      )

    UNION

    -- 3. Whiteboard Intro section text mentions the member's whiteboard_name
    SELECT m.id AS member_id, ws.id AS session_id
    FROM members m
    JOIN wods w ON w.sections::text ~* ('\y' || m.whiteboard_name || '\y')
    JOIN weekly_sessions ws ON ws.workout_id = w.id
    WHERE m.id = ANY(p_member_ids)
      AND m.whiteboard_name IS NOT NULL
      AND m.whiteboard_name <> ''
      AND ws.date <= CURRENT_DATE
      AND (
        p_days_back IS NULL
        OR ws.date >= CURRENT_DATE - (p_days_back || ' days')::INTERVAL
      )
  )
  SELECT a.member_id, COUNT(DISTINCT a.session_id)::BIGINT AS attendance_count
  FROM attended a
  GROUP BY a.member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_all_members_attendance(UUID[], INTEGER) TO authenticated;

COMMENT ON FUNCTION get_all_members_attendance(UUID[], INTEGER) IS
  'Batch attendance count per member. Counts distinct sessions from bookings, linked score rows, or whiteboard text mentions.';


CREATE OR REPLACE FUNCTION get_members_last_attendance(
  p_member_ids UUID[]
)
RETURNS TABLE(member_id UUID, last_attendance_date DATE) AS $$
BEGIN
  RETURN QUERY
  WITH attended AS (
    SELECT b.member_id, ws.date
    FROM bookings b
    JOIN weekly_sessions ws ON b.session_id = ws.id
    WHERE b.member_id = ANY(p_member_ids)
      AND b.status = 'confirmed'
      AND ws.date <= CURRENT_DATE

    UNION

    SELECT wsr.member_id, ws.date
    FROM wod_section_results wsr
    JOIN weekly_sessions ws ON ws.workout_id = wsr.wod_id
    WHERE wsr.member_id = ANY(p_member_ids)
      AND wsr.member_id IS NOT NULL
      AND ws.date <= CURRENT_DATE

    UNION

    SELECT m.id AS member_id, ws.date
    FROM members m
    JOIN wods w ON w.sections::text ~* ('\y' || m.whiteboard_name || '\y')
    JOIN weekly_sessions ws ON ws.workout_id = w.id
    WHERE m.id = ANY(p_member_ids)
      AND m.whiteboard_name IS NOT NULL
      AND m.whiteboard_name <> ''
      AND ws.date <= CURRENT_DATE
  )
  SELECT a.member_id, MAX(a.date) AS last_attendance_date
  FROM attended a
  GROUP BY a.member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_members_last_attendance(UUID[]) TO authenticated;

COMMENT ON FUNCTION get_members_last_attendance(UUID[]) IS
  'Last attendance date per member from bookings, linked score rows, or whiteboard text mentions.';
