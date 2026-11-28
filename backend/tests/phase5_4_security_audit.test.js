import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import pool from "../src/database/pool.js";
import { env } from "../src/config/env.js";
import { updateProfileSchema } from "../src/modules/users/users.validator.js";
import { handleWebhook } from "../src/modules/payments/payments.service.js";

test("Security Audit: Auth, RBAC, IDOR, Validation, Injection, CORS, Webhook & Oversized Payloads", async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const guestAId = "11111111-1111-4111-8111-111111111111";
  const guestBId = "22222222-2222-4222-8222-222222222222";
  const validTokenA = jwt.sign({ sub: guestAId, role: "guest", email: "a@example.com" }, env.JWT_SECRET, { expiresIn: "1h" });
  const expiredToken = jwt.sign({ sub: guestAId, role: "guest", email: "a@example.com" }, env.JWT_SECRET, { expiresIn: "-10s" });

  const origQuery = pool.query.bind(pool);
  try {
    // 1. Unauthenticated access to protected endpoints -> 401
    for (const p of ["/api/v1/bookings", "/api/v1/payments/my", "/api/v1/users/me", "/api/v1/admin/dashboard"]) {
      const r = await fetch(`${baseUrl}${p}`);
      assert.equal(r.status, 401, `Expected 401 for ${p}`);
    }

    // 2. Invalid & expired tokens -> 401
    const invRes = await fetch(`${baseUrl}/api/v1/users/me`, {
      headers: { Authorization: "Bearer invalid.jwt.token" },
    });
    assert.equal(invRes.status, 401);

    const expRes = await fetch(`${baseUrl}/api/v1/users/me`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    assert.equal(expRes.status, 401);

    // Mock pool.query for authenticated User A (guest)
    pool.query = async (sql) => {
      if (sql.includes("FROM users WHERE id =")) {
        return { rows: [{ id: guestAId, email: "a@example.com", role: "guest", account_status: "active" }] };
      }
      if (sql.includes("FROM bookings b")) {
        // Booking belongs to guestBId (IDOR check)
        return {
          rows: [
            {
              id: "33333333-3333-4333-8333-333333333333",
              guest_id: guestBId,
              property_host_id: "44444444-4444-4444-8444-444444444444",
              status: "confirmed",
              payment_status: "paid",
              total_price: "1844.00",
              price_per_night: "1200.00",
            },
          ],
        };
      }
      return { rows: [] };
    };

    // 3. Incorrect role: guest accessing admin endpoint -> 403
    const adminDenied = await fetch(`${baseUrl}/api/v1/admin/dashboard`, {
      headers: { Authorization: `Bearer ${validTokenA}` },
    });
    assert.equal(adminDenied.status, 403);

    // 4. IDOR: User A accessing User B's booking -> 403
    const idorBooking = await fetch(`${baseUrl}/api/v1/bookings/33333333-3333-4333-8333-333333333333`, {
      headers: { Authorization: `Bearer ${validTokenA}` },
    });
    assert.equal(idorBooking.status, 403);

    // 5. Role escalation blocked by strict updateProfileSchema
    assert.throws(() => updateProfileSchema.parse({ full_name: "Hacker", role: "admin" }));

    // 6. Malformed JSON -> 400 (not 500)
    const badJson = await fetch(`${baseUrl}/api/v1/bookings`, {
      method: "POST",
      headers: { Authorization: `Bearer ${validTokenA}`, "Content-Type": "application/json" },
      body: "{bad-json",
    });
    assert.equal(badJson.status, 400);

    // 7. Harmless SQLi / path-traversal-like ID param -> controlled 400 (not 500)
    const sqliParam = await fetch(`${baseUrl}/api/v1/bookings/' OR 1=1--`, {
      headers: { Authorization: `Bearer ${validTokenA}` },
    });
    assert.equal(sqliParam.status, 400);

    // 8. Oversized JSON payload (>1MB) -> 413
    const bigBody = JSON.stringify({ data: "x".repeat(1_200_000) });
    const bigRes = await fetch(`${baseUrl}/api/v1/bookings`, {
      method: "POST",
      headers: { Authorization: `Bearer ${validTokenA}`, "Content-Type": "application/json" },
      body: bigBody,
    });
    assert.equal(bigRes.status, 413);

    // 9. Blocked CORS origin -> 403 (not 500)
    const corsRes = await fetch(`${baseUrl}/api/v1/rooms?limit=1`, {
      headers: { Origin: "https://evil.example.com" },
    });
    assert.equal(corsRes.status, 403);

    // 10. Invalid Razorpay webhook signature -> 400/401 rejected
    await assert.rejects(
      () => handleWebhook(JSON.stringify({ event: "payment.captured", payload: {} }), "invalid_sig"),
      (err) => err.status === 400 || err.status === 401
    );
  } finally {
    pool.query = origQuery;
    server.close();
  }
});
