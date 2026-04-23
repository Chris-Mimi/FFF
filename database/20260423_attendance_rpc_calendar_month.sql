-- Session 306 follow-up: add optional p_start_date / p_end_date to
-- get_all_members_attendance so Admin Tools can show calendar-month
-- attendance (not just rolling-window lookback).
--
-- Backward compatible: existing callers passing only (p_member_ids, p_days_back)
-- via Supabase named-arg RPC continue to work — start/end default NULL and
-- the days_back path runs.
--
-- When p_start_date is provided it takes priority over p_days_back.
-- p_end_date defaults to CURRENT_DATE.

DROP FUNCTION IF EXISTS get_all_members_attendance(UUID[], INTEGER);

CREATE OR REPLACE FUNCTION get_all_members_attendance(
  p_member_ids UUID[],
  p_days_back INTEGER DEFAULT 30,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(member_id UUID, attendance_count BIGINT) AS $$
DECLARE
  v_end DATE := COALESCE(p_end_date, CURRENT_DATE);
BEGIN
  RETURN QUERY
  WITH attended AS (
    -- 1. Confirmed bookings
    SELECT b.member_id, ws.id AS session_id
    FROM bookings b
    JOIN weekly_sessions ws ON b.session_id = ws.id
    WHERE b.member_id = ANY(p_member_ids)
      AND b.status = 'confirmed'
      AND ws.date <= v_end
      AND (
        (p_start_date IS NOT NULL AND ws.date >= p_start_date)
        OR
        (p_start_date IS NULL AND (p_days_back IS NULL OR ws.date >= CURRENT_DATE - (p_days_back || ' days')::INTERVAL))
      )

    UNION

    -- 2. Structured score rows linked to member
    SELECT wsr.member_id, ws.id AS session_id
    FROM wod_section_results wsr
    JOIN weekly_sessions ws ON ws.workout_id = wsr.wod_id
    WHERE wsr.member_id = ANY(p_member_ids)
      AND wsr.member_id IS NOT NULL
      AND ws.date <= v_end
      AND (
        (p_start_date IS NOT NULL AND ws.date >= p_start_date)
        OR
        (p_start_date IS NULL AND (p_days_back IS NULL OR ws.date >= CURRENT_DATE - (p_days_back || ' days')::INTERVAL))
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
      AND ws.date <= v_end
      AND (
        (p_start_date IS NOT NULL AND ws.date >= p_start_date)
        OR
        (p_start_date IS NULL AND (p_days_back IS NULL OR ws.date >= CURRENT_DATE - (p_days_back || ' days')::INTERVAL))
      )
  )
  SELECT a.member_id, COUNT(DISTINCT a.session_id)::BIGINT AS attendance_count
  FROM attended a
  GROUP BY a.member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_all_members_attendance(UUID[], INTEGER, DATE, DATE) TO authenticated;

COMMENT ON FUNCTION get_all_members_attendance(UUID[], INTEGER, DATE, DATE) IS
  'Batch attendance count per member. Counts distinct sessions from bookings, linked score rows, or whiteboard text mentions. Date scope: p_start_date/p_end_date if provided, else CURRENT_DATE-p_days_back to today.';
