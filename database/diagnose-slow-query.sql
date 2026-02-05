-- Run this to see what's actually slow
-- This will show you the query execution plan

-- Test 1: Check if indexes exist and are being used
EXPLAIN ANALYZE
SELECT id, date, time, capacity, status, workout_id
FROM weekly_sessions
WHERE date >= '2024-12-06' AND date <= '2025-04-06'
ORDER BY date ASC, time ASC;

-- Test 2: Check bookings query with session IDs
EXPLAIN ANALYZE
SELECT session_id, status
FROM bookings
WHERE session_id IN (
  SELECT id FROM weekly_sessions
  WHERE date >= '2024-12-06' AND date <= '2025-04-06'
);

-- Test 3: Check the nested wods query (this might be the killer)
EXPLAIN ANALYZE
SELECT
  ws.id,
  ws.date,
  ws.time,
  w.id as wod_id,
  w.sections
FROM weekly_sessions ws
LEFT JOIN wods w ON ws.workout_id = w.id
WHERE ws.date >= '2024-12-06' AND ws.date <= '2025-04-06'
ORDER BY ws.date ASC, ws.time ASC;

-- Test 4: Check table sizes
SELECT
  'weekly_sessions' as table_name,
  COUNT(*) as row_count,
  pg_size_pretty(pg_total_relation_size('weekly_sessions')) as total_size
FROM weekly_sessions
UNION ALL
SELECT
  'bookings',
  COUNT(*),
  pg_size_pretty(pg_total_relation_size('bookings'))
FROM bookings
UNION ALL
SELECT
  'wods',
  COUNT(*),
  pg_size_pretty(pg_total_relation_size('wods'))
FROM wods;
