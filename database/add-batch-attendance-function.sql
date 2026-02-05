-- Add batch attendance function to eliminate N+1 queries
-- This fetches attendance counts for ALL members in one query

CREATE OR REPLACE FUNCTION get_all_members_attendance(
  p_member_ids UUID[],
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE(member_id UUID, attendance_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.member_id,
    COUNT(*)::BIGINT as attendance_count
  FROM bookings b
  JOIN weekly_sessions ws ON b.session_id = ws.id
  WHERE b.member_id = ANY(p_member_ids)
    AND b.status = 'confirmed'
    AND (
      p_days_back IS NULL
      OR ws.date >= CURRENT_DATE - (p_days_back || ' days')::INTERVAL
    )
    AND ws.date <= CURRENT_DATE
  GROUP BY b.member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_all_members_attendance(UUID[], INTEGER) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_all_members_attendance(UUID[], INTEGER) IS 'Batch fetch attendance counts for multiple members (eliminates N+1 queries)';
