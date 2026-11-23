import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import app from "../src/app.js";
import pool from "../src/database/pool.js";
import { env } from "../src/config/env.js";

let server;
let baseUrl;

// Fixtures
let hostUser1;
let hostUser2;
let guestUser1;
let guestUser2;
let adminUser;
let suspendedUser;

let hostToken1;
let hostToken2;
let guestToken1;
let guestToken2;
let adminToken;
let suspendedToken;

let testProperty1;
let testProperty2;
let unavailableProperty;

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

// Date helpers
const getFutureDate = (daysFromNow) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split("T")[0];
};

const getPastDate = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
};

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}/api/v1`;
      resolve();
    });
  });

  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const passwordHash = await bcrypt.hash("Password123!", 10);

  // Users
  const h1Res = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, account_status)
     VALUES ($1, $2, $3, 'host', 'active') RETURNING id, full_name, email, role`,
    [`Host One ${uniqueSuffix}`, `b_host1_${uniqueSuffix}@example.com`, passwordHash]
  );
  hostUser1 = h1Res.rows[0];
  hostToken1 = createToken(hostUser1);

  const h2Res = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, account_status)
     VALUES ($1, $2, $3, 'host', 'active') RETURNING id, full_name, email, role`,
    [`Host Two ${uniqueSuffix}`, `b_host2_${uniqueSuffix}@example.com`, passwordHash]
  );
  hostUser2 = h2Res.rows[0];
  hostToken2 = createToken(hostUser2);

  const g1Res = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, account_status)
     VALUES ($1, $2, $3, 'guest', 'active') RETURNING id, full_name, email, role`,
    [`Guest One ${uniqueSuffix}`, `b_guest1_${uniqueSuffix}@example.com`, passwordHash]
  );
  guestUser1 = g1Res.rows[0];
  guestToken1 = createToken(guestUser1);

  const g2Res = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, account_status)
     VALUES ($1, $2, $3, 'guest', 'active') RETURNING id, full_name, email, role`,
    [`Guest Two ${uniqueSuffix}`, `b_guest2_${uniqueSuffix}@example.com`, passwordHash]
  );
  guestUser2 = g2Res.rows[0];
  guestToken2 = createToken(guestUser2);

  const aRes = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, account_status)
     VALUES ($1, $2, $3, 'admin', 'active') RETURNING id, full_name, email, role`,
    [`Admin User ${uniqueSuffix}`, `b_admin_${uniqueSuffix}@example.com`, passwordHash]
  );
  adminUser = aRes.rows[0];
  adminToken = createToken(adminUser);

  const sRes = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, account_status)
     VALUES ($1, $2, $3, 'guest', 'suspended') RETURNING id, full_name, email, role`,
    [`Suspended User ${uniqueSuffix}`, `b_susp_${uniqueSuffix}@example.com`, passwordHash]
  );
  suspendedUser = sRes.rows[0];
  suspendedToken = createToken(suspendedUser);

  // Properties
  const p1Res = await pool.query(
    `INSERT INTO properties (
       host_id, title, description, property_type, room_type,
       price_per_night, currency, address, city, country,
       max_guests, bedrooms, beds, bathrooms, status, is_available
     ) VALUES (
       $1, 'Seaside Villa', 'Beautiful villa with beach view', 'villa', 'entire_place',
       200.00, 'USD', '10 Coastal Way', 'Malibu', 'USA',
       4, 2, 2, 2.0, 'active', true
     ) RETURNING *`,
    [hostUser1.id]
  );
  testProperty1 = p1Res.rows[0];

  const p2Res = await pool.query(
    `INSERT INTO properties (
       host_id, title, description, property_type, room_type,
       price_per_night, currency, address, city, country,
       max_guests, bedrooms, beds, bathrooms, status, is_available
     ) VALUES (
       $1, 'City Loft', 'Modern loft in downtown', 'apartment', 'entire_place',
       100.00, 'USD', '50 Broadway', 'New York', 'USA',
       2, 1, 1, 1.0, 'active', true
     ) RETURNING *`,
    [hostUser2.id]
  );
  testProperty2 = p2Res.rows[0];

  const pUnavailRes = await pool.query(
    `INSERT INTO properties (
       host_id, title, description, property_type, room_type,
       price_per_night, currency, address, city, country,
       max_guests, bedrooms, beds, bathrooms, status, is_available
     ) VALUES (
       $1, 'Closed Cabin', 'Cabin closed for repairs', 'cabin', 'entire_place',
       150.00, 'USD', '100 Forest Rd', 'Denver', 'USA',
       4, 2, 2, 1.0, 'inactive', false
     ) RETURNING *`,
    [hostUser1.id]
  );
  unavailableProperty = pUnavailRes.rows[0];
});

test.after(async () => {
  if (adminUser) {
    await pool.query(
      "DELETE FROM users WHERE id IN ($1, $2, $3, $4, $5, $6)",
      [
        hostUser1.id,
        hostUser2.id,
        guestUser1.id,
        guestUser2.id,
        adminUser.id,
        suspendedUser.id,
      ]
    );
  }
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

// ==========================================
// 1. Authentication & Role Access
// ==========================================

test("POST /bookings - rejects unauthenticated request with 401", async () => {
  const res = await fetch(`${baseUrl}/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      property_id: testProperty1.id,
      check_in_date: getFutureDate(10),
      check_out_date: getFutureDate(15),
      guests_count: 2,
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 401);
  assert.equal(data.success, false);
});

test("POST /bookings - rejects invalid or expired token with 401", async () => {
  const res = await fetch(`${baseUrl}/bookings`, {
    method: "POST",
    headers: {
      Authorization: "Bearer invalid.token.value",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      property_id: testProperty1.id,
      check_in_date: getFutureDate(10),
      check_out_date: getFutureDate(15),
      guests_count: 2,
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 401);
  assert.equal(data.success, false);
});

test("POST /bookings - rejects suspended user with 403", async () => {
  const res = await fetch(`${baseUrl}/bookings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${suspendedToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      property_id: testProperty1.id,
      check_in_date: getFutureDate(10),
      check_out_date: getFutureDate(15),
      guests_count: 2,
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 403);
  assert.equal(data.success, false);
  assert.ok(data.message.toLowerCase().includes("suspended"));
});

// ==========================================
// 2. Validation & Edge Cases
// ==========================================

test("POST /bookings - rejects invalid property UUID with 400", async () => {
  const res = await fetch(`${baseUrl}/bookings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      property_id: "not-a-valid-uuid",
      check_in_date: getFutureDate(10),
      check_out_date: getFutureDate(15),
      guests_count: 2,
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
});

test("POST /bookings - returns 404 for nonexistent property UUID", async () => {
  const res = await fetch(`${baseUrl}/bookings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      property_id: crypto.randomUUID(),
      check_in_date: getFutureDate(10),
      check_out_date: getFutureDate(15),
      guests_count: 2,
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 404);
  assert.equal(data.success, false);
  assert.equal(data.message, "Property not found");
});

test("POST /bookings - rejects booking unavailable or inactive property with 400", async () => {
  const res = await fetch(`${baseUrl}/bookings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      property_id: unavailableProperty.id,
      check_in_date: getFutureDate(10),
      check_out_date: getFutureDate(15),
      guests_count: 2,
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
  assert.ok(data.message.includes("not available"));
});

test("POST /bookings - prevents host from booking their own property with 400", async () => {
  const res = await fetch(`${baseUrl}/bookings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${hostToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      property_id: testProperty1.id,
      check_in_date: getFutureDate(10),
      check_out_date: getFutureDate(15),
      guests_count: 2,
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
  assert.ok(data.message.includes("own property"));
});

test("POST /bookings - rejects check-in date in the past with 400", async () => {
  const res = await fetch(`${baseUrl}/bookings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      property_id: testProperty1.id,
      check_in_date: getPastDate(5),
      check_out_date: getFutureDate(5),
      guests_count: 2,
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
});

test("POST /bookings - rejects checkout on or before checkin with 400", async () => {
  const res = await fetch(`${baseUrl}/bookings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      property_id: testProperty1.id,
      check_in_date: getFutureDate(15),
      check_out_date: getFutureDate(10),
      guests_count: 2,
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
});

test("POST /bookings - rejects same-day invalid booking (0 nights) with 400", async () => {
  const sameDay = getFutureDate(20);
  const res = await fetch(`${baseUrl}/bookings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      property_id: testProperty1.id,
      check_in_date: sameDay,
      check_out_date: sameDay,
      guests_count: 2,
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
});

test("POST /bookings - rejects guest count exceeding property capacity with 400", async () => {
  const res = await fetch(`${baseUrl}/bookings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      property_id: testProperty1.id, // capacity is 4
      check_in_date: getFutureDate(10),
      check_out_date: getFutureDate(15),
      guests_count: 8,
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
  assert.ok(data.message.includes("capacity"));
});

// ==========================================
// 3. Successful Booking Creation & Calculations
// ==========================================

let createdBooking1;

test("POST /bookings - successfully creates booking with accurate price calculation", async () => {
  const checkIn = getFutureDate(10);
  const checkOut = getFutureDate(14); // 4 nights

  const res = await fetch(`${baseUrl}/bookings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      property_id: testProperty1.id,
      check_in_date: checkIn,
      check_out_date: checkOut,
      guests_count: 2,
      special_requests: "Early check-in if possible",
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 201);
  assert.equal(data.success, true);
  assert.equal(data.data.booking.guest_id, guestUser1.id);
  assert.equal(data.data.booking.property_id, testProperty1.id);
  assert.equal(data.data.booking.total_nights, 4);
  assert.equal(data.data.booking.price_per_night, 200.0);
  assert.equal(data.data.booking.total_price, 800.0); // 4 * 200
  assert.equal(data.data.booking.status, "confirmed");
  assert.equal(data.data.booking.special_requests, "Early check-in if possible");

  createdBooking1 = data.data.booking;
});

// ==========================================
// 4. Overlapping Conflict Prevention
// ==========================================

test("POST /bookings - prevents overlapping booking inside existing dates with 409", async () => {
  // Existing: days 10 to 14
  // Requested: days 11 to 13 (subset)
  const res = await fetch(`${baseUrl}/bookings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken2}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      property_id: testProperty1.id,
      check_in_date: getFutureDate(11),
      check_out_date: getFutureDate(13),
      guests_count: 1,
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 409);
  assert.equal(data.success, false);
  assert.ok(data.message.toLowerCase().includes("already booked"));
});

test("POST /bookings - prevents overlapping booking straddling check-in with 409", async () => {
  // Existing: days 10 to 14
  // Requested: days 8 to 12
  const res = await fetch(`${baseUrl}/bookings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken2}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      property_id: testProperty1.id,
      check_in_date: getFutureDate(8),
      check_out_date: getFutureDate(12),
      guests_count: 1,
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 409);
  assert.equal(data.success, false);
});

test("POST /bookings - permits back-to-back booking where checkout equals check-in", async () => {
  // Existing: days 10 to 14
  // Requested: days 14 to 18 (starts on the exact day previous booking checks out)
  const res = await fetch(`${baseUrl}/bookings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken2}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      property_id: testProperty1.id,
      check_in_date: getFutureDate(14),
      check_out_date: getFutureDate(18),
      guests_count: 2,
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 201);
  assert.equal(data.success, true);
  assert.equal(data.data.booking.check_in_date, getFutureDate(14));
  assert.equal(data.data.booking.check_out_date, getFutureDate(18));
});

test("POST /bookings - permits back-to-back booking checking out when another checks in", async () => {
  // Existing: days 10 to 14
  // Requested: days 6 to 10 (checks out on the exact day the next booking checks in)
  const res = await fetch(`${baseUrl}/bookings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken2}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      property_id: testProperty1.id,
      check_in_date: getFutureDate(6),
      check_out_date: getFutureDate(10),
      guests_count: 2,
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 201);
  assert.equal(data.success, true);
});

// ==========================================
// 5. Concurrency & Race Condition Simulation
// ==========================================

test("POST /bookings - concurrent requests for identical dates allow exactly one booking", async () => {
  const dates = {
    check_in_date: getFutureDate(30),
    check_out_date: getFutureDate(35),
    guests_count: 1,
  };

  // Launch two simultaneous requests
  const [res1, res2] = await Promise.all([
    fetch(`${baseUrl}/bookings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${guestToken1}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ property_id: testProperty2.id, ...dates }),
    }),
    fetch(`${baseUrl}/bookings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${guestToken2}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ property_id: testProperty2.id, ...dates }),
    }),
  ]);

  const [data1, data2] = await Promise.all([res1.json(), res2.json()]);

  // One must be 201 Created and the other must be 409 Conflict
  const statuses = [res1.status, res2.status].sort();
  assert.deepEqual(statuses, [201, 409]);

  const successData = res1.status === 201 ? data1 : data2;
  const conflictData = res1.status === 409 ? data1 : data2;

  assert.equal(successData.success, true);
  assert.equal(conflictData.success, false);
  assert.ok(conflictData.message.toLowerCase().includes("already booked"));
});

// ==========================================
// 6. Availability Endpoint
// ==========================================

test("GET /bookings/availability - reports available dates accurately", async () => {
  const res = await fetch(
    `${baseUrl}/bookings/availability?property_id=${testProperty1.id}&check_in_date=${getFutureDate(40)}&check_out_date=${getFutureDate(45)}`
  );
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.available, true);
  assert.equal(data.data.total_nights, 5);
  assert.equal(data.data.total_price, 1000.0);
});

test("GET /bookings/availability - reports unavailable dates accurately", async () => {
  // Days 10 to 14 are already booked on testProperty1
  const res = await fetch(
    `${baseUrl}/bookings/availability?property_id=${testProperty1.id}&check_in_date=${getFutureDate(11)}&check_out_date=${getFutureDate(13)}`
  );
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.available, false);
  assert.ok(data.data.reason.includes("already booked"));
});

// ==========================================
// 7. Booking History & Ownership Retrieval
// ==========================================

test("GET /bookings - guest retrieves their own booking history", async () => {
  const res = await fetch(`${baseUrl}/bookings`, {
    headers: { Authorization: `Bearer ${guestToken1}` },
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.data.bookings));
  assert.ok(data.data.bookings.length >= 1);
  for (const b of data.data.bookings) {
    assert.equal(b.guest_id, guestUser1.id);
  }
});

test("GET /bookings/:id - guest retrieves their specific booking", async () => {
  const res = await fetch(`${baseUrl}/bookings/${createdBooking1.id}`, {
    headers: { Authorization: `Bearer ${guestToken1}` },
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.booking.id, createdBooking1.id);
  assert.equal(data.data.booking.property.id, testProperty1.id);
});

test("GET /bookings/:id - host retrieves reservation on their property", async () => {
  const res = await fetch(`${baseUrl}/bookings/${createdBooking1.id}`, {
    headers: { Authorization: `Bearer ${hostToken1}` },
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.booking.id, createdBooking1.id);
});

test("GET /bookings/:id - unauthorized user cannot view another user's booking (403)", async () => {
  // guestUser2 didn't make createdBooking1 and isn't the host
  const res = await fetch(`${baseUrl}/bookings/${createdBooking1.id}`, {
    headers: { Authorization: `Bearer ${guestToken2}` },
  });
  const data = await res.json();

  assert.equal(res.status, 403);
  assert.equal(data.success, false);
  assert.ok(data.message.includes("permission"));
});

test("GET /bookings/property/:propertyId - host views all reservations for their property", async () => {
  const res = await fetch(`${baseUrl}/bookings/property/${testProperty1.id}`, {
    headers: { Authorization: `Bearer ${hostToken1}` },
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.data.reservations));
  assert.ok(data.data.reservations.length >= 1);
});

test("GET /bookings/property/:propertyId - host cannot view another host's property reservations (403)", async () => {
  // hostUser2 does not own testProperty1
  const res = await fetch(`${baseUrl}/bookings/property/${testProperty1.id}`, {
    headers: { Authorization: `Bearer ${hostToken2}` },
  });
  const data = await res.json();

  assert.equal(res.status, 403);
  assert.equal(data.success, false);
});

// ==========================================
// 8. Cancellation & Status Management
// ==========================================

test("PATCH /bookings/:id/cancel - guest successfully cancels their booking", async () => {
  const res = await fetch(`${baseUrl}/bookings/${createdBooking1.id}/cancel`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${guestToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reason: "Trip cancelled" }),
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.booking.status, "cancelled");
  assert.equal(data.data.booking.cancellation_reason, "Trip cancelled");
  assert.equal(data.data.booking.cancelled_by, guestUser1.id);
  assert.ok(data.data.booking.cancelled_at);
});

test("PATCH /bookings/:id/cancel - cannot cancel an already cancelled booking (400)", async () => {
  const res = await fetch(`${baseUrl}/bookings/${createdBooking1.id}/cancel`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${guestToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reason: "Try again" }),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
  assert.ok(data.message.includes("already cancelled"));
});

test("POST /bookings - dates freed up after cancellation become bookable again", async () => {
  // createdBooking1 was days 10 to 14 on testProperty1. Since it's cancelled, guest2 can now book it!
  const res = await fetch(`${baseUrl}/bookings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken2}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      property_id: testProperty1.id,
      check_in_date: getFutureDate(10),
      check_out_date: getFutureDate(14),
      guests_count: 1,
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 201);
  assert.equal(data.success, true);
  assert.equal(data.data.booking.status, "confirmed");
});

test("PATCH /bookings/:id/status - host can update booking status to completed", async () => {
  // Create a booking on property 2
  const createRes = await fetch(`${baseUrl}/bookings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      property_id: testProperty2.id,
      check_in_date: getFutureDate(50),
      check_out_date: getFutureDate(52),
      guests_count: 1,
    }),
  });
  const createData = await createRes.json();
  const newBookingId = createData.data.booking.id;

  // Host 2 marks completed
  const statusRes = await fetch(`${baseUrl}/bookings/${newBookingId}/status`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${hostToken2}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "completed" }),
  });
  const statusData = await statusRes.json();

  assert.equal(statusRes.status, 200);
  assert.equal(statusData.success, true);
  assert.equal(statusData.data.booking.status, "completed");
});

test("PATCH /bookings/:id/status - cannot modify completed booking (400)", async () => {
  // Query the completed booking and try to cancel it
  const listRes = await fetch(`${baseUrl}/bookings?status=completed`, {
    headers: { Authorization: `Bearer ${guestToken1}` },
  });
  const listData = await listRes.json();
  const completedBooking = listData.data.bookings[0];

  const cancelRes = await fetch(`${baseUrl}/bookings/${completedBooking.id}/cancel`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${guestToken1}`,
      "Content-Type": "application/json",
    },
  });
  const cancelData = await cancelRes.json();

  assert.equal(cancelRes.status, 400);
  assert.equal(cancelData.success, false);
  assert.ok(cancelData.message.includes("completed"));
});

// ==========================================
// 9. SQL Injection Resistance
// ==========================================

test("POST /bookings - resists SQL injection in special_requests", async () => {
  const sqlInjection = "'; DROP TABLE bookings; --";
  const res = await fetch(`${baseUrl}/bookings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      property_id: testProperty2.id,
      check_in_date: getFutureDate(60),
      check_out_date: getFutureDate(62),
      guests_count: 1,
      special_requests: sqlInjection,
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 201);
  assert.equal(data.data.booking.special_requests, sqlInjection);

  // Table must still exist
  const verifyRes = await pool.query("SELECT COUNT(*) FROM bookings");
  assert.ok(Number.parseInt(verifyRes.rows[0].count, 10) > 0);
});
