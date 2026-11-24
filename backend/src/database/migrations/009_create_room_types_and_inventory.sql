-- Migration: 009_create_room_types_and_inventory.sql
-- Description: Create room_types, rate_plans, rooms, inventory_units, and inventory_holds tables for Stayzy full accommodation hierarchy

-- 1. Create room_types table
CREATE TABLE IF NOT EXISTS room_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) UNIQUE,
    category VARCHAR(50) NOT NULL DEFAULT 'PRIVATE'
        CHECK (category IN ('PRIVATE', 'TWIN_SHARING', 'TRIPLE_SHARING', 'DORMITORY', 'STUDIO')),
    description TEXT,
    size_sq_ft INTEGER NOT NULL DEFAULT 180 CHECK (size_sq_ft > 0),
    base_capacity INTEGER NOT NULL DEFAULT 1 CHECK (base_capacity >= 1),
    max_capacity INTEGER NOT NULL DEFAULT 1 CHECK (max_capacity >= 1),
    has_ac BOOLEAN NOT NULL DEFAULT TRUE,
    bathroom_type VARCHAR(20) NOT NULL DEFAULT 'ATTACHED'
        CHECK (bathroom_type IN ('ATTACHED', 'COMMON')),
    food_included BOOLEAN NOT NULL DEFAULT FALSE,
    food_details TEXT,
    amenities JSONB NOT NULL DEFAULT '[]'::jsonb,
    images JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_room_types_property_id ON room_types(property_id);
CREATE INDEX IF NOT EXISTS idx_room_types_category ON room_types(category);
CREATE INDEX IF NOT EXISTS idx_room_types_slug ON room_types(slug);

-- 2. Create rate_plans table (supports HOURLY, DAILY, WEEKLY, MONTHLY, YEARLY)
CREATE TABLE IF NOT EXISTS rate_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
    duration_type VARCHAR(20) NOT NULL
        CHECK (duration_type IN ('HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY')),
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    min_duration INTEGER NOT NULL DEFAULT 1 CHECK (min_duration >= 1),
    max_duration INTEGER,
    allowed_hours_start VARCHAR(10) DEFAULT '08:00',
    allowed_hours_end VARCHAR(10) DEFAULT '22:00',
    deposit_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (deposit_amount >= 0),
    food_monthly_charge NUMERIC(10, 2) DEFAULT 0.00 CHECK (food_monthly_charge >= 0),
    electricity_rule TEXT DEFAULT 'Included in rent',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_room_type_duration UNIQUE (room_type_id, duration_type)
);

CREATE INDEX IF NOT EXISTS idx_rate_plans_room_type ON rate_plans(room_type_id);
CREATE INDEX IF NOT EXISTS idx_rate_plans_duration_type ON rate_plans(duration_type);

-- 3. Create physical rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
    room_number VARCHAR(50) NOT NULL,
    floor INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'maintenance')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rooms_room_type_id ON rooms(room_type_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);

-- 4. Create inventory_units table (individual beds or private rooms)
CREATE TABLE IF NOT EXISTS inventory_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    identifier VARCHAR(50) NOT NULL,
    is_bed BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'available'
        CHECK (status IN ('available', 'maintenance', 'blocked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_units_room_id ON inventory_units(room_id);
CREATE INDEX IF NOT EXISTS idx_inventory_units_status ON inventory_units(status);

-- 5. Extend bookings table safely for room_type and inventory
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS room_type_id UUID REFERENCES room_types(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS inventory_unit_id UUID REFERENCES inventory_units(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS duration_type VARCHAR(20) DEFAULT 'DAILY',
ADD COLUMN IF NOT EXISTS duration_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS food_charges NUMERIC(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS taxes NUMERIC(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS payable_now NUMERIC(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS balance_remaining NUMERIC(10, 2) DEFAULT 0.00;

CREATE INDEX IF NOT EXISTS idx_bookings_room_type ON bookings(room_type_id);
CREATE INDEX IF NOT EXISTS idx_bookings_inventory_unit ON bookings(inventory_unit_id);

-- 6. Create inventory_holds table for 15-minute checkout reservation locking
CREATE TABLE IF NOT EXISTS inventory_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(100) UNIQUE NOT NULL,
    room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
    inventory_unit_id UUID REFERENCES inventory_units(id) ON DELETE SET NULL,
    duration_type VARCHAR(20) NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    guest_email VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_holds_expires_at ON inventory_holds(expires_at);
CREATE INDEX IF NOT EXISTS idx_inventory_holds_token ON inventory_holds(token);
CREATE INDEX IF NOT EXISTS idx_inventory_holds_unit_dates ON inventory_holds(inventory_unit_id, start_time, end_time);
