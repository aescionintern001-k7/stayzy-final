-- Migration: 004_add_search_indexes.sql
-- Description: Add search and filtering performance indexes for BE-07

CREATE INDEX IF NOT EXISTS idx_properties_amenities ON properties USING gin (amenities);
CREATE INDEX IF NOT EXISTS idx_properties_country ON properties(country);
CREATE INDEX IF NOT EXISTS idx_properties_status_available ON properties(status, is_available);
CREATE INDEX IF NOT EXISTS idx_properties_max_guests ON properties(max_guests);

-- Down Migration (Rollback):
-- DROP INDEX IF EXISTS idx_properties_amenities;
-- DROP INDEX IF EXISTS idx_properties_country;
-- DROP INDEX IF EXISTS idx_properties_status_available;
-- DROP INDEX IF EXISTS idx_properties_max_guests;
