-- Migration: 008_add_admin_moderation.sql
-- Description: Add moderation fields to properties for administrative oversight (BE-11)

ALTER TABLE properties
ADD COLUMN IF NOT EXISTS moderation_note TEXT,
ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_properties_moderated_at ON properties(moderated_at DESC);

-- Down Migration (Rollback):
-- ALTER TABLE properties DROP COLUMN IF EXISTS moderation_note, DROP COLUMN IF EXISTS moderated_at, DROP COLUMN IF EXISTS moderated_by;
-- DROP INDEX IF EXISTS idx_properties_moderated_at;
