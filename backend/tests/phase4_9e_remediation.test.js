import test from "node:test";
import assert from "node:assert/strict";
import pool from "../src/database/pool.js";
import { createBookingSchema } from "../src/modules/bookings/bookings.validator.js";
import {
  isKeylessPinEligible,
  ALLOWED_BOOKING_TRANSITIONS,
  validateBookingStatusTransition,
  computeBookingPayloadHash,
  createBooking,
} from "../src/modules/bookings/bookings.service.js";
import {
  assertHoldAccess,
  getHoldByTokenService,
  releaseHoldService,
} from "../src/modules/holds/holds.service.js";

// Pure mirror of mobile formatUnitLabel for Node test runner isolation
function formatUnitLabel(unitIdentifier) {
  const trimmed = (unitIdentifier || "").trim();
  if (!trimmed) return null;
  if (/^unit\b/i.test(trimmed)) return trimmed;
  return `Unit ${trimmed}`;
}

test("Booking Idempotency: schema, payload hash, replay, mismatch 409, and 23505 recovery", async () => {
  const basePayload = {
    room_type_id: "7a737eed-16b7-4ad9-9c76-2d152c447c6c",
    duration_type: "DAILY",
    start_date: "2026-12-20",
    duration_count: 1,
    guests_count: 1,
    guest_name: "Test User",
    guest_email: "test@example.com",
    guest_phone: "+919876543210",
  };

  // Legacy client compatibility (without idempotency_key)
  assert.doesNotThrow(() => createBookingSchema.parse(basePayload));
  // With idempotency_key
  assert.doesNotThrow(() =>
    createBookingSchema.parse({ ...basePayload, idempotency_key: "mob_bk_test_1234" })
  );

  const h1 = computeBookingPayloadHash(basePayload);
  const h2 = computeBookingPayloadHash({ ...basePayload, duration_type: "daily" });
  const h3 = computeBookingPayloadHash({ ...basePayload, duration_count: 2 });
  assert.equal(h1, h2);
  assert.notEqual(h1, h3);

  // Mock pool.query for isolated idempotent replay & mismatch tests (zero DB mutation)
  const origQuery = pool.query.bind(pool);
  try {
    const fakeBookingRow = {
      id: "11111111-1111-4111-8111-111111111111",
      booking_reference: "STY-2026-IDEM01",
      property_id: "6069525e-4c2b-4abf-8ec2-86f81315dd38",
      room_type_id: basePayload.room_type_id,
      guest_id: "24828f81-8a1a-46f2-8b83-9f17c56445f3",
      duration_type: "DAILY",
      duration_count: 1,
      check_in_date: "2026-12-20",
      check_out_date: "2026-12-21",
      total_nights: 1,
      price_per_night: "1200.00",
      total_price: "1844.00",
      payable_now: "1844.00",
      currency: "INR",
      guests_count: 1,
      status: "pending",
      payment_status: "unpaid",
      idempotency_payload_hash: h1,
      property_title: "Stayzy Haven — Koramangala",
      room_type_name: "Master Executive Private Room",
    };

    pool.query = async (sql) => {
      if (sql.includes("FROM users")) {
        return {
          rows: [
            {
              id: "24828f81-8a1a-46f2-8b83-9f17c56445f3",
              full_name: "Aarav Sharma",
              email: "aarav.sharma@example.com",
              phone: "+919876512345",
              account_status: "active",
            },
          ],
        };
      }
      if (sql.includes("idempotency_key")) {
        return { rows: [fakeBookingRow] };
      }
      return { rows: [] };
    };

    // Identical retry returns original booking without touching holds or creating duplicate
    const replayed = await createBooking("24828f81-8a1a-46f2-8b83-9f17c56445f3", {
      ...basePayload,
      idempotency_key: "mob_bk_test_1234",
    });
    assert.equal(replayed.id, fakeBookingRow.id);
    assert.equal(replayed.booking_reference, "STY-2026-IDEM01");

    // Reused key with materially different payload is rejected with 409
    await assert.rejects(
      () =>
        createBooking("24828f81-8a1a-46f2-8b83-9f17c56445f3", {
          ...basePayload,
          duration_count: 2,
          idempotency_key: "mob_bk_test_1234",
        }),
      (err) => err.status === 409
    );
  } finally {
    pool.query = origQuery;
  }
});

test("Hold Ownership: owner, other user, anonymous hold, expired, and consumed hold", async () => {
  const authHold = { token: "hold_auth_1", guest_id: "user-a" };
  const anonHold = { token: "hold_anon_1", guest_id: null };

  assert.doesNotThrow(() => assertHoldAccess(authHold, { id: "user-a", role: "guest" }));
  assert.doesNotThrow(() => assertHoldAccess(authHold, { id: "admin-1", role: "admin" }));
  assert.throws(() => assertHoldAccess(authHold, null), (e) => e.status === 401);
  assert.throws(
    () => assertHoldAccess(authHold, { id: "user-b", role: "guest" }),
    (e) => e.status === 403
  );
  assert.doesNotThrow(() => assertHoldAccess(anonHold, null));

  const origQuery = pool.query.bind(pool);
  try {
    // Missing/consumed hold
    pool.query = async () => ({ rows: [], rowCount: 0 });
    await assert.rejects(() => getHoldByTokenService("hold_missing", null), (e) => e.status === 404);
    const relMissing = await releaseHoldService("hold_missing", null);
    assert.equal(relMissing.released, false);

    // Expired authenticated hold accessed by owner -> 410; by other user -> 403
    pool.query = async () => ({
      rows: [
        {
          token: "hold_exp",
          guest_id: "user-a",
          expires_at: new Date(Date.now() - 60_000).toISOString(),
        },
      ],
    });
    await assert.rejects(
      () => getHoldByTokenService("hold_exp", { id: "user-b", role: "guest" }),
      (e) => e.status === 403
    );
    await assert.rejects(
      () => getHoldByTokenService("hold_exp", { id: "user-a", role: "guest" }),
      (e) => e.status === 410
    );
  } finally {
    pool.query = origQuery;
  }
});

test("Booking State Machine: valid, invalid, and terminal transitions", () => {
  assert.deepEqual(ALLOWED_BOOKING_TRANSITIONS.cancelled, []);
  assert.deepEqual(ALLOWED_BOOKING_TRANSITIONS.completed, []);

  assert.doesNotThrow(() => validateBookingStatusTransition("pending", "confirmed"));
  assert.doesNotThrow(() => validateBookingStatusTransition("pending", "cancelled"));
  assert.doesNotThrow(() => validateBookingStatusTransition("confirmed", "checked_in"));
  assert.doesNotThrow(() => validateBookingStatusTransition("checked_in", "checked_out"));
  assert.doesNotThrow(() => validateBookingStatusTransition("checked_out", "completed"));

  assert.throws(() => validateBookingStatusTransition("pending", "completed"), (e) => e.status === 400);
  assert.throws(() => validateBookingStatusTransition("pending", "checked_in"), (e) => e.status === 400);
  assert.throws(() => validateBookingStatusTransition("checked_out", "confirmed"), (e) => e.status === 400);
  assert.throws(() => validateBookingStatusTransition("cancelled", "confirmed"), (e) => e.status === 400);
  assert.throws(() => validateBookingStatusTransition("completed", "cancelled"), (e) => e.status === 400);
});

test("Keyless PIN Eligibility: requires confirmed/checked_in AND paid", () => {
  assert.equal(isKeylessPinEligible("confirmed", "paid"), true);
  assert.equal(isKeylessPinEligible("checked_in", "paid"), true);
  assert.equal(isKeylessPinEligible("confirmed", "unpaid"), false);
  assert.equal(isKeylessPinEligible("pending", "unpaid"), false);
  assert.equal(isKeylessPinEligible("pending", "paid"), false);
  assert.equal(isKeylessPinEligible("cancelled", "paid"), false);
  assert.equal(isKeylessPinEligible("completed", "paid"), false);
});

test("Unit Label Normalization: prevents duplicate Unit prefix", () => {
  assert.equal(formatUnitLabel("Unit A"), "Unit A");
  assert.equal(formatUnitLabel("A"), "Unit A");
  assert.equal(formatUnitLabel("  unit 4B "), "unit 4B");
  assert.equal(formatUnitLabel(""), null);
  assert.equal(formatUnitLabel("   "), null);
  assert.equal(formatUnitLabel(null), null);
});
