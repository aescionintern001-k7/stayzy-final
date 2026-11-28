# Stayzy Mobile Production Readiness Audit

> **Status:** Pre-Deployment Audit (Phase 1)  
> **Project Root:** `D:\Stayzy-Final`  
> **Target Mobile App:** `com.stayzy.app` (`1.0.1`)  
> **Audit Scope:** Backend (`backend/`), Database (`PostgreSQL`), Mobile API (`mobile/src/services/api.ts`), and Android Release Signing (`mobile/android/`).  
> **Note:** No backend code was modified during this audit.

---

## 1. Current Backend Architecture

- **Framework & Entry Point:** Express `^5.3.0` (ES Modules `"type": "module"`) in `backend/src/server.js` importing `backend/src/app.js`.
- **Node.js Runtime:** Tested and running on Node `v22.23.5` (note: `backend/package.json` currently does not declare an `"engines"` field).
- **Package Scripts (`backend/package.json`):**
  - `start`: `node src/server.js`
  - `dev`: `nodemon src/server.js`
  - `migrate`: `node src/database/migrate.js`
  - `seed`: `node src/database/seed_stayzy_data.js`
  - `test`: `node --test`
- **API Prefix & Modules (`backend/src/app.js`):**
  - Default prefix `API_PREFIX=/api/v1`
  - Modules: `/auth`, `/users`, `/properties`, `/rooms`, `/holds`, `/bookings`, `/payments`, `/visits`, `/support`, `/cities`, `/content`, `/reviews`, `/admin`, plus Swagger UI at `/api/docs` and `/api/docs/spec.json`.
- **Health & Readiness Endpoints (`backend/src/routes/health.routes.js`):**
  - `GET /health` — liveness check (no DB dependency, exempt from rate limiting).
  - `GET /ready` — readiness check (checks shutdown state + PostgreSQL connectivity + pool stats).
  - `GET /health/db` — database health check.
- **Authentication & Authorization:**
  - JWT (`jsonwebtoken ^9.0.3`, `JWT_SECRET` >= 32 chars, `JWT_EXPIRES_IN=1d`, `REFRESH_TOKEN_EXPIRES_IN=30d`), `bcrypt ^6.0.0`, `cookie-parser`, plus optional `FIREBASE_WEB_API_KEY` for Google/Firebase token verification.
- **CORS (`backend/src/config/cors.js`):**
  - Explicit origin allowlist from `CORS_ORIGIN` (comma-separated). Requests with no `Origin` header (such as native mobile apps) are permitted; browser origins outside the allowlist receive `403`.
  - In `NODE_ENV=production` (`APP_ENV=production`), `env.js` rejects `*`, empty `CORS_ORIGIN`, and `localhost`/`127.0.0.1`.
- **Rate Limiting & Security (`backend/src/config/security.js`, `app.js`):**
  - `app.set("trust proxy", 1)` for reverse proxies.
  - `helmet` security headers (CSP enabled in production).
  - `express-rate-limit` (`globalRateLimiter`: 120 req/15m prod; `searchRateLimiter`: 180 req/15m prod; `bookingMutationLimiter`: 30 req/15m prod; `authRateLimiter`: 10 req/15m prod).
  - 25s HTTP response timeout guard, 1MB JSON/urlencoded body limit, async gzip compression for JSON >= 1024 bytes.
- **Payments:** Razorpay (`razorpay ^2.9.8`). In `NODE_ENV=production` + `APP_ENV=production`, `env.js` strictly requires non-placeholder, non-test `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET`, and rejects `ALLOW_DEV_PAYMENT_SIMULATOR=true`. (`APP_ENV=staging` allows `rzp_test_*` keys with `NODE_ENV=production`.)
- **File Uploads / Email / OTP / Background Jobs / WebSockets:**
  - No `multer`/disk file upload middleware in `backend/src`.
  - No `nodemailer` or SMTP service in `backend/package.json`.
  - No cron/background worker daemon or WebSocket (`ws` / `socket.io`) server; completely stateless HTTP REST API suitable for standard container/PaaS hosting.
- **Hardcoded Localhost References:**
  - `backend/src/config/env.js` defaults `CORS_ORIGIN` to `http://localhost:3000` and `DB_HOST` to `localhost` only when unset in non-production; production validation blocks `localhost` in `CORS_ORIGIN` and blocks `DB_NAME=stayzy_dev`.
  - `backend/src/config/security.js:48` uses `"127.0.0.1"` only as an IP fallback if `req.ip` is undefined.
  - No deployment-blocking hardcoded `localhost` calls in runtime business logic.

---

## 2. Database Requirements & Migration Safety

- **Engine:** PostgreSQL (`pg ^8.23.1`).
- **Connection Pooling (`backend/src/database/pool.js`):**
  - Supports `DATABASE_URL` or individual `DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USER`/`DB_PASSWORD`.
  - Pool settings: `max: DB_POOL_MAX` (default 10), `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 5000`, `statement_timeout: 15000`.
  - SSL: Enabled when `DB_SSL=true` or `DATABASE_URL` contains `sslmode=require` (uses `{ rejectUnauthorized: false }`).
- **Migrations (`backend/src/database/migrate.js`):**
  - 13 SQL migrations (`001_create_users.sql` through `013_booking_idempotency.sql`) in `backend/src/database/migrations/`.
  - Uses PostgreSQL session advisory lock (`739182`), `schema_migrations` tracking table, and per-file `BEGIN` / `COMMIT` / `ROLLBACK` transactions.
- **Production Safety:** `NODE_ENV=production` + `APP_ENV=production` rejects `DB_NAME=stayzy_dev`. Do **not** run `npm run seed` against production.

---

## 3. Required Environment Variables (Backend Production / Staging)

| Variable | Requirement |
|---|---|
| `NODE_ENV` | `production` |
| `APP_ENV` | `staging` (for Razorpay test keys) or `production` (for live Razorpay keys) |
| `LOG_FORMAT` | `json` |
| `PORT` | Platform-assigned (e.g., `5000` or `10000`) |
| `API_PREFIX` | `/api/v1` |
| `DATABASE_URL` | Managed PostgreSQL connection string with `?sslmode=require` |
| `DB_SSL` | `true` |
| `DB_POOL_MAX` | Sized to DB plan (e.g. `10`–`20`) |
| `JWT_SECRET` | Cryptographically random, >= 32 characters (no placeholders) |
| `JWT_EXPIRES_IN` | `1d` |
| `REFRESH_TOKEN_EXPIRES_IN` | `30d` |
| `CORS_ORIGIN` | Explicit HTTPS origin(s), e.g. `https://app.stayzy.example` (no `*`, no `localhost`) |
| `ALLOW_DEV_PAYMENT_SIMULATOR` | `false` |
| `RAZORPAY_KEY_ID` | `rzp_live_*` (`production`) or non-mock `rzp_test_*` (`staging`) |
| `RAZORPAY_KEY_SECRET` | Valid Razorpay secret |
| `RAZORPAY_WEBHOOK_SECRET` | Valid Razorpay webhook secret |
| `FIREBASE_WEB_API_KEY` | Required if Google/Firebase sign-in is enabled |

---

## 4. Mobile & Android Signing Readiness

- **Mobile API Configuration (`mobile/src/services/api.ts`):**
  - Already production-safe: in release builds (`__DEV__ === false`), `normalizeApiBaseUrl` requires an explicit `https://` `EXPO_PUBLIC_API_URL` and refuses `localhost`, `127.0.0.1`, `10.0.2.2`, and plain `http://`.
  - Currently no permanent HTTPS backend is deployed, so `EXPO_PUBLIC_API_URL` is unset in release builds (API calls fail gracefully without crashing startup).
- **Android Release Signing (`mobile/android/app/build.gradle`):**
  - `mobile/android/app/stayzy-release.keystore` does **not** exist yet.
  - `build.gradle` currently falls back to `debug.keystore` if `stayzy-release.keystore` and `STAYZY_KEYSTORE` are absent. A permanent release keystore must be generated and backed up securely before building the final production APK.

---

## 5. Security Risks & Deployment Blockers

### Security Risks
1. **Unpinned DB TLS Certificate:** `pool.js` sets `ssl: { rejectUnauthorized: false }` when `DB_SSL=true`; acceptable for initial managed PaaS setup, but pinning the provider CA cert is recommended long-term.
2. **Release Signing Fallback:** `build.gradle` falls back to `debug.keystore` if no release keystore is configured; must be replaced with a permanent release keystore for production APK distribution.
3. **In-Memory Rate Limiting:** `express-rate-limit` uses in-memory store (sufficient for a single instance; requires Redis if horizontally scaled).

### Deployment Blockers (Requires User Approval / Credentials)
1. **No Hosted Backend or Managed PostgreSQL Provisioned:** No `Dockerfile`, `render.yaml`, `fly.toml`, or cloud credentials exist in the repository. Hosting provider, plan/cost, and account credentials are required before deployment.
2. **Razorpay & Firebase Production Secrets:** `backend/src/config/env.js` blocks production startup without valid `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` (note: `APP_ENV=staging` allows `rzp_test_*` keys if live KYC is not ready).
3. **Permanent Android Release Keystore:** Needs destination/backup strategy confirmation before generation.

---

## 6. Estimated Hosting Requirements & Recommended Architecture

- **Workload Profile:** Lightweight stateless Node.js 22+ Express REST API (~150–300 MB RAM idle, low CPU) + PostgreSQL 15/16 (< 1 GB initial storage).
- **Recommended Architecture:**
  - **Option A (Recommended for simplicity & lowest initial cost):** **Render** (Web Service + Managed PostgreSQL) or **Railway** (Node service + Managed Postgres), or **Render Web Service + Neon PostgreSQL** (Neon has a generous free tier with persistent storage & branching, while Render Starter Web Service is \$7/month for always-on with zero cold starts, or Render Free Web Service at \$0/month with 15-minute idle sleep).
  - **Why stateless PaaS fits:** No local disk uploads, no WebSockets, no background worker processes; `GET /health` and `GET /ready` are already built for platform health checks, and `SIGTERM` graceful shutdown is already implemented.
- **Deployable Without Backend Code Modifications?**
  - **Yes** — provided Node.js 22+ is used and required environment variables (`NODE_ENV=production`, `APP_ENV`, `DATABASE_URL`, `DB_SSL=true`, `JWT_SECRET`, `CORS_ORIGIN`, `RAZORPAY_*`) are configured. (Optionally adding `"engines": { "node": ">=20" }` to `backend/package.json` is helpful but not strictly required if the host selects Node 22.)
