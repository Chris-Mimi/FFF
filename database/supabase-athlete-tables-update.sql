-- Add missing columns to existing tables
ALTER TABLE benchmark_results 
ADD COLUMN IF NOT EXISTS scaling TEXT;

ALTER TABLE lift_records 
ADD COLUMN IF NOT EXISTS rep_max_type TEXT;
