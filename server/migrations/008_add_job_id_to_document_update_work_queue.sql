-- Add job_id reference to document_update_work_queue for end-to-end tracking
ALTER TABLE document_update_work_queue 
ADD COLUMN job_id INTEGER REFERENCES llm_work_queue(id) ON DELETE SET NULL;

-- Add index for efficient job tracking queries
CREATE INDEX idx_document_update_work_queue_job_id ON document_update_work_queue(job_id);
