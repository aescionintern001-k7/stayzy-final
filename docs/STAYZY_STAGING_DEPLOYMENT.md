# Stayzy Staging Deployment & Android Release Signing Guide

> **Target Architecture:** Render Free (Node.js 22 Express API) + Neon PostgreSQL (Free Tier) + Razorpay Test Mode (`APP_ENV=staging`) + Permanent Android Release Signing (`com.stayzy.app`).  
> **Safety Note:** Never commit `.env`, `*.keystore` (except `debug.keystore`), or `keystore.properties` to Git. Never connect staging or production to `stayzy_dev`.

---

## 1. Neon PostgreSQL Staging Setup

1. Create a Neon project (PostgreSQL 15 or 16) in your chosen region (e.g., Singapore / Mumbai / closest to Render region).
2. Recommended database name: **`stayzy_staging`** (do **not** name it `stayzy_dev`, as `backend/src/config/env.js` rejects `stayzy_dev` when `NODE_ENV=production` and `APP_ENV=production`).
3. Copy the **pooled** or **direct** Neon connection string (`DATABASE_URL`) ensuring `?sslmode=require` is included:
   - Example format (placeholder): `postgresql://<user>:<password>@<neon-host>/stayzy_staging?sslmode=require`
4. **SSL & Connection Pooling (`backend/src/database/pool.js`):**
   - `DB_SSL=true` (and `sslmode=require` in `DATABASE_URL`) enables TLS automatically.
   - `DB_POOL_MAX=10`, `DB_IDLE_TIMEOUT_MS=30000`, `DB_CONNECTION_TIMEOUT_MS=5000`, `statement_timeout: 15000`.

### Safe Migration Procedure (Against Neon Staging Only)

1. Confirm `DATABASE_URL` points to your Neon `stayzy_staging` host (never `localhost` or `stayzy_dev`).
2. Inspect `backend/src/database/migrations/` (`001` through `013`) before running.
3. Run migrations from `D:\Stayzy-Final\backend` with `DATABASE_URL` scoped to the command (never saved in `.env` tracked by Git):
   ```powershell
   $env:DATABASE_URL = "postgresql://<user>:<password>@<neon-host>/stayzy_staging?sslmode=require"
   $env:DB_SSL = "true"
   npm run migrate
   Remove-Item Env:DATABASE_URL
   ```
4. Verify `schema_migrations` contains all 13 applied `.sql` files. Do **not** run `npm run seed` against staging/production unless you intentionally want sample catalog data.

---

## 2. Render Free Web Service Setup

A Render Blueprint is prepared at [`render.yaml`](../render.yaml):

- **Service Name:** `stayzy-staging-api`
- **Plan:** `free` (sleeps after 15 minutes of inactivity; ~30–50s cold start on first request)
- **Root Directory:** `backend`
- **Runtime:** Node (`NODE_VERSION=22`)
- **Build Command:** `npm ci`
- **Start Command:** `npm start` (`node src/server.js`)
- **Health Check Path:** `/health` (returns `200 OK` without DB dependency; `/ready` checks PostgreSQL connectivity)
- **Port:** Render automatically injects `PORT` and `app.listen(env.PORT)` binds to it.

### Required Environment Variables in Render Dashboard

| Variable | Value / Format | Notes |
|---|---|---|
| `NODE_VERSION` | `22` | Matches tested Node 22 runtime |
| `NODE_ENV` | `production` | Enables production security headers & strict validation |
| `APP_ENV` | `staging` | Permits Razorpay test keys (`rzp_test_*`) |
| `LOG_FORMAT` | `json` | Structured JSON logs |
| `API_PREFIX` | `/api/v1` | REST API base prefix |
| `DATABASE_URL` | Neon PostgreSQL URL (`?sslmode=require`) | Secret |
| `DB_SSL` | `true` | Required for Neon TLS |
| `DB_POOL_MAX` | `10` | Safe for Render Free + Neon |
| `JWT_SECRET` | Random >= 32-char secret | Secret; no placeholders |
| `JWT_EXPIRES_IN` | `1d` | Access token TTL |
| `REFRESH_TOKEN_EXPIRES_IN` | `30d` | Refresh token TTL |
| `CORS_ORIGIN` | Explicit HTTPS web origin(s), e.g. `https://stayzy-staging.web.app` | Must not be `*` or `localhost` |
| `ALLOW_DEV_PAYMENT_SIMULATOR` | `false` | Rejected if `true` in `NODE_ENV=production` |
| `RAZORPAY_KEY_ID` | Non-placeholder `rzp_test_*` | Must **not** start with `rzp_test_stayzy` |
| `RAZORPAY_KEY_SECRET` | Razorpay Test Secret | Secret |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay Test Webhook Secret | Secret |
| `FIREBASE_WEB_API_KEY` | Firebase Web API Key | Required for Google/Firebase auth |

### Health Verification After Deploy

1. `GET https://<your-render-service>.onrender.com/health` -> `200 OK` (`status: "UP"`)
2. `GET https://<your-render-service>.onrender.com/ready` -> `200 OK` (`status: "READY"`, pool stats)
3. `GET https://<your-render-service>.onrender.com/health/db` -> `200 OK` (`status: "UP"`)
4. `GET https://<your-render-service>.onrender.com/api/v1/cities` -> `200 OK`

---

## 3. Permanent Android Release Signing (`com.stayzy.app`)

- **Keystore Location (gitignored):** `mobile/android/app/stayzy-release.keystore`
- **Signing Properties (gitignored):** `mobile/android/keystore.properties`
- **Backup Location (outside Git):** `D:\Stayzy-SafeBackup\Android_Release_Keystore\` (`stayzy-release.keystore` + `keystore.properties`)
- **Key Alias:** `stayzy` (PKCS12, RSA 2048-bit, validity 10,000 days)
- **Public Certificate SHA-256 Fingerprint:**
  `70:0E:47:AF:77:C9:82:39:07:B2:F8:D7:6D:B9:CB:2A:5C:0F:CD:D9:29:0F:4B:40:BC:FD:10:BC:54:F3:72:0A`

### How `build.gradle` Uses the Keystore

[`mobile/android/app/build.gradle`](../mobile/android/app/build.gradle) reads `mobile/android/keystore.properties` for `signingConfigs.release` when present (or `STAYZY_KEYSTORE` / `STAYZY_STORE_PASSWORD` / `STAYZY_KEY_ALIAS` / `STAYZY_KEY_PASSWORD` environment variables in CI).

### Backup Guidance & Future APK Updates

- Keep `D:\Stayzy-SafeBackup\Android_Release_Keystore\` backed up to an encrypted password manager or offline secure storage.
- **Never lose or regenerate this keystore:** Android rejects app updates (`com.stayzy.app`) signed with a different certificate unless the user uninstalls the app first.
- For every future release APK/AAB:
  1. Increment `versionCode` and `versionName` in `mobile/android/app/build.gradle` and `mobile/app.json`.
  2. Set `EXPO_PUBLIC_API_URL="https://<your-render-service>.onrender.com/api/v1"`, `ANDROID_HOME`, and `EXPO_NO_METRO_WORKSPACE_ROOT="1"`.
  3. Run `.\gradlew.bat assembleRelease` inside `mobile/android`.
