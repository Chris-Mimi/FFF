-- Migration: Fix Newlines in Benchmark Descriptions
-- Date: 2025-11-05
-- Description: Replace literal \n with actual newline characters in benchmark descriptions

UPDATE benchmark_workouts
SET description = REPLACE(description, E'\\n', E'\n')
WHERE description LIKE '%\n%';

-- Verify the fix worked
-- SELECT name, description FROM benchmark_workouts WHERE description LIKE '%' || CHR(10) || '%' LIMIT 5;
