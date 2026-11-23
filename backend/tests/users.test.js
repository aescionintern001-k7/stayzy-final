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
let guestUser;
let hostUser;
let suspendedUser;

let adminToken;
let guestToken;
let hostToken;
let suspendedToken;

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
  // Start server on an ephemeral port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}/api/v1`;
      resolve();
    });
  });

  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const passwordHash = await bcrypt.hash("Password123!", 10);

  // Insert Admin test user
  const adminRes = await pool.query(
    `
      INSERT INTO users (full_name, email, password_hash, role, account_status)
      VALUES ($1, $2, $3, 'admin', 'active')
      RETURNING id, full_name, email, role, account_status
    `,
    [`Admin Test ${uniqueSuffix}`, `admin_${uniqueSuffix}@example.com`, passwordHash]
  );
  adminUser = adminRes.rows[0];
  adminToken = createToken(adminUser);

  // Insert Guest test user
  const guestRes = await pool.query(
    `
      INSERT INTO users (full_name, email, password_hash, role, account_status)
      VALUES ($1, $2, $3, 'guest', 'active')
      RETURNING id, full_name, email, role, account_status
    `,
    [`Guest Test ${uniqueSuffix}`, `guest_${uniqueSuffix}@example.com`, passwordHash]
  );
  guestUser = guestRes.rows[0];
  guestToken = createToken(guestUser);

  // Insert Host test user
  const hostRes = await pool.query(
    `
      INSERT INTO users (full_name, email, password_hash, role, account_status)
      VALUES ($1, $2, $3, 'host', 'active')
      RETURNING id, full_name, email, role, account_status
    `,
    [`Host Test ${uniqueSuffix}`, `host_${uniqueSuffix}@example.com`, passwordHash]
  );
  hostUser = hostRes.rows[0];
  hostToken = createToken(hostUser);

  // Insert Suspended test user
  const suspendedRes = await pool.query(
    `
      INSERT INTO users (full_name, email, password_hash, role, account_status)
      VALUES ($1, $2, $3, 'guest', 'suspended')
      RETURNING id, full_name, email, role, account_status
    `,
    [`Suspended Test ${uniqueSuffix}`, `suspended_${uniqueSuffix}@example.com`, passwordHash]
  );
  suspendedUser = suspendedRes.rows[0];
  suspendedToken = createToken(suspendedUser);
});

test.after(async () => {
  // Clean up created test users
  if (adminUser) {
    await pool.query(
      "DELETE FROM users WHERE id IN ($1, $2, $3, $4)",
      [adminUser.id, guestUser.id, hostUser.id, suspendedUser.id]
    );
  }

  // Close server and database pool
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

// ==========================================
// 1. GET /api/v1/users/me (Current User Profile)
// ==========================================

test("GET /users/me - rejects unauthenticated request with 401", async () => {
  const res = await fetch(`${baseUrl}/users/me`);
  const data = await res.json();

  assert.equal(res.status, 401);
  assert.equal(data.success, false);
  assert.ok(data.message.includes("Authentication token is required"));
});

test("GET /users/me - rejects invalid token with 401", async () => {
  const res = await fetch(`${baseUrl}/users/me`, {
    headers: { Authorization: "Bearer invalid.token.value" },
  });
  const data = await res.json();

  assert.equal(res.status, 401);
  assert.equal(data.success, false);
});

test("GET /users/me - returns safe profile fields for authenticated user", async () => {
  const res = await fetch(`${baseUrl}/users/me`, {
    headers: { Authorization: `Bearer ${guestToken}` },
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.user.id, guestUser.id);
  assert.equal(data.data.user.email, guestUser.email);
  assert.equal(data.data.user.role, "guest");
  assert.equal(data.data.user.account_status, "active");

  // Verify sensitive fields are NEVER exposed
  assert.equal(data.data.user.password_hash, undefined);
  assert.equal(data.data.user.password, undefined);
});

test("GET /users/me - rejects suspended user with 403", async () => {
  const res = await fetch(`${baseUrl}/users/me`, {
    headers: { Authorization: `Bearer ${suspendedToken}` },
  });
  const data = await res.json();

  assert.equal(res.status, 403);
  assert.equal(data.success, false);
  assert.ok(data.message.toLowerCase().includes("suspended"));
});

test("GET /users/me - returns 404 if authenticated user is deleted from DB", async () => {
  const fakeToken = jwt.sign(
    { sub: "a0000000-0000-0000-0000-000000000000", email: "nonexistent@example.com", role: "guest" },
    env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  const res = await fetch(`${baseUrl}/users/me`, {
    headers: { Authorization: `Bearer ${fakeToken}` },
  });
  const data = await res.json();

  assert.equal(res.status, 404);
  assert.equal(data.success, false);
  assert.equal(data.message, "User not found");
});

// ==========================================
// 2. PATCH /api/v1/users/me (Update Profile)
// ==========================================

test("PATCH /users/me - rejects unauthenticated request with 401", async () => {
  const res = await fetch(`${baseUrl}/users/me`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ full_name: "New Name" }),
  });
  const data = await res.json();

  assert.equal(res.status, 401);
  assert.equal(data.success, false);
});

test("PATCH /users/me - successfully updates full_name", async () => {
  const res = await fetch(`${baseUrl}/users/me`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ full_name: "Updated Guest Name" }),
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.user.full_name, "Updated Guest Name");
  assert.equal(data.data.user.password_hash, undefined);
});

test("PATCH /users/me - successfully updates phone and profile_image_url", async () => {
  const res = await fetch(`${baseUrl}/users/me`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phone: "+1-555-123-4567",
      profile_image_url: "https://example.com/avatar.jpg",
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.user.phone, "+1-555-123-4567");
  assert.equal(data.data.user.profile_image_url, "https://example.com/avatar.jpg");
});

test("PATCH /users/me - permits setting phone and profile_image_url to null", async () => {
  const res = await fetch(`${baseUrl}/users/me`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phone: null,
      profile_image_url: null,
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.user.phone, null);
  assert.equal(data.data.user.profile_image_url, null);
});

test("PATCH /users/me - rejects empty update body with 400", async () => {
  const res = await fetch(`${baseUrl}/users/me`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
});

test("PATCH /users/me - rejects forbidden field 'role' with 400", async () => {
  const res = await fetch(`${baseUrl}/users/me`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ role: "admin" }),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
});

test("PATCH /users/me - rejects forbidden field 'account_status' with 400", async () => {
  const res = await fetch(`${baseUrl}/users/me`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ account_status: "active" }),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
});

test("PATCH /users/me - rejects forbidden field 'email' with 400", async () => {
  const res = await fetch(`${baseUrl}/users/me`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: "hacked@example.com" }),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
});

test("PATCH /users/me - rejects forbidden field 'password_hash' with 400", async () => {
  const res = await fetch(`${baseUrl}/users/me`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password_hash: "malicious" }),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
});

test("PATCH /users/me - rejects invalid profile_image_url format with 400", async () => {
  const res = await fetch(`${baseUrl}/users/me`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ profile_image_url: "ftp://example.com/file.jpg" }),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
});

test("PATCH /users/me - rejects non-URL path in profile_image_url with 400", async () => {
  const res = await fetch(`${baseUrl}/users/me`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ profile_image_url: "/etc/passwd" }),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
});

test("PATCH /users/me - rejects invalid phone format with 400", async () => {
  const res = await fetch(`${baseUrl}/users/me`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ phone: "not-a-phone-number-at-all" }),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
});

test("PATCH /users/me - rejects suspended user with 403", async () => {
  const res = await fetch(`${baseUrl}/users/me`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${suspendedToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ full_name: "Try Update" }),
  });
  const data = await res.json();

  assert.equal(res.status, 403);
  assert.equal(data.success, false);
});

// ==========================================
// 3. GET /api/v1/users (Admin User Listing)
// ==========================================

test("GET /users - rejects unauthenticated request with 401", async () => {
  const res = await fetch(`${baseUrl}/users`);
  const data = await res.json();

  assert.equal(res.status, 401);
  assert.equal(data.success, false);
});

test("GET /users - rejects non-admin user (guest) with 403", async () => {
  const res = await fetch(`${baseUrl}/users`, {
    headers: { Authorization: `Bearer ${guestToken}` },
  });
  const data = await res.json();

  assert.equal(res.status, 403);
  assert.equal(data.success, false);
  assert.ok(data.message.includes("permission"));
});

test("GET /users - rejects non-admin user (host) with 403", async () => {
  const res = await fetch(`${baseUrl}/users`, {
    headers: { Authorization: `Bearer ${hostToken}` },
  });
  const data = await res.json();

  assert.equal(res.status, 403);
  assert.equal(data.success, false);
});

test("GET /users - permits admin and returns paginated users list", async () => {
  const res = await fetch(`${baseUrl}/users?page=1&limit=2`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.data.users));
  assert.equal(data.data.users.length, 2);
  assert.equal(data.data.pagination.page, 1);
  assert.equal(data.data.pagination.limit, 2);
  assert.ok(data.data.pagination.total >= 4);
  assert.ok(data.data.pagination.total_pages >= 2);

  // Verify safe fields only
  for (const u of data.data.users) {
    assert.equal(u.password_hash, undefined);
    assert.equal(u.password, undefined);
  }
});

test("GET /users - rejects limit exceeding 100 with 400", async () => {
  const res = await fetch(`${baseUrl}/users?limit=101`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
});

test("GET /users - rejects negative or zero page with 400", async () => {
  const res = await fetch(`${baseUrl}/users?page=0`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
});

test("GET /users - filters users by role", async () => {
  const res = await fetch(`${baseUrl}/users?role=host`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.ok(data.data.users.length > 0);
  for (const u of data.data.users) {
    assert.equal(u.role, "host");
  }
});

test("GET /users - filters users by status", async () => {
  const res = await fetch(`${baseUrl}/users?status=suspended`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.ok(data.data.users.length > 0);
  for (const u of data.data.users) {
    assert.equal(u.account_status, "suspended");
  }
});

test("GET /users - searches users by email", async () => {
  const res = await fetch(`${baseUrl}/users?search=${encodeURIComponent(guestUser.email)}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.users.length, 1);
  assert.equal(data.data.users[0].id, guestUser.id);
});

test("GET /users - parameterized search safely handles SQL injection characters", async () => {
  const sqlInjection = "' OR '1'='1";
  const res = await fetch(`${baseUrl}/users?search=${encodeURIComponent(sqlInjection)}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.users.length, 0); // No user has this in their email or name
});

// ==========================================
// 4. GET /api/v1/users/:id (Admin User Details)
// ==========================================

test("GET /users/:id - rejects unauthenticated request with 401", async () => {
  const res = await fetch(`${baseUrl}/users/${guestUser.id}`);
  const data = await res.json();

  assert.equal(res.status, 401);
  assert.equal(data.success, false);
});

test("GET /users/:id - rejects non-admin request with 403", async () => {
  const res = await fetch(`${baseUrl}/users/${adminUser.id}`, {
    headers: { Authorization: `Bearer ${guestToken}` },
  });
  const data = await res.json();

  assert.equal(res.status, 403);
  assert.equal(data.success, false);
});

test("GET /users/:id - rejects invalid UUID parameter with 400", async () => {
  const res = await fetch(`${baseUrl}/users/not-a-valid-uuid`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
});

test("GET /users/:id - returns 404 for non-existent user UUID", async () => {
  const nonExistentId = crypto.randomUUID();
  const res = await fetch(`${baseUrl}/users/${nonExistentId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const data = await res.json();

  assert.equal(res.status, 404);
  assert.equal(data.success, false);
  assert.equal(data.message, "User not found");
});

test("GET /users/:id - returns safe user details for admin", async () => {
  const res = await fetch(`${baseUrl}/users/${guestUser.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.user.id, guestUser.id);
  assert.equal(data.data.user.email, guestUser.email);
  assert.equal(data.data.user.role, "guest");
  assert.equal(data.data.user.password_hash, undefined);
  assert.equal(data.data.user.password, undefined);
});

// ==========================================
// 5. PATCH /api/v1/users/:id/status (Admin Status Management)
// ==========================================

test("PATCH /users/:id/status - rejects unauthenticated request with 401", async () => {
  const res = await fetch(`${baseUrl}/users/${guestUser.id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "suspended" }),
  });
  const data = await res.json();

  assert.equal(res.status, 401);
  assert.equal(data.success, false);
});

test("PATCH /users/:id/status - rejects non-admin request with 403", async () => {
  const res = await fetch(`${baseUrl}/users/${adminUser.id}/status`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${guestToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "suspended" }),
  });
  const data = await res.json();

  assert.equal(res.status, 403);
  assert.equal(data.success, false);
});

test("PATCH /users/:id/status - rejects invalid UUID with 400", async () => {
  const res = await fetch(`${baseUrl}/users/not-a-valid-uuid/status`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "suspended" }),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
});

test("PATCH /users/:id/status - rejects invalid status value with 400", async () => {
  const res = await fetch(`${baseUrl}/users/${guestUser.id}/status`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "banned_forever" }),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
});

test("PATCH /users/:id/status - rejects role elevation attempts in status endpoint with 400", async () => {
  const res = await fetch(`${baseUrl}/users/${guestUser.id}/status`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "active", role: "admin" }),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
});

test("PATCH /users/:id/status - prevents admin self-suspension with 400", async () => {
  const res = await fetch(`${baseUrl}/users/${adminUser.id}/status`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "suspended" }),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
  assert.ok(data.message.includes("cannot suspend"));
});

test("PATCH /users/:id/status - returns 404 for non-existent user UUID", async () => {
  const nonExistentId = crypto.randomUUID();
  const res = await fetch(`${baseUrl}/users/${nonExistentId}/status`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "suspended" }),
  });
  const data = await res.json();

  assert.equal(res.status, 404);
  assert.equal(data.success, false);
  assert.equal(data.message, "User not found");
});

test("PATCH /users/:id/status - successfully suspends an active user", async () => {
  const res = await fetch(`${baseUrl}/users/${guestUser.id}/status`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "suspended" }),
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.user.id, guestUser.id);
  assert.equal(data.data.user.account_status, "suspended");
  assert.equal(data.data.user.password_hash, undefined);
});

test("PATCH /users/:id/status - successfully reactivates a suspended user", async () => {
  const res = await fetch(`${baseUrl}/users/${guestUser.id}/status`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "active" }),
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.user.id, guestUser.id);
  assert.equal(data.data.user.account_status, "active");
  assert.equal(data.data.user.password_hash, undefined);
});
