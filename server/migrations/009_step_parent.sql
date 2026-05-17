ALTER TABLE steps
ADD COLUMN parent_id UUID REFERENCES steps(id);
