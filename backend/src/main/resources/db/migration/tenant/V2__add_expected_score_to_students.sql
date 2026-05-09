-- Add expected_score column to students table if it doesn't exist
-- This migration handles cases where the table already exists with behavior_score

-- For new tenants, the expected_score will be created by V1__init_tenant_schema.sql
-- For existing tenants, we need to rename or add the column

ALTER TABLE IF EXISTS students
ADD COLUMN IF NOT EXISTS expected_score INT NOT NULL DEFAULT 80;

-- If the old behavior_score column exists and expected_score doesn't, copy data
UPDATE students 
SET expected_score = COALESCE(behavior_score, 80)
WHERE expected_score = 80 AND behavior_score IS NOT NULL AND behavior_score != 80;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_students_expected_score ON students(expected_score);
