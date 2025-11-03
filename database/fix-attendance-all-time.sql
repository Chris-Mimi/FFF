-- Fix attendance function to handle NULL for "All Time" attendance
-- This allows counting all confirmed bookings without date filtering

CREATE OR REPLACE FUNCTION get_member_attendance_count(
  p_member_id UUID,
  p_days_back INTEGER DEFAULT 7
)
RETURNS INTEGER AS $$
BEGIN
  -- If p_days_back is NULL, count all confirmed bookings (no date filter)
  IF p_days_back IS NULL THEN
    RETURN (
      SELECT COUNT(*)
      FROM bookings b
      JOIN weekly_sessions ws ON b.session_id = ws.id
      WHERE b.member_id = p_member_id
      AND b.status = 'confirmed'
    );
  -- Otherwise, apply date filter
  ELSE
    RETURN (
      SELECT COUNT(*)
      FROM bookings b
      JOIN weekly_sessions ws ON b.session_id = ws.id
      WHERE b.member_id = p_member_id
      AND b.status = 'confirmed'
      AND ws.date >= CURRENT_DATE - (p_days_back || ' days')::INTERVAL
      AND ws.date <= CURRENT_DATE
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_member_attendance_count(UUID, INTEGER) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_member_attendance_count(UUID, INTEGER) IS 'Counts confirmed bookings for a member within the last N days. Pass NULL for all-time count.';
