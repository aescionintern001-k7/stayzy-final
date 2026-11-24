# Stayzy Full-Stack Integration Audit

**Date**: November 2026  
**Status**: In Progress  
**Authors**: Senior Full-Stack Software Architect & Integration Engineer  

---

## 1. Executive Summary

Stayzy is an end-to-end PG and flexible co-living platform supporting hourly, daily, weekly, monthly, and yearly stays. Prior to this integration effort, the project existed in two disconnected repositories/directories:
1. **Frontend Workspace (`D:\Stayzy\Stayzy\frontend` & `D:\Stayzy-Backend\frontend`)**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, and Prisma 6 with SQLite, containing rich UI components for customers, owners, and administrators.
2. **Backend Workspace (`D:\Stayzy-Backend\backend`)**: Express 5 (ES modules), PostgreSQL 17 (`pg` pool), JWT authentication, Zod validation, bcrypt password hashing, and Razorpay payment integration, verified with 267 passing automated tests.

This audit establishes the baseline analysis of both codebases, identifies schema discrepancies, maps security and authentication requirements, highlights integration risks, and defines the unified architecture with PostgreSQL as the single source of truth.

---

## 2. Codebase & Environment Audit

### 2.1 Workspace Locations
- **Git Repository**: `https://github.com/aescionintern001-k7/stayzy.git`
- **Backend Directory**: `D:\Stayzy-Backend\backend`
- **Frontend Directory**: `D:\Stayzy-Backend\frontend` (synchronized from `D:\Stayzy\Stayzy\frontend`)
- **Active Git Branch**: `feature/integration-frontend-backend` (branched from `origin/develop`)

### 2.2 Technology Stack Comparison

| Dimension | Frontend | Backend | Target Unified State |
| :--- | :--- | :--- | :--- |
| **Runtime** | Node.js 22 LTS | Node.js 22 LTS | Node.js 22 LTS |
| **Framework** | Next.js 16.4.6 | Express 5.3.0 | Next.js 16 (BFF / Proxy) + Express 5 (REST Core) |
| **Language** | TypeScript 5 | JavaScript (ESM) + Zod | TypeScript contracts + JS/TS services |
| **Database** | SQLite via Prisma 6 | PostgreSQL 17 via `pg` | PostgreSQL 17 (Single Source of Truth) |
| **Auth** | Custom HMAC / Cookie session | JWT (Bearer header / Cookie) | JWT Bearer + HttpOnly session cookie |
| **Roles** | `CUSTOMER`, `OWNER`, `ADMIN` | `guest`, `host`, `admin` | Bi-directional role mapping adapter |
| **Payments** | Demo Adapter / client Razorpay | Razorpay SDK + HMAC Webhooks | Authoritative backend Razorpay integration |

---

## 3. Data Model & Architecture Divergence

### 3.1 Frontend SQLite Schema (Prisma)
The frontend schema contains high-granularity accommodation models:
- `User`: Email, name, phone, role (`CUSTOMER`, `ADMIN`), passwordHash.
- `Property`: Basic property details, city, state, contact, coverImage, images JSON.
- `RoomType`: Categorized room entities (`PRIVATE`, `TWIN_SHARING`, `TRIPLE_SHARING`), size, capacity, AC, bathroom, food.
- `Room`: Physical room instances with room number, floor, status (`ACTIVE`, `MAINTENANCE`).
- `InventoryUnit`: Individual bookable units or beds (`Room 101` or `Bed A`), status (`AVAILABLE`, `MAINTENANCE`, `BLOCKED`).
- `RatePlan`: Multi-duration pricing plans (`HOURLY`, `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`), prices, allowed hours, deposits, food charges.
- `Booking`: References user, property, roomType, inventoryUnit, durationType, count, basePrice, foodCharges, taxes, deposit, status.
- `Payment`: Amount, status, provider, transactionRef, isDemo.
- `AvailabilityBlock`: Maintenance/cleaning window locks.
- `InventoryHold`: Temporary 15-minute checkout reservation hold.
- `VisitRequest`: Physical property visit scheduling.
- `SupportTicket`: User support queries with admin replies.

### 3.2 Backend PostgreSQL Schema
The backend schema implemented solid fundamentals:
- `users`: UUID primary key, `full_name`, `email`, `password_hash`, `role` (`guest`, `host`, `admin`), `account_status`, `phone`, `profile_image_url`.
- `properties`: `id`, `host_id`, `title`, `description`, `property_type`, `room_type`, `price_per_night`, `currency`, `address`, `city`, `amenities` (JSONB), `images` (JSONB), `status`, `average_rating`, `reviews_count`.
- `bookings`: `id`, `property_id`, `guest_id`, `check_in_date`, `check_out_date`, `total_nights`, `price_per_night`, `total_price`, `status`, `payment_status`.
- `payments`: `id`, `booking_id`, `user_id`, `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`, `amount`, `status`, `refund_status`.
- `reviews`: `id`, `booking_id`, `property_id`, `guest_id`, `rating`, `title`, `comment`.

### 3.3 Critical Model Differences & Harmonization Needs
1. **Room Types & Inventory Hierarchy**:
   - The backend previously treated `properties` as monolithic nightly accommodation.
   - The frontend requires multi-unit accommodation (Property -> RoomTypes -> Rooms/Beds -> RatePlans).
   - **Resolution**: Expand PostgreSQL schema with migration `009_create_room_types_and_inventory.sql` adding `room_types`, `rooms`, `inventory_units`, and `rate_plans`. Also keep fallback compatibility with properties table so legacy property queries remain valid and test suites pass 100%.
2. **Pricing Duration Models**:
   - Backend only supported nightly pricing (`price_per_night`).
   - Frontend supports HOURLY, DAILY, WEEKLY, MONTHLY, YEARLY.
   - **Resolution**: Backend rate plans table will store exact prices per duration, deposit requirements, and monthly food charges.
3. **Visits and Support Tickets**:
   - Existed only in frontend SQLite.
   - **Resolution**: Add PostgreSQL migrations `010_create_visits_and_support.sql` to manage visit requests and support tickets authoritatively.

---

## 4. API Endpoints Matrix

### 4.1 Backend Endpoints (`/api/v1`)
- **Auth**: `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/refresh`
- **Users**: `GET /users/profile`, `PUT /users/profile`, `PUT /users/change-password`, `GET /users`, `GET /users/:id`, `PATCH /users/:id/status`
- **Properties**: `GET /properties`, `GET /properties/:id`, `POST /properties`, `PUT /properties/:id`, `DELETE /properties/:id`, `GET /properties/host/my-properties`
- **Search**: `GET /properties/search` (supports city, property_type, min_price, max_price, amenities, page, limit)
- **Bookings**: `POST /bookings`, `GET /bookings/:id`, `GET /bookings/guest/my-bookings`, `GET /bookings/host/property-bookings`, `PATCH /bookings/:id/cancel`
- **Payments**: `POST /payments/orders`, `POST /payments/verify`, `POST /payments/webhook`, `POST /payments/refunds`
- **Reviews**: `POST /reviews`, `GET /reviews/property/:propertyId`, `GET /reviews/my-reviews`, `DELETE /reviews/:id`
- **Admin**: `GET /admin/dashboard`, `GET /admin/properties`, `PATCH /admin/properties/:id/status`, `GET /admin/bookings`, `GET /admin/payments`, `GET /admin/reports/revenue`, `GET /admin/reviews`

### 4.2 Frontend Next.js API Routes (`/api/*`)
- `/api/auth/login`, `/api/auth/register`, `/api/auth/me`, `/api/auth/profile`, `/api/auth/logout`
- `/api/rooms`, `/api/rooms/[slug]`
- `/api/bookings/my`, `/api/bookings/[id]/cancel`
- `/api/payments/create-order`, `/api/payments/verify`, `/api/payments/fail`, `/api/payments/my`
- `/api/admin/stats`, `/api/admin/bookings`, `/api/admin/properties`, `/api/admin/payments`
- `/api/visits/schedule`, `/api/visits/my`
- `/api/support/my`

---

## 5. Security & Authentication Audit

1. **Role Discrepancy**:
   - Backend: `guest`, `host`, `admin`
   - Frontend: `CUSTOMER`, `OWNER`, `ADMIN`
   - **Action**: Bi-directional mapping utility ensures seamless role translation.
2. **Session Persistence**:
   - Frontend previously relied on an insecure HMAC cookie `stayzy_session_token` with demo user fallback.
   - Backend issues secure JWT signed with `JWT_SECRET`.
   - **Action**: Next.js auth proxy stores the real backend JWT in an `HttpOnly`, `SameSite=Lax` cookie `stayzy_jwt_token`, verifying every request with the backend `/api/v1/auth/me`.
3. **Password Security**:
   - Frontend had sha256 fallback and hardcoded "password123".
   - Backend enforces bcrypt hashing with 10 salt rounds and Zod password complexity rules.
   - **Action**: Remove insecure fallback in production flows. All authentications route to backend bcrypt verification.

---

## 6. Integration Risks & Mitigations

| Risk | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Breaking Existing Backend Tests** | High | PostgreSQL migrations must strictly ADD tables/columns without altering or dropping existing columns referenced in test suites. |
| **N+1 Database Queries** | Medium | Utilize PostgreSQL joins or batch queries for room types and inventory units. |
| **Double Booking Race Condition** | High | Leverage PostgreSQL transactions (`SERIALIZABLE` or row-level `SELECT ... FOR UPDATE`) during inventory unit reservation. |
| **Frontend/Backend Type Drift** | High | Maintain shared TypeScript types in `src/lib/api/types.ts` mirroring backend schemas. |
| **Prisma vs PostgreSQL Discrepancy** | High | Migrate critical flows (Auth, Properties, Rooms, Bookings, Payments, Reviews) completely to Express API + PostgreSQL. Retain Prisma client only as legacy fallback where non-critical. |

---

## 7. Target Architecture Diagram

```
[ Browser / Client UI ]
        │
        │ HTTP / Cookies / Fetch
        ▼
[ Next.js 16 Frontend (Port 3000) ]
        │
        ├── Client Components / Pages / State
        └── Server Route Handlers (BFF Proxy: /api/*)
                │
                │ REST API with JWT Bearer Header
                ▼
[ Express 5 REST API (Port 5000) ]
        │
        ├── Middlewares (Auth, Authorize, RateLimiter, Helmet, CORS, Zod Validator)
        ├── Domain Controllers (Auth, Users, Properties, Rooms, Bookings, Payments, Reviews, Admin)
        └── Domain Services & Pool Queries
                │
                │ pg Pool
                ▼
[ PostgreSQL 17 Database (stayzy_dev) ]
        ├── users
        ├── properties
        ├── room_types
        ├── rooms
        ├── inventory_units
        ├── rate_plans
        ├── bookings
        ├── payments
        ├── reviews
        ├── visit_requests
        └── support_tickets
```

---

## 8. Audit Conclusion & Next Steps

The audit confirms:
1. Backend test suite of 267 tests is completely green.
2. Frontend UI is visually rich and complete across customer, host, and admin pages.
3. The next immediate step is to document the complete API Integration Contract (`docs/API_INTEGRATION_CONTRACT.md`), apply PostgreSQL database migration `009` and `010` to support multi-duration room types, inventory, and visits, and wire the Next.js API client proxy layer.
