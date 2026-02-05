-- Check if critical indexes exist
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('weekly_sessions', 'bookings', 'members', 'wods')
ORDER BY tablename, indexname;

-- Also check table sizes to understand scale
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND tablename IN ('weekly_sessions', 'bookings', 'members', 'wods')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
