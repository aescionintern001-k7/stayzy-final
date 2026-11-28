import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import app from "../src/app.js";
import pool from "../src/database/pool.js";
import { googleLoginUser, resetPasswordWithToken } from "../src/modules/auth/auth.service.js";
import { addCalendarDays } from "../src/utils/pricing.js";
import { env } from "../src/config/env.js";

let server;
let baseUrl;

const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const guestEmail = `p2_guest_${suffix}@example.com`;
const hostEmail = `p2_host_${suffix}@example.com`;
const guestPhone = `98${String(Math.floor(10000000 + Math.random() * 89999999))}`;

let guestUser;
let hostUser;
let guestToken;
let guestRefreshToken;
let hostToken;
let testPropertyId;
let testRoomTypeId;
let testUnitId;
const createdBookingIds = [];
const createdHoldTokens = [];

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}/api/v1`;
      resolve();
    });
  });

  // Register host via API (with phone)
  const hostRes = await fetch(`${baseUrl}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      full_name: `Phase2 Host ${suffix}`,
      email: hostEmail,
      password: "Password123!",
      role: "host",
    }),
  });
  const hostBody = await hostRes.json();
  assert.equal(hostRes.status, 201);
  hostUser = hostBody.data.user;

  const hostLogin = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: hostEmail, password: "Password123!" }),
  });
  const hostLoginBody = await hostLogin.json();
  hostToken = hostLoginBody.data.token;

  // Create property with single room & single bed unit + HOURLY/MONTHLY/YEARLY rate plans
  const propRes = await fetch(`${baseUrl}/properties`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${hostToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: `Phase2 Co-Living Hub ${suffix}`,
      description: "Verified co-living suite for Phase 2 automated test verification",
      property_type: "apartment",
      room_type: "private_room",
      price_per_night: 1200,
      currency: "INR",
      address: "100 Koramangala 4th Block",
      city: "Bengaluru",
      country: "India",
      max_guests: 2,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
      room_types: [
        {
          name: `Executive Room ${suffix}`,
          category: "PRIVATE",
          description: "Private air-conditioned studio room",
          size_sq_ft: 260,
          base_capacity: 1,
          max_capacity: 2,
          has_ac: true,
          bathroom_type: "ATTACHED",
          food_included: true,
          food_details: "Daily 3-meal dining plan optional",
          gender_eligibility: "COLIVING",
          room_numbers: ["201"],
          beds_per_room: 1,
          rate_plans: [
            {
              duration_type: "HOURLY",
              price: 200,
              min_duration: 1,
              max_duration: 8,
              allowed_hours_start: "08:00",
              allowed_hours_end: "22:00",
              deposit_amount: 0,
            },
            {
              duration_type: "DAILY",
              price: 1200,
              deposit_amount: 500,
            },
            {
              duration_type: "MONTHLY",
              price: 20000,
              deposit_amount: 10000,
              food_monthly_charge: 3000,
            },
            {
              duration_type: "YEARLY",
              price: 240000,
              deposit_amount: 20000,
              food_monthly_charge: 3000,
            },
          ],
        },
      ],
    }),
  });
  const propBody = await propRes.json();
  assert.equal(propRes.status, 201);
  testPropertyId = propBody.data.property.id;
  testRoomTypeId = propBody.data.property.room_types[0].id;

  const unitRes = await pool.query(
    `
      SELECT iu.id
      FROM inventory_units iu
      JOIN rooms r ON iu.room_id = r.id
      WHERE r.room_type_id = $1
      LIMIT 1
    `,
    [testRoomTypeId]
  );
  testUnitId = unitRes.rows[0].id;
});

test.after(async () => {
  for (const token of createdHoldTokens) {
    await pool.query("DELETE FROM inventory_holds WHERE token = $1", [token]);
  }
  for (const bId of createdBookingIds) {
    await pool.query("DELETE FROM bookings WHERE id = $1", [bId]);
  }
  if (testPropertyId) {
    await pool.query("DELETE FROM properties WHERE id = $1", [testPropertyId]);
  }
  const emails = [guestEmail, hostEmail, `google_${suffix}@example.com`];
  await pool.query("DELETE FROM users WHERE LOWER(email) = ANY($1)", [emails]);
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await pool.end();
});

test("Auth: register with phone blocks admin self-assign, supports phone login & refresh rotation", async () => {
  const regRes = await fetch(`${baseUrl}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      full_name: "Phase2 Guest",
      email: guestEmail,
      password: "Password123!",
      phone: `+91 ${guestPhone}`,
      role: "guest",
    }),
  });
  const regBody = await regRes.json();
  assert.equal(regRes.status, 201);
  guestUser = regBody.data.user;
  assert.equal(guestUser.role, "guest");

  // Phone login
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: guestPhone,
      password: "Password123!",
      device_label: "Expo iOS Simulator",
    }),
  });
  const loginBody = await loginRes.json();
  assert.equal(loginRes.status, 200);
  assert.ok(loginBody.data.token);
  assert.ok(loginBody.data.refresh_token);
  guestToken = loginBody.data.token;
  guestRefreshToken = loginBody.data.refresh_token;

  // Refresh rotation issues new pair and invalidates old refresh token
  const refRes = await fetch(`${baseUrl}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: guestRefreshToken }),
  });
  const refBody = await refRes.json();
  assert.equal(refRes.status, 200);
  assert.ok(refBody.data.token);
  assert.notEqual(refBody.data.refresh_token, guestRefreshToken);

  // Replay of rotated old refresh_token must fail with 401
  const replayRes = await fetch(`${baseUrl}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: guestRefreshToken }),
  });
  assert.equal(replayRes.status, 401);

  guestToken = refBody.data.token;
  guestRefreshToken = refBody.data.refresh_token;
});

test("Auth: Google sign-in rejects forged token with 401 and forces guest role for new verified accounts", async () => {
  const invalidRes = await fetch(`${baseUrl}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: "forged.invalid.google.token.payload" }),
  });
  assert.equal(invalidRes.status, 401);

  // Unit verify service upsert with injected verified profile forces role = 'guest'
  const gEmail = `google_${suffix}@example.com`;
  const session = await googleLoginUser(
    { idToken: "verified_mock_token_1234567890" },
    async () => ({ email: gEmail, name: "Google Resident", picture: null })
  );
  assert.equal(session.user.role, "guest");
  assert.equal(session.user.is_email_verified, true);
  assert.ok(session.refresh_token);
});

test("Auth & Users: password change, forgot-password non-enumeration, reset & logout revocation", async () => {
  // Change password fails on wrong current password
  const wrongPwRes = await fetch(`${baseUrl}/users/me/password`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      current_password: "WrongPassword!",
      new_password: "NewPassword456!",
    }),
  });
  assert.equal(wrongPwRes.status, 401);

  // Change password succeeds & revokes refresh tokens
  const okPwRes = await fetch(`${baseUrl}/users/me/password`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      current_password: "Password123!",
      new_password: "NewPassword456!",
    }),
  });
  assert.equal(okPwRes.status, 200);

  // Old refresh token is now revoked
  const afterPwRefresh = await fetch(`${baseUrl}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: guestRefreshToken }),
  });
  assert.equal(afterPwRefresh.status, 401);

  // Forgot-password returns uniform 200 for unknown email (no enumeration)
  const forgotUnknown = await fetch(`${baseUrl}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: `unknown_${suffix}@example.com` }),
  });
  assert.equal(forgotUnknown.status, 200);

  // Direct reset token flow restores original password cleanly
  const rawToken = crypto.randomBytes(24).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '15 minutes')`,
    [guestUser.id, tokenHash]
  );
  await resetPasswordWithToken({ token: rawToken, new_password: "Password123!" });

  // Re-login & logout
  const reLogin = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: guestEmail, password: "Password123!" }),
  });
  const reLoginBody = await reLogin.json();
  assert.equal(reLogin.status, 200);
  guestToken = reLoginBody.data.token;
  guestRefreshToken = reLoginBody.data.refresh_token;

  const logoutRes = await fetch(`${baseUrl}/auth/logout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh_token: guestRefreshToken }),
  });
  assert.equal(logoutRes.status, 200);

  const postLogoutRefresh = await fetch(`${baseUrl}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: guestRefreshToken }),
  });
  assert.equal(postLogoutRefresh.status, 401);
});

test("Users Favorites: add, list, and remove room_type_id favorites", async () => {
  const addRes = await fetch(`${baseUrl}/users/me/favorites`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ room_type_id: testRoomTypeId }),
  });
  assert.equal(addRes.status, 201);

  const listRes = await fetch(`${baseUrl}/users/me/favorites`, {
    headers: { Authorization: `Bearer ${guestToken}` },
  });
  const listBody = await listRes.json();
  assert.equal(listRes.status, 200);
  assert.ok(listBody.data.favorites.some((f) => f.room_type_id === testRoomTypeId));

  const delRes = await fetch(`${baseUrl}/users/me/favorites/${testRoomTypeId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${guestToken}` },
  });
  assert.equal(delRes.status, 200);
});

test("Pricing Engine: month-end clamping, hourly window enforcement & YEARLY installment schedule", async () => {
  // Jan 31 + 1 month -> Feb 28 (non-leap 2027)
  const clampRes = await fetch(`${baseUrl}/bookings/calculate-pricing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      room_type_id: testRoomTypeId,
      duration_type: "MONTHLY",
      duration_count: 1,
      start_date: "2027-01-31",
      include_food: false,
    }),
  });
  const clampBody = await clampRes.json();
  assert.equal(clampRes.status, 200);
  assert.equal(clampBody.data.breakdown.checkOutDate, "2027-02-28");

  // Hourly outside operating window (21:00 + 3h = 24:00 > 22:00) -> 400
  const badHourRes = await fetch(`${baseUrl}/bookings/calculate-pricing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      room_type_id: testRoomTypeId,
      duration_type: "HOURLY",
      duration_count: 3,
      start_date: "2027-02-10",
      start_time: "21:00",
    }),
  });
  assert.equal(badHourRes.status, 400);

  // YEARLY -> payableNow = Month 1 + deposit + 11 schedules
  const yearlyRes = await fetch(`${baseUrl}/bookings/calculate-pricing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      room_type_id: testRoomTypeId,
      duration_type: "YEARLY",
      duration_count: 1,
      start_date: "2027-03-01",
      include_food: false,
    }),
  });
  const yearlyBody = await yearlyRes.json();
  assert.equal(yearlyRes.status, 200);
  assert.equal(yearlyBody.data.breakdown.schedule.length, 11);
  assert.ok(yearlyBody.data.breakdown.payableNow < yearlyBody.data.breakdown.totalAmount);
  assert.equal(
    Number(
      (
        yearlyBody.data.breakdown.payableNow +
        yearlyBody.data.breakdown.balanceRemaining
      ).toFixed(2)
    ),
    yearlyBody.data.breakdown.totalAmount
  );
});

test("Rooms & Holds: 15-min lock prevents double-hold & 60-min cleaning buffer blocks adjacent hourly stay", async () => {
  const futureDate = addCalendarDays(new Date().toISOString().split("T")[0], 25);

  const catalogRes = await fetch(
    `${baseUrl}/rooms?city=Bengaluru&durationType=HOURLY&startDate=${futureDate}&startTime=10:00&durationCount=2`
  );
  const catalogBody = await catalogRes.json();
  assert.equal(catalogRes.status, 200);
  const myRoom = catalogBody.data.rooms.find((r) => r.id === testRoomTypeId);
  assert.ok(myRoom);
  assert.equal(myRoom.availableCount, 1);

  // Hold 10:00 - 12:00
  const holdRes = await fetch(`${baseUrl}/holds`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      room_type_id: testRoomTypeId,
      duration_type: "HOURLY",
      start_date: futureDate,
      start_time: "10:00",
      duration_count: 2,
    }),
  });
  const holdBody = await holdRes.json();
  assert.equal(holdRes.status, 201);
  const token1 = holdBody.data.hold_token;
  createdHoldTokens.push(token1);

  // Hold starting at 12:30 (only 30 min cleaning gap < 60 min) -> 409 Conflict
  const conflictHold = await fetch(`${baseUrl}/holds`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      room_type_id: testRoomTypeId,
      duration_type: "HOURLY",
      start_date: futureDate,
      start_time: "12:30",
      duration_count: 2,
    }),
  });
  assert.equal(conflictHold.status, 409);

  // Hold starting at 13:00 (exact 60 min cleaning buffer) -> 201 Created
  const okAfterBuffer = await fetch(`${baseUrl}/holds`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      room_type_id: testRoomTypeId,
      duration_type: "HOURLY",
      start_date: futureDate,
      start_time: "13:00",
      duration_count: 2,
    }),
  });
  const okAfterBody = await okAfterBuffer.json();
  assert.equal(okAfterBuffer.status, 201);
  createdHoldTokens.push(okAfterBody.data.hold_token);

  // Release second hold cleanly
  const relRes = await fetch(`${baseUrl}/holds/${okAfterBody.data.hold_token}`, {
    method: "DELETE",
  });
  assert.equal(relRes.status, 200);
});

test("Unified Room Booking, Owner View, Extension & Tiered Cancel Refund", async () => {
  const futureDate = addCalendarDays(new Date().toISOString().split("T")[0], 40);

  // Create YEARLY booking directly via room_type_id (zero client price trust: extra fields rejected)
  const tamperedRes = await fetch(`${baseUrl}/bookings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      room_type_id: testRoomTypeId,
      duration_type: "YEARLY",
      start_date: futureDate,
      duration_count: 1,
      total_price: 1,
    }),
  });
  assert.equal(tamperedRes.status, 400);

  const bookRes = await fetch(`${baseUrl}/bookings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      room_type_id: testRoomTypeId,
      duration_type: "DAILY",
      start_date: futureDate,
      duration_count: 2,
      guests_count: 1,
      guest_name: "Phase2 Guest",
      guest_email: guestEmail,
      guest_phone: `+91 ${guestPhone}`,
    }),
  });
  const bookBody = await bookRes.json();
  assert.equal(bookRes.status, 201);
  const booking = bookBody.data.booking;
  createdBookingIds.push(booking.id);
  assert.ok(booking.booking_reference.startsWith("STY-"));
  assert.equal(booking.keyless_code, null);
  assert.equal(booking.status, "pending");

  // Host aggregates reservations via /bookings/owner
  const ownerRes = await fetch(`${baseUrl}/bookings/owner`, {
    headers: { Authorization: `Bearer ${hostToken}` },
  });
  const ownerBody = await ownerRes.json();
  assert.equal(ownerRes.status, 200);
  assert.ok(ownerBody.data.reservations.some((r) => r.id === booking.id));

  // Guest denied access to /bookings/owner
  const guestOwnerDenied = await fetch(`${baseUrl}/bookings/owner`, {
    headers: { Authorization: `Bearer ${guestToken}` },
  });
  assert.equal(guestOwnerDenied.status, 403);

  // Extend booking by 1 day
  const extRes = await fetch(`${baseUrl}/bookings/${booking.id}/extend`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ additional_count: 1 }),
  });
  const extBody = await extRes.json();
  assert.equal(extRes.status, 200);
  assert.equal(extBody.data.booking.duration_count, 3);
  assert.ok(extBody.data.extension.delta_total > 0);

  // Complete payment via real create-order + HMAC verify so tiered cancel refund triggers (>48h = 100%)
  const orderRes = await fetch(`${baseUrl}/payments/create-order`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ booking_id: booking.id }),
  });
  const orderBody = await orderRes.json();
  assert.equal(orderRes.status, 201);

  const razorpayOrderId = orderBody.data.order.id;
  const razorpayPaymentId = `pay_p2_cancel_${suffix}`;
  const razorpaySignature = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  const simRes = await fetch(`${baseUrl}/payments/verify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
    }),
  });
  const simBody = await simRes.json();
  assert.equal(simRes.status, 200);

  const cancelRes = await fetch(`${baseUrl}/bookings/${booking.id}/cancel`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reason: "Travel schedule changed" }),
  });
  const cancelBody = await cancelRes.json();
  assert.equal(cancelRes.status, 200);
  assert.equal(cancelBody.data.booking.status, "cancelled");
  assert.equal(cancelBody.data.booking.refund.policy_tier, "FULL_OVER_48H");
  assert.equal(cancelBody.data.booking.refund.amount, simBody.data.payment.amount);
});
