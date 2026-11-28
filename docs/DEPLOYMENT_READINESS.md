# Stayzy Deployment Readiness Assessment

> **Important:** This document records pre-deployment readiness as of Phase 5.6. It does **not** certify Stayzy as live-production ready because external hosting, managed PostgreSQL, secret management, and live payment/Firebase accounts are not yet provisioned.

## Readiness Summary by Component

### 1. Backend (`backend/`)
- **Startup Config Validation (`Implemented & Verified`):** `src/config/env.js` validates `NODE_ENV`, `APP_ENV`, `JWT_SECRET`, `CORS_ORIGIN`, `DATABASE_URL`/`DB_*`, `ALLOW_DEV_PAYMENT_SIMULATOR`, and `RAZORPAY_*` at startup using Zod and fails fast without printing secret values.
- **CORS (`Implemented & Verified`):** `src/config/cors.js` enforces explicit origin allowlisting and permits `Content-Type`, `Authorization`, `Idempotency-Key`, and `X-Request-Id`.
- **Database Pool & Migrations (`Implemented`):** `src/database/pool.js` sets `max`, `idleTimeoutMillis`, `connectionTimeoutMillis`, `statement_timeout: 15000`, and SSL when `DB_SSL=true` or `sslmode=require`. `src/database/migrate.js` acquires PostgreSQL advisory lock `739182` and executes each `.sql` migration inside a transaction.
- **Observability & Shutdown (`Implemented & Verified`):** `GET /health`, `GET /health/db`, `GET /ready`, `GET /api/v1/admin/metrics`, `X-Request-Id` correlation, sensitive log redaction, and `SIGTERM`/`SIGINT` graceful shutdown are active.
- **Remaining Gap (`Not yet implemented`):** `pool.js` uses `{ rejectUnauthorized: false }` for SSL; pin a managed DB CA certificate when target Postgres provider is selected.

### 2. Website (`frontend/`)
- **Build Configuration (`Implemented`):** `next.config.ts` uses `output: "standalone"`.
- **Known Gap (`Warning`):** `next.config.ts` sets `typescript: { ignoreBuildErrors: true }`. CI runs `npx tsc --noEmit` separately, so TypeScript regressions must still be gated in CI before any deploy.
- **CI Workflow Gap (`Warning`):** `.github/workflows/deploy.yml` builds a static export with `NEXT_PUBLIC_DEMO_MODE="true"` for Firebase Hosting. Do not use `deploy.yml` for real production until updated to target the live backend API with `NEXT_PUBLIC_DEMO_MODE="false"`.

### 3. Mobile (`mobile/`)
- **API Protocol Enforcement (`Implemented & Verified`):** `mobile/src/services/api.ts` rejects missing or non-HTTPS `EXPO_PUBLIC_API_URL` when `__DEV__` is `false`.
- **Build & CI Gap (`Not yet implemented`):** `mobile/package.json` lacks a `typecheck` script and `.github/workflows/ci.yml` does not run mobile TypeScript validation.

### 4. External Infrastructure Required Before Go-Live
- Managed PostgreSQL instances for staging and production with automated daily backups and point-in-time recovery.
- Backend compute host supporting Node.js 22+, HTTPS termination, `SIGTERM` graceful shutdown, and secret injection.
- Live Razorpay merchant KYC, live keys, and verified webhook endpoint.
- Production Firebase project (if Google Sign-In / client Firebase services are enabled) and `FIREBASE_WEB_API_KEY` on backend.
- External error tracking (e.g., Sentry) and log/metrics aggregation.
