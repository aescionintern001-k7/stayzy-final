import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import app from "../src/app.js";
import pool from "../src/database/pool.js";
import { env } from "../src/config/env.js";
import { generateRazorpaySignature } from "../src/config/razorpay.js";

let server;
let baseUrl;

const createdBookingIds = [];
const createdReviewIds = [];

const getFutureDate = (daysFromNow) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
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
});

test.after(async () => {
  try {
    if (createdReviewIds.length > 0) {
      await pool.query("DELETE FROM reviews WHERE id = ANY($1)", [createdReviewIds]);
    }
    if (createdBookingIds.length > 0) {
      await pool.query("DELETE FROM payments WHERE booking_id = ANY($1)", [createdBookingIds]);
      await pool.query("DELETE FROM bookings WHERE id = ANY($1)", [createdBookingIds]);
    }
  } catch (err) {
    console.error("Cleanup error in integration tests:", err);
  }
  await new Promise((resolve) => server.close(resolve));
});

test.describe("Frontend-Backend Complete Integration Test Suite", () => {
  let guestToken = null;
  let adminToken = null;
  let guestUser = null;
  let seededPropertyId = null;
  let testBookingId = null;
  let razorpayOrderId = null;

  test("Step 1: Authenticate Resident User (aarav.sharma@example.com)", async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "aarav.sharma@example.com",
        password: "Password123!",
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.token);
    assert.strictEqual(body.data.user.email, "aarav.sharma@example.com");
    assert.strictEqual(body.data.user.role, "guest");

    guestToken = body.data.token;
    guestUser = body.data.user;
  });

  test("Step 2: Verify Current User Profile via GET /auth/me", async () => {
    const res = await fetch(`${baseUrl}/auth/me`, {
      headers: {
        Authorization: `Bearer ${guestToken}`,
        "Content-Type": "application/json",
      },
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.user.id, guestUser.id);
  });

  test("Step 3: Query Room Catalog via /properties/search with City filter", async () => {
    const res = await fetch(`${baseUrl}/properties/search?city=Bengaluru`, {
      headers: { "Content-Type": "application/json" },
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data.properties));
    assert.ok(body.data.properties.length > 0);

    const koramangalaProp = body.data.properties.find((p) =>
      p.title.includes("Koramangala")
    );
    assert.ok(koramangalaProp, "Koramangala property should be returned");
    assert.strictEqual(koramangalaProp.city, "Bengaluru");
    assert.ok(koramangalaProp.price_per_night > 0);

    seededPropertyId = koramangalaProp.id;
  });

  test("Step 4: Fetch Detailed Room View with attached room_types and rate_plans", async () => {
    assert.ok(seededPropertyId);
    const res = await fetch(`${baseUrl}/properties/${seededPropertyId}`);

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    const prop = body.data.property || body.data;
    assert.strictEqual(prop.id, seededPropertyId);
    assert.ok(Array.isArray(prop.room_types), "Property should include attached room_types");
    assert.ok(prop.room_types.length > 0, "Should have at least 1 room type");
    assert.ok(Array.isArray(prop.room_types[0].rate_plans), "Room type should include rate plans");
  });

  test("Step 5: Check Availability before Booking", async () => {
  const startDays = 20 + Math.floor(Math.random() * 80);
  const checkIn = getFutureDate(startDays);
  const checkOut = getFutureDate(startDays + 4);

    const res = await fetch(
      `${baseUrl}/bookings/availability?property_id=${seededPropertyId}&check_in_date=${checkIn}&check_out_date=${checkOut}`
    );

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.available, true);
    assert.strictEqual(body.data.total_nights, 4);
  });

  test("Step 6: Create Authoritative Booking in PostgreSQL", async () => {
  const startDays = 20 + Math.floor(Math.random() * 80);
  const checkIn = getFutureDate(startDays);
  const checkOut = getFutureDate(startDays + 4);

    const res = await fetch(`${baseUrl}/bookings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${guestToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        property_id: seededPropertyId,
        check_in_date: checkIn,
        check_out_date: checkOut,
        guests_count: 1,
        special_requests: "Early check-in requested if available",
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.booking.id);
    assert.strictEqual(body.data.booking.status, "confirmed");
    assert.strictEqual(body.data.booking.payment_status, "unpaid");

    testBookingId = body.data.booking.id;
    createdBookingIds.push(testBookingId);
  });

  test("Step 7: Create Razorpay Order for Booking", async () => {
    assert.ok(testBookingId);
    const res = await fetch(`${baseUrl}/payments/create-order`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${guestToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ booking_id: testBookingId }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.order?.id);
    assert.strictEqual(body.data.order.currency, "INR");
    assert.ok(body.data.order.amount > 0);

    razorpayOrderId = body.data.order.id;
  });

  test("Step 8: Verify Payment with HMAC-SHA256 Signature", async () => {
    assert.ok(razorpayOrderId);
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const signature = generateRazorpaySignature({
      orderId: razorpayOrderId,
      paymentId,
    });

    const res = await fetch(`${baseUrl}/payments/verify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${guestToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.payment?.status || body.data.status, "captured");

    // Verify booking is marked paid
    const bookingRes = await fetch(`${baseUrl}/bookings/${testBookingId}`, {
      headers: { Authorization: `Bearer ${guestToken}` },
    });
    const bookingBody = await bookingRes.json();
    assert.strictEqual(bookingBody.data.booking.payment_status, "paid");
  });

  test("Step 9: Retrieve Resident Booking History", async () => {
    const res = await fetch(`${baseUrl}/bookings`, {
      headers: { Authorization: `Bearer ${guestToken}` },
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data.bookings));
    const found = body.data.bookings.find((b) => b.id === testBookingId);
    assert.ok(found, "Created booking should be present in resident history");
    assert.strictEqual(found.payment_status, "paid");
  });

  test("Step 10: Authenticate Admin (admin@stayzy.com) and Inspect Dashboard", async () => {
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@stayzy.com",
        password: "AdminPassword123!",
      }),
    });

    const loginBody = await loginRes.json();
    assert.strictEqual(loginRes.status, 200);
    adminToken = loginBody.data.token;
    assert.strictEqual(loginBody.data.user.role, "admin");

    const dashRes = await fetch(`${baseUrl}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const dashBody = await dashRes.json();
    assert.strictEqual(dashRes.status, 200);
    assert.strictEqual(dashBody.success, true);
    assert.ok(dashBody.data.properties.total_properties >= 4);
    assert.ok(dashBody.data.users.total_users >= 3);
  });
});
