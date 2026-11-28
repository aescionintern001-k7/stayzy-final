import test from "node:test";
import assert from "node:assert/strict";
import pool from "../src/database/pool.js";
import {
  PROPERTY_COLUMNS,
  formatPropertyRow,
  listProperties,
  getPropertyById,
} from "../src/modules/properties/properties.service.js";
import {
  listRoomsService,
  getRoomDetailService,
} from "../src/modules/rooms/rooms.service.js";

const basePropertyRow = {
  id: "11111111-1111-4111-8111-111111111111",
  host_id: "22222222-2222-4222-8222-222222222222",
  title: "[DEMO] Stayzy Haven — Koramangala",
  description: "Sample listing",
  property_type: "apartment",
  room_type: "private_room",
  price_per_night: "22000",
  currency: "INR",
  address: "Sample Location",
  city: "Bengaluru",
  state: "Karnataka",
  country: "India",
  postal_code: "560034",
  latitude: "12.9352",
  longitude: "77.6245",
  max_guests: 2,
  bedrooms: 1,
  beds: 1,
  bathrooms: "1",
  amenities: ["WiFi", "AC"],
  images: ["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00"],
  status: "active",
  is_available: true,
  is_demo: false,
  tagline: null,
  rules: null,
  check_in_time: "12:00 PM",
  check_out_time: "11:00 AM",
  timezone: "Asia/Kolkata",
  gender_policy: "COLIVING",
  created_at: "2026-11-28T00:00:00Z",
  updated_at: "2026-11-28T00:00:00Z",
};

test("Phase 9A.3: PROPERTY_COLUMNS explicitly includes is_demo", () => {
  assert.equal(PROPERTY_COLUMNS.includes("is_demo"), true);
});

test("Phase 9A.3: formatPropertyRow returns strict boolean is_demo and fails closed", () => {
  assert.strictEqual(formatPropertyRow({ ...basePropertyRow, is_demo: true }).is_demo, true);
  assert.strictEqual(formatPropertyRow({ ...basePropertyRow, is_demo: false }).is_demo, false);
  assert.strictEqual(formatPropertyRow({ ...basePropertyRow, is_demo: undefined }).is_demo, false);
  assert.strictEqual(formatPropertyRow({ ...basePropertyRow, is_demo: null }).is_demo, false);
  assert.strictEqual(formatPropertyRow({ ...basePropertyRow, is_demo: "true" }).is_demo, false);
});

test("Phase 9A.3: listProperties exposes strict boolean is_demo on demo and real listings", async (t) => {
  const capturedQueries = [];
  t.mock.method(pool, "query", async (sql) => {
    capturedQueries.push(String(sql));
    if (String(sql).includes("COUNT(*)")) {
      return { rows: [{ total: 2 }] };
    }
    return {
      rows: [
        { ...basePropertyRow, id: "11111111-1111-4111-8111-111111111111", is_demo: true },
        { ...basePropertyRow, id: "33333333-3333-4333-8333-333333333333", title: "Real Stay", is_demo: false },
      ],
    };
  });

  const result = await listProperties({ city: "Bengaluru" });
  assert.equal(result.properties.length, 2);
  assert.strictEqual(result.properties[0].is_demo, true);
  assert.strictEqual(result.properties[1].is_demo, false);
  assert.equal(typeof result.properties[0].is_demo, "boolean");
  assert.equal(typeof result.properties[1].is_demo, "boolean");
  assert.ok(capturedQueries.some((q) => q.includes("p.is_demo")));
});

test("Phase 9A.3: getPropertyById exposes strict boolean is_demo on property detail", async (t) => {
  t.mock.method(pool, "query", async (sql) => {
    if (String(sql).includes("FROM properties p")) {
      return {
        rows: [
          {
            ...basePropertyRow,
            is_demo: true,
            host_full_name: "Demo Host",
            host_email: "demo.catalog@stayzy.local",
            host_phone: null,
            host_profile_image_url: null,
          },
        ],
      };
    }
    return { rows: [] };
  });

  const prop = await getPropertyById(basePropertyRow.id);
  assert.strictEqual(prop.is_demo, true);
  assert.equal(prop.title, basePropertyRow.title);
});

test("Phase 9A.3: listRooms selects p.is_demo and exposes strict boolean demo flags", async (t) => {
  const capturedQueries = [];
  const makeRoomRow = (id, propertyIsDemo) => ({
    id,
    name: "Executive Room",
    slug: `slug-${id}`,
    category: "PRIVATE",
    description: "Desc",
    size_sq_ft: 220,
    base_capacity: 1,
    max_capacity: 2,
    has_ac: true,
    bathroom_type: "ATTACHED",
    food_included: true,
    food_details: null,
    gender_eligibility: "COLIVING",
    amenities: ["WiFi"],
    images: [],
    property_id: basePropertyRow.id,
    property_is_demo: propertyIsDemo,
    property_title: "Property",
    property_description: "Desc",
    property_address: "Addr",
    property_city: "Bengaluru",
    property_state: "Karnataka",
    property_country: "India",
    property_images: [],
    property_tagline: null,
    property_rules: null,
    property_check_in_time: "12:00 PM",
    property_check_out_time: "11:00 AM",
    property_gender_policy: "COLIVING",
    property_rating: "4.8",
    property_reviews_count: 10,
    rate_plans_json: [
      {
        id: "rp-1",
        duration_type: "MONTHLY",
        price: 22000,
        deposit_amount: 10000,
        food_monthly_charge: 0,
        min_duration: 1,
        max_duration: 12,
        is_enabled: true,
      },
    ],
  });

  t.mock.method(pool, "query", async (sql) => {
    const q = String(sql);
    capturedQueries.push(q);
    if (q.includes("FROM room_types rt")) {
      return {
        rows: [
          makeRoomRow("44444444-4444-4444-8444-444444444444", true),
          makeRoomRow("55555555-5555-4555-8555-555555555555", false),
        ],
      };
    }
    if (q.includes("FROM rooms r")) {
      return { rows: [] };
    }
    return { rows: [] };
  });

  const res = await listRoomsService({ city: "Bengaluru", startDate: "2026-12-10" });
  assert.equal(res.rooms.length, 2);
  assert.strictEqual(res.rooms[0].isDemo, true);
  assert.strictEqual(res.rooms[0].property.is_demo, true);
  assert.strictEqual(res.rooms[1].isDemo, false);
  assert.strictEqual(res.rooms[1].property.is_demo, false);
  assert.ok(capturedQueries.some((q) => q.includes("p.is_demo AS property_is_demo")));
});

test("Phase 9A.3: getRoomDetailService selects p.is_demo and exposes strict boolean demo flags", async (t) => {
  const capturedQueries = [];
  t.mock.method(pool, "query", async (sql) => {
    const q = String(sql);
    capturedQueries.push(q);
    if (q.includes("FROM room_types rt")) {
      return {
        rows: [
          {
            id: "44444444-4444-4444-8444-444444444444",
            name: "Executive Room",
            slug: "demo-room",
            category: "PRIVATE",
            description: "Desc",
            size_sq_ft: 220,
            base_capacity: 1,
            max_capacity: 2,
            has_ac: true,
            bathroom_type: "ATTACHED",
            food_included: true,
            food_details: null,
            gender_eligibility: "COLIVING",
            amenities: ["WiFi"],
            images: [],
            property_id: basePropertyRow.id,
            property_is_demo: true,
            property_title: basePropertyRow.title,
            property_description: "Desc",
            property_address: "Addr",
            property_city: "Bengaluru",
            property_state: "Karnataka",
            property_country: "India",
            property_images: [],
            property_amenities: [],
            property_tagline: null,
            property_rules: null,
            property_check_in_time: "12:00 PM",
            property_check_out_time: "11:00 AM",
            property_gender_policy: "COLIVING",
            property_rating: "4.8",
            property_reviews_count: 10,
            rate_plans_json: [
              {
                id: "rp-1",
                duration_type: "MONTHLY",
                price: 22000,
                deposit_amount: 10000,
                food_monthly_charge: 0,
                min_duration: 1,
                max_duration: 12,
                is_enabled: true,
              },
            ],
          },
        ],
      };
    }
    return { rows: [] };
  });

  const detail = await getRoomDetailService("demo-room", { startDate: "2026-12-10" });
  assert.strictEqual(detail.room.isDemo, true);
  assert.strictEqual(detail.room.property.is_demo, true);
  assert.ok(capturedQueries.some((q) => q.includes("p.is_demo AS property_is_demo")));
});
