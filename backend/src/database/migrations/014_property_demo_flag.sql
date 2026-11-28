-- Additive, idempotent migration to mark demo/sample properties explicitly in PostgreSQL.
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;
