-- Add RLS Policies for bookings table
-- Execute in Supabase SQL Editor

-- Members can view their own bookings
CREATE POLICY "Members can view own bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = member_id);

-- Members can create their own bookings
CREATE POLICY "Members can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (auth.uid() = member_id);

-- Members can update/cancel their own bookings
CREATE POLICY "Members can update own bookings"
  ON bookings FOR UPDATE
  USING (auth.uid() = member_id)
  WITH CHECK (auth.uid() = member_id);

-- Coaches can view all bookings (temporary - any authenticated user)
-- TODO: Replace with proper coach-only access later
CREATE POLICY "Authenticated users can view all bookings"
  ON bookings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Coaches can update any booking (for promoting from waitlist)
-- TODO: Replace with proper coach-only access later
CREATE POLICY "Authenticated users can update all bookings"
  ON bookings FOR UPDATE
  USING (auth.uid() IS NOT NULL);
