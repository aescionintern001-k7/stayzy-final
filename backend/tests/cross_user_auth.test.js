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

test.describe("Cross-User Authentication & Role Isolation Tests", () => {
  const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const userA = {
    full_name: "Cross User A",
    email: `cross_user_a_${unique}@example.com`,
    password: "UserAPassword123!",
  };
  const userB = {
    full_name: "Cross User B",
    email: `cross_user_b_${unique}@example.com`,
    password: "UserBPassword123!",
  };
  const adminUser = {
    full_name: "Isolated Test Admin",
    email: `cross_admin_${unique}@example.com`,
    password: "AdminStrongPassword123!",
  };

  let userAId = null;
  let userBId = null;
  let adminId = null;
  let userAToken = null;
  let userBToken = null;
  let adminToken = null;

  test("Test A — User A registers and logs in with own UUID, email, and guest role", async () => {
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userA),
    });
    const regBody = await regRes.json();
    assert.strictEqual(regRes.status, 201);
    assert.strictEqual(regBody.success, true);
    assert.strictEqual(regBody.data.user.email, userA.email);
    assert.strictEqual(regBody.data.user.role, "guest");
    assert.strictEqual(regBody.data.user.password_hash, undefined);
    userAId = regBody.data.user.id;
    createdUserIds.push(userAId);

    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userA.email, password: userA.password }),
    });
    const loginBody = await loginRes.json();
    assert.strictEqual(loginRes.status, 200);
    assert.strictEqual(loginRes.headers.get("cache-control"), "no-store, private");
    assert.strictEqual(loginBody.data.user.id, userAId);
    assert.strictEqual(loginBody.data.user.email, userA.email);
    assert.strictEqual(loginBody.data.user.role, "guest");
    assert.ok(loginBody.data.token);
    userAToken = loginBody.data.token;
  });

  test("Test B — User B registers and logs in with distinct UUID, email, and guest role", async () => {
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userB),
    });
    const regBody = await regRes.json();
    assert.strictEqual(regRes.status, 201);
    userBId = regBody.data.user.id;
    createdUserIds.push(userBId);
    assert.notStrictEqual(userBId, userAId);

    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userB.email, password: userB.password }),
    });
    const loginBody = await loginRes.json();
    assert.strictEqual(loginRes.status, 200);
    assert.strictEqual(loginBody.data.user.id, userBId);
    assert.strictEqual(loginBody.data.user.email, userB.email);
    assert.strictEqual(loginBody.data.user.role, "guest");
    userBToken = loginBody.data.token;
    assert.notStrictEqual(userBToken, userAToken);
  });

  test("Test C — Cross-device authentication & case-insensitive email returns exact User A (never Admin or User B)", async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "FriendLaptop-Chrome/130.0",
      },
      body: JSON.stringify({
        email: `  ${userA.email.toUpperCase()}  `,
        password: userA.password,
      }),
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.data.user.id, userAId);
    assert.strictEqual(body.data.user.email, userA.email);
    assert.strictEqual(body.data.user.role, "guest");
    assert.notStrictEqual(body.data.user.role, "admin");
    assert.notStrictEqual(body.data.user.id, userBId);
  });

  test("Test D & I — Account switching & /auth/me session identity match verified JWT strictly", async () => {
    const meARes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    const meABody = await meARes.json();
    assert.strictEqual(meARes.status, 200);
    assert.strictEqual(meABody.data.user.id, userAId);
    assert.strictEqual(meABody.data.user.email, userA.email);
    assert.strictEqual(meARes.headers.get("cache-control"), "no-store, private");

    const meBRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${userBToken}` },
    });
    const meBBody = await meBRes.json();
    assert.strictEqual(meBRes.status, 200);
    assert.strictEqual(meBBody.data.user.id, userBId);
    assert.strictEqual(meBBody.data.user.email, userB.email);
    assert.notStrictEqual(meBBody.data.user.id, userAId);
  });

  test("Test E — Admin isolation: guest cannot register as admin or access Admin APIs; real Admin authenticates cleanly", async () => {
    const adminRegRes = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: "Fake Admin",
        email: `fake_admin_${unique}@example.com`,
        password: "Password123!",
        role: "admin",
      }),
    });
    assert.strictEqual(adminRegRes.status, 400);

    const adminDashGuest = await fetch(`${baseUrl}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    assert.strictEqual(adminDashGuest.status, 403);

    const usersListGuest = await fetch(`${baseUrl}/users`, {
      headers: { Authorization: `Bearer ${userBToken}` },
    });
    assert.strictEqual(usersListGuest.status, 403);

    // Provision a dedicated test Admin directly in PostgreSQL and verify legitimate Admin login works
    const hash = await bcrypt.hash(adminUser.password, 10);
    const ins = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, account_status)
       VALUES ($1, $2, $3, 'admin', 'active') RETURNING id`,
      [adminUser.full_name, adminUser.email, hash]
    );
    adminId = ins.rows[0].id;
    createdUserIds.push(adminId);

    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: adminUser.email, password: adminUser.password }),
    });
    const adminLoginBody = await adminLoginRes.json();
    assert.strictEqual(adminLoginRes.status, 200);
    assert.strictEqual(adminLoginBody.data.user.id, adminId);
    assert.strictEqual(adminLoginBody.data.user.role, "admin");
    adminToken = adminLoginBody.data.token;

    const adminDashRes = await fetch(`${baseUrl}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(adminDashRes.status, 200);
  });

  test("Test F — Unregistered email login fails with 401 and never falls back to Admin", async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `unregistered_${unique}@example.com`,
        password: "AnyPassword123!",
      }),
    });
    const body = await res.json();
    assert.strictEqual(res.status, 401);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.data, undefined);
  });

  test("Test G — Registered email with wrong password fails with 401 and issues no token", async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: userA.email,
        password: "WrongPassword999!",
      }),
    });
    const body = await res.json();
    assert.strictEqual(res.status, 401);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.data, undefined);
  });

  test("Test J — Token & browser isolation: User A JWT ignores client-supplied userId and cannot read User B profile", async () => {
    const [resA, resB] = await Promise.all([
      fetch(`${baseUrl}/auth/me?userId=${encodeURIComponent(userBId)}`, {
        headers: { Authorization: `Bearer ${userAToken}` },
      }),
      fetch(`${baseUrl}/auth/me?userId=${encodeURIComponent(userAId)}`, {
        headers: { Authorization: `Bearer ${userBToken}` },
      }),
    ]);

    const bodyA = await resA.json();
    const bodyB = await resB.json();

    assert.strictEqual(resA.status, 200);
    assert.strictEqual(bodyA.data.user.id, userAId);
    assert.strictEqual(bodyA.data.user.email, userA.email);

    assert.strictEqual(resB.status, 200);
    assert.strictEqual(bodyB.data.user.id, userBId);
    assert.strictEqual(bodyB.data.user.email, userB.email);
  });
});
