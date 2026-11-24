import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import app from "../src/app.js";
import pool from "../src/database/pool.js";
import { env } from "../src/config/env.js";
import {
  generateRazorpaySignature,
  verifyRazorpaySignature,
} from "../src/config/razorpay.js";

let server;
let baseUrl;

// Fixtures
let hostUser1;
let guestUser1;
let guestUser2;
let adminUser;
let suspendedUser;

let hostToken1;
let guestToken1;
let guestToken2;
let adminToken;
let suspendedToken;

let testProperty1;
let testBooking1;
let testBooking2;
let cancelledBooking;

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
  const h1Res = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, account_status)
     VALUES ($1, $2, $3, 'host', 'active') RETURNING id, full_name, email, role`,
    [`Host One ${uniqueSuffix}`, `pay_h1_${uniqueSuffix}@example.com`, passwordHash]
  );
  hostUser1 = h1Res.rows[0];
  hostToken1 = createToken(hostUser1);

  const g1Res = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, account_status)
     VALUES ($1, $2, $3, 'guest', 'active') RETURNING id, full_name, email, role`,
    [`Guest One ${uniqueSuffix}`, `pay_g1_${uniqueSuffix}@example.com`, passwordHash]
  );
  guestUser1 = g1Res.rows[0];
  guestToken1 = createToken(guestUser1);

  const g2Res = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, account_status)
     VALUES ($1, $2, $3, 'guest', 'active') RETURNING id, full_name, email, role`,
    [`Guest Two ${uniqueSuffix}`, `pay_g2_${uniqueSuffix}@example.com`, passwordHash]
  );
  guestUser2 = g2Res.rows[0];
  guestToken2 = createToken(guestUser2);

  const aRes = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, account_status)
     VALUES ($1, $2, $3, 'admin', 'active') RETURNING id, full_name, email, role`,
    [`Admin User ${uniqueSuffix}`, `pay_adm_${uniqueSuffix}@example.com`, passwordHash]
  );
  adminUser = aRes.rows[0];
  adminToken = createToken(adminUser);

  const sRes = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, account_status)
     VALUES ($1, $2, $3, 'guest', 'suspended') RETURNING id, full_name, email, role`,
    [`Suspended User ${uniqueSuffix}`, `pay_susp_${uniqueSuffix}@example.com`, passwordHash]
  );
  suspendedUser = sRes.rows[0];
  suspendedToken = createToken(suspendedUser);

  // 2. Property
  const p1Res = await pool.query(
    `INSERT INTO properties (
       host_id, title, description, property_type, room_type,
       price_per_night, currency, address, city, country,
       max_guests, bedrooms, beds, bathrooms, status, is_available
     ) VALUES (
       $1, 'Luxury Penthouse', 'High-end penthouse overlooking the city', 'apartment', 'entire_place',
       150.00, 'USD', '500 Skyline Drive', 'San Francisco', 'USA',
       4, 2, 2, 2.0, 'active', true
     ) RETURNING *`,
    [hostUser1.id]
  );
  testProperty1 = p1Res.rows[0];

  // 3. Bookings
  const b1Res = await pool.query(
    `INSERT INTO bookings (
       property_id, guest_id, check_in_date, check_out_date,
       total_nights, price_per_night, total_price, currency,
       guests_count, status, payment_status
     ) VALUES (
       $1, $2, $3, $4, 3, 150.00, 450.00, 'USD', 2, 'confirmed', 'unpaid'
     ) RETURNING *`,
    [testProperty1.id, guestUser1.id, getFutureDate(10), getFutureDate(13)]
  );
  testBooking1 = b1Res.rows[0];

  const b2Res = await pool.query(
    `INSERT INTO bookings (
       property_id, guest_id, check_in_date, check_out_date,
       total_nights, price_per_night, total_price, currency,
       guests_count, status, payment_status
     ) VALUES (
       $1, $2, $3, $4, 2, 150.00, 300.00, 'USD', 2, 'confirmed', 'unpaid'
     ) RETURNING *`,
    [testProperty1.id, guestUser1.id, getFutureDate(20), getFutureDate(22)]
  );
  testBooking2 = b2Res.rows[0];

  const bCancelledRes = await pool.query(
    `INSERT INTO bookings (
       property_id, guest_id, check_in_date, check_out_date,
       total_nights, price_per_night, total_price, currency,
       guests_count, status, payment_status
     ) VALUES (
       $1, $2, $3, $4, 2, 150.00, 300.00, 'USD', 2, 'cancelled', 'unpaid'
     ) RETURNING *`,
    [testProperty1.id, guestUser1.id, getFutureDate(30), getFutureDate(32)]
  );
  cancelledBooking = bCancelledRes.rows[0];
});

test.after(async () => {
  if (testProperty1) {
    await pool.query("DELETE FROM payments WHERE user_id = $1", [guestUser1.id]);
    await pool.query("DELETE FROM bookings WHERE property_id = $1", [testProperty1.id]);
    await pool.query("DELETE FROM properties WHERE id = $1", [testProperty1.id]);
  }
  if (hostUser1) {
    await pool.query("DELETE FROM users WHERE id IN ($1, $2, $3, $4, $5)", [
      hostUser1.id,
      guestUser1.id,
      guestUser2.id,
      adminUser.id,
      suspendedUser.id,
    ]);
  }
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

// ==========================================
// 1. Authentication & Authorization Controls
// ==========================================

test("POST /payments/create-order - rejects unauthenticated request with 401", async () => {
  const res = await fetch(`${baseUrl}/payments/create-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ booking_id: testBooking1.id }),
  });
  const data = await res.json();

  assert.equal(res.status, 401);
  assert.equal(data.success, false);
});

test("POST /payments/create-order - rejects suspended user with 403", async () => {
  const res = await fetch(`${baseUrl}/payments/create-order`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${suspendedToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ booking_id: testBooking1.id }),
  });
  const data = await res.json();

  assert.equal(res.status, 403);
  assert.equal(data.success, false);
  assert.ok(data.message.toLowerCase().includes("suspended"));
});

test("POST /payments/create-order - rejects invalid booking UUID with 400", async () => {
  const res = await fetch(`${baseUrl}/payments/create-order`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ booking_id: "not-a-valid-uuid" }),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
});

test("POST /payments/create-order - returns 404 for non-existent booking UUID", async () => {
  const nonExistentUuid = crypto.randomUUID();
  const res = await fetch(`${baseUrl}/payments/create-order`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ booking_id: nonExistentUuid }),
  });
  const data = await res.json();

  assert.equal(res.status, 404);
  assert.equal(data.success, false);
  assert.ok(data.message.toLowerCase().includes("not found"));
});

test("POST /payments/create-order - prevents user from paying for another guest's booking with 403", async () => {
  // guestUser2 attempts to pay for guestUser1's booking
  const res = await fetch(`${baseUrl}/payments/create-order`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken2}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ booking_id: testBooking1.id }),
  });
  const data = await res.json();

  assert.equal(res.status, 403);
  assert.equal(data.success, false);
  assert.ok(data.message.toLowerCase().includes("not authorized"));
});

test("POST /payments/create-order - rejects payment for cancelled booking with 400", async () => {
  const res = await fetch(`${baseUrl}/payments/create-order`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ booking_id: cancelledBooking.id }),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
  assert.ok(data.message.toLowerCase().includes("cancelled"));
});

// ==========================================
// 2. Order Creation
// ==========================================

let createdOrderId;
let createdPaymentId;

test("POST /payments/create-order - successfully creates payment order", async () => {
  const res = await fetch(`${baseUrl}/payments/create-order`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ booking_id: testBooking1.id }),
  });
  const data = await res.json();

  assert.equal(res.status, 201);
  assert.equal(data.success, true);
  assert.ok(data.data.order.id);
  assert.equal(data.data.order.amount, 450.0);
  assert.equal(data.data.order.amount_subunit, 45000);
  assert.equal(data.data.order.key_id, env.RAZORPAY_KEY_ID);
  // Ensure secret is NEVER exposed to frontend
  assert.equal(data.data.order.key_secret, undefined);
  assert.equal(data.data.key_secret, undefined);

  assert.equal(data.data.payment.booking_id, testBooking1.id);
  assert.equal(data.data.payment.user_id, guestUser1.id);
  assert.equal(data.data.payment.status, "created");

  createdOrderId = data.data.order.id;
  createdPaymentId = data.data.payment.id;
});

// ==========================================
// 3. Signature Verification & Payment Capture
// ==========================================

test("POST /payments/verify - rejects missing required fields with 400", async () => {
  const res = await fetch(`${baseUrl}/payments/verify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      razorpay_order_id: createdOrderId,
      // missing payment_id and signature
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
});

test("POST /payments/verify - returns 404 for non-existent order ID", async () => {
  const res = await fetch(`${baseUrl}/payments/verify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      razorpay_order_id: "order_non_existent_123",
      razorpay_payment_id: "pay_12345",
      razorpay_signature: "dummy_sig",
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 404);
  assert.equal(data.success, false);
});

test("POST /payments/verify - rejects verification attempt by non-payer with 403", async () => {
  const res = await fetch(`${baseUrl}/payments/verify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken2}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      razorpay_order_id: createdOrderId,
      razorpay_payment_id: "pay_12345",
      razorpay_signature: "dummy_sig",
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 403);
  assert.equal(data.success, false);
});

test("POST /payments/verify - rejects tampered/invalid signature with 400 and records failure", async () => {
  const fakePaymentId = `pay_test_${Date.now()}`;
  const invalidSignature = "invalid_tampered_hmac_signature_string_hex";

  const res = await fetch(`${baseUrl}/payments/verify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      razorpay_order_id: createdOrderId,
      razorpay_payment_id: fakePaymentId,
      razorpay_signature: invalidSignature,
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
  assert.ok(data.message.toLowerCase().includes("signature"));

  // Verify database record updated to failed safely
  const dbPayment = await pool.query(
    "SELECT status, error_code FROM payments WHERE razorpay_order_id = $1",
    [createdOrderId]
  );
  assert.equal(dbPayment.rows[0].status, "failed");
  assert.equal(dbPayment.rows[0].error_code, "SIGNATURE_VERIFICATION_FAILED");
});

test("POST /payments/verify - successfully verifies authentic signature and captures payment", async () => {
  // Reset payment status to 'created' for valid test
  await pool.query(
    "UPDATE payments SET status = 'created', error_code = NULL, error_description = NULL WHERE razorpay_order_id = $1",
    [createdOrderId]
  );

  const validPaymentId = `pay_valid_${Date.now()}`;
  const validSignature = generateRazorpaySignature({
    orderId: createdOrderId,
    paymentId: validPaymentId,
    secret: env.RAZORPAY_KEY_SECRET,
  });

  const res = await fetch(`${baseUrl}/payments/verify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      razorpay_order_id: createdOrderId,
      razorpay_payment_id: validPaymentId,
      razorpay_signature: validSignature,
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.payment.status, "captured");
  assert.equal(data.data.payment.razorpay_payment_id, validPaymentId);
  assert.equal(data.data.booking.payment_status, "paid");

  // Verify in database
  const dbBooking = await pool.query(
    "SELECT payment_status FROM bookings WHERE id = $1",
    [testBooking1.id]
  );
  assert.equal(dbBooking.rows[0].payment_status, "paid");
});

test("POST /payments/create-order - rejects creating order for already paid booking with 400", async () => {
  const res = await fetch(`${baseUrl}/payments/create-order`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ booking_id: testBooking1.id }),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
  assert.ok(data.message.toLowerCase().includes("already been paid"));
});

// ==========================================
// 4. Payment Failure Reporting
// ==========================================

let failureOrderId;

test("POST /payments/fail - safely records payment failure", async () => {
  // Create an order on testBooking2
  const orderRes = await fetch(`${baseUrl}/payments/create-order`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ booking_id: testBooking2.id }),
  });
  const orderData = await orderRes.json();
  failureOrderId = orderData.data.order.id;

  const res = await fetch(`${baseUrl}/payments/fail`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      razorpay_order_id: failureOrderId,
      error_code: "BAD_REQUEST_ERROR",
      error_description: "Payment failed due to insufficient funds",
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.payment.status, "failed");
  assert.equal(data.data.payment.error_code, "BAD_REQUEST_ERROR");
  assert.equal(data.data.payment.error_description, "Payment failed due to insufficient funds");

  // Check booking payment_status
  const dbBooking = await pool.query(
    "SELECT payment_status FROM bookings WHERE id = $1",
    [testBooking2.id]
  );
  assert.equal(dbBooking.rows[0].payment_status, "failed");
});

// ==========================================
// 5. Refunds & Refund Workflow Hooks
// ==========================================

test("POST /payments/:id/refund - rejects non-existent payment UUID with 404", async () => {
  const nonExistentUuid = crypto.randomUUID();
  const res = await fetch(`${baseUrl}/payments/${nonExistentUuid}/refund`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${hostToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount: 100 }),
  });
  const data = await res.json();

  assert.equal(res.status, 404);
  assert.equal(data.success, false);
});

test("POST /payments/:id/refund - rejects unauthorized refund attempt with 403", async () => {
  // guestUser2 attempts to refund guestUser1's payment on hostUser1's property
  const res = await fetch(`${baseUrl}/payments/${createdPaymentId}/refund`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken2}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount: 100 }),
  });
  const data = await res.json();

  assert.equal(res.status, 403);
  assert.equal(data.success, false);
  assert.ok(data.message.toLowerCase().includes("not authorized"));
});

test("POST /payments/:id/refund - rejects refund exceeding total refundable balance with 400", async () => {
  const res = await fetch(`${baseUrl}/payments/${createdPaymentId}/refund`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${hostToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount: 1000.0 }), // original was 450.00
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
  assert.ok(data.message.toLowerCase().includes("exceeds"));
});

test("POST /payments/:id/refund - processes partial refund successfully", async () => {
  const res = await fetch(`${baseUrl}/payments/${createdPaymentId}/refund`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${hostToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: 150.0,
      reason: "Partial cancellation compensation",
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.refund.amount, 150.0);
  assert.equal(data.data.payment.refund_amount, 150.0);
  assert.equal(data.data.payment.status, "captured"); // Still captured as partial
});

test("POST /payments/:id/refund - processes remaining refund and marks status refunded", async () => {
  // Remaining refundable: 450 - 150 = 300
  const res = await fetch(`${baseUrl}/payments/${createdPaymentId}/refund`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: 300.0,
      reason: "Full remaining refund",
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.payment.refund_amount, 450.0);
  assert.equal(data.data.payment.status, "refunded");

  // Check booking payment_status
  const dbBooking = await pool.query(
    "SELECT payment_status FROM bookings WHERE id = $1",
    [testBooking1.id]
  );
  assert.equal(dbBooking.rows[0].payment_status, "refunded");
});

test("POST /payments/:id/refund - rejects refund when already fully refunded with 400", async () => {
  const res = await fetch(`${baseUrl}/payments/${createdPaymentId}/refund`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${hostToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount: 50.0 }),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
  assert.ok(data.message.toLowerCase().includes("fully refunded"));
});

// ==========================================
// 6. Retrieval & History Endpoints
// ==========================================

test("GET /payments/my - returns paginated payment list for guest", async () => {
  const res = await fetch(`${baseUrl}/payments/my`, {
    headers: { Authorization: `Bearer ${guestToken1}` },
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.data.payments));
  assert.ok(data.data.payments.length >= 2);
  assert.equal(data.data.pagination.page, 1);
});

test("GET /payments/my - filters by status correctly", async () => {
  const res = await fetch(`${baseUrl}/payments/my?status=failed`, {
    headers: { Authorization: `Bearer ${guestToken1}` },
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  for (const p of data.data.payments) {
    assert.equal(p.status, "failed");
  }
});

test("GET /payments/:id - returns payment details for authorized guest", async () => {
  const res = await fetch(`${baseUrl}/payments/${createdPaymentId}`, {
    headers: { Authorization: `Bearer ${guestToken1}` },
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.payment.id, createdPaymentId);
  assert.ok(data.data.payment.booking);
});

test("GET /payments/:id - allows property host to view payment", async () => {
  const res = await fetch(`${baseUrl}/payments/${createdPaymentId}`, {
    headers: { Authorization: `Bearer ${hostToken1}` },
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.payment.id, createdPaymentId);
});

test("GET /payments/:id - allows admin to view payment", async () => {
  const res = await fetch(`${baseUrl}/payments/${createdPaymentId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.payment.id, createdPaymentId);
});

test("GET /payments/:id - prevents unauthorized user with 403", async () => {
  const res = await fetch(`${baseUrl}/payments/${createdPaymentId}`, {
    headers: { Authorization: `Bearer ${guestToken2}` },
  });
  const data = await res.json();

  assert.equal(res.status, 403);
  assert.equal(data.success, false);
});

test("GET /payments/booking/:bookingId - returns payments for booking", async () => {
  const res = await fetch(`${baseUrl}/payments/booking/${testBooking1.id}`, {
    headers: { Authorization: `Bearer ${guestToken1}` },
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.data.payments));
  assert.ok(data.data.payments.length >= 1);
});

// ==========================================
// 7. Razorpay Webhooks
// ==========================================

test("POST /payments/webhook - rejects invalid signature with 400", async () => {
  const payload = { event: "payment.captured", payload: { payment: { entity: { id: "pay_1" } } } };
  const res = await fetch(`${baseUrl}/payments/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-razorpay-signature": "invalid_sig",
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
});

test("POST /payments/webhook - successfully processes valid webhook event", async () => {
  const payload = {
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_webhook_test_123",
          order_id: createdOrderId,
        },
      },
    },
  };

  const payloadString = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(payloadString)
    .digest("hex");

  const res = await fetch(`${baseUrl}/payments/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-razorpay-signature": signature,
    },
    body: payloadString,
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.event, "payment.captured");
});

// ==========================================
// 8. SQL Injection Safety
// ==========================================

test("GET /payments/my - parameterized status query safely handles SQL injection payload", async () => {
  const res = await fetch(
    `${baseUrl}/payments/my?status=%27%20OR%20%271%27%3D%271`,
    {
      headers: { Authorization: `Bearer ${guestToken1}` },
    }
  );
  const data = await res.json();

  // Status is validated by Zod enum or handled safely by parameterized SQL
  assert.equal(res.status, 400);
  assert.equal(data.success, false);
});
