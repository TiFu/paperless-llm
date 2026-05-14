
CREATE TABLE job_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  field varchar(50) NOT NULL,
  CONSTRAINT job_fields_jobid_field_unique UNIQUE (job_id, field)
);

CREATE INDEX idx_jobs_fields ON job_fields(job_id);
