# Stayzy Environment Matrix

Status Legend:
- **Implemented:** Enforced in code or configuration templates.
- **Verified:** Tested via automated checks.
- **Documented:** Operational convention; requires target environment provisioning.
- **Requires external infrastructure:** Depends on hosting, managed DB, or secret manager not yet provisioned.

## 1. Backend (`backend/`)

| Variable | Development | Staging | Production | Status |
|---|---|---|---|---|
| `NODE_ENV` | `development` | `production` | `production` | Implemented & Verified |
| `APP_ENV` | `development` | `staging` | `production` | Implemented & Verified |
| `LOG_FORMAT` | `pretty` | `json` | `json` | Implemented |
| `PORT` | `5000` | Platform-assigned / `5000` | Platform-assigned / `5000` | Implemented |
| `API_PREFIX` | `/api/v1` | `/api/v1` | `/api/v1` | Implemented |
| `DATABASE_URL` | Optional (uses `DB_*`) | Staging PostgreSQL URL (`sslmode=require`) | Production PostgreSQL URL (`sslmode=require`) | Implemented |
| `DB_SSL` | `false` | `true` | `true` | Implemented |
| `DB_NAME` | `stayzy_dev` | `stayzy_staging` | `stayzy_prod` (`stayzy_dev` rejected) | Implemented & Verified |
| `DB_POOL_MAX` | `10`–`20` | Sized to staging DB plan | Sized to production DB plan | Implemented |
| `DB_IDLE_TIMEOUT_MS` | `30000` | `30000` | `30000` | Implemented |
| `DB_CONNECTION_TIMEOUT_MS` | `5000` | `5000` | `5000` | Implemented |
| `JWT_SECRET` | Local 32+ char secret | Unique staging 32+ char secret | Unique production 32+ char secret (placeholders rejected) | Implemented & Verified |
| `JWT_EXPIRES_IN` | `1d` | `1d` | `1d` (or shorter per policy) | Implemented |
| `REFRESH_TOKEN_EXPIRES_IN` | `30d` | `30d` | `30d` | Implemented |
| `CORS_ORIGIN` | `http://localhost:3000,...` | Staging web origin(s) | Explicit HTTPS production origin(s); `*` and `localhost` rejected | Implemented & Verified |
| `RAZORPAY_KEY_ID` | Mock fallback or `rzp_test_*` | Non-mock `rzp_test_*` | `rzp_live_*` (`rzp_test_*` rejected when `APP_ENV=production`) | Implemented & Verified |
| `RAZORPAY_KEY_SECRET` | Mock fallback or test secret | Staging Razorpay test secret | Live Razorpay secret | Implemented & Verified |
| `RAZORPAY_WEBHOOK_SECRET` | Mock fallback or test secret | Staging webhook secret | Live webhook secret | Implemented & Verified |
| `ALLOW_DEV_PAYMENT_SIMULATOR` | `false` (or `true` locally) | `false` (rejected if `true`) | `false` (rejected if `true`) | Implemented & Verified |
| `FIREBASE_WEB_API_KEY` | Optional (falls back to Google `tokeninfo`) | Required for Google/Firebase auth | Required (`503` if unset in `NODE_ENV=production`) | Implemented |

## 2. Website (`frontend/`)

| Variable | Development | Staging | Production | Status |
|---|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Staging HTTPS URL | Production HTTPS URL | Documented |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:5000/api/v1` | Staging API HTTPS URL | Production API HTTPS URL | Documented |
| `API_BASE_URL` | Server-side override (optional) | Staging internal/HTTPS URL | Production internal/HTTPS URL | Implemented |
| `NEXT_PUBLIC_DEMO_MODE` | `"true"` or `"false"` | `"false"` | `"false"` | Documented (note: `deploy.yml` currently sets `"true"`) |
| `AUTH_SECRET` | Local secret | Staging secret | Production secret | Implemented |
| `JWT_SECRET` | Shared with backend if local JWT verify used | Shared or delegated to `/auth/me` | Shared or delegated to `/auth/me` | Implemented |
| `DATABASE_URL` | `file:./dev.db` (local Prisma SQLite) | Managed DB if Prisma routes used | Managed DB if Prisma routes used | Documented |

## 3. Mobile (`mobile/`)

| Variable / Profile | Development (`__DEV__`) | Preview / Staging | Production | Status |
|---|---|---|---|---|
| `EXPO_PUBLIC_API_URL` | Optional (defaults to `10.0.2.2:5000` / `localhost:5000`) | Staging HTTPS API URL | Explicit `https://` API URL required at runtime | Implemented & Verified |
| `EXPO_PUBLIC_DEMO_MODE` | Optional | `"true"` in `eas.json` `preview` | `"false"` / unset | Documented |
| `EXPO_PUBLIC_FIREBASE_*` | Demo project fallback in `firebase.ts` | Dedicated staging Firebase project | Dedicated production Firebase project | Requires external infrastructure |
