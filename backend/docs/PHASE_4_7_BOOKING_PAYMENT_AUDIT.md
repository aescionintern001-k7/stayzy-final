# Stayzy Mobile — Phase 4.7: Booking & Payment Integration Readiness Audit

- **Repository:** `D:\Stayzy-Final`
- **Branch:** `integrate/perf-security-ui`
- **HEAD:** `32200ba7d825bae4c6449f98b5f2c81480751ef5`
- **Audit Mode:** Read-only code & configuration inspection (no holds, bookings, payments, or webhooks executed)

---

## 1. Booking Lifecycle Architecture Diagram

```mermaid
sequenceDiagram
  autonumber
  actor Guest as Guest (Mobile / Web)
  participant Mobile as Stayzy Mobile (Expo)
  participant API as Express API (/api/v1)
  participant DB as PostgreSQL (stayzy_dev)
  participant RZP as Razorpay (Test / Simulator)

  Guest->>Mobile: Select room & configure dates/duration/dining
  Mobile->>API: POST /bookings/calculate-pricing
  API->>DB: Query rate_plans & room_types
  API-->>Mobile: Authoritative breakdown (base, food, taxes, deposit, payableNow)

  Guest->>Mobile: Tap "Proceed to Book" (authenticated)
  Mobile->>API: POST /holds
  API->>DB: BEGIN; DELETE expired holds; FOR UPDATE unit lock; INSERT inventory_holds (15m TTL)
  API-->>Mobile: hold_token, expires_at, assigned unit

  Mobile->>API: GET /holds/:token & POST /bookings/calculate-pricing
  Guest->>Mobile: Confirm guest details & accept terms, tap "Pay & Confirm Stay"
  Mobile->>API: POST /bookings (with hold_token)
  API->>DB: BEGIN; FOR UPDATE property & unit; recalculate pricing; INSERT bookings ('pending','unpaid') & payment_schedules; DELETE hold
  API-->>Mobile: booking (id, booking_reference, keyless_code)

  Mobile->>API: POST /payments/create-order (idempotency_key)
  API->>RZP: Create order (or deterministic mock order in dev/test)
  API->>DB: INSERT payments ('created')
  API-->>Mobile: order (id, amount, key_id)

  alt Real Razorpay SDK (Not Yet Installed on Mobile)
    Mobile->>RZP: Native Razorpay Checkout
    RZP-->>Mobile: razorpay_payment_id, razorpay_signature
    Mobile->>API: POST /payments/verify (HMAC-SHA256 timingSafeEqual)
  else Dev/Test Simulator (NODE_ENV !== 'production')
    Mobile->>API: POST /payments/demo-simulate (SUCCESS / PENDING / FAILED)
  end

  API->>DB: UPDATE payments ('captured'), bookings ('confirmed','paid'), payment_schedules
  RZP-->>API: POST /payments/webhook (x-razorpay-signature + webhook_events dedupe)
  Guest->>Mobile: View booking in My Stays (GET /bookings)
```

---

## 2. Website → Mobile → Backend Flow

| Stage | Website (`frontend/`) | Mobile (`mobile/`) | Express Backend (`backend/`) |
| :--- | :--- | :--- | :--- |
| Room & Config | `RoomDetailsClient.tsx` | `app/room/[id].tsx` | `GET /rooms/:slug`, `POST /bookings/calculate-pricing` |
| 15-Min Hold | `POST /api/checkout/hold` | `BookingApi.createHold()` | `POST /holds` |
| Checkout / Details | `app/checkout/page.tsx` | `app/checkout.tsx` | `GET /holds/:token`, `POST /bookings/calculate-pricing` |
| Booking Creation | `POST /api/checkout/create-booking` | `BookingApi.createBooking()` | `POST /bookings` |
| Order Creation | Server / Checkout | `PaymentApi.createOrder()` | `POST /payments/create-order` |
| Checkout Execution | Web Razorpay / Demo | Simulator Modal (`PaymentApi.demoSimulate()`) — *Native Razorpay SDK missing* | `POST /payments/verify` or `POST /payments/demo-simulate` |
| Post-Payment Recovery | Reconciliation | `PaymentApi.reconcile()`, `PaymentApi.fail()` | `POST /payments/reconcile`, `POST /payments/fail`, `POST /payments/webhook` |
| My Stays & Cancellation | `MyBookingsClient.tsx` | `CustomerStaysScreen.tsx` | `GET /bookings`, `POST /bookings/:id/extend`, `PATCH /bookings/:id/cancel` |

---

## 3. Backend API Inventory

| Endpoint | Method | Auth | Request Payload / Params | Response Format | Validation & DB Side Effects | Idempotency / Safe to Test |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/v1/bookings/availability` | `GET` | Public | `property_id`, `check_in_date`, `check_out_date` | `{ available, pricing }` | Zod `checkAvailabilityQuerySchema`; read-only | Read-only (**Safe**) |
| `/api/v1/bookings/calculate-pricing` | `POST` / `GET` | Public | `room_type_id`, `duration_type`, `duration_count`, `start_date`, `start_time`, `include_food` | `{ breakdown, ratePlan }` | Queries `rate_plans`, `room_types`, `properties`; server pricing rules | Read-only (**Safe**) |
| `/api/v1/holds` | `POST` | Optional JWT | `room_type_id`, `inventory_unit_id?`, `duration_type`, `start_date`, `start_time?`, `duration_count`, `include_food`, `guest_email?` | `{ hold_token, expires_at, ttl_seconds, inventory_unit_id, unit }` | Zod `createHoldSchema`; deletes expired holds, locks unit `FOR UPDATE`, inserts `inventory_holds` (15m TTL) | Mutates DB (**Do NOT run in audit**) |
| `/api/v1/holds/:token` | `GET` | Public | `:token` (10–160 chars) | `{ hold }` (includes `remaining_seconds`, `unit`) | Zod `holdTokenParamSchema`; read-only | Read-only (**Safe**) |
| `/api/v1/holds/:token` | `DELETE` | Public | `:token` | `{ released: true }` | Deletes row from `inventory_holds` | Mutates DB (**Do NOT run in audit**) |
| `/api/v1/bookings` | `POST` | JWT (`authenticate`) | `room_type_id`, `hold_token?`, `inventory_unit_id?`, `duration_type`, `start_date`, `start_time?`, `duration_count`, `include_food`, `guests_count`, `guest_name`, `guest_email`, `guest_phone`, `special_requests?` | `{ booking }` | Zod `createBookingSchema` (`.strict()`); `FOR UPDATE OF p`; server pricing; inserts `bookings` (`pending`/`unpaid`) + `payment_schedules`; deletes hold | Mutates DB (**Do NOT run in audit**) |
| `/api/v1/bookings` | `GET` | JWT | `?limit=&page=` | `{ bookings, pagination }` | Reads `bookings` + `refunds` for `req.user.id` | Read-only (**Safe**) |
| `/api/v1/bookings/:id` | `GET` | JWT (Owner/Guest/Admin) | `:id` (UUID) | `{ booking }` | Ownership enforced in service | Read-only (**Safe**) |
| `/api/v1/bookings/:id/extend` | `POST` | JWT | `additional_count` | `{ booking, extension }` | Updates `bookings` & `payment_schedules` | Mutates DB (**Do NOT run in audit**) |
| `/api/v1/bookings/:id/cancel` | `PATCH` | JWT | `reason?` | `{ booking }` | Calculates `calculateTieredRefund()`, updates `bookings`, inserts `refunds` if paid | Mutates DB (**Do NOT run in audit**) |
| `/api/v1/payments/create-order` | `POST` | JWT | `booking_id`, `payment_schedule_id?`, `idempotency_key?` | `{ payment, order, idempotent_replay? }` | Verifies ownership, computes server `targetAmount` (`payable_now` or `schedule.amount`), reuses open `created`/`pending` order or creates Razorpay order, inserts `payments` | Idempotent via `idempotency_key` (`uq_payments_idempotency_key`) + open-order reuse (**Mutates DB**) |
| `/api/v1/payments/verify` | `POST` | JWT | `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature` | `{ payment, booking, idempotent? }` | `FOR UPDATE OF p`; verifies owner (`payment.user_id === userId`); timing-safe HMAC-SHA256; marks `payments='captured'`, `bookings='confirmed'/'paid'` | Idempotent if already `captured` (**Mutates DB**) |
| `/api/v1/payments/fail` | `POST` | JWT | `razorpay_order_id`, `error_code?`, `error_description?` | `{ payment }` | Marks `payments='failed'`, `bookings.payment_status='failed'` | Mutates DB (**Do NOT run in audit**) |
| `/api/v1/payments/reconcile` | `POST` | JWT | `booking_id?`, `payment_id?`, `razorpay_order_id?` | `{ reconciled, action, booking?, payment? }` | Queries Razorpay `orders.fetchPayments(orderId)` when live keys configured; syncs captured/failed state | Mutates DB (**Do NOT run in audit**) |
| `/api/v1/payments/demo-simulate` | `POST` | JWT (Blocked in `production` with `403`) | `booking_id?`, `razorpay_order_id?`, `payment_schedule_id?`, `outcome` (`SUCCESS`/`FAILED`/`PENDING`) | `{ payment, booking?, idempotent? }` | Disabled when `NODE_ENV === 'production'`; simulates capture/pending/failure in `development`/`test` | Idempotent if already `captured` (**Dev/Test only**) |
| `/api/v1/payments/my` | `GET` | JWT | `?limit=` | `{ payments, schedules, refunds }` | Reads user's payments, schedules, refunds | Read-only (**Safe**) |
| `/api/v1/payments/webhook` | `POST` | Public (HMAC Signature) | Razorpay webhook JSON + `x-razorpay-signature` | `{ received, event, event_id?, duplicate? }` | Verifies HMAC-SHA256 (`RAZORPAY_WEBHOOK_SECRET`); deduplicates via `webhook_events(event_id)` | Idempotent via `webhook_events` (**Mutates DB**) |

---

## 4. Hold Lifecycle
1. **Creation (`POST /holds`):** Validates `start_date >= getTodayIstYmd()`, checks room/property active status, calculates server pricing, purges expired holds (`expires_at <= NOW()`), locks an available `inventory_unit` (`FOR UPDATE`), and inserts into `inventory_holds` with `HOLD_TTL_MINUTES` (15 minutes) and `guest_id`.
2. **Inspection (`GET /holds/:token`):** Returns hold details and `remaining_seconds`.
3. **Consumption (`POST /bookings`):** Validates hold exists, is not expired (`410` if expired), and `holdRecord.guest_id === guestId` (`403` otherwise); creates booking and deletes the hold row inside the same DB transaction.
4. **Release / Expiry:** Explicitly released via `DELETE /holds/:token` (on Back press in `checkout.tsx`) or automatically purged on the next hold/availability check after `expires_at`.

---

## 5. Booking Lifecycle
- **Statuses (`bookings_status_check`):** `pending` → `confirmed` → `checked_in` → `checked_out` / `completed`, or `cancelled`.
- **Payment Statuses (`bookings_payment_status_check`):** `unpaid`, `pending`, `held`, `paid`, `failed`, `refunded`, `partially_refunded`.
- **Creation:** Always starts as `status = 'pending'`, `payment_status = 'unpaid'` with a generated `booking_reference` (`STY-YYYY-XXXXXX`) and 6-digit `keyless_code`.
- **Confirmation:** Transitions to `confirmed` / `paid` only after payment capture (`verifyPayment`, `handleWebhook`, `reconcilePayment`, or dev-only `demoSimulatePayment`).
- **Cancellation:** `PATCH /bookings/:id/cancel` computes `calculateTieredRefund()`, updates `bookings.status = 'cancelled'`, cancels pending `payment_schedules`, and inserts a `refunds` row if paid.

---

## 6. Razorpay Payment Lifecycle
- **Backend SDK:** `razorpay@^2.9.8` installed in `backend/package.json`, initialized in `backend/src/config/razorpay.js`.
- **Mobile SDK:** `react-native-razorpay` is **NOT** installed in `mobile/package.json`. Mobile `checkout.tsx` currently uses a **Razorpay Test Checkout & Simulator Modal** (`PaymentApi.demoSimulate`) with `Retry Order` and `Reconcile Status` controls.
- **Test vs Live Mode:** `backend/src/config/env.js` defaults `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` to local `rzp_test_stayzy*` mock values when `NODE_ENV !== 'production'`. In `production`, `envSchema.superRefine` rejects missing or `rzp_test_stayzy*` keys at startup, and `demoSimulatePayment` throws `403 Forbidden`.
- **Order Creation & Verification:** Server computes `targetAmount` from `bookings.payable_now` (or `payment_schedules.amount`). `verifyPayment` uses `crypto.timingSafeEqual` on `HMAC-SHA256("${orderId}|${paymentId}")`.
- **Failure / Pending / Recovery:** Failed verification updates `payments.status = 'failed'` and `bookings.payment_status = 'failed'`; `reconcilePayment` fetches order payments from Razorpay (in live/non-mock mode) to sync interrupted sessions; `handleWebhook` handles `payment.captured` and `payment.failed` with `webhook_events` deduplication.

---

## 7. Database Records Affected at Each Stage
1. **Hold:** `inventory_holds` (`INSERT`), expired `inventory_holds` (`DELETE`).
2. **Booking Creation:** `bookings` (`INSERT` as `pending`/`unpaid`), `payment_schedules` (`INSERT` for installment plans), `inventory_holds` (`DELETE`).
3. **Order Creation:** `payments` (`INSERT` as `created`, `idempotency_key` unique index `uq_payments_idempotency_key`).
4. **Payment Capture / Webhook:** `payments` (`UPDATE` to `captured`, `verified_at`), `bookings` (`UPDATE` to `confirmed`/`paid`), `payment_schedules` (`UPDATE` to `PAID` if schedule payment), `webhook_events` (`INSERT` for deduplication).
5. **Cancellation / Refund:** `bookings` (`UPDATE` to `cancelled`), `payment_schedules` (`UPDATE` to `CANCELLED`), `refunds` (`INSERT`).

---

## 8. Mobile Integration Readiness Checklist

| Capability | Status | Notes |
| :--- | :--- | :--- |
| Checkout navigation & params | **READY** | `room/[id].tsx` passes `holdToken`, `roomTypeId`, `roomName`, `propertyName`, `locality`, `roomImage`, `durationType`, `durationCount`, `startDate`, `startTime`, `includeFood`. |
| Form validation | **READY** | `validateCheckoutDetails()` matches backend Zod rules; verified in unit & Android runtime tests. |
| Authoritative server pricing | **READY** | `BookingApi.calculatePricing` wired in both `room/[id].tsx` and `checkout.tsx`. |
| Auth & token handling | **READY** | `SecureStore` JWT + `RoleContext` + `!isAuthenticated` guard in `checkout.tsx`. |
| Hold API client | **READY** | `BookingApi.createHold`, `getHold`, `releaseHold` implemented in `mobile/src/services/api.ts`. |
| Booking API client | **READY** | `BookingApi.createBooking`, `getMyBookings`, `extendBooking`, `cancelBooking` implemented. |
| Payment API client | **READY** | `PaymentApi.createOrder`, `verify`, `fail`, `reconcile`, `demoSimulate`, `getMyPayments` implemented. |
| Native Razorpay Checkout SDK | **MISSING** | `react-native-razorpay` is not installed; currently uses `demoSimulate` modal in `checkout.tsx`. |
| Dedicated Booking Confirmation Screen | **PARTIAL** | `checkout.tsx` shows an `Alert.alert("Stay Confirmed!", ...)` with `booking_reference` & `keyless_code` and redirects to `/(tabs)/stays`; no dedicated confirmation screen like website `booking-confirmation/[id]/page.tsx`. |
| My Stays refresh & actions | **READY** | `CustomerStaysScreen.tsx` fetches `getMyBookings`, `getMyPayments`, `getMyVisits`, `getMySupportTickets` with `+1 Extend`, `Cancel`, and `Pay Now`. |
| Duplicate-submission protection | **PARTIAL** | `submitting` state disables button and `activeBooking` prevents re-creating booking on retry, plus `idempotency_key: mob_${booking.id.slice(0,12)}`; however `checkout.tsx` does not lock against double-tap before `setSubmitting(true)` via a `useRef` guard, and `createOrder` on `CustomerStaysScreen` "Pay Now" flow is not yet wired to `checkout`. |

---

## 9. Security Findings Ranked by Severity

- **HIGH — `bookings.createBooking` without `hold_token` / Guest-only `holds` optionalAuth:**
  - `POST /holds` uses `optionalAuth`, allowing unauthenticated callers (rate-limited by `globalRateLimiter`) to temporarily lock inventory units for 15 minutes (`guest_id = NULL`). Note that `POST /bookings` properly requires `authenticate` and verifies `holdRecord.guest_id === guestId` when `guest_id` is set.
- **MEDIUM — Missing `useRef` double-submit lock in mobile `handleConfirmAndPay`:**
  - `checkout.tsx` relies on React state `submitting` (`disabled={submitting}`), which can allow two rapid taps in the same render frame before state updates.
- **MEDIUM — `reconcilePayment` in local `rzp_test_stayzy*` mode:**
  - `fetchRazorpayOrderPayments()` returns `null` when using local fallback keys (`rzp_test_stayzy*`), so real Razorpay reconciliation can only be exercised when real Razorpay Test API keys (`rzp_test_...` from Razorpay Dashboard) are configured.
- **LOW — Webhook deduplication when `event.id` is absent:**
  - `handleWebhook` only inserts into `webhook_events` when `event.id` is present; Razorpay production webhooks include `x-razorpay-event-id` / `event.id`, though `payment.status !== 'captured'` still guards against double-capture.
- **LOW — Client-side `idempotency_key` slice length in `checkout.tsx`:**
  - `idempotency_key: \`mob_${booking.id.slice(0, 12)}\`` is deterministic for initial order creation, while `handleRetryOrder` omits `idempotency_key` so retries generate a new order cleanly (and `payments.service.js` reuses any open `created`/`pending` order).
- **INFORMATIONAL — Server-authoritative pricing & secrets hygiene:**
  - Client-supplied prices, deposits, and GST are **never** trusted by `POST /bookings` or `POST /payments/create-order`; all amounts are recalculated from PostgreSQL `rate_plans` inside a transaction with `FOR UPDATE` row locks.
  - No Razorpay secret keys (`RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`) exist anywhere in `mobile/` or `frontend/` client bundles.

---

## 10. Test-Environment Readiness
- **Backend Environment:** `NODE_ENV=development`, `PORT=5000`, `API_PREFIX=/api/v1`.
- **Database:** Local PostgreSQL (`DB_HOST=localhost`, `DB_PORT=5432`, `DB_NAME=stayzy_dev`) — isolated development database.
- **Razorpay Mode:** Safe local fallback test mode (`rzp_test_stayzykey123` etc. injected by `env.js` because `.env` has no Razorpay keys). Live Razorpay keys **cannot** be used accidentally.
- **Dev Simulator:** Active in `development` (`demoSimulatePayment` only blocks `NODE_ENV === 'production'`).
- **Seeded Test Data:** Seeded `guest`, `host`, and `admin` accounts plus Bengaluru rooms (`Stayzy Haven — Koramangala`) and sample booking (`STY-2026-C8A0EE`) exist in `stayzy_dev`.

---

## 11. Missing Implementations
1. **Native/Test Razorpay Checkout integration** (`react-native-razorpay` or controlled Razorpay Test Checkout flow if native SDK is desired vs dev simulator for Expo).
2. **Dedicated Mobile Booking Confirmation Screen** (matching website `booking-confirmation/[id]/page.tsx` with booking reference, keyless PIN, dates, and receipt summary).
3. **`Pay Now` wiring from `CustomerStaysScreen.tsx`** for existing `UNPAID` bookings (`STY-2026-C8A0EE`).
4. **`useRef` double-tap guard** on `handleConfirmAndPay` and `handleProceedToBook`.

---

## 12. Safe Testing Strategy (Next Phase)
1. **Backend Automated Tests:** Run existing `npm test` in `backend/` (covers auth, holds, payments, reconciliation, webhooks).
2. **Isolated Hold → Booking → Simulator Checkout Test (Dev DB Only):**
   - Use seeded `guest` account in `stayzy_dev` with `NODE_ENV=development`.
   - Verify `POST /holds` → `GET /holds/:token` → `POST /bookings` → `POST /payments/create-order` → `POST /payments/demo-simulate` (`FAILED` → `Retry Order` → `PENDING` → `SUCCESS`).
   - Verify `My Stays` displays the newly confirmed booking and `POST /bookings/:id/cancel` cleans up/cancels the test booking cleanly.
3. **Production Safety Gate:** Confirm `NODE_ENV=production` rejects `demo-simulate` (`403`) and refuses mock `rzp_test_stayzy*` keys at boot.

---

## 13. Recommended Next Milestone
**Phase 5 — Safe Test-Mode Hold, Booking & Payment Flow Verification (Dev DB + Simulator + Confirmation Screen):**
- Add `useRef` double-submit protection on `room/[id].tsx` and `checkout.tsx`.
- Add a dedicated mobile Booking Confirmation view (or modal/screen) matching the website.
- Execute end-to-end test-mode hold → booking → payment failure/retry/success → My Stays verification on `emulator-5554` against `stayzy_dev`, then cleanly cancel the test booking.
