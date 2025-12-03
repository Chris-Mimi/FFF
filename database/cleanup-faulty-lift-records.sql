-- Cleanup faulty lift records with UUID-like names
-- These were created due to a bug where the full key was saved instead of just the lift name

-- First, let's see what we're deleting (run this to review)
-- SELECT id, lift_name, weight_kg, reps, lift_date
-- FROM lift_records
-- WHERE lift_name LIKE '%-%-%-%-%-%'
-- ORDER BY created_at DESC;

-- Delete records where lift_name contains multiple dashes (UUID pattern)
DELETE FROM lift_records
WHERE lift_name LIKE '%-%-%-%-%-%';

-- Verify cleanup (should return 0 rows)
SELECT COUNT(*) as remaining_faulty_records
FROM lift_records
WHERE lift_name LIKE '%-%-%-%-%-%';
