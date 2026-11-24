# Stayzy Full-Stack Local Development Guide

This guide provides complete instructions for setting up, running, testing, and debugging the integrated **Stayzy** full-stack application (Next.js frontend, Express 5 REST API, and PostgreSQL 17 database).

---

## 1. System Prerequisites

Ensure the following tools are installed on your workstation:

- **Node.js**: v20.x or v22.x LTS
- **npm**: v10.x+
- **PostgreSQL**: v16.x or v17.x
- **Git**: v2.40+
- **Operating System**: Windows, macOS, or Linux

---

## 2. Repository and Directory Structure

The project is organized in a monorepo structure under `D:\Stayzy-Backend`:

```
Stayzy-Backend/
├── backend/                   # Express 5 REST API
│   ├── src/
│   │   ├── config/            # Database pool, JWT, Razorpay, env validator
│   │   ├── database/          # SQL migrations (001-010) and seed scripts
│   │   ├── middleware/        # JWT auth, RBAC, error handler, rate limit
│   │   ├── modules/           # Auth, Users, Properties, Bookings, Payments, Reviews, Admin
│   │   └── server.js          # App entrypoint (Port 5000)
│   ├── tests/                 # 267+ unit, integration, and E2E test suites
│   └── package.json
├── frontend/                  # Next.js 16 (App Router) + React 19 + Tailwind v4
│   ├── src/
│   │   ├── app/               # Next.js route handlers & pages
│   │   ├── components/        # Reusable UI component library
│   │   ├── context/           # AuthContext, ToastContext
│   │   └── lib/api/           # Centralized API client & data adapters
│   └── package.json
└── docs/                      # Architectural specs, audit, and API contracts
    ├── INTEGRATION_AUDIT.md
    ├── API_INTEGRATION_CONTRACT.md
    ├── FRONTEND_BACKEND_CHANGELOG.md
    ├── LOCAL_DEVELOPMENT.md
    └── SECURITY_AUDIT.md
```

---

## 3. Environment Configuration

### 3.1 Backend Configuration (`backend/.env`)

Create or verify `backend/.env`:

```env
# Server
NODE_ENV=development
PORT=5000
API_PREFIX=/api/v1
FRONTEND_URL=http://localhost:3000

# Database (PostgreSQL 17)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stayzy_dev
DB_USER=postgres
DB_PASSWORD=postgres
DB_POOL_MIN=2
DB_POOL_MAX=20

# Authentication & JWT
JWT_SECRET=super-secret-development-jwt-key-stayzy-2026-secure!
JWT_EXPIRES_IN=7d
COOKIE_SECRET=cookie-secret-stayzy-key-development-2026

# Payment Gateway (Razorpay Sandbox)
RAZORPAY_KEY_ID=rzp_test_stayzy_dev_key
RAZORPAY_KEY_SECRET=rzp_test_stayzy_dev_secret_12345

# Logging & Monitoring
LOG_LEVEL=debug
```

### 3.2 Frontend Configuration (`frontend/.env.local`)

Create or verify `frontend/.env.local`:

```env
# Backend REST API
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1

# Razorpay Client Key (matches RAZORPAY_KEY_ID)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_stayzy_dev_key

# Node Environment
NODE_ENV=development
```

---

## 4. Database Setup & Migrations

### Step 4.1: Create PostgreSQL Database

Open `psql` or pgAdmin:

```sql
CREATE DATABASE stayzy_dev;
```

### Step 4.2: Run Database Migrations

Navigate to the `backend` directory and run the automated migration tool:

```bash
cd backend
npm run migrate
```

This runs all 10 SQL migration files in sequence:
- `001_create_users_table.sql`
- `002_create_properties_table.sql`
- `003_create_bookings_table.sql`
- `004_create_payments_table.sql`
- `005_create_reviews_table.sql`
- `006_create_amenities_table.sql`
- `007_create_property_amenities_table.sql`
- `008_create_audit_logs_table.sql`
- `009_create_room_types_and_inventory.sql` *(Room types, rate plans, physical inventory, holds)*
- `010_create_visits_and_support.sql` *(Physical visit requests & support tickets)*

Migrations are tracked idempotently in the `schema_migrations` table.

### Step 4.3: Seed Initial Data

Populate the database with verified seed data (host properties, room types, rate plans, inventory units, and test users):

```bash
npm run seed
```

---

## 5. Pre-Configured Test Accounts

The seed script creates the following verified accounts (all passwords are `Password123!`):

| Role | Email | Password | Permissions / Capabilities |
| :--- | :--- | :--- | :--- |
| **Platform Admin** | `admin@stayzy.com` | `Password123!` | System oversight, host verification, analytics, dispute resolution |
| **Property Host** | `host@stayzy.com` | `Password123!` | Property creation, room type management, inventory control, booking management |
| **Verified Resident** | `aarav.sharma@example.com` | `Password123!` | Room search, instant booking, Razorpay checkout, booking history, reviews |

---

## 6. Running the Applications

### Step 6.1: Start the Backend Service

In a terminal:

```bash
cd backend
npm run dev
```

The Express API will boot on `http://localhost:5000`. You can verify health at:
- `GET http://localhost:5000/health` or `GET http://localhost:5000/api/v1/properties`

### Step 6.2: Start the Frontend Application

In a second terminal:

```bash
cd frontend
npm run dev
```

The Next.js application will boot on `http://localhost:3000`. Open your browser to `http://localhost:3000`.

---

## 7. Testing & Quality Assurance

### 7.1 Backend Unit & Module Tests

Run the full native Node test suite (267+ tests):

```bash
cd backend
npm test
```

### 7.2 End-to-End Integration Test Suite

Run the 10-step full-lifecycle integration test (Auth -> Search -> Room Details -> Availability -> Authoritative Booking -> Razorpay Order -> HMAC Payment Verification -> History -> Admin Dashboard):

```bash
cd backend
node --test tests/frontend_backend_integration.test.js
```

### 7.3 Frontend Static Type Check

Ensure TypeScript adheres to strict typing with zero compilation errors:

```bash
cd frontend
npx tsc --noEmit
```

### 7.4 Frontend Production Build

Validate production compilation, bundle splitting, and static route generation:

```bash
cd frontend
npm run build
```

---

## 8. Common Troubleshooting

### PostgreSQL Connection Refused (`ECONNREFUSED 127.0.0.1:5432`)
- Ensure PostgreSQL service is active:
  - Windows: `Get-Service postgresql* | Start-Service`
  - Linux/macOS: `sudo systemctl start postgresql` or `brew services start postgresql@17`
- Confirm port in `backend/.env` matches your PostgreSQL configuration (default is 5432).

### Migration Errors (`relation already exists`)
- The migration runner `migrate.js` wraps migrations inside a transaction and records applied migrations in `schema_migrations`.
- If an interrupted migration occurred, check `schema_migrations`:
  ```sql
  SELECT * FROM schema_migrations ORDER BY id;
  ```

### Cross-Origin / Cookie Issues in Localhost
- The Express backend includes `cors` configured with `credentials: true` and `origin: http://localhost:3000`.
- In local development, cookies are set with `SameSite=Lax` and `Secure=false` so HTTP requests across ports 3000 and 5000 receive the JWT cookie seamlessly.

### Next.js Image Optimization Errors (`Invalid src prop`)
- Ensure external image hostnames (e.g. `images.unsplash.com`) are configured in `frontend/next.config.ts` under `images.remotePatterns`.
