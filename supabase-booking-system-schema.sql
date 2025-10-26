-- Booking System Phase 1 - Database Schema
-- Creates 5 new tables: members, session_templates, weekly_sessions, bookings, subscriptions
-- Execute in Supabase SQL Editor

-- =====================================================
-- TABLE 1: members
-- User accounts with approval workflow and trial tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,

  -- Account status and type
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'blocked')),
  account_type TEXT NOT NULL DEFAULT 'primary' CHECK (account_type IN ('primary', 'family_member')),
  primary_member_id UUID REFERENCES members(id) ON DELETE CASCADE,

  -- Athlete page trial and subscription tracking (individual per member)
  athlete_trial_start TIMESTAMP WITH TIME ZONE,
  athlete_subscription_status TEXT DEFAULT 'expired' CHECK (athlete_subscription_status IN ('trial', 'active', 'expired')),
  athlete_subscription_end TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for family member lookups
CREATE INDEX IF NOT EXISTS idx_members_primary_member_id ON members(primary_member_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);

-- RLS policies for members table
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Members can view their own profile and family members
CREATE POLICY "Members can view own profile"
  ON members FOR SELECT
  USING (
    auth.uid() = id OR
    auth.uid() = primary_member_id OR
    id IN (SELECT id FROM members WHERE primary_member_id = auth.uid())
  );

-- Members can update their own profile
CREATE POLICY "Members can update own profile"
  ON members FOR UPDATE
  USING (auth.uid() = id);

-- Public can insert during registration (status will be 'pending')
CREATE POLICY "Public can register"
  ON members FOR INSERT
  WITH CHECK (status = 'pending');

-- Coaches can view and manage all members (assuming coach role check via function)
-- TODO: Add coach role check when auth system is extended


-- =====================================================
-- TABLE 2: session_templates
-- Weekly schedule templates for auto-generating sessions
-- =====================================================
CREATE TABLE IF NOT EXISTS session_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Schedule definition
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1 = Monday, 7 = Sunday
  time TIME NOT NULL, -- HH:MM format

  -- Session configuration
  workout_type TEXT NOT NULL, -- e.g., 'WOD', 'Foundations', 'Diapers & Dumbbells'
  default_capacity INTEGER NOT NULL DEFAULT 10 CHECK (default_capacity > 0),
  active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for active template lookups
CREATE INDEX IF NOT EXISTS idx_session_templates_active ON session_templates(active);
CREATE INDEX IF NOT EXISTS idx_session_templates_day ON session_templates(day_of_week);

-- RLS policies for session_templates
ALTER TABLE session_templates ENABLE ROW LEVEL SECURITY;

-- Everyone can view active templates
CREATE POLICY "Public can view active templates"
  ON session_templates FOR SELECT
  USING (active = true);

-- Only coaches can manage templates
-- TODO: Add coach role check when auth system is extended


-- =====================================================
-- TABLE 3: weekly_sessions
-- Generated sessions from templates, linked to workouts
-- =====================================================
CREATE TABLE IF NOT EXISTS weekly_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Schedule
  date DATE NOT NULL,
  time TIME NOT NULL,

  -- Linked workout (auto-created placeholder)
  workout_id UUID REFERENCES wods(id) ON DELETE CASCADE,

  -- Session configuration
  capacity INTEGER NOT NULL DEFAULT 10 CHECK (capacity > 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'completed', 'cancelled')),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for session lookups
CREATE INDEX IF NOT EXISTS idx_weekly_sessions_date ON weekly_sessions(date);
CREATE INDEX IF NOT EXISTS idx_weekly_sessions_workout_id ON weekly_sessions(workout_id);
CREATE INDEX IF NOT EXISTS idx_weekly_sessions_status ON weekly_sessions(status);

-- RLS policies for weekly_sessions
ALTER TABLE weekly_sessions ENABLE ROW LEVEL SECURITY;

-- Everyone can view published sessions
CREATE POLICY "Public can view published sessions"
  ON weekly_sessions FOR SELECT
  USING (status = 'published');

-- Only coaches can manage sessions
-- TODO: Add coach role check when auth system is extended


-- =====================================================
-- TABLE 4: bookings
-- Member session reservations (confirmed or waitlist)
-- =====================================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  session_id UUID NOT NULL REFERENCES weekly_sessions(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,

  -- Booking status
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'waitlist', 'cancelled')),

  -- Timestamps
  booked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate bookings
  UNIQUE(session_id, member_id)
);

-- Indexes for booking lookups
CREATE INDEX IF NOT EXISTS idx_bookings_session_id ON bookings(session_id);
CREATE INDEX IF NOT EXISTS idx_bookings_member_id ON bookings(member_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- RLS policies for bookings
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Members can view their own bookings
CREATE POLICY "Members can view own bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = member_id);

-- Members can create their own bookings
CREATE POLICY "Members can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (auth.uid() = member_id);

-- Members can cancel their own bookings
CREATE POLICY "Members can cancel own bookings"
  ON bookings FOR UPDATE
  USING (auth.uid() = member_id)
  WITH CHECK (status = 'cancelled');

-- Only coaches can promote from waitlist
-- TODO: Add coach role check when auth system is extended


-- =====================================================
-- TABLE 5: subscriptions
-- Stripe subscription management for Athlete Page access
-- =====================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationship
  primary_member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,

  -- Subscription details
  plan_type TEXT NOT NULL CHECK (plan_type IN ('monthly', 'yearly')),
  family_member_count INTEGER NOT NULL DEFAULT 0 CHECK (family_member_count >= 0),

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  current_period_end TIMESTAMP WITH TIME ZONE,

  -- Stripe integration
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for subscription lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_primary_member_id ON subscriptions(primary_member_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);

-- RLS policies for subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Members can view their own subscriptions
CREATE POLICY "Members can view own subscriptions"
  ON subscriptions FOR SELECT
  USING (
    auth.uid() = primary_member_id OR
    auth.uid() IN (SELECT id FROM members WHERE primary_member_id = subscriptions.primary_member_id)
  );

-- Only system/coaches can manage subscriptions
-- TODO: Add coach role check when auth system is extended


-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to check if member has athlete page access
CREATE OR REPLACE FUNCTION has_athlete_access(member_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  member_record RECORD;
BEGIN
  SELECT athlete_subscription_status, athlete_subscription_end
  INTO member_record
  FROM members
  WHERE id = member_id;

  IF member_record.athlete_subscription_status = 'trial' THEN
    RETURN NOW() < member_record.athlete_subscription_end;
  END IF;

  RETURN member_record.athlete_subscription_status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get booking count for a session
CREATE OR REPLACE FUNCTION get_booking_count(session_id UUID, booking_status TEXT DEFAULT 'confirmed')
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM bookings
    WHERE bookings.session_id = get_booking_count.session_id
    AND bookings.status = booking_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================

-- Create trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_session_templates_updated_at BEFORE UPDATE ON session_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weekly_sessions_updated_at BEFORE UPDATE ON weekly_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Run these after migration to verify:
-- SELECT * FROM members LIMIT 5;
-- SELECT * FROM session_templates LIMIT 5;
-- SELECT * FROM weekly_sessions LIMIT 5;
-- SELECT * FROM bookings LIMIT 5;
-- SELECT * FROM subscriptions LIMIT 5;

-- Check RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('members', 'session_templates', 'weekly_sessions', 'bookings', 'subscriptions');
