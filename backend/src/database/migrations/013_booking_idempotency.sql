-- 013_booking_idempotency.sql
-- Adds nullable idempotency tracking to bookings so network-timeout retries
-- return the original booking instead of creating duplicates or failing on a consumed hold.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(120),
  ADD COLUMN IF NOT EXISTS idempotency_payload_hash VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_guest_idempotency_key
  ON bookings (guest_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
