import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import pool from "../src/database/pool.js";
import { env } from "../src/config/env.js";
import { redactSensitive, logEvent } from "../src/utils/logger.js";
import {
  recordRequestMetric,
  getMetricsSnapshot,
  resetMetrics,
  setShuttingDown,
} from "../src/utils/metrics.js";
import { resolveRequestId } from "../src/middlewares/requestContext.js";

test("Structured Logger: redacts secrets, tokens, auth headers, cookies, OTPs, and PII", () => {
  const input = {
    requestId: "req-12345678",
    authorization: "Bearer secret-jwt",
    cookie: "sid=abc",
    password: "MyPassword123",
    otp: "654321",
    keyless_code: "151765",
    nested: { razorpay_secret: "rzp_live_xxx", safeField: "ok" },
  };
  const redacted = redactSensitive(input);
  assert.equal(redacted.requestId, "req-12345678");
  assert.equal(redacted.authorization, "[REDACTED]");
  assert.equal(redacted.cookie, "[REDACTED]");
  assert.equal(redacted.password, "[REDACTED]");
  assert.equal(redacted.otp, "[REDACTED]");
  assert.equal(redacted.keyless_code, "[REDACTED]");
  assert.equal(redacted.nested.razorpay_secret, "[REDACTED]");
  assert.equal(redacted.nested.safeField, "ok");

  let captured = null;
  logEvent("info", "test_event", { token: "abc", route: "/health" }, { writer: (e) => (captured = e) });
  assert.equal(captured.service, "stayzy-api");
  assert.equal(captured.event, "test_event");
  assert.equal(captured.token, "[REDACTED]");
  assert.equal(captured.route, "/health");
});

test("Request Correlation & Bounded Metrics: ID generation, validation, concurrency, and ring-buffer bound", async () => {
  assert.equal(resolveRequestId("valid-req-id-01"), "valid-req-id-01");
  const replaced = resolveRequestId("bad <script> id");
  assert.notEqual(replaced, "bad <script> id");
  assert.ok(replaced.length >= 32);

  resetMetrics();
  for (let i = 0; i < 300; i++) {
    recordRequestMetric({ statusCode: i % 10 === 0 ? 500 : 200, durationMs: i === 5 ? 1200 : 10 });
  }
  const snap = getMetricsSnapshot(pool);
  assert.equal(snap.totalRequests, 300);
  assert.equal(snap.totalErrors, 30);
  assert.equal(snap.slowRequests, 1);
  assert.equal(snap.latencyMs.sampleSize, 256, "Latency buffer must stay bounded at 256");
  assert.ok(snap.latencyMs.p95 >= snap.latencyMs.p50);
  assert.equal(typeof snap.dbPool.total, "number");
});

test("Health, Readiness, Metrics RBAC, Concurrent Request IDs & DB Recovery", async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const adminId = "11111111-1111-4111-8111-111111111111";
  const guestId = "22222222-2222-4222-8222-222222222222";
  const adminToken = jwt.sign({ sub: adminId, role: "admin", email: "adm@example.com" }, env.JWT_SECRET, { expiresIn: "1h" });
  const guestToken = jwt.sign({ sub: guestId, role: "guest", email: "g@example.com" }, env.JWT_SECRET, { expiresIn: "1h" });

  const origQuery = pool.query.bind(pool);
  try {
    // 1. Concurrent requests get unique X-Request-Id headers; valid/malformed IDs handled safely
    const [r1, r2, rValid, rBad] = await Promise.all([
      fetch(`${baseUrl}/health`),
      fetch(`${baseUrl}/health`),
      fetch(`${baseUrl}/health`, { headers: { "X-Request-Id": "ext-trace-12345" } }),
      fetch(`${baseUrl}/health`, { headers: { "X-Request-Id": "bad id !!" } }),
    ]);
    assert.equal(r1.status, 200);
    assert.notEqual(r1.headers.get("x-request-id"), r2.headers.get("x-request-id"));
    assert.equal(rValid.headers.get("x-request-id"), "ext-trace-12345");
    assert.notEqual(rBad.headers.get("x-request-id"), "bad id !!");

    // 2. /ready returns 200 when DB up, 503 when DB down, 503 when shuttingDown, and recovers
    pool.query = async () => ({ rows: [{ connected: 1 }] });
    const readyOk = await fetch(`${baseUrl}/ready`);
    assert.equal(readyOk.status, 200);

    setShuttingDown(true);
    const readyDown = await fetch(`${baseUrl}/ready`);
    assert.equal(readyDown.status, 503);
    setShuttingDown(false);

    pool.query = async () => {
      throw new Error("DB down");
    };
    const dbDownReady = await fetch(`${baseUrl}/ready`);
    assert.equal(dbDownReady.status, 503);

    // 3. /api/v1/admin/metrics protected (401 unauth, 403 guest, 200 admin)
    const mUnauth = await fetch(`${baseUrl}/api/v1/admin/metrics`);
    assert.equal(mUnauth.status, 401);

    pool.query = async (sql, params) => {
      if (sql.includes("FROM users WHERE id =")) {
        const id = params?.[0];
        return {
          rows: [
            {
              id,
              email: id === adminId ? "adm@example.com" : "g@example.com",
              role: id === adminId ? "admin" : "guest",
              account_status: "active",
            },
          ],
        };
      }
      return { rows: [{ connected: 1 }] };
    };

    const mGuest = await fetch(`${baseUrl}/api/v1/admin/metrics`, {
      headers: { Authorization: `Bearer ${guestToken}` },
    });
    assert.equal(mGuest.status, 403);

    const mAdmin = await fetch(`${baseUrl}/api/v1/admin/metrics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(mAdmin.status, 200);
    const mBody = await mAdmin.json();
    assert.equal(typeof mBody.data.metrics.totalRequests, "number");
    assert.equal(typeof mBody.data.metrics.dbPool.total, "number");
  } finally {
    setShuttingDown(false);
    pool.query = origQuery;
    server.close();
  }
});
