-- Migration: Add feedback fields to practice_sessions table
-- Run this migration to add structured feedback storage

-- Add overall_band column
ALTER TABLE practice_sessions 
ADD COLUMN IF NOT EXISTS overall_band DECIMAL(3, 2);

-- Add feedback_strengths column (JSON array as text)
ALTER TABLE practice_sessions 
ADD COLUMN IF NOT EXISTS feedback_strengths TEXT;

-- Add feedback_improvements column (JSON array as text)
ALTER TABLE practice_sessions 
ADD COLUMN IF NOT EXISTS feedback_improvements TEXT;

-- Add feedback_corrections column (JSON array as text)
ALTER TABLE practice_sessions 
ADD COLUMN IF NOT EXISTS feedback_corrections TEXT;

-- Update existing records to have default empty arrays for JSON fields
UPDATE practice_sessions 
SET feedback_strengths = '[]' 
WHERE feedback_strengths IS NULL AND feedback IS NOT NULL;

UPDATE practice_sessions 
SET feedback_improvements = '[]' 
WHERE feedback_improvements IS NULL AND feedback IS NOT NULL;

UPDATE practice_sessions 
SET feedback_corrections = '[]' 
WHERE feedback_corrections IS NULL AND feedback IS NOT NULL;

-- Create index on overall_band for faster queries
CREATE INDEX IF NOT EXISTS idx_practice_sessions_overall_band 
ON practice_sessions(overall_band);

-- Verify migration
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'practice_sessions' 
AND column_name IN ('overall_band', 'feedback_strengths', 'feedback_improvements', 'feedback_corrections');

