import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import pool from "../src/database/pool.js";
import { env } from "../src/config/env.js";
import { addCalendarDays } from "../src/utils/pricing.js";

let server;
let baseUrl;

const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const adminEmail = `p2adm_${suffix}@example.com`;
const guestEmail = `p2adm_guest_${suffix}@example.com`;
const createdUserEmail = `p2adm_new_${suffix}@example.com`;
const customCmsKey = `p2_test_banner_${suffix}`;
const customSettingKey = `p2_test_setting_${suffix}`;

let adminUser;
let guestUser;
let adminToken;
let guestToken;
let createdPropertyId;
let createdRoomTypeId;
let createdUnitId;
let createdRateId;
let createdBlockId;
let createdVisitId;
let createdTicketId;
let createdOfflineBookingId;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}/api/v1`;
      resolve();
    });
  });

  const hash = await bcrypt.hash("Password123!", 10);
  const aRes = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, account_status)
     VALUES ($1, $2, $3, 'admin', 'active') RETURNING id, email, role`,
    [`P2 Admin ${suffix}`, adminEmail, hash]
  );
  adminUser = aRes.rows[0];
  adminToken = jwt.sign(
    { sub: adminUser.id, role: adminUser.role, email: adminUser.email },
    env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  const gRes = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, account_status)
     VALUES ($1, $2, $3, 'guest', 'active') RETURNING id, email, role`,
    [`P2 Guest ${suffix}`, guestEmail, hash]
  );
  guestUser = gRes.rows[0];
  guestToken = jwt.sign(
    { sub: guestUser.id, role: guestUser.role, email: guestUser.email },
    env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  // Create property for admin ops testing
  const pRes = await pool.query(
    `INSERT INTO properties (
      host_id, title, description, property_type, room_type, price_per_night,
      currency, address, city, country, max_guests, bedrooms, beds, bathrooms, status, is_available
    ) VALUES (
      $1, $2, 'Admin operations test property', 'apartment', 'private_room', 1000,
      'INR', '99 HSR Layout', 'Bengaluru', 'India', 4, 2, 2, 2, 'active', true
    ) RETURNING id`,
    [adminUser.id, `AdminOps Hub ${suffix}`]
  );
  createdPropertyId = pRes.rows[0].id;
});

test.after(async () => {
  if (createdOfflineBookingId) {
    await pool.query("DELETE FROM bookings WHERE id = $1", [createdOfflineBookingId]);
  }
  if (createdTicketId) {
    await pool.query("DELETE FROM support_tickets WHERE id = $1", [createdTicketId]);
  }
  if (createdVisitId) {
    await pool.query("DELETE FROM visit_requests WHERE id = $1", [createdVisitId]);
  }
  if (createdBlockId) {
    await pool.query("DELETE FROM availability_blocks WHERE id = $1", [createdBlockId]);
  }
  if (createdPropertyId) {
    await pool.query("DELETE FROM properties WHERE id = $1", [createdPropertyId]);
  }
  await pool.query("DELETE FROM site_content WHERE key = $1", [customCmsKey]);
  await pool.query("DELETE FROM system_settings WHERE key = $1", [customSettingKey]);
  await pool.query("DELETE FROM audit_logs WHERE actor_id = $1", [adminUser.id]);
  await pool.query("DELETE FROM users WHERE LOWER(email) = ANY($1)", [
    [adminEmail, guestEmail, createdUserEmail],
  ]);

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await pool.end();
});

test("Public Directory & CMS: GET /cities & GET /content without leaking secrets", async () => {
  const citiesRes = await fetch(`${baseUrl}/cities?letter=B`);
  const citiesBody = await citiesRes.json();
  assert.equal(citiesRes.status, 200);
  const blr = citiesBody.data.cities.find((c) => c.name === "Bengaluru");
  assert.ok(blr);
  assert.ok(blr.propertyCount >= 1);
  assert.equal(blr.isComingSoon, false);

  const cmsRes = await fetch(`${baseUrl}/content`);
  const cmsBody = await cmsRes.json();
  assert.equal(cmsRes.status, 200);
  assert.ok(cmsBody.data.content.hero_content);
  assert.ok(cmsBody.data.content.faq_content);
  assert.ok(cmsBody.data.settings.platform_config);
  assert.equal(cmsBody.data.settings.platform_config.razorpayKeySecret, undefined);
});

test("Visits & Support: walkthrough validation, resident queries & ticket submission", async () => {
  const visitDate = addCalendarDays(new Date().toISOString().split("T")[0], 5);

  // Invalid phone rejected with 400
  const badVisit = await fetch(`${baseUrl}/visits/schedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      property_id: createdPropertyId,
      customer_name: "Test Visitor",
      customer_phone: "12345",
      customer_email: guestEmail,
      preferred_date: visitDate,
      time_slot: "11:00 AM",
    }),
  });
  assert.equal(badVisit.status, 400);

  const okVisit = await fetch(`${baseUrl}/visits/schedule`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      property_id: createdPropertyId,
      customer_name: "Test Visitor",
      customer_phone: "9876543210",
      customer_email: guestEmail,
      preferred_date: visitDate,
      time_slot: "11:00 AM",
      notes: "Interested in private studio",
    }),
  });
  const okVisitBody = await okVisit.json();
  assert.equal(okVisit.status, 201);
  assert.equal(okVisitBody.data.visit.customer_phone, "+91 98765 43210");
  createdVisitId = okVisitBody.data.visit.id;

  const myVisits = await fetch(`${baseUrl}/visits/my`, {
    headers: { Authorization: `Bearer ${guestToken}` },
  });
  const myVisitsBody = await myVisits.json();
  assert.equal(myVisits.status, 200);
  assert.ok(myVisitsBody.data.visits.some((v) => v.id === createdVisitId));

  // Support ticket
  const tickRes = await fetch(`${baseUrl}/support`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      category: "maintenance",
      priority: "HIGH",
      subject: "Wi-Fi router check",
      message: "Speed dropped on 2nd floor, please inspect.",
    }),
  });
  const tickBody = await tickRes.json();
  assert.equal(tickRes.status, 201);
  createdTicketId = tickBody.data.ticket.id;

  const listTickets = await fetch(`${baseUrl}/support`, {
    headers: { Authorization: `Bearer ${guestToken}` },
  });
  const listTickBody = await listTickets.json();
  assert.equal(listTickets.status, 200);
  assert.ok(listTickBody.data.tickets.some((t) => t.id === createdTicketId));
});

test("Admin RBAC Boundaries & Phase A/B/C Operations + Audit Logs", async () => {
  // Guest rejected with 403 on new admin endpoints
  const forbidden = await fetch(`${baseUrl}/admin/calendar`, {
    headers: { Authorization: `Bearer ${guestToken}` },
  });
  assert.equal(forbidden.status, 403);

  // Phase A: Create user, change role, self-demotion guard, customers CRM
  const newUserRes = await fetch(`${baseUrl}/admin/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      full_name: "Created Staff User",
      email: createdUserEmail,
      password: "Password123!",
      role: "host",
    }),
  });
  const newUserBody = await newUserRes.json();
  assert.equal(newUserRes.status, 201);
  const newUserId = newUserBody.data.user.id;

  const roleUpdate = await fetch(`${baseUrl}/admin/users/${newUserId}/role`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ role: "guest" }),
  });
  assert.equal(roleUpdate.status, 200);

  const selfDemote = await fetch(`${baseUrl}/admin/users/${adminUser.id}/role`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ role: "guest" }),
  });
  assert.equal(selfDemote.status, 400);

  const crmRes = await fetch(`${baseUrl}/admin/customers?search=${encodeURIComponent(guestEmail)}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(crmRes.status, 200);

  // Phase B: Create room type + beds + 5 rate plans
  const roomRes = await fetch(`${baseUrl}/admin/rooms`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      property_id: createdPropertyId,
      name: `Admin Deluxe Room ${suffix}`,
      category: "PRIVATE",
      room_numbers: ["401"],
      beds_per_room: 1,
    }),
  });
  const roomBody = await roomRes.json();
  assert.equal(roomRes.status, 201);
  createdRoomTypeId = roomBody.data.room_type.id;
  createdUnitId = roomBody.data.units[0].id;
  createdRateId = roomBody.data.rate_plans[0].id;

  // Add second unit & update rate plan
  const addBedRes = await fetch(`${baseUrl}/admin/beds`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "ADD_UNIT",
      room_type_id: createdRoomTypeId,
      room_number: "402",
      identifier: "402-A",
      is_bed: true,
    }),
  });
  assert.equal(addBedRes.status, 200);

  const ratePatch = await fetch(`${baseUrl}/admin/rates/${createdRateId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ price: 250 }),
  });
  assert.equal(ratePatch.status, 200);

  // Availability block & calendar view
  const blkStart = new Date(Date.now() + 2 * 86400000).toISOString();
  const blkEnd = new Date(Date.now() + 3 * 86400000).toISOString();
  const blkRes = await fetch(`${baseUrl}/admin/inventory/blocks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inventory_unit_id: createdUnitId,
      reason: "MAINTENANCE",
      start_time: blkStart,
      end_time: blkEnd,
      notes: "AC servicing",
    }),
  });
  const blkBody = await blkRes.json();
  assert.equal(blkRes.status, 201);
  createdBlockId = blkBody.data.block.id;

  const calRes = await fetch(`${baseUrl}/admin/calendar?property_id=${createdPropertyId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const calBody = await calRes.json();
  assert.equal(calRes.status, 200);
  assert.ok(calBody.data.units.some((u) => u.blocks.length > 0));

  const delBlk = await fetch(`${baseUrl}/admin/inventory/blocks/${createdBlockId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(delBlk.status, 200);
  createdBlockId = null;

  // Offline booking + offline payment
  const offRes = await fetch(`${baseUrl}/admin/bookings/offline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      room_type_id: createdRoomTypeId,
      guest_name: "WalkIn Guest",
      guest_email: guestEmail,
      guest_phone: "+91 99887 76655",
      duration_type: "DAILY",
      start_date: addCalendarDays(new Date().toISOString().split("T")[0], 10),
      duration_count: 2,
      mark_paid: false,
    }),
  });
  const offBody = await offRes.json();
  assert.equal(offRes.status, 201);
  createdOfflineBookingId = offBody.data.booking.id;

  const offPayRes = await fetch(`${baseUrl}/admin/payments/offline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      booking_id: createdOfflineBookingId,
      notes: "Paid via UPI at front desk",
    }),
  });
  assert.equal(offPayRes.status, 201);

  // Admin visit update & support reply
  const vUpd = await fetch(`${baseUrl}/admin/visits/${createdVisitId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "confirmed", admin_notes: "Host assigned" }),
  });
  assert.equal(vUpd.status, 200);

  const sRep = await fetch(`${baseUrl}/admin/support/${createdTicketId}/reply`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      admin_reply: "Router firmware updated and channel switched.",
      status: "resolved",
    }),
  });
  assert.equal(sRep.status, 200);

  // Phase C: CMS content, redacted settings & audit logs
  const cmsPut = await fetch(`${baseUrl}/admin/content`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      key: customCmsKey,
      value: { headline: "Monsoon Offer" },
    }),
  });
  assert.equal(cmsPut.status, 200);

  const setPut = await fetch(`${baseUrl}/admin/settings`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      key: customSettingKey,
      value: { gstRatePercent: 12, razorpayKeySecret: "super_secret_should_redact" },
      is_public: false,
    }),
  });
  const setPutBody = await setPut.json();
  assert.equal(setPut.status, 200);
  assert.equal(setPutBody.data.item.value.razorpayKeySecret, "[REDACTED]");

  const auditRes = await fetch(`${baseUrl}/admin/audit-logs`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const auditBody = await auditRes.json();
  assert.equal(auditRes.status, 200);
  assert.ok(auditBody.data.logs.length > 0);
});
