import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { authenticate } from "./auth.middleware.js";
import { env } from "../config/env.js";
import pool from "../database/pool.js";

let activeUser;
let suspendedUser;

test.before(async () => {
  const unique = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const hash = await bcrypt.hash("Password123!", 10);

  const activeRes = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, account_status)
     VALUES ($1, $2, $3, 'guest', 'active') RETURNING id, email, role`,
    ["Active User", `active_mw_${unique}@example.com`, hash]
  );
  activeUser = activeRes.rows[0];

  const suspendedRes = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, account_status)
     VALUES ($1, $2, $3, 'guest', 'suspended') RETURNING id, email, role`,
    ["Suspended User", `suspended_mw_${unique}@example.com`, hash]
  );
  suspendedUser = suspendedRes.rows[0];
});

test.after(async () => {
  const ids = [activeUser?.id, suspendedUser?.id].filter(Boolean);
  if (ids.length > 0) {
    await pool.query("DELETE FROM users WHERE id = ANY($1)", [ids]);
  }
});

const createResponse = () => {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };

  return res;
};

const createRequest = (authorization) => ({
  headers: authorization ? { authorization } : {},
});

test("rejects missing authorization token", async () => {
  const req = createRequest();
  const res = createResponse();
  let nextCalled = false;

  await authenticate(req, res, () => {
    nextCalled = true;
  });

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, "Authentication token is required");
  assert.equal(nextCalled, false);
});

test("rejects incorrect authorization format", async () => {
  const req = createRequest("Basic abc123");
  const res = createResponse();

  await authenticate(req, res, () => {});

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, "Authentication token is required");
});

test("rejects invalid JWT", async () => {
  const req = createRequest("Bearer invalid.token.value");
  const res = createResponse();

  await authenticate(req, res, () => {});

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, "Invalid or expired authentication token");
});

test("rejects expired JWT", async () => {
  const expiredToken = jwt.sign(
    {
      sub: activeUser.id,
      email: activeUser.email,
      role: activeUser.role,
      exp: Math.floor(Date.now() / 1000) - 60,
    },
    env.JWT_SECRET
  );

  const req = createRequest(`Bearer ${expiredToken}`);
  const res = createResponse();

  await authenticate(req, res, () => {});

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, "Invalid or expired authentication token");
});

test("rejects non-existent user with 404", async () => {
  const nonExistentId = crypto.randomUUID();
  const token = jwt.sign(
    {
      sub: nonExistentId,
      email: "ghost@example.com",
      role: "guest",
    },
    env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  const req = createRequest(`Bearer ${token}`);
  const res = createResponse();

  await authenticate(req, res, () => {});

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.message, "User not found");
});

test("rejects suspended user account with 403", async () => {
  const token = jwt.sign(
    {
      sub: suspendedUser.id,
      email: suspendedUser.email,
      role: suspendedUser.role,
    },
    env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  const req = createRequest(`Bearer ${token}`);
  const res = createResponse();
  let nextCalled = false;

  await authenticate(req, res, () => {
    nextCalled = true;
  });

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, "Your account has been suspended");
  assert.equal(nextCalled, false);
});

test("accepts valid JWT for active user and populates req.user", async () => {
  const token = jwt.sign(
    {
      sub: activeUser.id,
      email: activeUser.email,
      role: activeUser.role,
    },
    env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  const req = createRequest(`Bearer ${token}`);
  const res = createResponse();
  let nextCalled = false;

  await authenticate(req, res, () => {
    nextCalled = true;
  });

  assert.deepEqual(req.user, {
    id: activeUser.id,
    email: activeUser.email,
    role: activeUser.role,
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, null);
});
