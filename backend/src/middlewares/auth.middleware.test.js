import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { authenticate } from "./auth.middleware.js";
import { env } from "../config/env.js";

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

test("rejects missing authorization token", () => {
  const req = createRequest();
  const res = createResponse();
  let nextCalled = false;

  authenticate(req, res, () => {
    nextCalled = true;
  });

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, "Authentication token is required");
  assert.equal(nextCalled, false);
});

test("rejects incorrect authorization format", () => {
  const req = createRequest("Basic abc123");
  const res = createResponse();

  authenticate(req, res, () => {});

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, "Authentication token is required");
});

test("rejects invalid JWT", () => {
  const req = createRequest("Bearer invalid.token.value");
  const res = createResponse();

  authenticate(req, res, () => {});

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, "Invalid or expired authentication token");
});

test("rejects expired JWT", () => {
  const expiredToken = jwt.sign(
    {
      sub: "user-123",
      email: "test@example.com",
      role: "guest",
      exp: Math.floor(Date.now() / 1000) - 60,
    },
    env.JWT_SECRET
  );

  const req = createRequest(`Bearer ${expiredToken}`);
  const res = createResponse();

  authenticate(req, res, () => {});

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, "Invalid or expired authentication token");
});

test("accepts valid JWT and populates req.user", () => {
  const token = jwt.sign(
    {
      sub: "user-123",
      email: "test@example.com",
      role: "guest",
    },
    env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  const req = createRequest(`Bearer ${token}`);
  const res = createResponse();
  let nextCalled = false;

  authenticate(req, res, () => {
    nextCalled = true;
  });

  assert.deepEqual(req.user, {
    id: "user-123",
    email: "test@example.com",
    role: "guest",
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, null);
});
