# Stayzy Deployment Rollback Runbook

## 1. Version Identification
- Identify the running Git commit SHA / release tag from the host deployment metadata and verify `GET /api/v1` + `GET /ready` responses.
- Retain `X-Request-Id` values from failing client responses or `http_error` JSON logs to correlate incidents.

## 2. Triage & Decision Matrix
| Symptom | Likely Cause | Action |
|---|---|---|
| Startup crash (`Invalid environment configuration`) | Missing or invalid env var in `env.js` | **Configuration Rollback:** Fix/revert env vars and restart |
| `GET /ready` returns `503` | DB unreachable or `SIGTERM` shutdown active | Check DB connectivity, pool saturation, and host health |
| Elevated `5xx` or `slowRequests` in `GET /api/v1/admin/metrics` | Bad application release or slow query | **Code Rollback** to last known good build |
| Migration failed mid-run | SQL error in a migration file | `migrate.js` rolls back the failed migration transaction automatically; inspect error, fix forward, or restore pre-migration DB backup if needed |

## 3. Application Rollback Steps
1. Trigger rollback to the previous known-good release/image in the hosting platform.
2. Confirm no pending incompatible schema changes block the previous code version.
3. Wait for `GET /ready` to return `200` and `GET /health/db` to confirm database connectivity.
4. Check `GET /api/v1/admin/metrics` (admin auth) to confirm `totalErrors` stabilizes.

## 4. Migration Failure Recovery
- Because `backend/src/database/migrate.js` wraps each `.sql` file in `BEGIN ... COMMIT` and `ROLLBACK` on error, a failed migration does not partially apply or record itself in `schema_migrations`.
- If a migration succeeded syntactically but introduced bad data/schema, do **not** manually delete rows from `schema_migrations` in production; either deploy a forward-fix migration or execute the **Database Recovery** procedure in `docs/DATABASE_BACKUP_RESTORE_RUNBOOK.md`.

## 5. Secrets & Incident Response
- If any secret (`JWT_SECRET`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, DB password) is suspected exposed:
  1. Rotate the compromised secret immediately in the provider/secret manager.
  2. Update the backend environment and restart instances.
  3. Note that rotating `JWT_SECRET` invalidates existing access tokens and forces re-authentication.
