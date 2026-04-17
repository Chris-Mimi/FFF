-- Update attendance RPCs to count bookings OR linked score rows
-- Fixes: newly-registered athletes with pre-launch whiteboard scores
--        appearing as At-Risk / zero attendance (Session 282).
--
-- Both functions count DISTINCT session_id so a class with multiple scored
-- sections (strength + metcon) is counted once, and a class that has both
-- a booking and a score row is also counted once.

CREATE OR REPLACE FUNCTION get_all_members_attendance(
  p_member_ids UUID[],
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE(member_id UUID, attendance_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  WITH attended AS (
    -- Confirmed bookings
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

    -- Score rows linked to a class (covers pre-registration whiteboard history)
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
  )
  SELECT a.member_id, COUNT(DISTINCT a.session_id)::BIGINT AS attendance_count
  FROM attended a
  GROUP BY a.member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_all_members_attendance(UUID[], INTEGER) TO authenticated;

COMMENT ON FUNCTION get_all_members_attendance(UUID[], INTEGER) IS
  'Batch attendance count per member. Counts distinct sessions from bookings OR linked score rows.';


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
  )
  SELECT a.member_id, MAX(a.date) AS last_attendance_date
  FROM attended a
  GROUP BY a.member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_members_last_attendance(UUID[]) TO authenticated;

COMMENT ON FUNCTION get_members_last_attendance(UUID[]) IS
  'Last attendance date per member from bookings OR linked score rows.';
