-- Remove incorrectly added Olympic Lifting from workout_types table
-- (In case it exists - this was the wrong table)
DELETE FROM workout_types WHERE name = 'Olympic Lifting';

-- Add Olympic Lifting section type to section_types table
-- This is where workout section types belong (Warm-up, Strength, etc.)

-- Insert Olympic Lifting as a new section type
-- Using display_order 11 to place it after the default sections (10 was taken)
INSERT INTO section_types (name, description, display_order) VALUES
  ('Olympic Lifting', 'Olympic weightlifting movements including Clean, Snatch, Jerk variations', 11)
ON CONFLICT (name) DO NOTHING;
