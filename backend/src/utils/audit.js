import pool from "../database/pool.js";

/**
 * Record an administrative or domain security event in the audit_logs table.
 * Accepts an optional pg transaction client so audit entries commit atomically
 * with the triggering operation.
 *
 * @param {Object} entry
 * @param {string|null} [entry.actorId]
 * @param {string|null} [entry.actorEmail]
 * @param {string} entry.action
 * @param {string} entry.entityType
 * @param {string|null} [entry.entityId]
 * @param {string|Object|null} [entry.details]
 * @param {import("pg").PoolClient|null} [client]
 */
export const recordAuditLog = async (
  {
    actorId = null,
    actorEmail = null,
    action,
    entityType,
    entityId = null,
    details = null,
  },
  client = null
) => {
  const executor = client || pool;
  const serializedDetails =
    details === null || details === undefined
      ? null
      : typeof details === "string"
        ? details
        : JSON.stringify(details);

  await executor.query(
    `
      INSERT INTO audit_logs (actor_id, actor_email, action, entity_type, entity_id, details)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [
      actorId,
      actorEmail,
      action,
      entityType,
      entityId ? String(entityId) : null,
      serializedDetails,
    ]
  );
};

export default { recordAuditLog };
