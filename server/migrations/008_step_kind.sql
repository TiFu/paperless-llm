ALTER TABLE steps
ADD COLUMN kind VARCHAR(16) NOT NULL DEFAULT 'executable' CHECK (kind IN ('executable', 'manual', 'composite'));
