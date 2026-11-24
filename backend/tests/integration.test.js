import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import pool from "../src/database/pool.js";
import { env } from "../src/config/env.js";
import { generateRazorpaySignature } from "../src/config/razorpay.js";

let server;
let baseUrl;

// Test entity IDs for clean teardown
let hostUserId;
let guestUserId;
let adminUserId;
let propertyId;
let bookingId;
let paymentId;
let reviewId;

let hostToken;
let guestToken;
let adminToken;

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

  // Seed Admin user for platform verification
  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const pwHash = await bcrypt.hash("AdminPassword123!", 10);
  const adminRes = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, account_status)
     VALUES ($1, $2, $3, 'admin', 'active') RETURNING id`,
    [`Admin QA ${uniqueSuffix}`, `admin_qa_${uniqueSuffix}@example.com`, pwHash]
  );
  adminUserId = adminRes.rows[0].id;
  adminToken = jwt.sign(
    { sub: adminUserId, email: `admin_qa_${uniqueSuffix}@example.com`, role: "admin" },
    env.JWT_SECRET,
    { expiresIn: "1h" }
  );
});

test.after(async () => {
  try {
    if (reviewId) {
      await pool.query("DELETE FROM reviews WHERE id = $1", [reviewId]);
    }
    if (bookingId) {
      await pool.query("DELETE FROM payments WHERE booking_id = $1", [bookingId]);
      await pool.query("DELETE FROM bookings WHERE id = $1", [bookingId]);
    }
    if (propertyId) {
      await pool.query("DELETE FROM properties WHERE id = $1", [propertyId]);
    }
    const userIds = [hostUserId, guestUserId, adminUserId].filter(Boolean);
    if (userIds.length > 0) {
      await pool.query("DELETE FROM users WHERE id = ANY($1)", [userIds]);
    }
  } catch (err) {
    console.error("Teardown error:", err);
  }

  await new Promise((resolve) => server.close(resolve));
});

test.describe("Full Platform End-to-End Integration Flow", () => {
  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const hostEmail = `e2e_host_${uniqueSuffix}@example.com`;
  const guestEmail = `e2e_guest_${uniqueSuffix}@example.com`;
  const password = "SecurePassword123!";

  let propertyCity = `E2ECity_${uniqueSuffix}`;
  let razorpayOrderId = null;

  test("Step 1: Host registers account", async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: "E2E Test Host",
        email: hostEmail,
        password: password,
        role: "host",
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.user.id);
    hostUserId = body.data.user.id;
  });

  test("Step 2: Host logs in and obtains JWT token", async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: hostEmail,
        password: password,
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.token);
    assert.strictEqual(body.data.user.role, "host");
    hostToken = body.data.token;
  });

  test("Step 3: Host creates a new property listing", async () => {
    const res = await fetch(`${baseUrl}/properties`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${hostToken}`,
      },
      body: JSON.stringify({
        title: `Luxury Villa ${uniqueSuffix}`,
        description: "A gorgeous luxury villa with panoramic ocean views and private pool.",
        property_type: "villa",
        room_type: "entire_place",
        price_per_night: 5000,
        currency: "USD",
        address: "100 Seaside Boulevard",
        city: propertyCity,
        state: "Goa",
        country: "India",
        postal_code: "403001",
        latitude: 15.4989,
        longitude: 73.8278,
        max_guests: 6,
        bedrooms: 3,
        beds: 3,
        bathrooms: 3,
        amenities: ["wifi", "pool", "kitchen", "air_conditioning"],
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.property.id);
    propertyId = body.data.property.id;
  });

  test("Step 4: Host adds images to the property", async () => {
    const res = await fetch(`${baseUrl}/properties/${propertyId}/images`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${hostToken}`,
      },
      body: JSON.stringify({
        images: [
          "https://example.com/villa_front.jpg",
          "https://example.com/villa_pool.jpg",
        ],
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.property);
  });

  test("Step 5: Guest registers account", async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: "E2E Test Guest",
        email: guestEmail,
        password: password,
        role: "guest",
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.user.id);
    guestUserId = body.data.user.id;
  });

  test("Step 6: Guest logs in and obtains JWT token", async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: guestEmail,
        password: password,
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.token);
    assert.strictEqual(body.data.user.role, "guest");
    guestToken = body.data.token;
  });

  test("Step 7: Guest searches for property by city and property_type", async () => {
    const res = await fetch(
      `${baseUrl}/properties/search?city=${encodeURIComponent(propertyCity)}&property_type=villa`
    );

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.properties.length >= 1);
    const found = body.data.properties.find((p) => p.id === propertyId);
    assert.ok(found, "Created property should appear in search results");
  });

  test("Step 8: Guest checks property availability for dates", async () => {
    const checkIn = getFutureDate(10);
    const checkOut = getFutureDate(13);

    const res = await fetch(
      `${baseUrl}/bookings/availability?property_id=${propertyId}&check_in_date=${checkIn}&check_out_date=${checkOut}`
    );

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.available, true);
  });

  test("Step 9: Guest creates a booking", async () => {
    const checkIn = getFutureDate(10);
    const checkOut = getFutureDate(13);

    const res = await fetch(`${baseUrl}/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${guestToken}`,
      },
      body: JSON.stringify({
        property_id: propertyId,
        check_in_date: checkIn,
        check_out_date: checkOut,
        guests_count: 2,
        special_requests: "Early check-in if possible please",
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.booking.id);
    bookingId = body.data.booking.id;
    assert.strictEqual(body.data.booking.status, "confirmed");
  });

  test("Step 10: Guest initiates payment order via Razorpay", async () => {
    const res = await fetch(`${baseUrl}/payments/create-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${guestToken}`,
      },
      body: JSON.stringify({
        booking_id: bookingId,
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.order.id);
    assert.ok(body.data.payment.id);
    razorpayOrderId = body.data.order.id;
    paymentId = body.data.payment.id;
  });

  test("Step 11: Guest verifies payment signature and captures payment", async () => {
    const mockPaymentId = `pay_e2e_${crypto.randomBytes(6).toString("hex")}`;
    const validSignature = generateRazorpaySignature({
      orderId: razorpayOrderId,
      paymentId: mockPaymentId,
      secret: env.RAZORPAY_KEY_SECRET,
    });

    const res = await fetch(`${baseUrl}/payments/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${guestToken}`,
      },
      body: JSON.stringify({
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: mockPaymentId,
        razorpay_signature: validSignature,
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.payment.status, "captured");
    assert.strictEqual(body.data.booking.payment_status, "paid");
  });

  test("Step 12: Guest views booking history", async () => {
    const res = await fetch(`${baseUrl}/bookings`, {
      headers: { Authorization: `Bearer ${guestToken}` },
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    const myBooking = body.data.bookings.find((b) => b.id === bookingId);
    assert.ok(myBooking);
    assert.strictEqual(myBooking.id, bookingId);
  });

  test("Step 13: Host views reservations for their property", async () => {
    const res = await fetch(`${baseUrl}/bookings/property/${propertyId}`, {
      headers: { Authorization: `Bearer ${hostToken}` },
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.reservations);
    const hostReservation = body.data.reservations.find((b) => b.id === bookingId);
    assert.ok(hostReservation);
    assert.strictEqual(hostReservation.id, bookingId);
  });

  test("Step 14: Stay completed & Guest submits review and rating", async () => {
    // Fast-forward stay completion in database
    await pool.query("UPDATE bookings SET status = 'completed' WHERE id = $1", [bookingId]);

    const res = await fetch(`${baseUrl}/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${guestToken}`,
      },
      body: JSON.stringify({
        booking_id: bookingId,
        rating: 5,
        title: "Perfection in Goa",
        comment: "Outstanding experience! The pool, view, and hospitality were top notch.",
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.review.id);
    assert.strictEqual(body.data.review.rating, 5);
    reviewId = body.data.review.id;
  });

  test("Step 15: Public checks property reviews and verifies rating recalculation", async () => {
    const res = await fetch(`${baseUrl}/reviews/property/${propertyId}`);

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(Number(body.data.summary.average_rating), 5);
    assert.strictEqual(Number(body.data.summary.reviews_count), 1);
  });

  test("Step 16: Admin inspects platform business dashboard statistics", async () => {
    const res = await fetch(`${baseUrl}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.users);
    assert.ok(body.data.properties);
    assert.ok(body.data.bookings);
    assert.ok(Number(body.data.users.total_users) >= 3);
    assert.ok(Number(body.data.properties.total_properties) >= 1);
    assert.ok(Number(body.data.bookings.total_bookings) >= 1);
  });
});
