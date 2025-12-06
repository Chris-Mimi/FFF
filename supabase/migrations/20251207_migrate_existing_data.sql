-- Migration: Migrate Existing Data to Unified Movement System
-- Date: 2025-12-07
-- Description: Migrates data from old tables (barbell_lifts, benchmark_workouts, forge_benchmarks, lift_records, benchmark_results) to new unified tables

-- ============================================
-- PART 1: Migrate barbell_lifts → movements
-- ============================================

INSERT INTO movements (
  id,
  name,
  category,
  movement_type,
  result_fields,
  description,
  has_scaling,
  is_barbell_lift,
  display_order,
  created_at,
  updated_at
)
SELECT
  id,
  name,
  'lift'::TEXT as category,
  'max_weight'::TEXT as movement_type,
  '{"weight": true, "reps": true}'::JSONB as result_fields,  -- Lifts track weight + reps
  NULL as description,
  FALSE as has_scaling,
  TRUE as is_barbell_lift,
  display_order,
  created_at,
  updated_at
FROM barbell_lifts
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- PART 2: Migrate benchmark_workouts → movements
-- ============================================

INSERT INTO movements (
  id,
  name,
  category,
  movement_type,
  result_fields,
  description,
  has_scaling,
  is_barbell_lift,
  display_order,
  created_at,
  updated_at
)
SELECT
  id,
  name,
  'benchmark'::TEXT as category,
  -- Map benchmark type to movement_type
  CASE
    WHEN type = 'For Time' THEN 'for_time'
    WHEN type = 'AMRAP' THEN 'amrap'
    WHEN type IN ('Max Reps', 'Max Effort') THEN 'max_reps'
    WHEN type = 'Max Weight' THEN 'max_weight'
    WHEN type = 'EMOM' THEN 'amrap'  -- EMOM typically tracks rounds/reps
    ELSE 'for_time'  -- Default fallback
  END::TEXT as movement_type,
  -- Map type to result_fields
  CASE
    WHEN type = 'For Time' THEN '{"time": true, "scaling": true}'::JSONB
    WHEN type = 'AMRAP' THEN '{"rounds_reps": true, "scaling": true}'::JSONB
    WHEN type IN ('Max Reps', 'Max Effort') THEN '{"reps": true, "scaling": true}'::JSONB
    WHEN type = 'Max Weight' THEN '{"weight": true, "scaling": true}'::JSONB
    WHEN type = 'EMOM' THEN '{"rounds_reps": true, "scaling": true}'::JSONB
    ELSE '{"time": true, "scaling": true}'::JSONB  -- Default fallback
  END as result_fields,
  description,
  COALESCE(has_scaling, TRUE) as has_scaling,  -- Most benchmarks have scaling
  FALSE as is_barbell_lift,
  display_order,
  created_at,
  updated_at
FROM benchmark_workouts
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- PART 3: Migrate forge_benchmarks → movements
-- ============================================

INSERT INTO movements (
  id,
  name,
  category,
  movement_type,
  result_fields,
  description,
  has_scaling,
  is_barbell_lift,
  display_order,
  created_at,
  updated_at
)
SELECT
  id,
  name,
  'forge_benchmark'::TEXT as category,
  -- Map forge benchmark type to movement_type
  CASE
    WHEN type = 'For Time' THEN 'for_time'
    WHEN type = 'AMRAP' THEN 'amrap'
    WHEN type IN ('Max Reps', 'Max Effort') THEN 'max_reps'
    WHEN type = 'Max Weight' THEN 'max_weight'
    WHEN type = 'EMOM' THEN 'amrap'
    ELSE 'for_time'
  END::TEXT as movement_type,
  -- Map type to result_fields
  CASE
    WHEN type = 'For Time' THEN '{"time": true, "scaling": true}'::JSONB
    WHEN type = 'AMRAP' THEN '{"rounds_reps": true, "scaling": true}'::JSONB
    WHEN type IN ('Max Reps', 'Max Effort') THEN '{"reps": true, "scaling": true}'::JSONB
    WHEN type = 'Max Weight' THEN '{"weight": true, "scaling": true}'::JSONB
    WHEN type = 'EMOM' THEN '{"rounds_reps": true, "scaling": true}'::JSONB
    ELSE '{"time": true, "scaling": true}'::JSONB
  END as result_fields,
  description,
  COALESCE(has_scaling, TRUE) as has_scaling,
  FALSE as is_barbell_lift,
  display_order,
  created_at,
  updated_at
FROM forge_benchmarks
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- PART 4: Migrate lift_records → movement_results
-- ============================================

INSERT INTO movement_results (
  id,
  movement_id,
  user_id,
  weight_result,
  reps_result,
  rep_scheme,
  calculated_1rm,
  notes,
  result_date,
  created_at,
  updated_at
)
SELECT
  lr.id,
  -- Find movement_id by joining on lift_name
  m.id as movement_id,
  lr.user_id,
  lr.weight_kg as weight_result,
  lr.reps as reps_result,
  COALESCE(lr.rep_scheme, lr.rep_max_type) as rep_scheme,  -- Use rep_scheme if exists, else rep_max_type
  lr.calculated_1rm,
  lr.notes,
  lr.lift_date as result_date,
  lr.created_at,
  lr.updated_at
FROM lift_records lr
JOIN movements m ON m.name = lr.lift_name AND m.category = 'lift'
ON CONFLICT (user_id, movement_id, result_date, rep_scheme) DO NOTHING;

-- ============================================
-- PART 5: Migrate benchmark_results → movement_results
-- ============================================

INSERT INTO movement_results (
  id,
  movement_id,
  user_id,
  time_result,
  reps_result,
  weight_result,
  scaling_level,
  notes,
  result_date,
  created_at,
  updated_at
)
SELECT
  br.id,
  -- Find movement_id by joining on benchmark_name
  -- Try benchmark first, then forge_benchmark
  COALESCE(
    (SELECT id FROM movements WHERE name = br.benchmark_name AND category = 'benchmark' LIMIT 1),
    (SELECT id FROM movements WHERE name = br.benchmark_name AND category = 'forge_benchmark' LIMIT 1)
  ) as movement_id,
  br.user_id,
  br.time_result,
  br.reps_result,
  br.weight_result,
  br.scaling_level,
  br.notes,
  br.result_date,
  br.created_at,
  br.updated_at
FROM benchmark_results br
WHERE EXISTS (
  SELECT 1 FROM movements m
  WHERE m.name = br.benchmark_name
  AND m.category IN ('benchmark', 'forge_benchmark')
)
ON CONFLICT (user_id, movement_id, result_date, rep_scheme) DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES (Optional - run separately)
-- ============================================

-- Verify movements migration
-- SELECT category, COUNT(*) FROM movements GROUP BY category;
-- Expected:
--   lift: ~11
--   benchmark: ~21
--   forge_benchmark: variable (depends on custom benchmarks)

-- Verify movement_results migration
-- SELECT
--   m.category,
--   COUNT(*) as result_count
-- FROM movement_results mr
-- JOIN movements m ON mr.movement_id = m.id
-- GROUP BY m.category;

-- Check for orphaned results (should be 0)
-- SELECT COUNT(*) FROM benchmark_results br
-- WHERE NOT EXISTS (
--   SELECT 1 FROM movements m
--   WHERE m.name = br.benchmark_name
--   AND m.category IN ('benchmark', 'forge_benchmark')
-- );
