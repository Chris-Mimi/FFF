-- EMERGENCY RESTORE: Recreate deleted movement tables
-- Date: 2025-12-06
-- Issue: Tables were dropped by unified movement system migration
-- Solution: Restore original tables with seed data

-- ============================================
-- Drop movements table (empty anyway)
-- ============================================
DROP TABLE IF EXISTS movements CASCADE;

-- ============================================
-- RESTORE: benchmark_workouts table
-- ============================================

CREATE TABLE IF NOT EXISTS benchmark_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  has_scaling BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_benchmark_workouts_display_order
ON benchmark_workouts(display_order);

ALTER TABLE benchmark_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view benchmark workouts"
  ON benchmark_workouts FOR SELECT
  USING (true);

-- ============================================
-- RESTORE: barbell_lifts table
-- ============================================

CREATE TABLE IF NOT EXISTS barbell_lifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_barbell_lifts_display_order
ON barbell_lifts(display_order);

CREATE INDEX IF NOT EXISTS idx_barbell_lifts_category
ON barbell_lifts(category);

ALTER TABLE barbell_lifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view barbell lifts"
  ON barbell_lifts FOR SELECT
  USING (true);

-- ============================================
-- RESTORE: forge_benchmarks table
-- ============================================

CREATE TABLE IF NOT EXISTS forge_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  has_scaling BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forge_benchmarks_display_order
ON forge_benchmarks(display_order);

ALTER TABLE forge_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view forge benchmarks"
  ON forge_benchmarks FOR SELECT
  USING (true);

CREATE POLICY "Coaches can insert forge benchmarks"
  ON forge_benchmarks FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  );

CREATE POLICY "Coaches can update forge benchmarks"
  ON forge_benchmarks FOR UPDATE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  );

CREATE POLICY "Coaches can delete forge benchmarks"
  ON forge_benchmarks FOR DELETE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  );

-- ============================================
-- RESTORE SEED DATA: Benchmark Workouts
-- ============================================

INSERT INTO benchmark_workouts (name, type, description, display_order, has_scaling) VALUES
  ('Fran', 'For Time', '21-15-9 reps of:\nThrusters (43/29 kg)\nPull-ups', 1, true),
  ('Helen', 'For Time', '3 rounds for time:\n400m Run\n21 KB Swings (24/16 kg)\n12 Pull-ups', 2, true),
  ('Cindy', 'AMRAP', '20 min AMRAP:\n5 Pull-ups\n10 Push-ups\n15 Air Squats', 3, true),
  ('Diane', 'For Time', '21-15-9 reps of:\nDeadlifts (102/70 kg)\nHandstand Push-ups', 4, true),
  ('Grace', 'For Time', '30 Clean & Jerks for time (61/43 kg)', 5, true),
  ('Isabel', 'For Time', '30 Snatches for time (61/43 kg)', 6, true),
  ('Karen', 'For Time', '150 Wall Balls for time (9/6 kg)', 7, true),
  ('Annie', 'For Time', '50-40-30-20-10 reps of:\nDouble-unders\nSit-ups', 8, true),
  ('Jackie', 'For Time', 'For time:\n1000m Row\n50 Thrusters (20/15 kg)\n30 Pull-ups', 9, true),
  ('Elizabeth', 'For Time', '21-15-9 reps of:\nCleans (61/43 kg)\nRing Dips', 10, true),
  ('Eva', 'For Time', '5 rounds for time:\n800m Run\n30 KB Swings (32/24 kg)\n30 Pull-ups', 11, true),
  ('Kelly', 'For Time', '5 rounds for time:\n400m Run\n30 Box Jumps (60/50 cm)\n30 Wall Balls (9/6 kg)', 12, true),
  ('Lynne', 'Max Reps', '5 rounds for max reps:\nBodyweight Bench Press\nPull-ups', 13, true),
  ('Nancy', 'For Time', '5 rounds for time:\n400m Run\n15 Overhead Squats (43/29 kg)', 14, true),
  ('Amanda', 'For Time', '9-7-5 reps of:\nMuscle-ups\nSnatches (61/43 kg)', 15, true),
  ('Chelsea', 'EMOM', 'EMOM 30 min:\n5 Pull-ups\n10 Push-ups\n15 Air Squats', 16, true),
  ('DT', 'For Time', '5 rounds for time:\n12 Deadlifts (70/47 kg)\n9 Hang Power Cleans\n6 Push Jerks', 17, true),
  ('Fight Gone Bad', 'Max Reps', '3 rounds, 1 min each:\nWall Balls\nSDHP (34/25 kg)\nBox Jumps\nPush Press (34/25 kg)\nRow (calories)', 18, true),
  ('Filthy Fifty', 'For Time', 'For time:\n50 Box Jumps\n50 Jumping Pull-ups\n50 KB Swings\n50 Walking Lunges\n50 K2E\n50 Push Press\n50 Back Extensions\n50 Wall Balls\n50 Burpees\n50 Double-unders', 19, true),
  ('The Seven', 'For Time', '7 rounds for time:\n7 Handstand Push-ups\n7 Thrusters (61/43 kg)\n7 Knees to Elbows\n7 Deadlifts (111/75 kg)\n7 Burpees\n7 KB Swings (32/24 kg)\n7 Pull-ups', 20, true),
  ('Murph', 'For Time', 'For time:\n1 mile Run\n100 Pull-ups\n200 Push-ups\n300 Air Squats\n1 mile Run', 21, true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- RESTORE SEED DATA: Barbell Lifts
-- ============================================

INSERT INTO barbell_lifts (name, category, display_order) VALUES
  ('Snatch', 'Olympic Lifts', 1),
  ('Clean', 'Olympic Lifts', 2),
  ('Clean & Jerk', 'Olympic Lifts', 3),
  ('Back Squat', 'Squats', 4),
  ('Front Squat', 'Squats', 5),
  ('Overhead Squat', 'Squats', 6),
  ('Shoulder Press', 'Pressing', 7),
  ('Push Press', 'Pressing', 8),
  ('Push Jerk', 'Pressing', 9),
  ('Bench Press', 'Pressing', 10),
  ('Deadlift', 'Pulling', 11),
  ('Sumo Deadlift', 'Pulling', 12),
  ('Power Clean', 'Olympic Lifts', 13),
  ('Power Snatch', 'Olympic Lifts', 14),
  ('Hang Clean', 'Olympic Lifts', 15),
  ('Hang Snatch', 'Olympic Lifts', 16)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- RESTORE: lift_records table
-- ============================================

CREATE TABLE IF NOT EXISTS lift_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lift_name TEXT NOT NULL,
  weight_kg NUMERIC(6,2) NOT NULL CHECK (weight_kg > 0),
  reps INTEGER NOT NULL CHECK (reps > 0),
  calculated_1rm NUMERIC(6,2),
  rep_max_type TEXT CHECK (rep_max_type IN ('1RM', '3RM', '5RM', '10RM') OR rep_max_type IS NULL),
  rep_scheme TEXT,
  notes TEXT,
  lift_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT rep_type_xor CHECK (
    (rep_max_type IS NOT NULL AND rep_scheme IS NULL) OR
    (rep_max_type IS NULL AND rep_scheme IS NOT NULL) OR
    (rep_max_type IS NULL AND rep_scheme IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_lift_records_user_id ON lift_records(user_id);
CREATE INDEX IF NOT EXISTS idx_lift_records_lift_name ON lift_records(lift_name);
CREATE INDEX IF NOT EXISTS idx_lift_records_date ON lift_records(lift_date DESC);
CREATE INDEX IF NOT EXISTS idx_lift_records_user_lift ON lift_records(user_id, lift_name, lift_date DESC);

ALTER TABLE lift_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lift records"
  ON lift_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lift records"
  ON lift_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lift records"
  ON lift_records FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own lift records"
  ON lift_records FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE benchmark_workouts IS 'Coach-managed benchmark WODs for athlete tracking';
COMMENT ON TABLE barbell_lifts IS 'Coach-managed barbell lifts for athlete PR tracking';
COMMENT ON TABLE forge_benchmarks IS 'Gym-specific benchmark WODs for Forge Functional Fitness';
COMMENT ON TABLE lift_records IS 'Athlete lift performance records from workouts and PR testing';
COMMENT ON COLUMN lift_records.rep_max_type IS 'For actual RM tests: 1RM, 3RM, 5RM, 10RM';
COMMENT ON COLUMN lift_records.rep_scheme IS 'For workout rep patterns: 5x5, 3x10, 21-15-9, etc';
COMMENT ON COLUMN lift_records.calculated_1rm IS 'Estimated 1RM using Epley formula';
