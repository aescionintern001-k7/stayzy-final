-- Migration: 007_create_reviews.sql
-- Description: Create reviews table and add rating aggregates to properties (BE-10)

-- 1. Add average_rating and reviews_count columns to properties
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3, 2) NOT NULL DEFAULT 0.00
    CHECK (average_rating >= 0 AND average_rating <= 5),
ADD COLUMN IF NOT EXISTS reviews_count INTEGER NOT NULL DEFAULT 0
    CHECK (reviews_count >= 0);

CREATE INDEX IF NOT EXISTS idx_properties_average_rating ON properties(average_rating DESC);

-- 2. Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(150),
    comment TEXT NOT NULL CHECK (char_length(comment) >= 5 AND char_length(comment) <= 2000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexes for high-performance querying
CREATE INDEX IF NOT EXISTS idx_reviews_property_id ON reviews(property_id);
CREATE INDEX IF NOT EXISTS idx_reviews_guest_id ON reviews(guest_id);
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

-- Down Migration (Rollback):
-- DROP TABLE IF EXISTS reviews;
-- ALTER TABLE properties DROP COLUMN IF EXISTS average_rating, DROP COLUMN IF EXISTS reviews_count;
