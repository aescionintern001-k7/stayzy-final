import test from "node:test";
import assert from "node:assert/strict";
import {
  isDemoPropertyEligible,
  shouldOpenDemoSimulatorModal,
} from "../src/lib/checkout/demoEligibility.ts";
import { backendPropertyToFrontendRoom } from "../src/lib/api/adapters.ts";
import type { BackendProperty } from "../src/lib/api/types.ts";

test("Phase 9A.2: demo status true makes simulator UI visible", () => {
  assert.equal(isDemoPropertyEligible({ isDemo: true }, false), true);
  assert.equal(shouldOpenDemoSimulatorModal({ isDemo: true }, false), true);
});

test("Phase 9A.2: demo status false, undefined, or null hides simulator UI", () => {
  assert.equal(isDemoPropertyEligible({ isDemo: false }, false), false);
  assert.equal(isDemoPropertyEligible({ isDemo: undefined }, false), false);
  assert.equal(isDemoPropertyEligible({ isDemo: null }, false), false);
  assert.equal(isDemoPropertyEligible({}, false), false);
  assert.equal(isDemoPropertyEligible(null, false), false);
  assert.equal(isDemoPropertyEligible(undefined, false), false);
});

test("Phase 9A.2: loading state fails closed even if previous room had isDemo=true", () => {
  assert.equal(isDemoPropertyEligible({ isDemo: true }, true), false);
  assert.equal(shouldOpenDemoSimulatorModal({ isDemo: true }, true), false);
});

test("Phase 9A.2: switching from demo to non-demo property hides simulator UI", () => {
  const demoRoom = { isDemo: true };
  const realRoom = { isDemo: false };
  assert.equal(isDemoPropertyEligible(demoRoom, false), true);
  assert.equal(isDemoPropertyEligible(realRoom, false), false);
  assert.equal(shouldOpenDemoSimulatorModal(realRoom, false), false);
});

test("Phase 9A.2: [DEMO] text alone without trusted isDemo=true flag does not enable simulator", () => {
  const spoofedRoom = {
    name: "[DEMO] Spoofed Listing",
    property: { name: "[DEMO] Spoofed Property" },
    isDemo: false,
  } as unknown as Parameters<typeof isDemoPropertyEligible>[0];
  assert.equal(isDemoPropertyEligible(spoofedRoom, false), false);
  assert.equal(shouldOpenDemoSimulatorModal(spoofedRoom, false), false);
});

test("Phase 9A.2: adapter maps BackendProperty.is_demo strictly to boolean isDemo", () => {
  const baseProp: BackendProperty = {
    id: "11111111-1111-4111-8111-111111111111",
    host_id: "22222222-2222-4222-8222-222222222222",
    title: "[DEMO] Test",
    description: "Test",
    property_type: "apartment",
    room_type: "private_room",
    price_per_night: 1200,
    currency: "INR",
    address: "Test",
    city: "Bengaluru",
    country: "India",
    max_guests: 1,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    amenities: [],
    images: [],
    status: "active",
    is_available: true,
    average_rating: 4.8,
    reviews_count: 1,
    created_at: "2026-11-28T00:00:00Z",
    updated_at: "2026-11-28T00:00:00Z",
  };

  assert.equal(backendPropertyToFrontendRoom({ ...baseProp, is_demo: true }).isDemo, true);
  assert.equal(backendPropertyToFrontendRoom({ ...baseProp, is_demo: false }).isDemo, false);
  assert.equal(backendPropertyToFrontendRoom({ ...baseProp, is_demo: undefined }).isDemo, false);
  assert.equal(backendPropertyToFrontendRoom({ ...baseProp, is_demo: null }).isDemo, false);
});
