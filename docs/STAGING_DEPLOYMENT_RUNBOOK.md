# Stayzy Staging Deployment Runbook

> **Pre-condition:** Staging infrastructure (managed PostgreSQL, backend Node.js 22+ host, web host, and secret store) must be provisioned before executing these steps.

## 1. Pre-Deployment Checklist
1. Confirm CI checks pass on the target commit (`backend-ci` and `frontend-ci` in `.github/workflows/ci.yml`, plus `mobile` TypeScript check).
2. Confirm staging environment variables are populated in the host secret manager per `docs/ENVIRONMENT_MATRIX.md`:
   - `NODE_ENV=production`
   - `APP_ENV=staging`
   - `LOG_FORMAT=json`
   - `DATABASE_URL` pointing to **staging** PostgreSQL (`sslmode=require`)
   - `JWT_SECRET` unique to staging (32+ random characters, no placeholder strings)
   - `CORS_ORIGIN` set to the staging website origin(s)
   - `RAZORPAY_KEY_ID` (`rzp_test_*` non-mock staging key), `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
   - `ALLOW_DEV_PAYMENT_SIMULATOR=false`
   - `FIREBASE_WEB_API_KEY` (if Google Sign-In is enabled)

## 2. Safe Staging Migration Procedure
1. **Backup staging database** using the provider snapshot or `pg_dump` (see `docs/DATABASE_BACKUP_RESTORE_RUNBOOK.md`).
2. **Verify backup** artifact exists, is non-empty, and matches expected schema/row counts.
3. **Apply migrations** against staging only:
   ```bash
   cd backend
   npm run migrate
   ```
   (`migrate.js` acquires advisory lock `739182` and runs pending `.sql` files transactionally.)
4. **Verify schema** by inspecting `schema_migrations` for all expected migration filenames (`001` through `013+`).
5. **Deploy application build** (backend `npm start` and website `npm run build` / `npm start` with `NEXT_PUBLIC_DEMO_MODE="false"` and `NEXT_PUBLIC_API_BASE_URL` pointing to staging API).
6. **Run smoke tests** against staging:
   - `GET /health` -> `200`
   - `GET /ready` -> `200` with `pool` stats
   - Auth login/me check with test user
   - Public rooms/properties search
   - Idempotent booking create + test Razorpay order flow
7. **Verify rollback readiness** per `docs/DEPLOYMENT_ROLLBACK_RUNBOOK.md`.
