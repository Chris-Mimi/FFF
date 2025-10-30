-- Add attendance tracking functions for member management

-- Function to count confirmed bookings for a member in a given timeframe
CREATE OR REPLACE FUNCTION get_member_attendance_count(
  p_member_id UUID,
  p_days_back INTEGER DEFAULT 7
)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM bookings b
    JOIN weekly_sessions ws ON b.session_id = ws.id
    WHERE b.member_id = p_member_id
    AND b.status = 'confirmed'
    AND ws.date >= CURRENT_DATE - (p_days_back || ' days')::INTERVAL
    AND ws.date <= CURRENT_DATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_member_attendance_count(UUID, INTEGER) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_member_attendance_count(UUID, INTEGER) IS 'Counts confirmed bookings for a member within the last N days';
