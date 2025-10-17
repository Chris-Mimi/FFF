-- Add scaling column to benchmark_results table
-- This allows athletes to track whether they performed the benchmark as prescribed (Rx) or scaled

ALTER TABLE benchmark_results
ADD COLUMN IF NOT EXISTS scaling VARCHAR(10) DEFAULT 'Rx';

-- Add a constraint to ensure only valid scaling options are stored
ALTER TABLE benchmark_results
ADD CONSTRAINT valid_scaling CHECK (scaling IN ('Rx', 'Sc1', 'Sc2', 'Sc3'));

-- Add an index on scaling for faster filtering
CREATE INDEX IF NOT EXISTS idx_benchmark_results_scaling ON benchmark_results(scaling);

-- Update existing records to have 'Rx' scaling (assuming all existing records were Rx)
UPDATE benchmark_results
SET scaling = 'Rx'
WHERE scaling IS NULL;
