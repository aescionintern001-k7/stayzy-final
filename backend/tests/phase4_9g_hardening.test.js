import test from "node:test";
import assert from "node:assert/strict";
import pool from "../src/database/pool.js";
import {
  createBooking,
  computeBookingPayloadHash,
  recoverBookingByIdempotencyKey,
} from "../src/modules/bookings/bookings.service.js";
import { recoverByIdempotencyKeyParamSchema } from "../src/modules/bookings/bookings.validator.js";

test("Legacy property_id booking path: idempotency replay, mismatch 409, concurrent 23505 recovery, and legacy no-key compatibility", async () => {
  const guestId = "24828f81-8a1a-46f2-8b83-9f17c56445f3";
  const legacyPayload = {
    property_id: "6069525e-4c2b-4abf-8ec2-86f81315dd38",
    check_in_date: "2026-12-25",
    check_out_date: "2026-12-26",
    guests_count: 1,
    idempotency_key: "mob_bk_legacy_001",
  };
  const hash = computeBookingPayloadHash(legacyPayload);

  const committedLegacyRow = {
    id: "66666666-6666-4666-8666-666666666666",
    booking_reference: "STY-2026-LEG001",
    property_id: legacyPayload.property_id,
    guest_id: guestId,
    check_in_date: "2026-12-25",
    check_out_date: "2026-12-26",
    total_nights: 1,
    price_per_night: "1200.00",
    total_price: "1200.00",
    payable_now: "1200.00",
    currency: "INR",
    guests_count: 1,
    status: "confirmed",
    payment_status: "unpaid",
    idempotency_payload_hash: hash,
    property_title: "Stayzy Haven — Koramangala",
    property_host_id: "44444444-4444-4444-8444-444444444444",
  };

  let committed = false;
  let insertAttempts = 0;

  const origQuery = pool.query.bind(pool);
  const origConnect = pool.connect.bind(pool);

  try {
    pool.query = async (sql, params) => {
      if (sql.includes("FROM users")) {
        return { rows: [{ id: guestId, full_name: "Aarav", email: "a@example.com", account_status: "active" }] };
      }
      if (sql.includes("idempotency_key")) {
        // Scoped to guestId
        if (params?.[0] !== guestId) return { rows: [] };
        return { rows: committed ? [committedLegacyRow] : [] };
      }
      return { rows: [] };
    };

    pool.connect = async () => ({
      query: async (sql) => {
        if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
          if (sql === "COMMIT") committed = true;
          return { rows: [] };
        }
        if (sql.includes("FROM properties")) {
          return {
            rows: [
              {
                id: legacyPayload.property_id,
                host_id: committedLegacyRow.property_host_id,
                title: committedLegacyRow.property_title,
                price_per_night: "1200.00",
                currency: "INR",
                max_guests: 2,
                status: "active",
                is_available: true,
              },
            ],
          };
        }
        if (sql.includes("SELECT COUNT(*)::int AS count")) {
          return { rows: [{ count: 0 }] };
        }
        if (sql.includes("INSERT INTO bookings")) {
          insertAttempts++;
          if (insertAttempts === 1) {
            committed = true;
            return { rows: [committedLegacyRow] };
          }
          const dupErr = new Error("duplicate key");
          dupErr.code = "23505";
          throw dupErr;
        }
        return { rows: [] };
      },
      release: () => {},
    });

    // 1. Concurrent duplicate legacy requests -> winner inserts once, loser recovers via 23505
    const [b1, b2] = await Promise.all([
      createBooking(guestId, legacyPayload),
      createBooking(guestId, legacyPayload),
    ]);
    assert.equal(b1.id, committedLegacyRow.id);
    assert.equal(b2.id, committedLegacyRow.id);

    // 2. Same key + same payload replay -> returns original without extra INSERT
    const beforeAttempts = insertAttempts;
    const replayed = await createBooking(guestId, legacyPayload);
    assert.equal(replayed.id, committedLegacyRow.id);
    assert.equal(insertAttempts, beforeAttempts);

    // 3. Same key + different payload -> rejected with 409
    await assert.rejects(
      () =>
        createBooking(guestId, {
          ...legacyPayload,
          check_out_date: "2026-12-27",
        }),
      (e) => e.status === 409
    );

    // 4. Legacy client without idempotency_key still creates booking normally
    const noKeyPayload = { ...legacyPayload };
    delete noKeyPayload.idempotency_key;
    insertAttempts = 0; // reset for mock insert
    const noKeyRes = await createBooking(guestId, noKeyPayload);
    assert.equal(noKeyRes.id, committedLegacyRow.id);
    assert.equal(insertAttempts, 1);
  } finally {
    pool.query = origQuery;
    pool.connect = origConnect;
  }
});

test("Exact Timeout Recovery: recovers by (guest_id, idempotency_key), rejects other user, ignores similar bookings", async () => {
  assert.doesNotThrow(() =>
    recoverByIdempotencyKeyParamSchema.parse({ idempotencyKey: "mob_bk_exact_1234" })
  );
  assert.throws(() => recoverByIdempotencyKeyParamSchema.parse({ idempotencyKey: "short" }));

  const ownerId = "24828f81-8a1a-46f2-8b83-9f17c56445f3";
  const otherId = "99999999-9999-4999-8999-999999999999";
  const targetRow = {
    id: "77777777-7777-4777-8777-777777777777",
    booking_reference: "STY-2026-REC01",
    property_id: "6069525e-4c2b-4abf-8ec2-86f81315dd38",
    room_type_id: "7a737eed-16b7-4ad9-9c76-2d152c447c6c",
    guest_id: ownerId,
    check_in_date: "2026-12-28",
    check_out_date: "2026-12-29",
    total_nights: 1,
    price_per_night: "1200.00",
    total_price: "1844.00",
    payable_now: "1844.00",
    currency: "INR",
    guests_count: 1,
    status: "pending",
    payment_status: "unpaid",
    property_title: "Stayzy Haven — Koramangala",
    room_type_name: "Master Executive Private Room",
  };

  const origQuery = pool.query.bind(pool);
  let queryCalls = 0;
  try {
    pool.query = async (sql, params) => {
      queryCalls++;
      // Verify exact query filters by guest_id AND idempotency_key (not LIMIT 10!)
      assert.ok(sql.includes("b.guest_id = $1 AND b.idempotency_key = $2"));
      assert.ok(!sql.includes("LIMIT 10"));
      if (params[0] === ownerId && params[1] === "mob_bk_exact_1234") {
        return { rows: [targetRow] };
      }
      return { rows: [] };
    };

    // Owner recovers exact booking (even if older than 10 bookings)
    const r1 = await recoverBookingByIdempotencyKey(ownerId, "mob_bk_exact_1234");
    const r2 = await recoverBookingByIdempotencyKey(ownerId, "mob_bk_exact_1234");
    assert.equal(r1.id, targetRow.id);
    assert.equal(r2.id, targetRow.id);
    assert.equal(queryCalls, 2);

    // Another customer cannot recover owner's booking -> 404
    await assert.rejects(
      () => recoverBookingByIdempotencyKey(otherId, "mob_bk_exact_1234"),
      (e) => e.status === 404
    );

    // New booking attempt with a different key does not match old booking -> 404
    await assert.rejects(
      () => recoverBookingByIdempotencyKey(ownerId, "mob_bk_new_attempt_999"),
      (e) => e.status === 404
    );
  } finally {
    pool.query = origQuery;
  }
});
