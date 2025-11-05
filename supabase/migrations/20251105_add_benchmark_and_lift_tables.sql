-- Migration: Add Benchmark Workouts and Barbell Lifts Tables
-- Date: 2025-11-05
-- Description: Creates tables for coach-managed benchmark workouts and barbell lifts
--              Previously hardcoded in athlete page, now database-driven

-- ============================================
-- TABLE 1: benchmark_workouts
-- Coach-managed list of benchmark WODs
-- ============================================

CREATE TABLE IF NOT EXISTS benchmark_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL, -- 'For Time', 'AMRAP', 'Max Weight', etc
  description TEXT, -- Workout details
  display_order INTEGER DEFAULT 0, -- For custom ordering
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for ordering
CREATE INDEX IF NOT EXISTS idx_benchmark_workouts_display_order
ON benchmark_workouts(display_order);

-- RLS policies for benchmark_workouts
ALTER TABLE benchmark_workouts ENABLE ROW LEVEL SECURITY;

-- Everyone can view benchmarks
CREATE POLICY "Public can view benchmark workouts"
  ON benchmark_workouts FOR SELECT
  USING (true);

-- Only coaches can manage benchmarks
-- TODO: Add coach role check when auth system is extended

-- ============================================
-- TABLE 2: barbell_lifts
-- Coach-managed list of barbell lifts
-- ============================================

CREATE TABLE IF NOT EXISTS barbell_lifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL, -- 'Squat', 'Pull', 'Press', 'Olympic'
  display_order INTEGER DEFAULT 0, -- For custom ordering
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for ordering
CREATE INDEX IF NOT EXISTS idx_barbell_lifts_display_order
ON barbell_lifts(display_order);

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_barbell_lifts_category
ON barbell_lifts(category);

-- RLS policies for barbell_lifts
ALTER TABLE barbell_lifts ENABLE ROW LEVEL SECURITY;

-- Everyone can view lifts
CREATE POLICY "Public can view barbell lifts"
  ON barbell_lifts FOR SELECT
  USING (true);

-- Only coaches can manage lifts
-- TODO: Add coach role check when auth system is extended

-- ============================================
-- SEED DATA: Benchmark Workouts
-- ============================================

INSERT INTO benchmark_workouts (name, type, description, display_order) VALUES
  ('Fran', 'For Time', '21-15-9 reps of:\nThrusters (43/29 kg)\nPull-ups', 1),
  ('Helen', 'For Time', '3 rounds for time:\n400m Run\n21 KB Swings (24/16 kg)\n12 Pull-ups', 2),
  ('Cindy', 'AMRAP', '20 min AMRAP:\n5 Pull-ups\n10 Push-ups\n15 Air Squats', 3),
  ('Diane', 'For Time', '21-15-9 reps of:\nDeadlifts (102/70 kg)\nHandstand Push-ups', 4),
  ('Grace', 'For Time', '30 Clean & Jerks for time (61/43 kg)', 5),
  ('Isabel', 'For Time', '30 Snatches for time (61/43 kg)', 6),
  ('Karen', 'For Time', '150 Wall Balls for time (9/6 kg)', 7),
  ('Annie', 'For Time', '50-40-30-20-10 reps of:\nDouble-unders\nSit-ups', 8),
  ('Jackie', 'For Time', 'For time:\n1000m Row\n50 Thrusters (20/15 kg)\n30 Pull-ups', 9),
  ('Elizabeth', 'For Time', '21-15-9 reps of:\nCleans (61/43 kg)\nRing Dips', 10),
  ('Eva', 'For Time', '5 rounds for time:\n800m Run\n30 KB Swings (32/24 kg)\n30 Pull-ups', 11),
  ('Kelly', 'For Time', '5 rounds for time:\n400m Run\n30 Box Jumps (60/50 cm)\n30 Wall Balls (9/6 kg)', 12),
  ('Lynne', 'Max Reps', '5 rounds for max reps:\nBodyweight Bench Press\nPull-ups', 13),
  ('Nancy', 'For Time', '5 rounds for time:\n400m Run\n15 Overhead Squats (43/29 kg)', 14),
  ('Amanda', 'For Time', '9-7-5 reps of:\nMuscle-ups\nSnatches (61/43 kg)', 15),
  ('Chelsea', 'EMOM', 'EMOM 30 min:\n5 Pull-ups\n10 Push-ups\n15 Air Squats', 16),
  ('DT', 'For Time', '5 rounds for time:\n12 Deadlifts (70/47 kg)\n9 Hang Power Cleans\n6 Push Jerks', 17),
  ('Fight Gone Bad', 'Max Reps', '3 rounds, 1 min each:\nWall Balls\nSDHP (34/25 kg)\nBox Jumps\nPush Press (34/25 kg)\nRow (calories)', 18),
  ('Filthy Fifty', 'For Time', 'For time:\n50 Box Jumps\n50 Jumping Pull-ups\n50 KB Swings\n50 Walking Lunges\n50 K2E\n50 Push Press\n50 Back Extensions\n50 Wall Balls\n50 Burpees\n50 Double-unders', 19),
  ('The Seven', 'For Time', '7 rounds for time:\n7 Handstand Push-ups\n7 Thrusters (61/43 kg)\n7 Knees to Elbows\n7 Deadlifts (111/75 kg)\n7 Burpees\n7 KB Swings (32/24 kg)\n7 Pull-ups', 20),
  ('Murph', 'For Time', 'For time:\n1 mile Run\n100 Pull-ups\n200 Push-ups\n300 Air Squats\n1 mile Run', 21)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- SEED DATA: Barbell Lifts
-- ============================================

INSERT INTO barbell_lifts (name, category, display_order) VALUES
  ('Back Squat', 'Squat', 1),
  ('Front Squat', 'Squat', 2),
  ('Overhead Squat', 'Squat', 3),
  ('Deadlift', 'Pull', 4),
  ('Sumo Deadlift', 'Pull', 5),
  ('Bench Press', 'Press', 6),
  ('Shoulder Press', 'Press', 7),
  ('Push Press', 'Press', 8),
  ('Jerk', 'Press', 9),
  ('Clean', 'Olympic', 10),
  ('Snatch', 'Olympic', 11)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE benchmark_workouts IS 'Coach-managed benchmark WODs for athlete tracking';
COMMENT ON TABLE barbell_lifts IS 'Coach-managed barbell lifts for athlete PR tracking';
COMMENT ON COLUMN benchmark_workouts.display_order IS 'Custom ordering for display in athlete UI';
COMMENT ON COLUMN barbell_lifts.display_order IS 'Custom ordering for display in athlete UI';
