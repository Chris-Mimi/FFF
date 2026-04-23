-- Session 303 follow-up: add acronym tags to exercises that didn't have parenthetical
-- suffixes (so weren't covered by 20260422_session303_strip_acronym_suffixes.sql).
-- The Workouts-page search + Movement Tracking now read exercises.tags at runtime
-- to resolve acronyms like "DL" → "Barbell Deadlift". Add new acronyms here as needed.
--
-- Pattern: append lowercased acronym to tags[] only if missing (idempotent).

UPDATE exercises
SET tags = CASE WHEN 'dl' = ANY(tags) THEN tags ELSE array_append(tags, 'dl') END
WHERE display_name = 'Barbell Deadlift';

-- To add more in the future:
--   UPDATE exercises
--   SET tags = CASE WHEN '<acr>' = ANY(tags) THEN tags ELSE array_append(tags, '<acr>') END
--   WHERE display_name = '<Full Display Name>';

-- Verify: lists every exercise with at least one lowercase alphanumeric tag
-- (handy to confirm the new tag was added and to eyeball coverage).
SELECT display_name, tags
FROM exercises
WHERE cardinality(tags) > 0
ORDER BY display_name;
