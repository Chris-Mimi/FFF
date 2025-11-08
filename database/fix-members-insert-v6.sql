-- Fix members INSERT policies - Remove auth.uid() check entirely
-- Run this in Supabase SQL Editor
-- Date: 2025-11-08
--
-- THEORY: auth.uid() might error when called as anon, causing policy to fail
-- FIX: Don't check auth.uid() at all - just check status and account_type

-- Drop existing INSERT policies
DROP POLICY IF EXISTS "Public can register" ON members;
DROP POLICY IF EXISTS "Users can add family members" ON members;

-- SIMPLE REGISTRATION: Just check status='pending' and account_type='primary'
-- This policy allows anyone (including anon) to insert pending primary accounts
CREATE POLICY "Public can register"
  ON members
  FOR INSERT
  WITH CHECK (
    status = 'pending' AND
    account_type = 'primary'
  );

-- AUTHENTICATED FAMILY MEMBERS: Requires auth.uid() to match
CREATE POLICY "Users can add family members"
  ON members
  FOR INSERT
  WITH CHECK (
    account_type = 'family_member' AND
    auth.uid() IS NOT NULL AND
    auth.uid() = primary_member_id
  );

-- Verify
SELECT policyname, cmd, roles, with_check
FROM pg_policies
WHERE tablename = 'members' AND cmd = 'INSERT'
ORDER BY policyname;

-- Test as anon
SET ROLE anon;
INSERT INTO members (email, name, status, account_type, relationship, display_name)
VALUES ('test-simple@example.com', 'Simple Test', 'pending', 'primary', 'self', 'Simple Test')
RETURNING id, email, status;
RESET ROLE;

-- Cleanup
DELETE FROM members WHERE email = 'test-simple@example.com';

SELECT 'SUCCESS: Simple policy works!' as result;
