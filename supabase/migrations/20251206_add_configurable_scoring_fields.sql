-- Add new result columns to wod_section_results table for configurable scoring
-- This migration is additive only - no data loss, full backward compatibility

ALTER TABLE wod_section_results
ADD COLUMN IF NOT EXISTS rounds_result INTEGER,
ADD COLUMN IF NOT EXISTS calories_result INTEGER,
ADD COLUMN IF NOT EXISTS metres_result DECIMAL(8,2),
ADD COLUMN IF NOT EXISTS task_completed BOOLEAN;

-- Add helpful comments
COMMENT ON COLUMN wod_section_results.rounds_result IS 'Complete rounds for AMRAP workouts';
COMMENT ON COLUMN wod_section_results.calories_result IS 'Total calories (rower, bike, ski)';
COMMENT ON COLUMN wod_section_results.metres_result IS 'Distance in metres';
COMMENT ON COLUMN wod_section_results.task_completed IS 'Checkbox for task completion';

-- Update table comment
COMMENT ON TABLE wod_section_results IS 'Stores athlete results for WOD sections. Fields are configurable per section via scoring_fields JSONB in wods.sections.';
