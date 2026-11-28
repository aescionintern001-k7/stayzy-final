# Stayzy Database Backup & Restore Runbook

> **Important:** Automated cloud backups and retention require provisioning a managed PostgreSQL provider. Do **not** assume any backup is recoverable until an isolated restore test has been executed and verified.

## 1. Code Rollback vs. Database Recovery vs. Configuration Rollback
- **Code Rollback:** Re-deploying the previous application container/build artifact. Safe only when the database schema remains backward-compatible with the prior release.
- **Configuration Rollback:** Reverting environment variables (e.g., `CORS_ORIGIN`, `LOG_FORMAT`, feature flags) and restarting the service. Does not alter database state.
- **Database Recovery:** Restoring PostgreSQL from a snapshot or `pg_dump` archive into a clean target database. Required if a migration or bug corrupted data. Note that restoring an older snapshot loses writes committed after that snapshot unless point-in-time recovery (PITR) is enabled.

## 2. Backup Policy (Target for Staging & Production)
- **Automated Daily Snapshots:** Enable managed PostgreSQL daily snapshots + WAL/PITR where supported.
- **Pre-Migration Manual Backup:** Always take an on-demand backup immediately before running `npm run migrate`.
- **Retention:** Minimum 7 days for staging, 30 days for production (adjust per compliance needs).
- **Secrets Separation:** Never store `.env` or secret values inside SQL dumps or unencrypted backup buckets.

## 3. Manual Logical Backup (`pg_dump`)
```bash
pg_dump --format=custom --no-owner --no-acl --file="stayzy_backup_$(date +%Y%m%d_%H%M%S).dump" "$DATABASE_URL"
```

## 4. Isolated Restore & Verification Procedure
Always restore into a **new/isolated** database first — never overwrite a live database blindly:
```bash
createdb stayzy_restore_verify
pg_restore --dbname="postgresql://.../stayzy_restore_verify" --no-owner --no-acl stayzy_backup_YYYYMMDD_HHMMSS.dump
```
Verify after restore:
1. Check `schema_migrations` latest entry matches expected migration.
2. Check critical table counts (`users`, `properties`, `room_types`, `bookings`, `payments`).
3. Run read-only smoke queries or point a staging/isolated backend instance at the restored DB and verify `GET /ready`.
4. Only cut over traffic (or promote the restored instance) after verification passes.
