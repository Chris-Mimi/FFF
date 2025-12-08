-- Update existing lift categories to match new naming convention
-- Old: 'Olympic Lifts', 'Squats', 'Pressing', 'Pulling', 'Deadlifts'
-- New: 'Olympic', 'Squat', 'Press'

UPDATE barbell_lifts
SET category = 'Olympic'
WHERE category = 'Olympic Lifts';

UPDATE barbell_lifts
SET category = 'Squat'
WHERE category IN ('Squats', 'Squat');

UPDATE barbell_lifts
SET category = 'Press'
WHERE category IN ('Pressing', 'Press', 'Pull', 'Pulling');

-- Note: Deadlifts category removed - if any exist, they'll be moved to Press
UPDATE barbell_lifts
SET category = 'Press'
WHERE category = 'Deadlifts';
