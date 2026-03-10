-- Migration: Add unique constraints to prevent duplicate athlete results
-- Date: 2026-03-10
-- Context: Athlete audit found race conditions allowing duplicate records on rapid saves

-- 1. wod_section_results: one result per user + wod + section + date
-- First clean up any existing duplicates (keep the most recent)
DELETE FROM wod_section_results a
USING wod_section_results b
WHERE a.id < b.id
  AND a.user_id = b.user_id
  AND a.wod_id = b.wod_id
  AND a.section_id = b.section_id
  AND a.workout_date = b.workout_date;

CREATE UNIQUE INDEX IF NOT EXISTS idx_wod_section_results_unique
  ON wod_section_results (user_id, wod_id, section_id, workout_date);

-- 2. benchmark_results: one result per user + benchmark + date
-- Clean up duplicates first (keep the most recent)
DELETE FROM benchmark_results a
USING benchmark_results b
WHERE a.id < b.id
  AND a.user_id = b.user_id
  AND a.benchmark_name = b.benchmark_name
  AND a.result_date = b.result_date;

CREATE UNIQUE INDEX IF NOT EXISTS idx_benchmark_results_unique
  ON benchmark_results (user_id, benchmark_name, result_date);
