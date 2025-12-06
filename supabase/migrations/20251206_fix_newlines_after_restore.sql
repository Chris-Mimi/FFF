-- Fix escaped newlines in benchmark descriptions after table restoration
-- Date: 2025-12-06
-- Issue: Descriptions show literal \n instead of line breaks
-- Solution: Replace escaped \n with actual newline characters

-- Fix benchmark_workouts descriptions
UPDATE benchmark_workouts
SET description = REPLACE(description, E'\\n', E'\n')
WHERE description LIKE '%\\n%';

-- Fix forge_benchmarks descriptions
UPDATE forge_benchmarks
SET description = REPLACE(description, E'\\n', E'\n')
WHERE description LIKE '%\\n%';

-- Verify the fix
-- Uncomment to check results:
-- SELECT name, description FROM benchmark_workouts WHERE description LIKE '%' || CHR(10) || '%' LIMIT 5;
-- SELECT name, description FROM forge_benchmarks WHERE description LIKE '%' || CHR(10) || '%' LIMIT 5;
