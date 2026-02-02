-- Migration: Add Stripe subscriptions table and extend members table
-- Date: 2026-02-01
-- Purpose: Enable payment system for Athlete Login

-- ============================================
-- 0. Clean up any partial previous runs
-- ============================================

DROP FUNCTION IF EXISTS check_member_payment_access(UUID);
DROP TRIGGER IF EXISTS subscriptions_updated_at ON subscriptions;
DROP FUNCTION IF EXISTS update_subscriptions_updated_at();
DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Coaches can view all subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Coaches can manage subscriptions" ON subscriptions;
DROP TABLE IF EXISTS subscriptions;

-- ============================================
-- 1. Create subscriptions table
-- ============================================

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  plan_type TEXT CHECK (plan_type IN ('monthly', 'yearly')),
  status TEXT CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing')) DEFAULT 'active',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_subscriptions_member_id ON subscriptions(member_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);

-- ============================================
-- 2. Add new columns to members table
-- ============================================

-- Stripe customer ID for linking to Stripe
ALTER TABLE members ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- 10-card expiry date (optional - null means no expiry)
ALTER TABLE members ADD COLUMN IF NOT EXISTS ten_card_expiry_date TIMESTAMP WITH TIME ZONE;

-- Total sessions on 10-card (default 10, but could be different for special cards)
ALTER TABLE members ADD COLUMN IF NOT EXISTS ten_card_total INTEGER DEFAULT 10;

-- ============================================
-- 3. RLS Policies for subscriptions table
-- ============================================

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions (lookup via member's email matching auth email)
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.id = member_id
        AND m.email = auth.jwt() ->> 'email'
    )
  );

-- Coaches can view all subscriptions
CREATE POLICY "Coaches can view all subscriptions"
  ON subscriptions
  FOR SELECT
  USING (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'coach'
  );

-- Coaches can insert/update/delete subscriptions (for manual adjustments)
CREATE POLICY "Coaches can manage subscriptions"
  ON subscriptions
  FOR ALL
  USING (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'coach'
  );

-- Service role can do everything (for webhook updates)
-- Note: Service role bypasses RLS by default

-- ============================================
-- 4. Update trigger for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();

-- ============================================
-- 5. Helper function to check payment access
-- ============================================

CREATE OR REPLACE FUNCTION check_member_payment_access(p_member_id UUID)
RETURNS TABLE (
  has_access BOOLEAN,
  access_type TEXT,
  sessions_remaining INTEGER,
  subscription_end TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_member RECORD;
  v_subscription RECORD;
BEGIN
  -- Get member data
  SELECT * INTO v_member FROM members WHERE id = p_member_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'not_found'::TEXT, 0, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;

  -- Check for active subscription
  SELECT * INTO v_subscription
  FROM subscriptions
  WHERE member_id = p_member_id
    AND status = 'active'
    AND (current_period_end IS NULL OR current_period_end > NOW())
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT TRUE, 'subscription'::TEXT, NULL::INTEGER, v_subscription.current_period_end;
    RETURN;
  END IF;

  -- Check athlete_subscription_status (for manually set subscriptions)
  IF v_member.athlete_subscription_status = 'active' THEN
    RETURN QUERY SELECT TRUE, 'manual_subscription'::TEXT, NULL::INTEGER, v_member.athlete_subscription_end;
    RETURN;
  END IF;

  -- Check for 10-card sessions
  IF v_member.ten_card_total IS NOT NULL AND v_member.ten_card_sessions_used IS NOT NULL THEN
    DECLARE
      v_remaining INTEGER := COALESCE(v_member.ten_card_total, 10) - COALESCE(v_member.ten_card_sessions_used, 0);
    BEGIN
      -- Check if 10-card has expired
      IF v_member.ten_card_expiry_date IS NOT NULL AND v_member.ten_card_expiry_date < NOW() THEN
        RETURN QUERY SELECT FALSE, '10card_expired'::TEXT, v_remaining, v_member.ten_card_expiry_date;
        RETURN;
      END IF;

      IF v_remaining > 0 THEN
        RETURN QUERY SELECT TRUE, '10card'::TEXT, v_remaining, v_member.ten_card_expiry_date;
        RETURN;
      END IF;
    END;
  END IF;

  -- No access
  RETURN QUERY SELECT FALSE, 'none'::TEXT, 0, NULL::TIMESTAMP WITH TIME ZONE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
