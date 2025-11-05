-- Migration: Add Coach Permissions for Benchmarks and Lifts
-- Date: 2025-11-05
-- Description: Adds INSERT, UPDATE, DELETE policies for coaches to manage benchmark_workouts and barbell_lifts

-- ============================================
-- POLICIES: benchmark_workouts
-- ============================================

-- Coaches can insert benchmarks
CREATE POLICY "Coaches can insert benchmark workouts"
  ON benchmark_workouts FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  );

-- Coaches can update benchmarks
CREATE POLICY "Coaches can update benchmark workouts"
  ON benchmark_workouts FOR UPDATE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  );

-- Coaches can delete benchmarks
CREATE POLICY "Coaches can delete benchmark workouts"
  ON benchmark_workouts FOR DELETE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  );

-- ============================================
-- POLICIES: barbell_lifts
-- ============================================

-- Coaches can insert lifts
CREATE POLICY "Coaches can insert barbell lifts"
  ON barbell_lifts FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  );

-- Coaches can update lifts
CREATE POLICY "Coaches can update barbell lifts"
  ON barbell_lifts FOR UPDATE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  );

-- Coaches can delete lifts
CREATE POLICY "Coaches can delete barbell lifts"
  ON barbell_lifts FOR DELETE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  );
