-- Migration: Link existing athlete data to a demo user account
-- This script creates a demo user and links all existing NULL user_id records to it
-- Run this AFTER creating your first real user account through the signup page

-- INSTRUCTIONS:
-- 1. First, create a demo user account through the signup page (e.g., demo@theforge.com)
-- 2. Copy the user's UUID from the auth.users table
-- 3. Replace 'YOUR_DEMO_USER_UUID_HERE' below with the actual UUID
-- 4. Run this migration in your Supabase SQL editor

-- Example query to find your demo user's UUID:
-- SELECT id, email FROM auth.users WHERE email = 'demo@theforge.com';

-- Replace this with your actual demo user UUID
DO $$
DECLARE
  demo_user_id UUID := 'YOUR_DEMO_USER_UUID_HERE'; -- REPLACE THIS!
BEGIN
  -- Check if the demo_user_id exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = demo_user_id) THEN
    RAISE EXCEPTION 'Demo user UUID not found. Please create a user account first and update the demo_user_id variable.';
  END IF;

  -- Update athlete_profiles with NULL user_id
  UPDATE athlete_profiles
  SET user_id = demo_user_id
  WHERE user_id IS NULL;

  -- Update workout_logs with NULL user_id
  UPDATE workout_logs
  SET user_id = demo_user_id
  WHERE user_id IS NULL;

  -- Update benchmark_results with NULL user_id
  UPDATE benchmark_results
  SET user_id = demo_user_id
  WHERE user_id IS NULL;

  -- Update lift_records with NULL user_id
  UPDATE lift_records
  SET user_id = demo_user_id
  WHERE user_id IS NULL;

  -- Report what was updated
  RAISE NOTICE 'Migration complete! Linked existing data to demo user: %', demo_user_id;
END $$;

-- Verify the migration (optional - run after the above)
-- This will show you how many records are now linked to the demo user
/*
SELECT
  'athlete_profiles' as table_name,
  COUNT(*) as record_count
FROM athlete_profiles
WHERE user_id = 'YOUR_DEMO_USER_UUID_HERE'

UNION ALL

SELECT
  'workout_logs' as table_name,
  COUNT(*) as record_count
FROM workout_logs
WHERE user_id = 'YOUR_DEMO_USER_UUID_HERE'

UNION ALL

SELECT
  'benchmark_results' as table_name,
  COUNT(*) as record_count
FROM benchmark_results
WHERE user_id = 'YOUR_DEMO_USER_UUID_HERE'

UNION ALL

SELECT
  'lift_records' as table_name,
  COUNT(*) as record_count
FROM lift_records
WHERE user_id = 'YOUR_DEMO_USER_UUID_HERE';
*/
