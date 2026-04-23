-- Add open_gym flag to wod_section_results (parallel to dnf)
-- Used when an athlete attended class but did Open Gym instead of the WOD.
-- Mutually exclusive with dnf in UI; both default false.

ALTER TABLE wod_section_results
ADD COLUMN IF NOT EXISTS open_gym BOOLEAN DEFAULT FALSE NOT NULL;
