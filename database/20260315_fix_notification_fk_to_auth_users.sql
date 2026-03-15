-- Fix push notification FK constraints to reference auth.users instead of members
-- This allows coaches (who aren't in the members table) to subscribe to push notifications
-- Run in Supabase SQL Editor (ALREADY APPLIED 2026-03-15)

-- push_subscriptions
ALTER TABLE push_subscriptions
  DROP CONSTRAINT push_subscriptions_user_id_fkey;

ALTER TABLE push_subscriptions
  ADD CONSTRAINT push_subscriptions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- notification_preferences
ALTER TABLE notification_preferences
  DROP CONSTRAINT notification_preferences_user_id_fkey;

ALTER TABLE notification_preferences
  ADD CONSTRAINT notification_preferences_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- notification_log
ALTER TABLE notification_log
  DROP CONSTRAINT notification_log_user_id_fkey;

ALTER TABLE notification_log
  ADD CONSTRAINT notification_log_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Allow same endpoint for multiple user accounts (same device, different logins)
ALTER TABLE push_subscriptions DROP CONSTRAINT push_subscriptions_endpoint_key;
ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_user_endpoint_key UNIQUE(user_id, endpoint);
