import test from "node:test";
import assert from "node:assert/strict";
import { backendBookingToFrontend, backendPaymentToFrontend } from "../src/lib/api/adapters.ts";

test("Phase 5.12 Adapters: backendBookingToFrontend populates all dashboard & my-bookings fields", () => {
  const adapted = backendBookingToFrontend({
    id: "1ab91314-fc83-4948-a280-57ff8f2e49e6",
    booking_reference: "STY-2026-46D6EF",
    property_id: "f4eba44d-14b4-4d37-a395-8ba42d00eb8c",
    guest_id: "95741956-01b7-40b8-9995-8e36d9278434",
    duration_type: "MONTHLY",
    duration_count: 1,
    check_in_date: "2027-03-01",
    check_out_date: "2027-04-01",
    start_time: "2027-03-01T06:30:00.000Z",
    end_time: "2027-04-01T05:30:00.000Z",
    total_nights: 31,
    price_per_night: 12000,
    base_price: 12000,
    food_charges: 0,
    taxes: 1440,
    deposit_amount: 5000,
    total_price: 18440,
    payable_now: 18440,
    balance_remaining: 0,
    currency: "INR",
    guests_count: 1,
    status: "confirmed",
    payment_status: "paid",
    keyless_code: "733808",
    special_requests: null,
    cancellation_reason: null,
    cancelled_at: null,
    created_at: "2026-11-27T09:57:14.238Z",
    updated_at: "2026-11-27T09:57:16.074Z",
    room_type: { id: "503f6a90-226e-4fb3-8d68-2cfa19ef1679", name: "Manual Test Studio Suite" },
    unit: { id: "0aaed0e0-da4c-4df0-9134-6dbff951c434", identifier: "Unit 101A" },
  });

  assert.equal(adapted.bookingReference, "STY-2026-46D6EF");
  assert.equal(adapted.totalAmount, 18440);
  assert.equal(adapted.basePrice, 12000);
  assert.equal(adapted.taxes, 1440);
  assert.equal(adapted.depositAmount, 5000);
  assert.equal(adapted.securityDeposit, 5000);
  assert.equal(adapted.durationType, "MONTHLY");
  assert.equal(adapted.startTime, "2027-03-01T06:30:00.000Z");
  assert.equal(adapted.endTime, "2027-04-01T05:30:00.000Z");
  assert.equal(adapted.keylessCode, "733808");
  assert.equal(adapted.inventoryUnit?.identifier, "Unit 101A");
  assert.equal(adapted.totalAmount.toLocaleString("en-IN"), "18,440");
});

test("Phase 5.12 Adapters: backendPaymentToFrontend normalizes captured payment fields", () => {
  const adapted = backendPaymentToFrontend({
    id: "850cfd71-b3dc-4882-b9f0-96516f161499",
    booking_id: "1ab91314-fc83-4948-a280-57ff8f2e49e6",
    user_id: "95741956-01b7-40b8-9995-8e36d9278434",
    provider: "DEMO_SIMULATOR",
    razorpay_order_id: "order_test_123",
    razorpay_payment_id: "pay_demo_456",
    amount: 18440,
    currency: "INR",
    status: "captured",
    verified_at: "2026-11-27T09:57:16.074Z",
    created_at: "2026-11-27T09:57:14.682Z",
    updated_at: "2026-11-27T09:57:16.074Z",
    booking: { id: "1ab91314-fc83-4948-a280-57ff8f2e49e6", booking_reference: "STY-2026-46D6EF" },
  });

  assert.equal(adapted.status, "SUCCESS");
  assert.equal(adapted.amount, 18440);
  assert.equal(adapted.transactionRef, "pay_demo_456");
  assert.equal(adapted.bookingId, "1ab91314-fc83-4948-a280-57ff8f2e49e6");
  assert.equal(adapted.booking?.bookingReference, "STY-2026-46D6EF");
});
