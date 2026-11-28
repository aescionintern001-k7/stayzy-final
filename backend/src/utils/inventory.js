import pool from "../database/pool.js";
import { CLEANING_BUFFER_MINUTES } from "./pricing.js";

/**
 * Find all physical inventory_units (beds/units) belonging to a room_type
 * that are free across [startTime, endTime] with a 60-minute turnaround cleaning buffer
 * against bookings, active inventory_holds, and availability_blocks.
 */
export const findAvailableUnits = async (
  roomTypeId,
  startTime,
  endTime,
  { executor = pool, excludeHoldToken = null, lockRows = false } = {}
) => {
  const startIso = new Date(startTime).toISOString();
  const endIso = new Date(endTime).toISOString();
  const lockClause = lockRows ? "FOR UPDATE OF iu" : "";

  const res = await executor.query(
    `
      SELECT
        iu.id,
        iu.room_id,
        iu.identifier,
        iu.is_bed,
        iu.status,
        r.room_number,
        r.floor
      FROM inventory_units iu
      JOIN rooms r ON iu.room_id = r.id
      WHERE r.room_type_id = $1
        AND r.status = 'active'
        AND iu.status = 'available'
        AND NOT EXISTS (
          SELECT 1
          FROM bookings b
          WHERE b.inventory_unit_id = iu.id
            AND b.status IN ('pending', 'confirmed', 'checked_in')
            AND COALESCE(b.end_time, b.check_out_date::timestamptz) > ($2::timestamptz - make_interval(mins => $5))
            AND COALESCE(b.start_time, b.check_in_date::timestamptz) < ($3::timestamptz + make_interval(mins => $5))
        )
        AND NOT EXISTS (
          SELECT 1
          FROM inventory_holds ih
          WHERE ih.inventory_unit_id = iu.id
            AND ih.expires_at > NOW()
            AND ($4::varchar IS NULL OR ih.token <> $4)
            AND ih.end_time > ($2::timestamptz - make_interval(mins => $5))
            AND ih.start_time < ($3::timestamptz + make_interval(mins => $5))
        )
        AND NOT EXISTS (
          SELECT 1
          FROM availability_blocks ab
          WHERE ab.inventory_unit_id = iu.id
            AND ab.end_time > ($2::timestamptz - make_interval(mins => $5))
            AND ab.start_time < ($3::timestamptz + make_interval(mins => $5))
        )
      ORDER BY r.floor ASC, r.room_number ASC, iu.identifier ASC
      ${lockClause}
    `,
    [roomTypeId, startIso, endIso, excludeHoldToken, CLEANING_BUFFER_MINUTES]
  );

  return res.rows;
};

/**
 * Batch-count available inventory_units across multiple room_type_ids for a shared [startTime, endTime] window.
 * Eliminates N+1 queries on catalog/search listings while preserving identical conflict & buffer rules.
 */
export const countAvailableUnitsByRoomTypes = async (
  roomTypeIds,
  startTime,
  endTime,
  { executor = pool } = {}
) => {
  const uniqueIds = [...new Set((roomTypeIds || []).filter(Boolean))];
  const counts = new Map();
  if (uniqueIds.length === 0) return counts;

  const startIso = new Date(startTime).toISOString();
  const endIso = new Date(endTime).toISOString();

  const res = await executor.query(
    `
      SELECT
        r.room_type_id,
        COUNT(iu.id)::int AS available_count
      FROM inventory_units iu
      JOIN rooms r ON iu.room_id = r.id
      WHERE r.room_type_id = ANY($1::uuid[])
        AND r.status = 'active'
        AND iu.status = 'available'
        AND NOT EXISTS (
          SELECT 1
          FROM bookings b
          WHERE b.inventory_unit_id = iu.id
            AND b.status IN ('pending', 'confirmed', 'checked_in')
            AND COALESCE(b.end_time, b.check_out_date::timestamptz) > ($2::timestamptz - make_interval(mins => $4))
            AND COALESCE(b.start_time, b.check_in_date::timestamptz) < ($3::timestamptz + make_interval(mins => $4))
        )
        AND NOT EXISTS (
          SELECT 1
          FROM inventory_holds ih
          WHERE ih.inventory_unit_id = iu.id
            AND ih.expires_at > NOW()
            AND ih.end_time > ($2::timestamptz - make_interval(mins => $4))
            AND ih.start_time < ($3::timestamptz + make_interval(mins => $4))
        )
        AND NOT EXISTS (
          SELECT 1
          FROM availability_blocks ab
          WHERE ab.inventory_unit_id = iu.id
            AND ab.end_time > ($2::timestamptz - make_interval(mins => $4))
            AND ab.start_time < ($3::timestamptz + make_interval(mins => $4))
        )
      GROUP BY r.room_type_id
    `,
    [uniqueIds, startIso, endIso, CLEANING_BUFFER_MINUTES]
  );

  for (const row of res.rows) {
    counts.set(row.room_type_id, row.available_count);
  }
  return counts;
};

/**
 * Lock and verify a single specific inventory_unit_id is available for [startTime, endTime]
 * (optionally excluding an existing booking ID when checking an extension window).
 */
export const checkSpecificUnitAvailable = async (
  unitId,
  startTime,
  endTime,
  {
    executor = pool,
    excludeHoldToken = null,
    excludeBookingId = null,
    lockRow = true,
  } = {}
) => {
  const startIso = new Date(startTime).toISOString();
  const endIso = new Date(endTime).toISOString();

  const unitRes = await executor.query(
    `
      SELECT iu.id, iu.room_id, iu.identifier, iu.status, r.room_type_id, r.status AS room_status
      FROM inventory_units iu
      JOIN rooms r ON iu.room_id = r.id
      WHERE iu.id = $1
      ${lockRow ? "FOR UPDATE OF iu" : ""}
    `,
    [unitId]
  );

  const unit = unitRes.rows[0];
  if (!unit || unit.status !== "available" || unit.room_status !== "active") {
    return { available: false, reason: "Selected bed/unit is inactive or under maintenance", unit: unit || null };
  }

  const bookingConflict = await executor.query(
    `
      SELECT id
      FROM bookings b
      WHERE b.inventory_unit_id = $1
        AND ($4::uuid IS NULL OR b.id <> $4)
        AND b.status IN ('pending', 'confirmed', 'checked_in')
        AND COALESCE(b.end_time, b.check_out_date::timestamptz) > ($2::timestamptz - make_interval(mins => $5))
        AND COALESCE(b.start_time, b.check_in_date::timestamptz) < ($3::timestamptz + make_interval(mins => $5))
      LIMIT 1
    `,
    [unitId, startIso, endIso, excludeBookingId, CLEANING_BUFFER_MINUTES]
  );
  if (bookingConflict.rows.length > 0) {
    return { available: false, reason: "Selected unit conflicts with another booking or cleaning buffer", unit };
  }

  const holdConflict = await executor.query(
    `
      SELECT id
      FROM inventory_holds ih
      WHERE ih.inventory_unit_id = $1
        AND ih.expires_at > NOW()
        AND ($4::varchar IS NULL OR ih.token <> $4)
        AND ih.end_time > ($2::timestamptz - make_interval(mins => $5))
        AND ih.start_time < ($3::timestamptz + make_interval(mins => $5))
      LIMIT 1
    `,
    [unitId, startIso, endIso, excludeHoldToken, CLEANING_BUFFER_MINUTES]
  );
  if (holdConflict.rows.length > 0) {
    return { available: false, reason: "Selected unit is temporarily held by another guest checkout", unit };
  }

  const blockConflict = await executor.query(
    `
      SELECT id
      FROM availability_blocks ab
      WHERE ab.inventory_unit_id = $1
        AND ab.end_time > ($2::timestamptz - make_interval(mins => $4))
        AND ab.start_time < ($3::timestamptz + make_interval(mins => $4))
      LIMIT 1
    `,
    [unitId, startIso, endIso, CLEANING_BUFFER_MINUTES]
  );
  if (blockConflict.rows.length > 0) {
    return { available: false, reason: "Selected unit has an active maintenance/offline block", unit };
  }

  return { available: true, reason: null, unit };
};

export default { findAvailableUnits, checkSpecificUnitAvailable };
