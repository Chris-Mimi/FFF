-- Create athlete profile for the current user
-- Replace 'YOUR_USER_ID' with your actual auth.users ID
-- You can find your user ID by running: SELECT id, email FROM auth.users;

-- First, check your user ID
SELECT id, email, raw_user_meta_data->>'role' as role
FROM auth.users
WHERE raw_user_meta_data->>'role' = 'athlete'
   OR email = 'chris@example.com'; -- Replace with your email

-- Then create the athlete profile (replace the user_id value)
-- INSERT INTO athlete_profiles (user_id, full_name, email, created_at, updated_at)
-- VALUES (
--   'YOUR_USER_ID_HERE',
--   'Your Full Name',
--   'your.email@example.com',
--   NOW(),
--   NOW()
-- );

-- Or, automatically create profiles for all athletes without one:
INSERT INTO athlete_profiles (user_id, full_name, email, created_at, updated_at)
SELECT
  u.id,
  u.raw_user_meta_data->>'full_name' as full_name,
  u.email,
  NOW(),
  NOW()
FROM auth.users u
LEFT JOIN athlete_profiles ap ON ap.user_id = u.id
WHERE ap.id IS NULL
  AND (u.raw_user_meta_data->>'role' = 'athlete' OR u.raw_user_meta_data->>'role' IS NULL);
