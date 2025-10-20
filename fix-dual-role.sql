-- Fix user roles to allow dual coach/athlete access
-- This script will help you see your current role and fix it if needed

-- 1. First, check all users and their current roles
SELECT
  id,
  email,
  raw_user_meta_data->>'role' as current_role,
  raw_user_meta_data->>'full_name' as full_name,
  created_at
FROM auth.users
ORDER BY created_at DESC;

-- 2. If you need to update YOUR role back to 'coach', run this:
-- (Replace 'your.email@example.com' with your actual email)
-- UPDATE auth.users
-- SET raw_user_meta_data = jsonb_set(
--   COALESCE(raw_user_meta_data, '{}'::jsonb),
--   '{role}',
--   '"coach"'
-- )
-- WHERE email = 'your.email@example.com';

-- 3. Or, to see ONLY your user:
-- SELECT
--   id,
--   email,
--   raw_user_meta_data->>'role' as role,
--   raw_user_meta_data
-- FROM auth.users
-- WHERE email = 'your.email@example.com';

-- 4. To allow a user to be BOTH coach and athlete, you could add a separate field:
-- UPDATE auth.users
-- SET raw_user_meta_data = jsonb_set(
--   COALESCE(raw_user_meta_data, '{}'::jsonb),
--   '{is_athlete}',
--   'true'
-- )
-- WHERE email = 'your.email@example.com';
