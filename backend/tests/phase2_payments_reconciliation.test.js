import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import app from "../src/app.js";
import pool from "../src/database/pool.js";
import { env } from "../src/config/env.js";
import { generateRazorpaySignature } from "../src/config/razorpay.js";
import { addCalendarDays } from "../src/utils/pricing.js";

let server;
let baseUrl;

const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const hostEmail = `p2pay_host_${suffix}@example.com`;
const guestEmail = `p2pay_guest_${suffix}@example.com`;
const otherGuestEmail = `p2pay_other_${suffix}@example.com`;

let hostToken;
let guestToken;
let otherToken;
let testPropertyId;
let testRoomTypeId;
let yearlyBookingId;
let retryBookingId;
let firstScheduleId;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}/api/v1`;
      resolve();
    });
  });

  const registerAndLogin = async (name, email, role) => {
    await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: name, email, password: "Password123!", role }),
    });
    const lRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "Password123!" }),
    });
    const lBody = await lRes.json();
    return lBody.data.token;
  };

  hostToken = await registerAndLogin("Pay Host", hostEmail, "host");
  guestToken = await registerAndLogin("Pay Guest", guestEmail, "guest");
  otherToken = await registerAndLogin("Other Guest", otherGuestEmail, "guest");

  const propRes = await fetch(`${baseUrl}/properties`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${hostToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: `Pay Test Co-Living ${suffix}`,
      description: "Property for testing idempotent payments, schedules, webhooks & simulator",
      property_type: "apartment",
      room_type: "private_room",
      price_per_night: 1000,
      currency: "INR",
      address: "12 Indiranagar 100ft Rd",
      city: "Bengaluru",
      country: "India",
      room_types: [
        {
          name: `Pay Room ${suffix}`,
          category: "PRIVATE",
          room_numbers: ["301", "302"],
          beds_per_room: 1,
          rate_plans: [
            { duration_type: "DAILY", price: 1000, deposit_amount: 500 },
            { duration_type: "YEARLY", price: 120000, deposit_amount: 15000 },
          ],
        },
      ],
    }),
  });
  const propBody = await propRes.json();
  assert.equal(propRes.status, 201);
  testPropertyId = propBody.data.property.id;
  testRoomTypeId = propBody.data.property.room_types[0].id;

  const startDate = addCalendarDays(new Date().toISOString().split("T")[0], 20);

  // 1. Yearly booking (generates 11 payment_schedules)
  const yRes = await fetch(`${baseUrl}/bookings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      room_type_id: testRoomTypeId,
      duration_type: "YEARLY",
      start_date: startDate,
      duration_count: 1,
    }),
  });
  const yBody = await yRes.json();
  assert.equal(yRes.status, 201);
  yearlyBookingId = yBody.data.booking.id;
  firstScheduleId = yBody.data.booking.payment_schedules[0].id;

  // 2. Daily booking for retry / webhook / demo tests
  const dRes = await fetch(`${baseUrl}/bookings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      room_type_id: testRoomTypeId,
      duration_type: "DAILY",
      start_date: startDate,
      duration_count: 2,
    }),
  });
  const dBody = await dRes.json();
  assert.equal(dRes.status, 201);
  retryBookingId = dBody.data.booking.id;
});

test.after(async () => {
  if (yearlyBookingId) await pool.query("DELETE FROM bookings WHERE id = $1", [yearlyBookingId]);
  if (retryBookingId) await pool.query("DELETE FROM bookings WHERE id = $1", [retryBookingId]);
  if (testPropertyId) await pool.query("DELETE FROM properties WHERE id = $1", [testPropertyId]);
  await pool.query("DELETE FROM users WHERE LOWER(email) = ANY($1)", [
    [hostEmail, guestEmail, otherGuestEmail],
  ]);
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await pool.end();
});

test("Payments: idempotency_key prevents duplicate order creation & strict schema blocks amount override", async () => {
  const tamperedRes = await fetch(`${baseUrl}/payments/create-order`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ booking_id: yearlyBookingId, amount: 1 }),
  });
  assert.equal(tamperedRes.status, 400);

  const idemKey = `idem_${suffix}_1`;
  const o1 = await fetch(`${baseUrl}/payments/create-order`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ booking_id: yearlyBookingId, idempotency_key: idemKey }),
  });
  const o1Body = await o1.json();
  assert.equal(o1.status, 201);

  const o2 = await fetch(`${baseUrl}/payments/create-order`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ booking_id: yearlyBookingId, idempotency_key: idemKey }),
  });
  const o2Body = await o2.json();
  assert.equal(o2.status, 201);
  assert.equal(o2Body.data.order.id, o1Body.data.order.id);
  assert.equal(o2Body.data.idempotent_replay, true);

  // Pay initial YEARLY installment using server HMAC verification
  const payId = `pay_yr_${suffix}`;
  const sig = generateRazorpaySignature({
    orderId: o1Body.data.order.id,
    paymentId: payId,
    secret: env.RAZORPAY_KEY_SECRET,
  });

  const v1 = await fetch(`${baseUrl}/payments/verify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      razorpay_order_id: o1Body.data.order.id,
      razorpay_payment_id: payId,
      razorpay_signature: sig,
    }),
  });
  const v1Body = await v1.json();
  assert.equal(v1.status, 200);
  assert.equal(v1Body.data.booking.status, "confirmed");
  assert.equal(v1Body.data.booking.payment_status, "paid");

  // Duplicate verify returns idempotent response cleanly
  const v2 = await fetch(`${baseUrl}/payments/verify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      razorpay_order_id: o1Body.data.order.id,
      razorpay_payment_id: payId,
      razorpay_signature: sig,
    }),
  });
  const v2Body = await v2.json();
  assert.equal(v2.status, 200);
  assert.equal(v2Body.data.idempotent, true);

  // Pay scheduled Month 2 installment via payment_schedule_id
  const schedOrder = await fetch(`${baseUrl}/payments/create-order`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      booking_id: yearlyBookingId,
      payment_schedule_id: firstScheduleId,
    }),
  });
  const schedOrderBody = await schedOrder.json();
  assert.equal(schedOrder.status, 201);

  const schedPayId = `pay_sched_${suffix}`;
  const schedVerify = await fetch(`${baseUrl}/payments/verify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      razorpay_order_id: schedOrderBody.data.order.id,
      razorpay_payment_id: schedPayId,
      razorpay_signature: generateRazorpaySignature({
        orderId: schedOrderBody.data.order.id,
        paymentId: schedPayId,
        secret: env.RAZORPAY_KEY_SECRET,
      }),
    }),
  });
  assert.equal(schedVerify.status, 200);

  // Confirm schedule status PAID and GET /payments/my returns schedules & refunds
  const myPayRes = await fetch(`${baseUrl}/payments/my`, {
    headers: { Authorization: `Bearer ${guestToken}` },
  });
  const myPayBody = await myPayRes.json();
  assert.equal(myPayRes.status, 200);
  const paidSched = myPayBody.data.schedules.find((s) => s.id === firstScheduleId);
  assert.equal(paidSched.status, "PAID");
});

test("Payments: fail -> retry order -> webhook deduplication & atomic booking confirmation + reconcile", async () => {
  // 1. Create initial order, then mark it FAILED
  const initOrder = await fetch(`${baseUrl}/payments/create-order`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ booking_id: retryBookingId }),
  });
  const initOrderBody = await initOrder.json();
  assert.equal(initOrder.status, 201);
  const initialOrderId = initOrderBody.data.order.id;

  const failRes = await fetch(`${baseUrl}/payments/fail`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      razorpay_order_id: initialOrderId,
      error_code: "BAD_REQUEST_ERROR",
      error_description: "Bank timeout",
    }),
  });
  assert.equal(failRes.status, 200);

  // 2. Retry creates a fresh Razorpay order
  const retryOrder = await fetch(`${baseUrl}/payments/create-order`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ booking_id: retryBookingId }),
  });
  const retryBody = await retryOrder.json();
  assert.equal(retryOrder.status, 201);
  assert.notEqual(retryBody.data.order.id, initialOrderId);

  // 3. Deliver signed webhook with event.id -> updates BOTH payment AND booking
  const eventId = `evt_${suffix}`;
  const whPayload = {
    id: eventId,
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: `pay_wh_${suffix}`,
          order_id: retryBody.data.order.id,
        },
      },
    },
  };
  const whSig = crypto
    .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(JSON.stringify(whPayload))
    .digest("hex");

  const wh1 = await fetch(`${baseUrl}/payments/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-razorpay-signature": whSig,
    },
    body: JSON.stringify(whPayload),
  });
  assert.equal(wh1.status, 200);

  // Verify booking atomically confirmed by webhook
  const bCheck = await pool.query(
    "SELECT status, payment_status FROM bookings WHERE id = $1",
    [retryBookingId]
  );
  assert.equal(bCheck.rows[0].status, "confirmed");
  assert.equal(bCheck.rows[0].payment_status, "paid");

  // Duplicate webhook event delivery is cleanly deduplicated
  const wh2 = await fetch(`${baseUrl}/payments/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-razorpay-signature": whSig,
    },
    body: JSON.stringify(whPayload),
  });
  const wh2Body = await wh2.json();
  assert.equal(wh2.status, 200);
  assert.equal(wh2Body.data.duplicate, true);

  // Reconcile endpoint ownership guard + status check
  const deniedRec = await fetch(`${baseUrl}/payments/reconcile`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${otherToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ booking_id: retryBookingId }),
  });
  assert.equal(deniedRec.status, 403);

  const okRec = await fetch(`${baseUrl}/payments/reconcile`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ booking_id: retryBookingId }),
  });
  const okRecBody = await okRec.json();
  assert.equal(okRec.status, 200);
  assert.equal(okRecBody.data.action, "already_captured");
});

test("Security: demo-simulate strictly returns 403 Forbidden when NODE_ENV=production", async () => {
  const script = `
    import { demoSimulate } from "./src/modules/payments/payments.controller.js";
    const req = { user: { id: "u1", role: "guest" }, body: { booking_id: "00000000-0000-0000-0000-000000000001", outcome: "SUCCESS" } };
    let statusCode = 0;
    let jsonPayload = null;
    const res = {
      status(c) { statusCode = c; return this; },
      json(p) { jsonPayload = p; return this; }
    };
    await demoSimulate(req, res, (err) => { statusCode = err?.status || 500; jsonPayload = { message: err?.message }; });
    console.log(JSON.stringify({ statusCode, jsonPayload }));
  `;

  const rawOut = execFileSync(
    process.execPath,
    ["--input-type=module", "-e", script],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: "production",
        CORS_ORIGIN: "https://stayzy.example.com",
        DB_NAME: "stayzy_prod_validation",
        DB_PASSWORD: process.env.DB_PASSWORD || "prod_validation_password",
        JWT_SECRET: "production_subprocess_validation_key_at_least_32_chars_long",
        RAZORPAY_KEY_ID: "rzp_live_mocked_production_key",
        RAZORPAY_KEY_SECRET: "rzp_live_mocked_production_secret",
        RAZORPAY_WEBHOOK_SECRET: "rzp_live_mocked_webhook_secret",
      },
      encoding: "utf8",
    }
  );

  const lines = rawOut.trim().split(/\r?\n/);
  const parsed = JSON.parse(lines[lines.length - 1]);
  assert.equal(parsed.statusCode, 403);
  assert.ok(parsed.jsonPayload.message.toLowerCase().includes("production"));
});
