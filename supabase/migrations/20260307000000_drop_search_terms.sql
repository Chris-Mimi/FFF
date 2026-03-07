-- Migration: Drop search_terms column from exercises
-- Reason: search_terms was redundant — all useful content (abbreviations, alt names)
-- has been migrated into tags. Search already covers name, category, subcategory,
-- tags, equipment, body_parts directly.

-- Step 1: Update search_vector trigger to use category+subcategory instead of search_terms
CREATE OR REPLACE FUNCTION exercises_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.category, '') || ' ' || COALESCE(NEW.subcategory, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 2: Drop the search_terms column
ALTER TABLE exercises DROP COLUMN IF EXISTS search_terms;

-- Step 3: Rebuild search_vector for all rows with new trigger logic
UPDATE exercises SET name = name;
