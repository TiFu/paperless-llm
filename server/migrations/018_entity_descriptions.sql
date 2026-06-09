CREATE TABLE entity_descriptions (
  entity_type   VARCHAR(50) NOT NULL,
  paperless_id  INTEGER     NOT NULL,
  name          TEXT        NOT NULL,
  description   TEXT,
  synced_at     TIMESTAMP   NOT NULL DEFAULT NOW(),
  PRIMARY KEY (entity_type, paperless_id)
);
