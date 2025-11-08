-- Check for FORCE RLS and all restrictive policies
-- Run this in Supabase SQL Editor

-- Check if FORCE ROW LEVEL SECURITY is enabled
SELECT
  n.nspname as schema,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'members';

-- Check for ANY restrictive policies (vs permissive)
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'members'
  AND permissive = 'RESTRICTIVE'
ORDER BY policyname;

-- Show me ALL policies that apply to INSERT for the anon role
SELECT
  policyname,
  cmd,
  roles,
  permissive,
  with_check
FROM pg_policies
WHERE tablename = 'members'
  AND (roles @> ARRAY['anon']::name[] OR roles @> ARRAY['public']::name[])
ORDER BY cmd, policyname;
