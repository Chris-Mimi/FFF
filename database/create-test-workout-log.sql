-- Create a test workout log entry for your athlete account

-- First, find your athlete user ID and a WOD to log
SELECT
  u.id as user_id,
  u.email,
  w.id as wod_id,
  w.title,
  w.date
FROM auth.users u
CROSS JOIN wods w
WHERE u.email = 'chris@the-forge-functional-fitness.de'
  AND w.date <= CURRENT_DATE
ORDER BY w.date DESC
LIMIT 5;

-- Then insert a workout log (replace the IDs with values from above)
-- INSERT INTO workout_logs (user_id, wod_id, workout_date, result, notes, created_at, updated_at)
-- VALUES (
--   'YOUR_ATHLETE_USER_ID',
--   'A_WOD_ID_FROM_ABOVE',
--   '2025-10-17',  -- The date you did the workout
--   '15:32 Rx',    -- Your result
--   'Felt good, scaled the weight on kettlebell swings',  -- Optional notes
--   NOW(),
--   NOW()
-- );

-- Or use this to automatically create one with the most recent WOD:
INSERT INTO workout_logs (user_id, wod_id, workout_date, result, notes, created_at, updated_at)
SELECT
  u.id,
  w.id,
  w.date,
  'Completed Rx',
  'Test workout log entry',
  NOW(),
  NOW()
FROM auth.users u
CROSS JOIN LATERAL (
  SELECT id, date
  FROM wods
  WHERE date <= CURRENT_DATE
  ORDER BY date DESC
  LIMIT 1
) w
WHERE u.email = 'chris@the-forge-functional-fitness.de';
