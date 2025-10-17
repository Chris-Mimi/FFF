-- Update lift_records table to support tracking 1RM, 3RM, 5RM, 10RM
-- This migration adds a rep_max_type field to categorize lift records

-- Add rep_max_type column to track which rep max category this record is for
ALTER TABLE lift_records ADD COLUMN IF NOT EXISTS rep_max_type TEXT;

-- Add check constraint to ensure rep_max_type is one of the valid values
ALTER TABLE lift_records ADD CONSTRAINT valid_rep_max_type
  CHECK (rep_max_type IN ('1RM', '3RM', '5RM', '10RM', 'Other') OR rep_max_type IS NULL);

-- Add index for rep_max_type for faster queries
CREATE INDEX IF NOT EXISTS idx_lift_records_rep_max_type ON lift_records(rep_max_type);

-- Update existing records to set rep_max_type based on reps
UPDATE lift_records
SET rep_max_type = CASE
  WHEN reps = 1 THEN '1RM'
  WHEN reps = 3 THEN '3RM'
  WHEN reps = 5 THEN '5RM'
  WHEN reps = 10 THEN '10RM'
  ELSE 'Other'
END
WHERE rep_max_type IS NULL;

-- Note: This table structure keeps the flexible reps field for any rep count,
-- but adds rep_max_type for easy filtering of PR attempts at standard rep maxes
