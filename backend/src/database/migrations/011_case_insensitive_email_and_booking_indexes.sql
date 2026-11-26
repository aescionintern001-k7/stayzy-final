-- Migration: 011_case_insensitive_email_and_booking_indexes.sql
-- Enforce case-insensitive email uniqueness in PostgreSQL and optimize concurrent booking overlap queries

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower
  ON users (LOWER(email));

CREATE INDEX IF NOT EXISTS idx_bookings_property_dates_active
  ON bookings (property_id, check_in_date, check_out_date)
  WHERE status IN ('pending', 'confirmed');
