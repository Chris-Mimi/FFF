-- Push Notifications - Database Schema
-- Execute in Supabase SQL Editor
-- IMPORTANT: Run npm run backup FIRST!

-- =====================================================
-- TABLE 1: push_subscriptions
-- Stores Web Push subscription objects per user per device
-- =====================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,

  -- Web Push subscription data (from PushSubscription.toJSON())
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,

  -- Metadata
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate subscriptions for same endpoint
  UNIQUE(endpoint)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Members can create push subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can delete own push subscriptions"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);


-- =====================================================
-- TABLE 2: notification_preferences
-- Per-user opt-in/out per notification type (all default ON)
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,

  -- Notification type toggles
  wod_published BOOLEAN NOT NULL DEFAULT true,
  booking_confirmed BOOLEAN NOT NULL DEFAULT true,
  booking_waitlisted BOOLEAN NOT NULL DEFAULT true,
  booking_promoted BOOLEAN NOT NULL DEFAULT true,
  pr_achieved BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One preferences row per user
  UNIQUE(user_id)
);

-- RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own notification preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Members can create notification preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can update own notification preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);


-- =====================================================
-- TABLE 3: notification_log
-- Sent notification history for in-app display
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,

  -- Notification details
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,

  -- Delivery status
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'clicked')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_log_user_id ON notification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_created ON notification_log(created_at DESC);

-- RLS
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own notification log"
  ON notification_log FOR SELECT
  USING (auth.uid() = user_id);


-- =====================================================
-- VERIFICATION (run after migration)
-- =====================================================
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename IN ('push_subscriptions', 'notification_preferences', 'notification_log');
