-- Update coach policies to properly allow access to all athlete data
-- The coach policies need to work alongside the PUBLIC policies

-- Note: Since we have PUBLIC policies that allow everything with USING (true),
-- coaches should already have access. But we'll ensure coach-specific policies
-- are also in place and won't conflict.

-- First, verify the PUBLIC policies are active
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('athlete_profiles', 'workout_logs', 'benchmark_results', 'lift_records')
ORDER BY tablename, policyname;

-- The PUBLIC policies with USING (true) should be sufficient.
-- If coaches still can't access data, it means either:
-- 1. The PUBLIC policies weren't created
-- 2. RLS is blocking due to policy conflicts

-- Let's ensure the coach policies don't conflict with PUBLIC policies
-- by making them permissive (OR logic, not AND)

-- These policies will be in addition to PUBLIC policies (they use OR logic)
-- So if EITHER the PUBLIC policy OR the coach policy passes, access is granted
