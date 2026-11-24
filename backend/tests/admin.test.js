import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import app from "../src/app.js";
import pool from "../src/database/pool.js";
import { env } from "../src/config/env.js";

let server;
let baseUrl;

// Fixtures
let adminUser;
let hostUser;
let guestUser;
let suspendedUser;

let adminToken;
let hostToken;
let guestToken;
let suspendedToken;

let testProperty1;
let testProperty2;
let testBooking1;
let testBooking2;
let testPayment1;
let testReview1;

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

const getFutureDate = (daysFromNow) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getPastDate = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

  // 1. Users
  const aRes = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, account_status)
     VALUES ($1, $2, $3, 'admin', 'active') RETURNING id, full_name, email, role`,
    [`Admin Chief ${uniqueSuffix}`, `adm_${uniqueSuffix}@example.com`, passwordHash]
  );
  adminUser = aRes.rows[0];
  adminToken = createToken(adminUser);

  const hRes = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, account_status)
     VALUES ($1, $2, $3, 'host', 'active') RETURNING id, full_name, email, role`,
    [`Host Boss ${uniqueSuffix}`, `adm_h_${uniqueSuffix}@example.com`, passwordHash]
  );
  hostUser = hRes.rows[0];
  hostToken = createToken(hostUser);

  const gRes = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, account_status)
     VALUES ($1, $2, $3, 'guest', 'active') RETURNING id, full_name, email, role`,
    [`Guest Member ${uniqueSuffix}`, `adm_g_${uniqueSuffix}@example.com`, passwordHash]
  );
  guestUser = gRes.rows[0];
  guestToken = createToken(guestUser);

  const sRes = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, account_status)
     VALUES ($1, $2, $3, 'guest', 'suspended') RETURNING id, full_name, email, role`,
    [`Suspended Member ${uniqueSuffix}`, `adm_s_${uniqueSuffix}@example.com`, passwordHash]
  );
  suspendedUser = sRes.rows[0];
  suspendedToken = createToken(suspendedUser);

  // 2. Properties
  const p1Res = await pool.query(
    `INSERT INTO properties (
       host_id, title, description, property_type, room_type,
       price_per_night, currency, address, city, country,
       max_guests, bedrooms, beds, bathrooms, status, is_available
     ) VALUES (
       $1, 'Metropolitan Suite', 'Modern downtown suite', 'apartment', 'entire_place',
       180.00, 'USD', '100 Metro Ave', 'Chicago', 'USA',
       3, 1, 1, 1.0, 'active', true
     ) RETURNING *`,
    [hostUser.id]
  );
  testProperty1 = p1Res.rows[0];

  const p2Res = await pool.query(
    `INSERT INTO properties (
       host_id, title, description, property_type, room_type,
       price_per_night, currency, address, city, country,
       max_guests, bedrooms, beds, bathrooms, status, is_available
     ) VALUES (
       $1, 'Rustic Farmhouse', 'Quiet farmhouse with countryside view', 'house', 'entire_place',
       140.00, 'USD', '42 Valley Rd', 'Madison', 'USA',
       6, 3, 3, 2.0, 'inactive', false
     ) RETURNING *`,
    [hostUser.id]
  );
  testProperty2 = p2Res.rows[0];

  // 3. Bookings
  const b1Res = await pool.query(
    `INSERT INTO bookings (
       property_id, guest_id, check_in_date, check_out_date,
       total_nights, price_per_night, total_price, currency,
       guests_count, status, payment_status
     ) VALUES (
       $1, $2, $3, $4, 2, 180.00, 360.00, 'USD', 2, 'confirmed', 'paid'
     ) RETURNING *`,
    [testProperty1.id, guestUser.id, getPastDate(5), getPastDate(3)]
  );
  testBooking1 = b1Res.rows[0];

  const b2Res = await pool.query(
    `INSERT INTO bookings (
       property_id, guest_id, check_in_date, check_out_date,
       total_nights, price_per_night, total_price, currency,
       guests_count, status, payment_status
     ) VALUES (
       $1, $2, $3, $4, 3, 180.00, 540.00, 'USD', 2, 'pending', 'unpaid'
     ) RETURNING *`,
    [testProperty1.id, guestUser.id, getFutureDate(10), getFutureDate(13)]
  );
  testBooking2 = b2Res.rows[0];

  // 4. Payments
  const pay1Res = await pool.query(
    `INSERT INTO payments (
       booking_id, user_id, razorpay_order_id, razorpay_payment_id,
       amount, currency, status, refund_amount
     ) VALUES (
       $1, $2, $3, $4, 360.00, 'USD', 'captured', 0.00
     ) RETURNING *`,
    [
      testBooking1.id,
      guestUser.id,
      `order_adm_${uniqueSuffix}`,
      `pay_adm_${uniqueSuffix}`,
    ]
  );
  testPayment1 = pay1Res.rows[0];

  // 5. Reviews
  const r1Res = await pool.query(
    `INSERT INTO reviews (
       booking_id, property_id, guest_id, rating, title, comment
     ) VALUES (
       $1, $2, $3, 5, 'Exceptional experience', 'Loved the downtown view and hospitality!'
     ) RETURNING *`,
    [testBooking1.id, testProperty1.id, guestUser.id]
  );
  testReview1 = r1Res.rows[0];

  await pool.query(
    "UPDATE properties SET average_rating = 5.00, reviews_count = 1 WHERE id = $1",
    [testProperty1.id]
  );
});

test.after(async () => {
  if (testProperty1) {
    await pool.query("DELETE FROM reviews WHERE property_id IN ($1, $2)", [
      testProperty1.id,
      testProperty2.id,
    ]);
    await pool.query("DELETE FROM payments WHERE user_id = $1", [guestUser.id]);
    await pool.query("DELETE FROM bookings WHERE property_id IN ($1, $2)", [
      testProperty1.id,
      testProperty2.id,
    ]);
    await pool.query("DELETE FROM properties WHERE id IN ($1, $2)", [
      testProperty1.id,
      testProperty2.id,
    ]);
  }
  if (adminUser) {
    await pool.query("DELETE FROM users WHERE id IN ($1, $2, $3, $4)", [
      adminUser.id,
      hostUser.id,
      guestUser.id,
      suspendedUser.id,
    ]);
  }
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

// ==========================================
// 1. Strict RBAC & Authentication Controls
// ==========================================

test("GET /admin/dashboard - rejects unauthenticated request with 401", async () => {
  const res = await fetch(`${baseUrl}/admin/dashboard`);
  const data = await res.json();

  assert.equal(res.status, 401);
  assert.equal(data.success, false);
});

test("GET /admin/dashboard - rejects guest role with 403 Forbidden", async () => {
  const res = await fetch(`${baseUrl}/admin/dashboard`, {
    headers: { Authorization: `Bearer ${guestToken}` },
  });
  const data = await res.json();

  assert.equal(res.status, 403);
  assert.equal(data.success, false);
});

test("GET /admin/dashboard - rejects host role with 403 Forbidden", async () => {
  const res = await fetch(`${baseUrl}/admin/dashboard`, {
    headers: { Authorization: `Bearer ${hostToken}` },
  });
  const data = await res.json();

  assert.equal(res.status, 403);
  assert.equal(data.success, false);
});

test("GET /admin/properties - rejects non-admin with 403", async () => {
  const res = await fetch(`${baseUrl}/admin/properties`, {
    headers: { Authorization: `Bearer ${hostToken}` },
  });
  const data = await res.json();

  assert.equal(res.status, 403);
  assert.equal(data.success, false);
});

test("PATCH /admin/properties/:id/status - rejects non-admin with 403", async () => {
  const res = await fetch(`${baseUrl}/admin/properties/${testProperty1.id}/status`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "inactive" }),
  });
  const data = await res.json();

  assert.equal(res.status, 403);
  assert.equal(data.success, false);
});

test("GET /admin/bookings - rejects non-admin with 403", async () => {
  const res = await fetch(`${baseUrl}/admin/bookings`, {
    headers: { Authorization: `Bearer ${guestToken}` },
  });
  const data = await res.json();

  assert.equal(res.status, 403);
  assert.equal(data.success, false);
});

test("GET /admin/payments - rejects non-admin with 403", async () => {
  const res = await fetch(`${baseUrl}/admin/payments`, {
    headers: { Authorization: `Bearer ${guestToken}` },
  });
  const data = await res.json();

  assert.equal(res.status, 403);
  assert.equal(data.success, false);
});

test("GET /admin/reports/revenue - rejects non-admin with 403", async () => {
  const res = await fetch(`${baseUrl}/admin/reports/revenue`, {
    headers: { Authorization: `Bearer ${hostToken}` },
  });
  const data = await res.json();

  assert.equal(res.status, 403);
  assert.equal(data.success, false);
});

test("GET /admin/reviews - rejects non-admin with 403", async () => {
  const res = await fetch(`${baseUrl}/admin/reviews`, {
    headers: { Authorization: `Bearer ${guestToken}` },
  });
  const data = await res.json();

  assert.equal(res.status, 403);
  assert.equal(data.success, false);
});

// ==========================================
// 2. Admin Dashboard Statistics
// ==========================================

test("GET /admin/dashboard - succeeds for admin and returns accurate database statistics", async () => {
  const res = await fetch(`${baseUrl}/admin/dashboard`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.ok(data.data.users);
  assert.ok(data.data.users.total_users >= 4);
  assert.ok(data.data.users.admins_count >= 1);
  assert.ok(data.data.users.hosts_count >= 1);
  assert.ok(data.data.users.guests_count >= 1);
  assert.ok(data.data.users.suspended_users >= 1);

  assert.ok(data.data.properties);
  assert.ok(data.data.properties.total_properties >= 2);
  assert.ok(data.data.properties.active_properties >= 1);
  assert.ok(data.data.properties.inactive_properties >= 1);

  assert.ok(data.data.bookings);
  assert.ok(data.data.bookings.total_bookings >= 2);
  assert.ok(data.data.bookings.confirmed_bookings >= 1);
  assert.ok(data.data.bookings.pending_bookings >= 1);
  assert.ok(data.data.bookings.paid_bookings >= 1);

  assert.ok(data.data.financials);
  assert.ok(data.data.financials.USD);
  assert.ok(data.data.financials.USD.gross_revenue >= 360.0);
  assert.ok(data.data.financials.USD.net_revenue >= 360.0);

  assert.ok(data.data.reviews);
  assert.ok(data.data.reviews.total_reviews >= 1);
  assert.ok(data.data.reviews.average_rating > 0);
});

// ==========================================
// 3. Property Oversight & Moderation
// ==========================================

test("GET /admin/properties - lists all properties with pagination and host info", async () => {
  const res = await fetch(`${baseUrl}/admin/properties`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.data.properties));
  assert.ok(data.data.properties.length >= 2);
  assert.ok(data.data.properties[0].host);
  assert.ok(data.data.pagination);
});

test("GET /admin/properties - filters properties by status correctly", async () => {
  const res = await fetch(`${baseUrl}/admin/properties?status=inactive`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  for (const p of data.data.properties) {
    assert.equal(p.status, "inactive");
  }
});

test("GET /admin/properties - searches properties by title", async () => {
  const res = await fetch(`${baseUrl}/admin/properties?search=Metropolitan`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.ok(data.data.properties.length >= 1);
  assert.ok(data.data.properties[0].title.includes("Metropolitan"));
});

test("PATCH /admin/properties/:id/status - returns 404 for non-existent property UUID", async () => {
  const nonExistentId = crypto.randomUUID();
  const res = await fetch(`${baseUrl}/admin/properties/${nonExistentId}/status`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      status: "archived",
      moderation_note: "Policy violation",
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 404);
  assert.equal(data.success, false);
});

test("PATCH /admin/properties/:id/status - successfully moderates property with note and timestamp", async () => {
  const res = await fetch(
    `${baseUrl}/admin/properties/${testProperty2.id}/status`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "active",
        moderation_note: "Verified documentation; approved for listing",
      }),
    }
  );
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.property.status, "active");
  assert.equal(
    data.data.property.moderation_note,
    "Verified documentation; approved for listing"
  );
  assert.ok(data.data.property.moderated_at);

  // Verify in database
  const propCheck = await pool.query(
    "SELECT status, moderation_note, moderated_by FROM properties WHERE id = $1",
    [testProperty2.id]
  );
  assert.equal(propCheck.rows[0].status, "active");
  assert.equal(propCheck.rows[0].moderated_by, adminUser.id);
});

// ==========================================
// 4. Booking Oversight & Management
// ==========================================

test("GET /admin/bookings - lists all platform bookings with pagination and user/property data", async () => {
  const res = await fetch(`${baseUrl}/admin/bookings`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.data.bookings));
  assert.ok(data.data.bookings.length >= 2);
  assert.ok(data.data.bookings[0].guest);
  assert.ok(data.data.bookings[0].property);
});

test("GET /admin/bookings - filters bookings by payment_status", async () => {
  const res = await fetch(`${baseUrl}/admin/bookings?payment_status=paid`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  for (const b of data.data.bookings) {
    assert.equal(b.payment_status, "paid");
  }
});

test("PATCH /admin/bookings/:id/status - administratively updates booking status", async () => {
  const res = await fetch(
    `${baseUrl}/admin/bookings/${testBooking1.id}/status`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "completed" }),
    }
  );
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.booking.status, "completed");
});

test("POST /admin/bookings/:id/cancel - administratively cancels booking with reason", async () => {
  const res = await fetch(
    `${baseUrl}/admin/bookings/${testBooking2.id}/cancel`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cancellation_reason: "Administrative cancellation for compliance audit",
      }),
    }
  );
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.booking.status, "cancelled");
  assert.equal(
    data.data.booking.cancellation_reason,
    "Administrative cancellation for compliance audit"
  );
});

test("POST /admin/bookings/:id/cancel - rejects already cancelled booking with 400", async () => {
  const res = await fetch(
    `${baseUrl}/admin/bookings/${testBooking2.id}/cancel`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cancellation_reason: "Duplicate cancellation attempt" }),
    }
  );
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
});

// ==========================================
// 5. Payments Overview & Revenue Reports
// ==========================================

test("GET /admin/payments - lists all payments platform-wide with pagination", async () => {
  const res = await fetch(`${baseUrl}/admin/payments`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.data.payments));
  assert.ok(data.data.payments.length >= 1);
  assert.ok(data.data.payments[0].payer);
  assert.ok(data.data.payments[0].property);
});

test("GET /admin/reports/revenue - returns time-based financial revenue analytics", async () => {
  const res = await fetch(`${baseUrl}/admin/reports/revenue?interval=day`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.interval, "day");
  assert.ok(Array.isArray(data.data.report));
  assert.ok(data.data.report.length >= 1);
  assert.ok(data.data.report[0].gross_amount >= 360.0);
});

test("GET /admin/reports/revenue - rejects invalid date format with 400", async () => {
  const res = await fetch(`${baseUrl}/admin/reports/revenue?from_date=invalid-date`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
});

// ==========================================
// 6. Review Moderation
// ==========================================

test("GET /admin/reviews - lists platform reviews with pagination and author info", async () => {
  const res = await fetch(`${baseUrl}/admin/reviews`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.data.reviews));
  assert.ok(data.data.reviews.length >= 1);
  assert.ok(data.data.reviews[0].author);
  assert.ok(data.data.reviews[0].property);
});

test("GET /admin/reviews - filters reviews by rating", async () => {
  const res = await fetch(`${baseUrl}/admin/reviews?rating=5`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  for (const r of data.data.reviews) {
    assert.equal(r.rating, 5);
  }
});

test("DELETE /admin/reviews/:id - admin deletes review for moderation and updates property ratings", async () => {
  const res = await fetch(`${baseUrl}/admin/reviews/${testReview1.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.property_rating.average_rating, 0.0);
  assert.equal(data.data.property_rating.reviews_count, 0);

  // Confirm database property rating is reset
  const propCheck = await pool.query(
    "SELECT average_rating, reviews_count FROM properties WHERE id = $1",
    [testProperty1.id]
  );
  assert.equal(Number(propCheck.rows[0].average_rating), 0.0);
  assert.equal(Number(propCheck.rows[0].reviews_count), 0);
});

test("DELETE /admin/reviews/:id - returns 404 for non-existent review UUID", async () => {
  const nonExistentId = crypto.randomUUID();
  const res = await fetch(`${baseUrl}/admin/reviews/${nonExistentId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const data = await res.json();

  assert.equal(res.status, 404);
  assert.equal(data.success, false);
});

// ==========================================
// 7. SQL Injection Security
// ==========================================

test("GET /admin/properties - parameterized search query safely handles SQL injection payload", async () => {
  const res = await fetch(
    `${baseUrl}/admin/properties?search=%27%20OR%201%3D1--`,
    {
      headers: { Authorization: `Bearer ${adminToken}` },
    }
  );
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
});
