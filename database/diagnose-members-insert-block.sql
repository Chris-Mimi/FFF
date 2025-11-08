-- Comprehensive Diagnostics for Members Table INSERT Blocking
-- Run in Supabase SQL Editor to identify root cause
-- Date: 2025-11-08 (Session 2)

-- ============================================
-- PART 1: Check for TRIGGERS on members table
-- ============================================
SELECT
  tgname AS trigger_name,
  tgtype AS trigger_type,
  tgenabled AS enabled,
  proname AS function_name,
  prosrc AS function_source
FROM pg_trigger
JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
WHERE tgrelid = 'members'::regclass
ORDER BY tgname;

-- Expected: Should be empty or only show system triggers
-- Red flag: Any BEFORE INSERT triggers

-- ============================================
-- PART 2: Check GRANT permissions for anon role
-- ============================================
SELECT
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants
WHERE table_name = 'members'
  AND grantee IN ('anon', 'authenticated', 'postgres', 'service_role')
ORDER BY grantee, privilege_type;

-- Expected: anon should have INSERT privilege
-- Red flag: If anon is missing INSERT grant

-- ============================================
-- PART 3: Check table ownership and schema
-- ============================================
SELECT
  schemaname,
  tablename,
  tableowner,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename = 'members';

-- Expected: owner = postgres, rls_enabled = true

-- ============================================
-- PART 4: Check for RESTRICTIVE policies (again)
-- ============================================
SELECT
  policyname,
  permissive AS is_permissive,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'members'
ORDER BY cmd, policyname;

-- Expected: All policies should have permissive = 'PERMISSIVE'
-- Red flag: Any policy with permissive = 'RESTRICTIVE'

-- ============================================
-- PART 5: Check column-level security
-- ============================================
SELECT
  column_name,
  is_nullable,
  column_default,
  data_type
FROM information_schema.columns
WHERE table_name = 'members'
  AND column_name IN ('id', 'email', 'name', 'status', 'account_type')
ORDER BY ordinal_position;

-- Check for any security-related column constraints

-- ============================================
-- PART 6: Check for foreign key constraints
-- ============================================
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'members'
ORDER BY tc.constraint_type, tc.constraint_name;

-- Check for any FK constraints that might require special handling

-- ============================================
-- PART 7: Test actual permissions with SET ROLE
-- ============================================

-- Test 1: Check current role
SELECT current_user, session_user, current_role;

-- Test 2: Switch to anon and check permissions
SET ROLE anon;

-- Check what operations anon can perform
SELECT
  has_table_privilege('anon', 'members', 'SELECT') AS can_select,
  has_table_privilege('anon', 'members', 'INSERT') AS can_insert,
  has_table_privilege('anon', 'members', 'UPDATE') AS can_update,
  has_table_privilege('anon', 'members', 'DELETE') AS can_delete;

-- Check RLS evaluation context
SELECT
  current_user AS role,
  auth.role() AS auth_role,
  auth.uid() AS auth_uid;

-- Reset role
RESET ROLE;

-- ============================================
-- PART 8: Check for schema-level restrictions
-- ============================================
SELECT
  nspname AS schema_name,
  nspowner::regrole AS schema_owner
FROM pg_namespace
WHERE nspname = 'public';

-- Check schema privileges
SELECT
  nspacl AS schema_acl
FROM pg_namespace
WHERE nspname = 'public';

-- ============================================
-- SUMMARY CHECKLIST
-- ============================================
--
-- ✓ Part 1: No blocking BEFORE INSERT triggers
-- ✓ Part 2: anon has INSERT grant
-- ✓ Part 3: Table owned by postgres, RLS enabled
-- ✓ Part 4: All policies are PERMISSIVE
-- ✓ Part 5: No unusual column constraints
-- ✓ Part 6: FK constraints don't block INSERT
-- ✓ Part 7: anon role can INSERT (has_table_privilege = true)
-- ✓ Part 8: anon has USAGE on public schema
--
-- If ALL checks pass but INSERT still fails:
--   → Issue is likely Supabase-specific configuration
--   → Solution: Use Edge Function with service role
