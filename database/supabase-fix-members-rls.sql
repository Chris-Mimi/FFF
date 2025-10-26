-- Fix Members Table RLS Policies - Remove Infinite Recursion
-- Execute in Supabase SQL Editor

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Members can view own profile" ON members;
DROP POLICY IF EXISTS "Members can update own profile" ON members;
DROP POLICY IF EXISTS "Public can register" ON members;

-- Create simplified policies without recursion

-- Policy 1: Members can view their own profile only
CREATE POLICY "Members can view own profile"
  ON members FOR SELECT
  USING (auth.uid() = id);

-- Policy 2: Members can update their own profile
CREATE POLICY "Members can update own profile"
  ON members FOR UPDATE
  USING (auth.uid() = id);

-- Policy 3: Public can register (insert with pending status)
CREATE POLICY "Public can register"
  ON members FOR INSERT
  WITH CHECK (status = 'pending');

-- Policy 4: Coaches can view all members (temporary - using user_metadata check)
-- TODO: Replace with proper role-based check when coach role system is implemented
CREATE POLICY "Coaches can view all members"
  ON members FOR SELECT
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'coach'
  );

-- Policy 5: Service role can do everything (for API endpoints)
-- This is handled automatically by service_role key, no policy needed
