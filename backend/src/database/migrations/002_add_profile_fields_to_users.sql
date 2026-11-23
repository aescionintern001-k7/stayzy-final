-- Migration: 002_add_profile_fields_to_users.sql
-- Description: Add phone and profile_image_url columns to users table for BE-05

ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone VARCHAR(20) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS profile_image_url TEXT DEFAULT NULL;

-- Down Migration (Rollback):
-- ALTER TABLE users DROP COLUMN IF EXISTS phone;
-- ALTER TABLE users DROP COLUMN IF EXISTS profile_image_url;
