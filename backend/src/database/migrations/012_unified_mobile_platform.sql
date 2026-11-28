-- Migration 012: Unified Mobile & Web Platform Extensions
-- Strictly additive & idempotent. Preserves all existing 001..011 tables and records.

-- 1. Extend bookings table for multi-duration stays (HOURLY..YEARLY), holds, guest metadata, and mobile lifecycle
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS booking_reference VARCHAR(50),
  ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS base_price NUMERIC(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS guest_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS guest_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS guest_phone VARCHAR(30),
  ADD COLUMN IF NOT EXISTS keyless_code VARCHAR(30),
  ADD COLUMN IF NOT EXISTS notes TEXT;

UPDATE bookings
SET
  start_time = COALESCE(start_time, check_in_date::timestamptz),
  end_time = COALESCE(end_time, check_out_date::timestamptz),
  booking_reference = COALESCE(
    booking_reference,
    'STY-' || TO_CHAR(COALESCE(created_at, NOW()), 'YYYY') || '-' || UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 6))
  )
WHERE start_time IS NULL
   OR end_time IS NULL
   OR booking_reference IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_booking_reference
  ON bookings (booking_reference)
  WHERE booking_reference IS NOT NULL;

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS chk_bookings_dates;
ALTER TABLE bookings
  ADD CONSTRAINT chk_bookings_dates
  CHECK (
    (check_out_date > check_in_date)
    OR (
      duration_type = 'HOURLY'
      AND check_out_date >= check_in_date
      AND end_time IS NOT NULL
      AND start_time IS NOT NULL
      AND end_time > start_time
    )
  );

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'completed'));

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_payment_status_check
  CHECK (payment_status IN ('unpaid', 'pending', 'held', 'paid', 'failed', 'refunded', 'partially_refunded'));

-- 2. Extend room_types and properties
ALTER TABLE room_types
  ADD COLUMN IF NOT EXISTS gender_eligibility VARCHAR(20) NOT NULL DEFAULT 'COLIVING',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE room_types DROP CONSTRAINT IF EXISTS chk_room_types_gender_eligibility;
ALTER TABLE room_types
  ADD CONSTRAINT chk_room_types_gender_eligibility
  CHECK (gender_eligibility IN ('COLIVING', 'MALE', 'FEMALE'));

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS tagline VARCHAR(255),
  ADD COLUMN IF NOT EXISTS rules TEXT,
  ADD COLUMN IF NOT EXISTS check_in_time VARCHAR(30) DEFAULT '12:00 PM',
  ADD COLUMN IF NOT EXISTS check_out_time VARCHAR(30) DEFAULT '11:00 AM',
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(60) DEFAULT 'Asia/Kolkata',
  ADD COLUMN IF NOT EXISTS gender_policy VARCHAR(20) DEFAULT 'COLIVING';

-- 3. Extend inventory_holds, visit_requests, support_tickets
ALTER TABLE inventory_holds
  ADD COLUMN IF NOT EXISTS guest_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS duration_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10, 2);

ALTER TABLE visit_requests
  ADD COLUMN IF NOT EXISTS room_type_id UUID REFERENCES room_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'NORMAL',
  ADD COLUMN IF NOT EXISTS replied_by UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS chk_support_tickets_priority;
ALTER TABLE support_tickets
  ADD CONSTRAINT chk_support_tickets_priority
  CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT'));

-- 4. Payment schedules table (created before payments FK)
CREATE TABLE IF NOT EXISTS payment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  description VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'CANCELLED')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Extend payments table for idempotency, schedules, webhook links, and dev simulator marking
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS provider VARCHAR(30) NOT NULL DEFAULT 'RAZORPAY',
  ADD COLUMN IF NOT EXISTS payment_schedule_id UUID REFERENCES payment_schedules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(120),
  ADD COLUMN IF NOT EXISTS webhook_event_id VARCHAR(120),
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_idempotency_key
  ON payments (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_webhook_event_id
  ON payments (webhook_event_id)
  WHERE webhook_event_id IS NOT NULL;

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments
  ADD CONSTRAINT payments_status_check
  CHECK (status IN ('created', 'pending', 'captured', 'failed', 'refunded'));

-- 6. New tables for auth, inventory blocks, refunds, webhooks, CMS, settings, audit logs, and favorites
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  device_label VARCHAR(120),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS availability_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_unit_id UUID NOT NULL REFERENCES inventory_units(id) ON DELETE CASCADE,
  reason VARCHAR(40) NOT NULL DEFAULT 'MAINTENANCE' CHECK (reason IN ('MAINTENANCE', 'CLEANING', 'OFFLINE_HOLD')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_availability_blocks_window CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  razorpay_refund_id VARCHAR(100),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED', 'PROCESSED', 'REJECTED', 'FAILED')),
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(30) NOT NULL DEFAULT 'RAZORPAY',
  event_id VARCHAR(160) NOT NULL UNIQUE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS site_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) NOT NULL UNIQUE,
  value JSONB NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_email VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id VARCHAR(100),
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_favorites (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, room_type_id)
);

-- 7. Additive Performance Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_unit_time ON bookings (inventory_unit_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_bookings_room_type ON bookings (room_type_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens (user_id, revoked_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_availability_blocks_unit_time ON availability_blocks (inventory_unit_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_booking ON payment_schedules (booking_id, due_date);
CREATE INDEX IF NOT EXISTS idx_refunds_booking ON refunds (booking_id, requested_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visit_requests_user ON visit_requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets (user_id, created_at DESC);

-- 8. Default Non-Destructive CMS & Public Platform Settings Seed
INSERT INTO site_content (key, value)
VALUES
  (
    'hero_content',
    '{
      "title": "Modern Co-Living & Stays, Designed for Effortless Living",
      "subtitle": "Hourly, Daily, Weekly, Monthly & Yearly stays across verified hubs with transparent billing.",
      "primaryCta": "Explore Stays",
      "secondaryCta": "Schedule Walkthrough"
    }'::jsonb
  ),
  (
    'faq_content',
    '[
      {"question": "What flexible stay durations does Stayzy offer?", "answer": "You can reserve verified stays for Hourly, Daily, Weekly, Monthly, or Yearly plans with transparent deposits."},
      {"question": "How is the security deposit handled?", "answer": "Security deposits are 100% refundable after move-out inspection according to Stayzy cancellation & house policies."},
      {"question": "Can I schedule a walkthrough visit before booking?", "answer": "Yes! Use the Schedule Walkthrough Visit option on any property to book an in-person tour."}
    ]'::jsonb
  ),
  (
    'rules_content',
    '[
      "Quiet hours from 10:30 PM to 6:30 AM across residential co-living floors.",
      "Standard check-in is 12:00 PM and check-out is 11:00 AM unless booked under an Hourly slot.",
      "Valid government-issued photo ID is required during digital or desk check-in.",
      "Free cancellation up to 48 hours prior to check-in (50% base rent charge between 24-48h; full deposit refunded)."
    ]'::jsonb
  ),
  (
    'contact_content',
    '{
      "brandName": "Stayzy",
      "supportPhone": "+91 98765 00001",
      "supportEmail": "concierge@stayzy.com",
      "headquarters": "Koramangala 4th Block, Bengaluru, Karnataka 560034",
      "deskHours": "Mon - Sun, 9:00 AM - 9:00 PM IST"
    }'::jsonb
  )
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_settings (key, value, is_public)
VALUES
  (
    'platform_config',
    '{
      "propertyName": "Stayzy Bengaluru Flagship",
      "currency": "INR",
      "gstRatePercent": 12,
      "cleaningBufferMinutes": 60,
      "holdTtlMinutes": 15,
      "standardCheckInTime": "12:00 PM",
      "standardCheckOutTime": "11:00 AM",
      "supportPhone": "+91 98765 00001",
      "supportEmail": "concierge@stayzy.com",
      "enableHourlyBookings": true,
      "enableWalkthroughVisits": true
    }'::jsonb,
    TRUE
  )
ON CONFLICT (key) DO NOTHING;
