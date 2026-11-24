import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import app from "../src/app.js";
import pool from "../src/database/pool.js";
import { env } from "../src/config/env.js";

let server;
let baseUrl;

// Test fixtures
let adminUser;
let hostUser1;
let hostUser2;
let guestUser;
let suspendedHost;

let adminToken;
let hostToken1;
let hostToken2;
let guestToken;
let suspendedHostToken;

let createdProperty1;
let createdProperty2;

const createToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    env.JWT_SECRET,
    { expiresIn: "1h" }
  );
};

test.before(async () => {
  // Start ephemeral server
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}/api/v1`;
      resolve();
    });
  });

  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const passwordHash = await bcrypt.hash("Password123!", 10);

  // Insert Admin
  const adminRes = await pool.query(
    `
      INSERT INTO users (full_name, email, password_hash, role, account_status)
      VALUES ($1, $2, $3, 'admin', 'active')
      RETURNING id, full_name, email, role, account_status
    `,
    [`Admin Test ${uniqueSuffix}`, `prop_admin_${uniqueSuffix}@example.com`, passwordHash]
  );
  adminUser = adminRes.rows[0];
  adminToken = createToken(adminUser);

  // Insert Host 1
  const host1Res = await pool.query(
    `
      INSERT INTO users (full_name, email, password_hash, role, account_status, phone)
      VALUES ($1, $2, $3, 'host', 'active', '+1234567890')
      RETURNING id, full_name, email, role, account_status, phone
    `,
    [`Host One ${uniqueSuffix}`, `prop_host1_${uniqueSuffix}@example.com`, passwordHash]
  );
  hostUser1 = host1Res.rows[0];
  hostToken1 = createToken(hostUser1);

  // Insert Host 2
  const host2Res = await pool.query(
    `
      INSERT INTO users (full_name, email, password_hash, role, account_status)
      VALUES ($1, $2, $3, 'host', 'active')
      RETURNING id, full_name, email, role, account_status
    `,
    [`Host Two ${uniqueSuffix}`, `prop_host2_${uniqueSuffix}@example.com`, passwordHash]
  );
  hostUser2 = host2Res.rows[0];
  hostToken2 = createToken(hostUser2);

  // Insert Guest
  const guestRes = await pool.query(
    `
      INSERT INTO users (full_name, email, password_hash, role, account_status)
      VALUES ($1, $2, $3, 'guest', 'active')
      RETURNING id, full_name, email, role, account_status
    `,
    [`Guest User ${uniqueSuffix}`, `prop_guest_${uniqueSuffix}@example.com`, passwordHash]
  );
  guestUser = guestRes.rows[0];
  guestToken = createToken(guestUser);

  // Insert Suspended Host
  const suspendedRes = await pool.query(
    `
      INSERT INTO users (full_name, email, password_hash, role, account_status)
      VALUES ($1, $2, $3, 'host', 'suspended')
      RETURNING id, full_name, email, role, account_status
    `,
    [`Suspended Host ${uniqueSuffix}`, `prop_susp_${uniqueSuffix}@example.com`, passwordHash]
  );
  suspendedHost = suspendedRes.rows[0];
  suspendedHostToken = createToken(suspendedHost);
});

test.after(async () => {
  // Clean up created properties and users
  if (adminUser) {
    await pool.query(
      "DELETE FROM users WHERE id IN ($1, $2, $3, $4, $5)",
      [adminUser.id, hostUser1.id, hostUser2.id, guestUser.id, suspendedHost.id]
    );
  }

  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

// ==========================================
// 1. POST /api/v1/properties (Create Property)
// ==========================================

test("POST /properties - rejects unauthenticated request with 401", async () => {
  const res = await fetch(`${baseUrl}/properties`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Cozy Beachfront Apartment",
      description: "Wonderful ocean view with sunrise.",
      property_type: "apartment",
      price_per_night: 120,
      address: "101 Ocean Ave",
      city: "Miami",
      country: "USA",
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 401);
  assert.equal(data.success, false);
});

test("POST /properties - rejects guest user with 403", async () => {
  const res = await fetch(`${baseUrl}/properties`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "Cozy Beachfront Apartment",
      description: "Wonderful ocean view with sunrise.",
      property_type: "apartment",
      price_per_night: 120,
      address: "101 Ocean Ave",
      city: "Miami",
      country: "USA",
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 403);
  assert.equal(data.success, false);
});

test("POST /properties - rejects suspended host with 403", async () => {
  const res = await fetch(`${baseUrl}/properties`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${suspendedHostToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "Suspended Host Property",
      description: "This should not be allowed to be created.",
      property_type: "apartment",
      price_per_night: 100,
      address: "202 Bad Rd",
      city: "Miami",
      country: "USA",
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 403);
  assert.equal(data.success, false);
  assert.ok(data.message.toLowerCase().includes("suspended"));
});

test("POST /properties - successfully creates property listing for host", async () => {
  const payload = {
    title: "Cozy Beachfront Apartment",
    description: "Wonderful ocean view with sunrise and modern interior.",
    property_type: "apartment",
    room_type: "entire_place",
    price_per_night: 150.5,
    currency: "USD",
    address: "101 Ocean Ave",
    city: "Miami",
    state: "FL",
    country: "USA",
    postal_code: "33139",
    latitude: 25.7617,
    longitude: -80.1918,
    max_guests: 4,
    bedrooms: 2,
    beds: 2,
    bathrooms: 1.5,
    amenities: ["wifi", "air_conditioning", "pool", "kitchen"],
    images: ["https://example.com/img1.jpg", "https://example.com/img2.jpg"],
    status: "active",
    is_available: true,
  };

  const res = await fetch(`${baseUrl}/properties`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${hostToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();

  assert.equal(res.status, 201);
  assert.equal(data.success, true);
  assert.ok(data.data.property.id);
  assert.equal(data.data.property.host_id, hostUser1.id);
  assert.equal(data.data.property.title, payload.title);
  assert.equal(data.data.property.price_per_night, 150.5);
  assert.equal(data.data.property.city, "Miami");
  assert.deepEqual(data.data.property.amenities, payload.amenities);
  assert.deepEqual(data.data.property.images, payload.images);

  createdProperty1 = data.data.property;
});

test("POST /properties - successfully creates property listing for admin", async () => {
  const payload = {
    title: "Luxury Mountain Chalet",
    description: "Serene mountain views with wood-burning fireplace and hot tub.",
    property_type: "chalet",
    room_type: "entire_place",
    price_per_night: 350,
    address: "500 Alpine Way",
    city: "Aspen",
    state: "CO",
    country: "USA",
    max_guests: 6,
    amenities: ["fireplace", "hot_tub", "wifi"],
    images: ["https://example.com/chalet.jpg"],
  };

  const res = await fetch(`${baseUrl}/properties`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();

  assert.equal(res.status, 201);
  assert.equal(data.success, true);
  assert.equal(data.data.property.host_id, adminUser.id);
  assert.equal(data.data.property.city, "Aspen");

  createdProperty2 = data.data.property;
});

test("POST /properties - rejects invalid price (<= 0) with 400", async () => {
  const res = await fetch(`${baseUrl}/properties`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${hostToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "Zero Dollar House",
      description: "This should fail validation due to price.",
      property_type: "house",
      price_per_night: 0,
      address: "123 Free St",
      city: "Nowhere",
      country: "USA",
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
});

test("POST /properties - rejects invalid property_type with 400", async () => {
  const res = await fetch(`${baseUrl}/properties`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${hostToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "Treehouse Castle",
      description: "Testing unknown property type enum.",
      property_type: "space_station",
      price_per_night: 500,
      address: "Orbit 1",
      city: "Space",
      country: "USA",
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
});

test("POST /properties - rejects invalid image URL with 400", async () => {
  const res = await fetch(`${baseUrl}/properties`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${hostToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "Bad Image Property",
      description: "Testing invalid image URL protocol.",
      property_type: "apartment",
      price_per_night: 100,
      address: "100 Test St",
      city: "Test",
      country: "USA",
      images: ["ftp://invalid-image.jpg"],
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
});

// ==========================================
// 2. GET /api/v1/properties/:id (Details)
// ==========================================

test("GET /properties/:id - publicly retrieves active property with host info", async () => {
  const res = await fetch(`${baseUrl}/properties/${createdProperty1.id}`);
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.property.id, createdProperty1.id);
  assert.equal(data.data.property.title, createdProperty1.title);
  assert.ok(data.data.property.host);
  assert.equal(data.data.property.host.id, hostUser1.id);
  assert.equal(data.data.property.host.full_name, hostUser1.full_name);
  assert.equal(data.data.property.host.phone, "+1234567890");
});

test("GET /properties/:id - rejects invalid UUID with 400", async () => {
  const res = await fetch(`${baseUrl}/properties/not-a-valid-uuid`);
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
});

test("GET /properties/:id - returns 404 for non-existent property UUID", async () => {
  const nonExistentId = crypto.randomUUID();
  const res = await fetch(`${baseUrl}/properties/${nonExistentId}`);
  const data = await res.json();

  assert.equal(res.status, 404);
  assert.equal(data.success, false);
});

// ==========================================
// 3. PATCH /api/v1/properties/:id (Update)
// ==========================================

test("PATCH /properties/:id - rejects unauthenticated update with 401", async () => {
  const res = await fetch(`${baseUrl}/properties/${createdProperty1.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ price_per_night: 180 }),
  });
  const data = await res.json();

  assert.equal(res.status, 401);
  assert.equal(data.success, false);
});

test("PATCH /properties/:id - rejects non-owner host update with 403", async () => {
  const res = await fetch(`${baseUrl}/properties/${createdProperty1.id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${hostToken2}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ price_per_night: 180 }),
  });
  const data = await res.json();

  assert.equal(res.status, 403);
  assert.equal(data.success, false);
  assert.ok(data.message.includes("permission"));
});

test("PATCH /properties/:id - allows owner host to update listing", async () => {
  const res = await fetch(`${baseUrl}/properties/${createdProperty1.id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${hostToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "Updated Beachfront Villa",
      price_per_night: 220,
      max_guests: 5,
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.property.title, "Updated Beachfront Villa");
  assert.equal(data.data.property.price_per_night, 220);
  assert.equal(data.data.property.max_guests, 5);
});

test("PATCH /properties/:id - allows admin to update any listing", async () => {
  const res = await fetch(`${baseUrl}/properties/${createdProperty1.id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      description: "Admin verified luxury listing with enhanced amenities.",
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(
    data.data.property.description,
    "Admin verified luxury listing with enhanced amenities."
  );
});

test("PATCH /properties/:id - rejects empty body with 400", async () => {
  const res = await fetch(`${baseUrl}/properties/${createdProperty1.id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${hostToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
});

// ==========================================
// 4. Listing Image Support
// ==========================================

test("POST /properties/:id/images - adds images to listing", async () => {
  const res = await fetch(`${baseUrl}/properties/${createdProperty1.id}/images`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${hostToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      images: ["https://example.com/new-deck.jpg", "https://example.com/pool.jpg"],
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.ok(data.data.property.images.includes("https://example.com/new-deck.jpg"));
  assert.ok(data.data.property.images.includes("https://example.com/pool.jpg"));
});

test("DELETE /properties/:id/images - removes an image from listing", async () => {
  const res = await fetch(`${baseUrl}/properties/${createdProperty1.id}/images`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${hostToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: "https://example.com/new-deck.jpg",
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.property.images.includes("https://example.com/new-deck.jpg"), false);
});

test("POST /properties/:id/images - rejects non-owner with 403", async () => {
  const res = await fetch(`${baseUrl}/properties/${createdProperty1.id}/images`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${hostToken2}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      images: ["https://example.com/hacker.jpg"],
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 403);
  assert.equal(data.success, false);
});

// ==========================================
// 5. Amenities Management
// ==========================================

test("PATCH /properties/:id/amenities - updates amenities list", async () => {
  const newAmenities = ["wifi", "kitchen", "sauna", "gym", "lake_view"];
  const res = await fetch(`${baseUrl}/properties/${createdProperty1.id}/amenities`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${hostToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amenities: newAmenities }),
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.deepEqual(data.data.property.amenities, newAmenities);
});

test("PATCH /properties/:id/amenities - rejects non-owner with 403", async () => {
  const res = await fetch(`${baseUrl}/properties/${createdProperty1.id}/amenities`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${hostToken2}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amenities: ["hack"] }),
  });
  const data = await res.json();

  assert.equal(res.status, 403);
  assert.equal(data.success, false);
});

// ==========================================
// 6. Availability Management
// ==========================================

test("PATCH /properties/:id/availability - toggles listing availability", async () => {
  const res = await fetch(`${baseUrl}/properties/${createdProperty1.id}/availability`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${hostToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ is_available: false }),
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.property.is_available, false);

  // Restore availability to true
  const res2 = await fetch(`${baseUrl}/properties/${createdProperty1.id}/availability`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${hostToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ is_available: true }),
  });
  const data2 = await res2.json();
  assert.equal(data2.data.property.is_available, true);
});

// ==========================================
// 7. GET /api/v1/properties (Public Listing & Filters)
// ==========================================

test("GET /properties - lists active properties with pagination", async () => {
  const res = await fetch(`${baseUrl}/properties?page=1&limit=10`);
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.data.properties));
  assert.ok(data.data.properties.length >= 2);
  assert.ok(data.data.pagination.total >= 2);
});

test("GET /properties - filters by city", async () => {
  const res = await fetch(`${baseUrl}/properties?city=Miami`);
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.ok(data.data.properties.length > 0);
  for (const prop of data.data.properties) {
    assert.equal(prop.city.toLowerCase(), "miami");
  }
});

test("GET /properties - filters by property_type", async () => {
  const res = await fetch(`${baseUrl}/properties?property_type=chalet`);
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.ok(data.data.properties.length > 0);
  for (const prop of data.data.properties) {
    assert.equal(prop.property_type, "chalet");
  }
});

test("GET /properties - parameterized query prevents SQL injection in city filter", async () => {
  const sqlPayload = "' OR '1'='1";
  const res = await fetch(`${baseUrl}/properties?city=${encodeURIComponent(sqlPayload)}`);
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.properties.length, 0);
});

// ==========================================
// 8. GET /api/v1/properties/my-listings (Host Listings)
// ==========================================

test("GET /properties/my-listings - rejects unauthenticated request with 401", async () => {
  const res = await fetch(`${baseUrl}/properties/my-listings`);
  const data = await res.json();

  assert.equal(res.status, 401);
  assert.equal(data.success, false);
});

test("GET /properties/my-listings - rejects guest user with 403", async () => {
  const res = await fetch(`${baseUrl}/properties/my-listings`, {
    headers: { Authorization: `Bearer ${guestToken}` },
  });
  const data = await res.json();

  assert.equal(res.status, 403);
  assert.equal(data.success, false);
});

test("GET /properties/my-listings - returns listings owned by the authenticated host", async () => {
  const res = await fetch(`${baseUrl}/properties/my-listings`, {
    headers: { Authorization: `Bearer ${hostToken1}` },
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.data.properties));
  assert.ok(data.data.properties.length >= 1);
  for (const p of data.data.properties) {
    assert.equal(p.host_id, hostUser1.id);
  }
});

// ==========================================
// 9. DELETE /api/v1/properties/:id (Archive / Delete)
// ==========================================

test("DELETE /properties/:id - rejects non-owner with 403", async () => {
  const res = await fetch(`${baseUrl}/properties/${createdProperty1.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${hostToken2}` },
  });
  const data = await res.json();

  assert.equal(res.status, 403);
  assert.equal(data.success, false);
});

test("DELETE /properties/:id - soft archives property by default", async () => {
  const res = await fetch(`${baseUrl}/properties/${createdProperty1.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${hostToken1}` },
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.archived, true);
  assert.equal(data.data.property.status, "archived");
  assert.equal(data.data.property.is_available, false);

  // Verify archived property is no longer in public listing
  const listRes = await fetch(`${baseUrl}/properties`);
  const listData = await listRes.json();
  const found = listData.data.properties.some((p) => p.id === createdProperty1.id);
  assert.equal(found, false);

  // Verify public GET /properties/:id returns 404 for archived listing
  const getRes = await fetch(`${baseUrl}/properties/${createdProperty1.id}`);
  assert.equal(getRes.status, 404);

  // Owner host can still view their archived listing
  const ownerGetRes = await fetch(`${baseUrl}/properties/${createdProperty1.id}`, {
    headers: { Authorization: `Bearer ${hostToken1}` },
  });
  const ownerGetData = await ownerGetRes.json();
  assert.equal(ownerGetRes.status, 200);
  assert.equal(ownerGetData.data.property.status, "archived");
});

test("DELETE /properties/:id?permanent=true - permanently deletes property", async () => {
  const res = await fetch(`${baseUrl}/properties/${createdProperty2.id}?permanent=true`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.deleted, true);

  // Verify it is completely gone
  const checkRes = await fetch(`${baseUrl}/properties/${createdProperty2.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(checkRes.status, 404);
});
