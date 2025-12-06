-- Migration: Seed Trackable Movements (Max Efforts, Holds, Cardio)
-- Date: 2025-12-07
-- Description: Pre-populates 28 commonly tracked movements for immediate use

-- ============================================
-- MAX EFFORTS (15 movements)
-- ============================================

-- Bodyweight Max Efforts
INSERT INTO movements (name, category, movement_type, result_fields, description, has_scaling, is_barbell_lift, display_order)
VALUES
  ('Max Strict Push-Ups', 'max_effort', 'max_reps', '{"reps": true}'::JSONB, 'Maximum strict push-ups (chest to ground)', FALSE, FALSE, 1),
  ('Max Strict Pull-Ups', 'max_effort', 'max_reps', '{"reps": true}'::JSONB, 'Maximum strict pull-ups (chin over bar)', FALSE, FALSE, 2),
  ('Max HSPU', 'max_effort', 'max_reps', '{"reps": true}'::JSONB, 'Maximum handstand push-ups', FALSE, FALSE, 3),
  ('Max Dips', 'max_effort', 'max_reps', '{"reps": true}'::JSONB, 'Maximum ring or bar dips', FALSE, FALSE, 4),
  ('Max Air Squats', 'max_effort', 'max_reps', '{"reps": true}'::JSONB, 'Maximum air squats (1 minute)', FALSE, FALSE, 5),
  ('Max Lunges', 'max_effort', 'max_reps', '{"reps": true}'::JSONB, 'Maximum alternating lunges (1 minute)', FALSE, FALSE, 6),
  ('Max Burpees', 'max_effort', 'max_reps', '{"reps": true}'::JSONB, 'Maximum burpees (1 minute)', FALSE, FALSE, 7),
  ('Max Sit-Ups', 'max_effort', 'max_reps', '{"reps": true}'::JSONB, 'Maximum abmat sit-ups (1 minute)', FALSE, FALSE, 8),
  ('Max Toes to Bar', 'max_effort', 'max_reps', '{"reps": true}'::JSONB, 'Maximum toes to bar', FALSE, FALSE, 9),
  ('Max Chest to Bar Pull-Ups', 'max_effort', 'max_reps', '{"reps": true}'::JSONB, 'Maximum chest to bar pull-ups', FALSE, FALSE, 10)
ON CONFLICT (name) DO NOTHING;

-- Machine-Based Max Efforts
INSERT INTO movements (name, category, movement_type, result_fields, description, has_scaling, is_barbell_lift, display_order)
VALUES
  ('Max Calories Assault Bike', 'max_effort', 'max_reps', '{"reps": true}'::JSONB, 'Maximum calories (1 minute)', FALSE, FALSE, 11),
  ('Max Calories Rower', 'max_effort', 'max_reps', '{"reps": true}'::JSONB, 'Maximum calories (1 minute)', FALSE, FALSE, 12),
  ('Max Wall Ball Shots', 'max_effort', 'max_reps', '{"reps": true}'::JSONB, 'Maximum wall ball shots (1 minute)', FALSE, FALSE, 13),
  ('Max Box Jumps', 'max_effort', 'max_reps', '{"reps": true}'::JSONB, 'Maximum box jumps (1 minute)', FALSE, FALSE, 14),
  ('Max Double Unders', 'max_effort', 'max_reps', '{"reps": true}'::JSONB, 'Maximum double unders (1 minute)', FALSE, FALSE, 15)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- HOLDS (5 movements)
-- ============================================

INSERT INTO movements (name, category, movement_type, result_fields, description, has_scaling, is_barbell_lift, display_order)
VALUES
  ('Parallettes L-Sit Hold', 'hold', 'max_hold', '{"duration_seconds": true}'::JSONB, 'Maximum L-sit hold time on parallettes', FALSE, FALSE, 1),
  ('Plank Hold', 'hold', 'max_hold', '{"duration_seconds": true}'::JSONB, 'Maximum plank hold time', FALSE, FALSE, 2),
  ('Dead Hang', 'hold', 'max_hold', '{"duration_seconds": true}'::JSONB, 'Maximum dead hang from pull-up bar', FALSE, FALSE, 3),
  ('Handstand Hold', 'hold', 'max_hold', '{"duration_seconds": true}'::JSONB, 'Maximum freestanding handstand hold', FALSE, FALSE, 4),
  ('Hollow Hold', 'hold', 'max_hold', '{"duration_seconds": true}'::JSONB, 'Maximum hollow body hold', FALSE, FALSE, 5)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- CARDIO BENCHMARKS (8 movements)
-- ============================================

-- Max Distance/Calories (1 minute)
INSERT INTO movements (name, category, movement_type, result_fields, description, has_scaling, is_barbell_lift, display_order)
VALUES
  ('Max SkiErg Metres (1 min)', 'cardio', 'max_distance', '{"distance_meters": true}'::JSONB, 'Maximum meters in 1 minute on SkiErg', FALSE, FALSE, 1),
  ('Max Row Metres (1 min)', 'cardio', 'max_distance', '{"distance_meters": true}'::JSONB, 'Maximum meters in 1 minute on rower', FALSE, FALSE, 2),
  ('Max Assault Bike Cals (1 min)', 'cardio', 'max_reps', '{"reps": true}'::JSONB, 'Maximum calories in 1 minute on assault bike', FALSE, FALSE, 3)
ON CONFLICT (name) DO NOTHING;

-- For Time Benchmarks
INSERT INTO movements (name, category, movement_type, result_fields, description, has_scaling, is_barbell_lift, display_order)
VALUES
  ('500m Row (For Time)', 'cardio', 'for_time', '{"time": true}'::JSONB, 'Row 500 meters for time', FALSE, FALSE, 4),
  ('2k Row (For Time)', 'cardio', 'for_time', '{"time": true}'::JSONB, 'Row 2000 meters for time', FALSE, FALSE, 5),
  ('400m Run (For Time)', 'cardio', 'for_time', '{"time": true}'::JSONB, 'Run 400 meters for time', FALSE, FALSE, 6),
  ('1 Mile Run (For Time)', 'cardio', 'for_time', '{"time": true}'::JSONB, 'Run 1 mile for time', FALSE, FALSE, 7),
  ('5k Run (For Time)', 'cardio', 'for_time', '{"time": true}'::JSONB, 'Run 5 kilometers for time', FALSE, FALSE, 8)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- VERIFICATION QUERY (Optional - run separately)
-- ============================================

-- Verify seeded movements
-- SELECT category, COUNT(*) as count
-- FROM movements
-- WHERE category IN ('max_effort', 'hold', 'cardio')
-- GROUP BY category
-- ORDER BY category;
-- Expected:
--   cardio: 8
--   hold: 5
--   max_effort: 15
--   TOTAL: 28
