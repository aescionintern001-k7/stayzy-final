import test from "node:test";
import assert from "node:assert/strict";
import pool from "../src/database/pool.js";
import {
  createBooking,
  computeBookingPayloadHash,
  isKeylessPinEligible,
  validateBookingStatusTransition,
} from "../src/modules/bookings/bookings.service.js";
import {
  getHoldByTokenService,
  releaseHoldService,
} from "../src/modules/holds/holds.service.js";

test("Concurrent duplicate booking requests: losing 23505 request recovers winning booking", async () => {
  const guestId = "24828f81-8a1a-46f2-8b83-9f17c56445f3";
  const payload = {
    room_type_id: "7a737eed-16b7-4ad9-9c76-2d152c447c6c",
    duration_type: "DAILY",
    start_date: "2026-12-22",
    duration_count: 1,
    guests_count: 1,
    guest_name: "Concurrent Guest",
    guest_email: "concurrent@example.com",
    guest_phone: "+919876543210",
    idempotency_key: "mob_bk_conc_9999",
  };
  const expectedHash = computeBookingPayloadHash(payload);

  const committedRow = {
    id: "22222222-2222-4222-8222-222222222222",
    booking_reference: "STY-2026-CONC01",
    property_id: "6069525e-4c2b-4abf-8ec2-86f81315dd38",
    room_type_id: payload.room_type_id,
    inventory_unit_id: "33333333-3333-4333-8333-333333333333",
    guest_id: guestId,
    duration_type: "DAILY",
    duration_count: 1,
    check_in_date: "2026-12-22",
    check_out_date: "2026-12-23",
    total_nights: 1,
    price_per_night: "1200.00",
    base_price: "1200.00",
    food_charges: "0.00",
    taxes: "144.00",
    deposit_amount: "500.00",
    total_price: "1844.00",
    payable_now: "1844.00",
    balance_remaining: "0.00",
    currency: "INR",
    guests_count: 1,
    status: "pending",
    payment_status: "unpaid",
    keyless_code: "999888",
    idempotency_payload_hash: expectedHash,
    property_title: "Stayzy Haven — Koramangala",
    property_host_id: "44444444-4444-4444-8444-444444444444",
    room_type_name: "Master Executive Private Room",
  };

  let committed = false;
  let insertCount = 0;

  const origQuery = pool.query.bind(pool);
  const origConnect = pool.connect.bind(pool);

  try {
    pool.query = async (sql, params) => {
      if (sql.includes("FROM users")) {
        return {
          rows: [
            {
              id: guestId,
              full_name: "Aarav Sharma",
              email: "aarav.sharma@example.com",
              phone: "+919876512345",
              account_status: "active",
            },
          ],
        };
      }
      if (sql.includes("idempotency_key")) {
        // Before commit, neither concurrent request sees an existing row; after 23505 rollback, loser sees committed row
        return { rows: committed ? [committedRow] : [] };
      }
      return { rows: [] };
    };

    pool.connect = async () => {
      let rolledBack = false;
      return {
        query: async (sql) => {
          if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
            if (sql === "COMMIT") committed = true;
            if (sql === "ROLLBACK") rolledBack = true;
            return { rows: [] };
          }
          if (sql.includes("FROM room_types rt")) {
            return {
              rows: [
                {
                  id: payload.room_type_id,
                  property_id: committedRow.property_id,
                  host_id: committedRow.property_host_id,
                  property_title: committedRow.property_title,
                  property_currency: "INR",
                  property_status: "active",
                  property_available: true,
                  max_capacity: 2,
                  name: committedRow.room_type_name,
                  slug: "master-exec",
                  category: "private",
                  is_active: true,
                },
              ],
            };
          }
          if (sql.includes("FROM rate_plans")) {
            return {
              rows: [
                {
                  id: "55555555-5555-4555-8555-555555555555",
                  duration_type: "DAILY",
                  price: "1200.00",
                  deposit_amount: "500.00",
                  food_monthly_charge: "0.00",
                  min_duration: 1,
                  max_duration: 29,
                  is_enabled: true,
                },
              ],
            };
          }
          if (sql.includes("FROM inventory_units")) {
            return {
              rows: [
                {
                  id: committedRow.inventory_unit_id,
                  room_type_id: payload.room_type_id,
                  identifier: "Unit A",
                  room_number: "101",
                  floor: 1,
                },
              ],
            };
          }
          if (sql.includes("FROM bookings") && sql.includes("inventory_unit_id")) {
            return { rows: [] };
          }
          if (sql.includes("FROM inventory_holds")) {
            return { rows: [] };
          }
          if (sql.includes("INSERT INTO bookings")) {
            insertCount++;
            if (insertCount === 1) {
              committed = true;
              return { rows: [committedRow] };
            }
            const dupErr = new Error("duplicate key value violates unique constraint");
            dupErr.code = "23505";
            throw dupErr;
          }
          return { rows: [] };
        },
        release: () => {},
      };
    };

    const [r1, r2] = await Promise.all([
      createBooking(guestId, payload),
      createBooking(guestId, payload),
    ]);

    assert.equal(r1.id, committedRow.id);
    assert.equal(r2.id, committedRow.id);
    assert.equal(r1.booking_reference, "STY-2026-CONC01");
    assert.equal(r2.booking_reference, "STY-2026-CONC01");
    // Unpaid pending booking must NOT expose keyless_code
    assert.equal(r1.keyless_code, null);
    assert.equal(r2.keyless_code, null);
  } finally {
    pool.query = origQuery;
    pool.connect = origConnect;
  }
});

test("Hold ownership: authenticated owner vs other user vs anonymous guest", async () => {
  const origQuery = pool.query.bind(pool);
  try {
    const futureExpiry = new Date(Date.now() + 600_000).toISOString();

    // Authenticated hold belonging to user-1
    pool.query = async (sql) => {
      if (sql.includes("DELETE FROM inventory_holds")) {
        return { rowCount: 1, rows: [{ token: "hold_u1" }] };
      }
      return {
        rows: [
          {
            token: "hold_u1",
            guest_id: "user-1",
            room_type_id: "rt-1",
            room_type_name: "Master",
            room_type_slug: "master",
            property_id: "prop-1",
            inventory_unit_id: "unit-1",
            duration_type: "DAILY",
            duration_count: 1,
            start_time: futureExpiry,
            end_time: futureExpiry,
            expires_at: futureExpiry,
            total_amount: "1844.00",
            unit_identifier: "Unit A",
          },
        ],
      };
    };

    const ownerGet = await getHoldByTokenService("hold_u1", { id: "user-1", role: "guest" });
    assert.equal(ownerGet.hold_token, "hold_u1");
    assert.equal(ownerGet.guest_id, undefined);

    const ownerDel = await releaseHoldService("hold_u1", { id: "user-1", role: "guest" });
    assert.equal(ownerDel.released, true);

    await assert.rejects(
      () => getHoldByTokenService("hold_u1", { id: "user-2", role: "guest" }),
      (e) => e.status === 403
    );
    await assert.rejects(
      () => releaseHoldService("hold_u1", { id: "user-2", role: "guest" }),
      (e) => e.status === 403
    );

    // Anonymous guest hold (guest_id: null)
    pool.query = async (sql) => {
      if (sql.includes("DELETE FROM inventory_holds")) {
        return { rowCount: 1, rows: [{ token: "hold_anon" }] };
      }
      return {
        rows: [
          {
            token: "hold_anon",
            guest_id: null,
            room_type_id: "rt-1",
            room_type_name: "Master",
            room_type_slug: "master",
            property_id: "prop-1",
            inventory_unit_id: "unit-1",
            duration_type: "DAILY",
            duration_count: 1,
            start_time: futureExpiry,
            end_time: futureExpiry,
            expires_at: futureExpiry,
            total_amount: "1844.00",
          },
        ],
      };
    };

    const anonGet = await getHoldByTokenService("hold_anon", null);
    assert.equal(anonGet.hold_token, "hold_anon");
    const anonDel = await releaseHoldService("hold_anon", null);
    assert.equal(anonDel.released, true);
  } finally {
    pool.query = origQuery;
  }
});

test("Keyless PIN & Status Transition regression matrix", () => {
  assert.equal(isKeylessPinEligible("confirmed", "paid"), true);
  assert.equal(isKeylessPinEligible("checked_in", "paid"), true);
  assert.equal(isKeylessPinEligible("confirmed", "unpaid"), false);
  assert.equal(isKeylessPinEligible("cancelled", "paid"), false);

  assert.doesNotThrow(() => validateBookingStatusTransition("confirmed", "cancelled"));
  assert.doesNotThrow(() => validateBookingStatusTransition("checked_in", "completed"));
  assert.throws(() => validateBookingStatusTransition("cancelled", "confirmed"), (e) => e.status === 400);
  assert.throws(() => validateBookingStatusTransition("completed", "checked_in"), (e) => e.status === 400);
});
