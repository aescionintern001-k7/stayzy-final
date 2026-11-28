import test from "node:test";
import assert from "node:assert/strict";
import { executeExpressBookingWithOrder } from "../src/lib/checkout/expressBooking.ts";

const baseArgs = {
  backendUrl: "http://127.0.0.1:5000/api/v1",
  token: "header.payload.signature",
  idempotencyKey: "web-chk-test-12345678",
  payload: {
    room_type_id: "22222222-2222-4222-8222-222222222222",
    duration_type: "MONTHLY",
    start_date: "2026-12-10",
    duration_count: 1,
  },
};

test("Phase 5.10: succeeds on Express booking + payment order creation", async () => {
  const calls: string[] = [];
  const mockFetch = (async (url: string) => {
    calls.push(url);
    if (url.endsWith("/bookings")) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            booking: {
              id: "11111111-1111-4111-8111-111111111111",
              booking_reference: "STY-2026-TEST01",
              payable_now: 14000,
            },
          },
        }),
        { status: 201 }
      );
    }
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          order: { id: "order_test_123", currency: "INR", amount: 1400000 },
          key_id: "rzp_test_key",
        },
      }),
      { status: 201 }
    );
  }) as typeof fetch;

  const res = await executeExpressBookingWithOrder({ ...baseArgs, fetchImpl: mockFetch });
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.source, "express_backend");
  assert.equal(res.body.bookingId, "11111111-1111-4111-8111-111111111111");
  assert.equal(calls.length, 2);
});

test("Phase 5.10: returns 503 with uncertainOutcome on Express network failure (never falls back)", async () => {
  const mockFetch = (async () => {
    throw new Error("ECONNREFUSED");
  }) as typeof fetch;

  const res = await executeExpressBookingWithOrder({ ...baseArgs, fetchImpl: mockFetch });
  assert.equal(res.status, 503);
  assert.equal(res.body.success, false);
  assert.equal(res.body.code, "BACKEND_UNAVAILABLE");
  assert.equal(res.body.uncertainOutcome, true);
  assert.equal(res.body.idempotencyKey, baseArgs.idempotencyKey);
});

test("Phase 5.10: returns 504 with uncertainOutcome on Express timeout (AbortError)", async () => {
  const mockFetch = (async () => {
    const err = new Error("The operation was aborted");
    err.name = "AbortError";
    throw err;
  }) as typeof fetch;

  const res = await executeExpressBookingWithOrder({ ...baseArgs, fetchImpl: mockFetch });
  assert.equal(res.status, 504);
  assert.equal(res.body.success, false);
  assert.equal(res.body.code, "BOOKING_TIMEOUT");
  assert.equal(res.body.uncertainOutcome, true);
});

test("Phase 5.10: propagates Express 4xx/5xx directly without SQLite fallback", async () => {
  const mockFetch = (async () => {
    return new Response(
      JSON.stringify({ success: false, message: "Idempotency key conflict" }),
      { status: 409 }
    );
  }) as typeof fetch;

  const res = await executeExpressBookingWithOrder({ ...baseArgs, fetchImpl: mockFetch });
  assert.equal(res.status, 409);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error, "Idempotency key conflict");
});

test("Phase 5.10: preserves bookingId and marks paymentRequired when create-order fails", async () => {
  const mockFetch = (async (url: string) => {
    if (url.endsWith("/bookings")) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            booking: {
              id: "11111111-1111-4111-8111-111111111111",
              booking_reference: "STY-2026-TEST02",
              payable_now: 14000,
            },
          },
        }),
        { status: 201 }
      );
    }
    return new Response(JSON.stringify({ message: "Gateway down" }), { status: 503 });
  }) as typeof fetch;

  const res = await executeExpressBookingWithOrder({ ...baseArgs, fetchImpl: mockFetch });
  assert.equal(res.status, 503);
  assert.equal(res.body.success, false);
  assert.equal(res.body.bookingCreated, true);
  assert.equal(res.body.paymentRequired, true);
  assert.equal(res.body.bookingId, "11111111-1111-4111-8111-111111111111");
});
