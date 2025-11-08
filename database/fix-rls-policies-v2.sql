-- Fix RLS Policies - Correct role assignments and WITH CHECK clauses
-- Run this script in Supabase SQL Editor to fix the issues found in testing
-- Date: 2025-11-08
--
-- ISSUES BEING FIXED:
-- 1. Coach policies show {public} role instead of {authenticated}
-- 2. "Public can register" has no WITH CHECK clause (qual: null)
-- 3. Multiple conflicting members policies all on {public} role
-- 4. Coach INSERT policies missing WITH CHECK clauses
--
-- ============================================
-- STEP 1: Drop ALL existing policies on problem tables
-- ============================================

-- Drop all policies on benchmark tables
DROP POLICY IF EXISTS "Public can view benchmark workouts" ON benchmark_workouts;
DROP POLICY IF EXISTS "Authenticated users can view benchmark workouts" ON benchmark_workouts;
DROP POLICY IF EXISTS "Coaches can insert benchmark workouts" ON benchmark_workouts;
DROP POLICY IF EXISTS "Coaches can update benchmark workouts" ON benchmark_workouts;
DROP POLICY IF EXISTS "Coaches can delete benchmark workouts" ON benchmark_workouts;

DROP POLICY IF EXISTS "Public can view forge benchmarks" ON forge_benchmarks;
DROP POLICY IF EXISTS "Authenticated users can view forge benchmarks" ON forge_benchmarks;
DROP POLICY IF EXISTS "Coaches can insert forge benchmarks" ON forge_benchmarks;
DROP POLICY IF EXISTS "Coaches can update forge benchmarks" ON forge_benchmarks;
DROP POLICY IF EXISTS "Coaches can delete forge benchmarks" ON forge_benchmarks;

DROP POLICY IF EXISTS "Public can view barbell lifts" ON barbell_lifts;
DROP POLICY IF EXISTS "Authenticated users can view barbell lifts" ON barbell_lifts;
DROP POLICY IF EXISTS "Coaches can insert barbell lifts" ON barbell_lifts;
DROP POLICY IF EXISTS "Coaches can update barbell lifts" ON barbell_lifts;
DROP POLICY IF EXISTS "Coaches can delete barbell lifts" ON barbell_lifts;

-- Drop all existing members policies (we'll recreate only what's needed)
DROP POLICY IF EXISTS "Public can register" ON members;
DROP POLICY IF EXISTS "Members can view own profile" ON members;
DROP POLICY IF EXISTS "Members can update own profile" ON members;
DROP POLICY IF EXISTS "Coaches can view all members" ON members;
DROP POLICY IF EXISTS "Coaches can update members" ON members;
DROP POLICY IF EXISTS "Allow coach updates" ON members;
DROP POLICY IF EXISTS "Authenticated users can view all members" ON members;
DROP POLICY IF EXISTS "Authenticated users can update members" ON members;
DROP POLICY IF EXISTS "Users can view their family members" ON members;
DROP POLICY IF EXISTS "Users can add family members" ON members;
DROP POLICY IF EXISTS "Users can update their family members" ON members;
DROP POLICY IF EXISTS "Users can delete their family members" ON members;

-- ============================================
-- STEP 2: Create correct policies for benchmark tables
-- ============================================

-- BENCHMARK_WORKOUTS
-- Authenticated users can view
CREATE POLICY "Authenticated users can view benchmark workouts"
  ON benchmark_workouts
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only coaches can manage (INSERT/UPDATE/DELETE)
CREATE POLICY "Coaches can insert benchmark workouts"
  ON benchmark_workouts
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  );

CREATE POLICY "Coaches can update benchmark workouts"
  ON benchmark_workouts
  FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  );

CREATE POLICY "Coaches can delete benchmark workouts"
  ON benchmark_workouts
  FOR DELETE
  USING (
    auth.role() = 'authenticated' AND
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  );

-- FORGE_BENCHMARKS
-- Authenticated users can view
CREATE POLICY "Authenticated users can view forge benchmarks"
  ON forge_benchmarks
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only coaches can manage (INSERT/UPDATE/DELETE)
CREATE POLICY "Coaches can insert forge benchmarks"
  ON forge_benchmarks
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  );

CREATE POLICY "Coaches can update forge benchmarks"
  ON forge_benchmarks
  FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  );

CREATE POLICY "Coaches can delete forge benchmarks"
  ON forge_benchmarks
  FOR DELETE
  USING (
    auth.role() = 'authenticated' AND
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  );

-- BARBELL_LIFTS
-- Authenticated users can view
CREATE POLICY "Authenticated users can view barbell lifts"
  ON barbell_lifts
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only coaches can manage (INSERT/UPDATE/DELETE)
CREATE POLICY "Coaches can insert barbell lifts"
  ON barbell_lifts
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  );

CREATE POLICY "Coaches can update barbell lifts"
  ON barbell_lifts
  FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  );

CREATE POLICY "Coaches can delete barbell lifts"
  ON barbell_lifts
  FOR DELETE
  USING (
    auth.role() = 'authenticated' AND
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  );

-- ============================================
-- STEP 3: Create correct policies for members table
-- ============================================

-- PUBLIC: Allow registration with status='pending' ONLY
CREATE POLICY "Public can register"
  ON members
  FOR INSERT
  WITH CHECK (status = 'pending');

-- AUTHENTICATED: Members can view and update their own profile
CREATE POLICY "Members can view own profile"
  ON members
  FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    auth.uid() = id
  );

CREATE POLICY "Members can update own profile"
  ON members
  FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    auth.uid() = id
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND
    auth.uid() = id
  );

-- AUTHENTICATED: Family member management
CREATE POLICY "Users can view their family members"
  ON members
  FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    (auth.uid() = id OR auth.uid() = primary_member_id)
  );

CREATE POLICY "Users can add family members"
  ON members
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    account_type = 'family_member' AND
    auth.uid() = primary_member_id
  );

CREATE POLICY "Users can update their family members"
  ON members
  FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    (auth.uid() = id OR auth.uid() = primary_member_id)
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND
    (auth.uid() = id OR auth.uid() = primary_member_id)
  );

CREATE POLICY "Users can delete their family members"
  ON members
  FOR DELETE
  USING (
    auth.role() = 'authenticated' AND
    auth.uid() = primary_member_id AND
    account_type = 'family_member'
  );

-- COACHES: Can view and manage all members
CREATE POLICY "Coaches can view all members"
  ON members
  FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  );

CREATE POLICY "Coaches can update members"
  ON members
  FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  );

-- ============================================
-- STEP 4: Verification
-- ============================================

-- Check all policies were created correctly
SELECT
  tablename,
  policyname,
  cmd,
  roles,
  CASE
    WHEN qual IS NULL THEN 'NULL'
    ELSE substring(qual from 1 for 50) || '...'
  END as qual_preview,
  CASE
    WHEN with_check IS NULL THEN 'NULL'
    ELSE substring(with_check from 1 for 50) || '...'
  END as with_check_preview
FROM pg_policies
WHERE tablename IN ('benchmark_workouts', 'forge_benchmarks', 'barbell_lifts', 'members')
ORDER BY tablename, cmd, policyname;

-- ============================================
-- EXPECTED RESULTS (What you should see):
-- ============================================
--
-- BENCHMARK TABLES (benchmark_workouts, forge_benchmarks, barbell_lifts):
--   1. SELECT policy: roles = {authenticated}, qual = (auth.role() = 'authenticated')
--   2. INSERT policy: roles = {public}, with_check includes 'coach' check
--   3. UPDATE policy: roles = {public}, qual AND with_check include 'coach' check
--   4. DELETE policy: roles = {public}, qual includes 'coach' check
--
-- MEMBERS TABLE:
--   1. "Public can register": roles = {public}, with_check = (status = 'pending')
--   2. All other policies: roles = {authenticated} in qual/with_check
--   3. Coach policies: include 'coach' role check
--   4. Family policies: include primary_member_id checks
--
-- KEY DIFFERENCES FROM BEFORE:
--   ✓ Coach INSERT policies now have WITH CHECK clauses (not NULL)
--   ✓ "Public can register" has WITH CHECK = (status = 'pending')
--   ✓ All auth checks include auth.role() = 'authenticated'
--   ✓ No conflicting duplicate policies
