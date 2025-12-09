-- Update existing lift categories to match new naming convention
-- Old: 'Olympic Lifts', 'Squats', 'Pressing', 'Pulling', 'Deadlifts'
-- New: 'Olympic', 'Squat', 'Press', 'Pull'

UPDATE barbell_lifts
SET category = 'Olympic'
WHERE category = 'Olympic Lifts';

UPDATE barbell_lifts
SET category = 'Squat'
WHERE category IN ('Squats', 'Squat');

UPDATE barbell_lifts
SET category = 'Press'
WHERE category IN ('Pressing', 'Press');

UPDATE barbell_lifts
SET category = 'Pull'
WHERE category IN ('Pull', 'Pulling');

-- Note: Deadlifts moved to Pull category
UPDATE barbell_lifts
SET category = 'Pull'
WHERE category = 'Deadlifts';
