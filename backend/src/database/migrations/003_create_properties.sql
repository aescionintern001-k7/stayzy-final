-- Migration: 003_create_properties.sql
-- Description: Create properties table for accommodation listings (BE-06)

CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    property_type VARCHAR(50) NOT NULL DEFAULT 'apartment'
        CHECK (property_type IN ('apartment', 'house', 'villa', 'condo', 'cottage', 'cabin', 'studio', 'chalet', 'other')),
    room_type VARCHAR(50) NOT NULL DEFAULT 'entire_place'
        CHECK (room_type IN ('entire_place', 'private_room', 'shared_room', 'hotel_room')),
    price_per_night NUMERIC(10, 2) NOT NULL
        CHECK (price_per_night > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    country VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    max_guests INTEGER NOT NULL DEFAULT 1
        CHECK (max_guests >= 1),
    bedrooms INTEGER NOT NULL DEFAULT 1
        CHECK (bedrooms >= 0),
    beds INTEGER NOT NULL DEFAULT 1
        CHECK (beds >= 0),
    bathrooms NUMERIC(3, 1) NOT NULL DEFAULT 1.0
        CHECK (bathrooms >= 0),
    amenities JSONB NOT NULL DEFAULT '[]'::jsonb,
    images JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'archived', 'draft')),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_properties_host_id ON properties(host_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_property_type ON properties(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price_per_night);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at DESC);

-- Down Migration (Rollback):
-- DROP TABLE IF EXISTS properties;
