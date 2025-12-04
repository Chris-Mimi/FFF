-- Create WOD Section Results table for tracking athlete scores per WOD section
-- This allows tracking of Time/Reps/Weight/Scaling for each WOD part

CREATE TABLE IF NOT EXISTS wod_section_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  wod_id UUID REFERENCES wods(id) ON DELETE CASCADE NOT NULL,
  section_id TEXT NOT NULL, -- Section ID from the workout sections array
  workout_date DATE NOT NULL,

  -- Result fields (at least one should be filled)
  time_result TEXT, -- e.g., "12:34", "DNF", "Cap+12"
  reps_result INTEGER, -- Total reps completed
  weight_result DECIMAL(6,2), -- Total weight (kg)
  scaling_level TEXT, -- "Rx", "Sc1", "Sc2", "Sc3"

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one result per user per section per date
  UNIQUE(user_id, wod_id, section_id, workout_date)
);

-- Enable RLS
ALTER TABLE wod_section_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Athletes
CREATE POLICY "Athletes can view own section results" ON wod_section_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Athletes can insert own section results" ON wod_section_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Athletes can update own section results" ON wod_section_results
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Athletes can delete own section results" ON wod_section_results
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for Coaches (PUBLIC for now, matching existing pattern)
CREATE POLICY "PUBLIC can view all section results" ON wod_section_results
  FOR SELECT USING (true);

CREATE POLICY "PUBLIC can insert section results" ON wod_section_results
  FOR INSERT WITH CHECK (true);

CREATE POLICY "PUBLIC can update section results" ON wod_section_results
  FOR UPDATE USING (true);

CREATE POLICY "PUBLIC can delete section results" ON wod_section_results
  FOR DELETE USING (true);

-- Index for faster queries
CREATE INDEX idx_wod_section_results_user_date ON wod_section_results(user_id, workout_date);
CREATE INDEX idx_wod_section_results_wod_section ON wod_section_results(wod_id, section_id);
