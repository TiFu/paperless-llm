-- Migration: Change jobs.document_id from TEXT to BIGINT (numeric)
-- 1. Add a new column for numeric document_id
ALTER TABLE jobs ADD COLUMN document_id_numeric INTEGER;

-- 2. Copy and cast existing values (assumes all are valid numbers)
UPDATE jobs SET document_id_numeric = document_id::INTEGER;

-- 3. Drop the old column
ALTER TABLE jobs DROP COLUMN document_id;

-- 4. Rename the new column to document_id
ALTER TABLE jobs RENAME COLUMN document_id_numeric TO document_id;

-- 5. (Optional) Add NOT NULL or other constraints if needed
-- ALTER TABLE jobs ALTER COLUMN document_id SET NOT NULL;
