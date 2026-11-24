# Stayzy Frontend-Backend Integration Changelog

All notable changes made during the full-stack integration of Stayzy are documented in this file.

---

## [1.0.0] - 2026-11-24

### Architecture & Single Source of Truth
- **Unified Monorepo Architecture**: Integrated Next.js frontend (`D:\Stayzy-Backend\frontend`) and Express 5 REST API (`D:\Stayzy-Backend\backend`) under a shared repository structure.
- **PostgreSQL 17 Authoritative Source of Truth**: Deprecated disjoint frontend SQLite/Prisma mock data storage for core domain entities. All users, properties, room types, rate plans, physical rooms, inventory units, bookings, payments, and reviews are now strictly stored and validated in PostgreSQL.

---

### Database Migrations
- **Added `009_create_room_types_and_inventory.sql`**:
  - `room_types`: Supports multiple room categories per property (e.g. Deluxe Suite, Executive Studio) with capacity, size, bed configuration, base pricing, and amenities.
  - `rate_plans`: Supports multi-duration pricing tiers (`HOURLY`, `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`) with discounts and cancellation policies.
  - `rooms`: Models physical room units (e.g., Room 101, Room 202) with status (`available`, `occupied`, `maintenance`).
  - `inventory_units`: Date-based inventory tracking per room type with allocated, booked, and available counts.
  - `inventory_holds`: Temporary inventory locking (15-minute expiration) during checkout to prevent double-booking.
  - Added `room_type_id`, `guest_count`, and `payment_status` columns to `bookings`.
- **Added `010_create_visits_and_support.sql`**:
  - `visit_requests`: In-person property visit scheduling and status tracking.
  - `support_tickets`: Platform-wide customer support and incident management.
- **Automated Migration Tooling (`backend/src/database/migrate.js`)**:
  - Added robust transactional migration runner tracking applied migrations in `schema_migrations`.
- **Authoritative Seed Script (`backend/src/database/seed_stayzy_data.js`)**:
  - Populates realistic properties in Bengaluru, Gurugram, and Hyderabad with room types, multi-tier rate plans, physical rooms, and pre-configured test users (`admin@stayzy.com`, `host@stayzy.com`, `aarav.sharma@example.com`).

---

### Backend Enhancements
- **Properties Service (`backend/src/modules/properties/properties.service.js`)**:
  - `getPropertyById` now fetches and aggregates associated `room_types` and their active `rate_plans`.
- **Bookings Service (`backend/src/modules/bookings/bookings.service.js`)**:
  - Added `payment_status` to default `BOOKING_COLUMNS` and row formatters.
- **Test Infrastructure (`backend/tests/frontend_backend_integration.test.js`)**:
  - Added comprehensive 10-step full lifecycle integration test covering:
    1. Resident authentication
    2. Profile retrieval (`GET /auth/me`)
    3. Property search by city (`GET /properties/search`)
    4. Property details with attached room types and rate plans
    5. Inventory availability check
    6. Authoritative booking creation in PostgreSQL
    7. Razorpay order generation
    8. HMAC-SHA256 signature verification & payment capture
    9. Resident booking history verification
    10. Platform admin dashboard inspection

---

### Frontend Improvements & Adaptations
- **Consolidated Component Architecture**:
  - Resolved nested subfolder duplication (`frontend/frontend/src`) by unifying components into `src/components`.
  - Replaced bulky external dependencies (`gsap`, `framer-motion`) in `AccordionGallery.tsx` and `animated-underline-text-one.tsx` with high-performance CSS and React state transitions.
- **Centralized API Client (`frontend/src/lib/api/config.ts`)**:
  - Configured standardized REST API base URL (`http://localhost:5000/api/v1`) and Bearer/JSON headers.
- **API Adapters (`frontend/src/lib/api/adapters.ts`)**:
  - Added bidirectional data adapters transforming backend PostgreSQL models into frontend UI view models with fallback multi-duration rate plans.
- **Route Handlers Updated**:
  - `src/app/api/cities/route.ts`: Updated to read from static `A_TO_Z_CITIES` list without invalid Prisma references.
  - `src/app/api/rooms/route.ts`: Refactored to forward queries directly to the Express backend `/properties/search` endpoint.
- **TypeScript Strict Compliance**:
  - Configured `tsconfig.json` to include `src/**/*.ts` and `src/**/*.tsx`.
  - Resolved all missing component and type imports; `tsc --noEmit` compiles with 0 errors.

---

### Documentation Deliverables
- `docs/INTEGRATION_AUDIT.md`: Complete audit of architecture, tech stacks, divergent schemas, and risk mitigation strategies.
- `docs/API_INTEGRATION_CONTRACT.md`: Complete REST contract specification across Auth, Properties, Bookings, Payments, Reviews, and Admin modules.
- `docs/LOCAL_DEVELOPMENT.md`: End-to-end setup, environment configuration, database migration, seeding, and execution guide.
- `docs/SECURITY_AUDIT.md`: Detailed security assessment covering bcrypt, JWT cookies, RBAC, HMAC payment verification, and SQL injection prevention.
- `docs/FRONTEND_BACKEND_CHANGELOG.md`: Detailed tracking of integration milestones.
