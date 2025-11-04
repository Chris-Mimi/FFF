-- Migration: Add Family Account Support to Members Table
-- Date: 2025-11-04
-- Description: Extends members table to support family member profiles
--              Primary member = auth account holder
--              Family members = sub-profiles without auth (kids, spouse, etc.)

-- ============================================
-- STEP 1: Add new columns to members table
-- ============================================

-- account_type: Distinguishes primary account holder from family members
ALTER TABLE members
ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'primary' CHECK (account_type IN ('primary', 'family_member'));

-- primary_member_id: Links family members to their primary account holder
ALTER TABLE members
ADD COLUMN IF NOT EXISTS primary_member_id UUID REFERENCES members(id) ON DELETE CASCADE;

-- display_name: User-friendly name (can differ from auth full_name)
ALTER TABLE members
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- date_of_birth: Optional, useful for age-based workout scaling
ALTER TABLE members
ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- relationship: Optional, tracks family relationship
ALTER TABLE members
ADD COLUMN IF NOT EXISTS relationship TEXT CHECK (relationship IN ('self', 'spouse', 'child', 'other'));

-- ============================================
-- STEP 2: Backfill existing members
-- ============================================

-- Set all existing members as 'primary' accounts
UPDATE members
SET
  account_type = 'primary',
  display_name = COALESCE(name, email),
  relationship = 'self'
WHERE account_type IS NULL;

-- ============================================
-- STEP 3: Add constraints
-- ============================================

-- Primary members cannot have a primary_member_id (they ARE the primary)
ALTER TABLE members
ADD CONSTRAINT primary_member_no_parent
CHECK (
  (account_type = 'primary' AND primary_member_id IS NULL) OR
  (account_type = 'family_member' AND primary_member_id IS NOT NULL)
);

-- Family members must have a display_name
ALTER TABLE members
ADD CONSTRAINT family_member_has_name
CHECK (
  (account_type = 'primary') OR
  (account_type = 'family_member' AND display_name IS NOT NULL)
);

-- ============================================
-- STEP 4: Create indexes for performance
-- ============================================

-- Index for looking up family members by primary account
CREATE INDEX IF NOT EXISTS idx_members_primary_member_id
ON members(primary_member_id)
WHERE primary_member_id IS NOT NULL;

-- Index for account type filtering
CREATE INDEX IF NOT EXISTS idx_members_account_type
ON members(account_type);

-- ============================================
-- STEP 5: Update RLS policies
-- ============================================

-- Allow users to view their own family members
DROP POLICY IF EXISTS "Users can view their family members" ON members;
CREATE POLICY "Users can view their family members"
ON members FOR SELECT
USING (
  auth.uid() = id OR
  auth.uid() = primary_member_id
);

-- Allow users to insert family members under their account
DROP POLICY IF EXISTS "Users can add family members" ON members;
CREATE POLICY "Users can add family members"
ON members FOR INSERT
WITH CHECK (
  account_type = 'family_member' AND
  auth.uid() = primary_member_id
);

-- Allow users to update their own family members
DROP POLICY IF EXISTS "Users can update their family members" ON members;
CREATE POLICY "Users can update their family members"
ON members FOR UPDATE
USING (
  auth.uid() = id OR
  auth.uid() = primary_member_id
);

-- Allow users to delete their own family members
DROP POLICY IF EXISTS "Users can delete their family members" ON members;
CREATE POLICY "Users can delete their family members"
ON members FOR DELETE
USING (
  auth.uid() = primary_member_id AND
  account_type = 'family_member'
);

-- ============================================
-- STEP 6: Helper function for subscription check
-- ============================================

-- Function to get primary member's subscription status (for family members)
CREATE OR REPLACE FUNCTION get_primary_subscription_status(member_uuid UUID)
RETURNS TABLE (
  subscription_status TEXT,
  subscription_end TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  member_record RECORD;
  primary_record RECORD;
BEGIN
  -- Get the member
  SELECT * INTO member_record FROM members WHERE id = member_uuid;

  -- If primary member, return their own subscription
  IF member_record.account_type = 'primary' THEN
    RETURN QUERY
    SELECT
      member_record.athlete_subscription_status,
      member_record.athlete_subscription_end;

  -- If family member, return primary member's subscription
  ELSIF member_record.account_type = 'family_member' THEN
    SELECT * INTO primary_record
    FROM members
    WHERE id = member_record.primary_member_id;

    RETURN QUERY
    SELECT
      primary_record.athlete_subscription_status,
      primary_record.athlete_subscription_end;
  END IF;
END;
$$;

-- ============================================
-- STEP 7: Verification queries
-- ============================================

-- Run these after migration to verify:

-- 1. Check all existing members are now 'primary'
-- SELECT id, email, account_type, display_name FROM members WHERE account_type = 'primary';

-- 2. Verify constraints work (should fail)
-- INSERT INTO members (id, email, account_type) VALUES (gen_random_uuid(), 'test@test.com', 'invalid_type');

-- 3. Test family member constraint (should fail - no primary_member_id)
-- INSERT INTO members (id, account_type) VALUES (gen_random_uuid(), 'family_member');

COMMENT ON COLUMN members.account_type IS 'Type of account: primary (auth user) or family_member (sub-profile)';
COMMENT ON COLUMN members.primary_member_id IS 'For family members: links to the primary account holder';
COMMENT ON COLUMN members.display_name IS 'Display name for UI (e.g., "Emma", "Chris Jr.")';
COMMENT ON COLUMN members.date_of_birth IS 'Optional: used for age-based workout recommendations';
COMMENT ON COLUMN members.relationship IS 'Relationship to primary member: self, spouse, child, other';
