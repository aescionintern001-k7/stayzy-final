import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import app from "../src/app.js";
import pool from "../src/database/pool.js";

let server;
let baseUrl;

const createdUserIds = [];

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
  if (createdUserIds.length > 0) {
    await pool.query("DELETE FROM users WHERE id = ANY($1)", [createdUserIds]);
  }
  await new Promise((resolve) => server.close(resolve));
});

test.describe("Auth Module Integration Tests", () => {
  const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const testEmail = `auth_test_${uniqueId}@example.com`;
  const hostEmail = `auth_host_${uniqueId}@example.com`;
  const testPassword = "Password123!";

  let guestToken = null;

  test("POST /auth/register - Successfully registers guest with valid payload", async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: "Auth Test Guest",
        email: testEmail,
        password: testPassword,
        role: "guest",
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.message, "Registration successful");
    assert.ok(body.data.user);
    assert.strictEqual(body.data.user.email, testEmail.toLowerCase());
    assert.strictEqual(body.data.user.role, "guest");
    assert.strictEqual(body.data.user.password_hash, undefined);
    assert.ok(body.data.user.id);

    createdUserIds.push(body.data.user.id);
  });

  test("POST /auth/register - Rejects registration when email is already in use", async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: "Duplicate User",
        email: testEmail,
        password: testPassword,
        role: "guest",
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 409);
    assert.strictEqual(body.success, false);
    assert.match(body.message, /already registered/i);
  });

  test("POST /auth/register - Successfully registers host account", async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: "Auth Test Host",
        email: hostEmail,
        password: testPassword,
        role: "host",
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.user.role, "host");
    createdUserIds.push(body.data.user.id);
  });

  test("POST /auth/register - Rejects invalid payloads with 400 Bad Request", async () => {
    // Missing required fields
    const resMissing = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "incomplete@example.com",
      }),
    });
    assert.strictEqual(resMissing.status, 400);

    // Password too short (< 8 chars)
    const resShortPw = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: "Short Pw User",
        email: `short_${uniqueId}@example.com`,
        password: "123",
      }),
    });
    assert.strictEqual(resShortPw.status, 400);

    // Invalid email format
    const resBadEmail = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: "Invalid Email",
        email: "not-an-email",
        password: testPassword,
      }),
    });
    assert.strictEqual(resBadEmail.status, 400);
  });

  test("POST /auth/login - Successfully logs in with valid credentials", async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.message, "Login successful");
    assert.ok(body.data.token);
    assert.ok(body.data.user);
    assert.strictEqual(body.data.user.email, testEmail.toLowerCase());

    guestToken = body.data.token;
  });

  test("POST /auth/login - Rejects invalid password with 401 Unauthorized", async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: "WrongPassword999!",
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 401);
    assert.strictEqual(body.success, false);
    assert.match(body.message, /invalid email or password/i);
  });

  test("POST /auth/login - Rejects non-existent email with 401 Unauthorized", async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `nonexistent_${uniqueId}@example.com`,
        password: testPassword,
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 401);
    assert.strictEqual(body.success, false);
  });

  test("POST /auth/login - Rejects suspended user login with 403 Forbidden", async () => {
    const suspendedEmail = `suspended_auth_${uniqueId}@example.com`;
    const hash = await bcrypt.hash(testPassword, 10);
    const insRes = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, account_status)
       VALUES ($1, $2, $3, 'guest', 'suspended') RETURNING id`,
      ["Suspended User", suspendedEmail, hash]
    );
    createdUserIds.push(insRes.rows[0].id);

    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: suspendedEmail,
        password: testPassword,
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 403);
    assert.strictEqual(body.success, false);
    assert.match(body.message, /account is not active/i);
  });

  test("GET /auth/me - Retrieves current authenticated user profile", async () => {
    assert.ok(guestToken, "Guest token must exist from login test");

    const res = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${guestToken}` },
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.user);
    assert.strictEqual(body.data.user.email, testEmail.toLowerCase());
    assert.strictEqual(body.data.user.role, "guest");
  });

  test("GET /auth/me - Rejects requests missing Authorization header with 401", async () => {
    const res = await fetch(`${baseUrl}/auth/me`);
    assert.strictEqual(res.status, 401);
  });

  test("GET /auth/me - Rejects invalid/malformed tokens with 401", async () => {
    const res = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: "Bearer invalid.token.payload" },
    });
    assert.strictEqual(res.status, 401);
  });
});
