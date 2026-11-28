import crypto from "node:crypto";
import pool from "../../database/pool.js";
import {
  HOLD_TTL_MINUTES,
  calculateBookingPricing,
  getTodayIstYmd,
} from "../../utils/pricing.js";
import {
  findAvailableUnits,
  checkSpecificUnitAvailable,
} from "../../utils/inventory.js";

export const createHoldService = async (payload, user = null) => {
  const {
    room_type_id,
    inventory_unit_id,
    duration_type,
    start_date,
    start_time = "10:00",
    duration_count,
    include_food = false,
    guest_email,
  } = payload;

  if (start_date < getTodayIstYmd()) {
    const error = new Error("Check-in date cannot be in the past");
    error.status = 400;
    throw error;
  }

  const roomRes = await pool.query(
    `
      SELECT rt.*, p.status AS property_status, p.is_available AS property_available
      FROM room_types rt
      JOIN properties p ON rt.property_id = p.id
      WHERE rt.id = $1
      LIMIT 1
    `,
    [room_type_id]
  );

  const roomType = roomRes.rows[0];
  if (!roomType || roomType.is_active === false) {
    const error = new Error("Room type not found");
    error.status = 404;
    throw error;
  }

  if (roomType.property_status !== "active" || !roomType.property_available) {
    const error = new Error("This property is not currently available for booking");
    error.status = 400;
    throw error;
  }

  const ratePlanRes = await pool.query(
    `
      SELECT *
      FROM rate_plans
      WHERE room_type_id = $1 AND duration_type = $2 AND is_enabled = TRUE
      LIMIT 1
    `,
    [room_type_id, duration_type]
  );

  const ratePlan = ratePlanRes.rows[0];
  const calc = calculateBookingPricing({
    ratePlan,
    durationType: duration_type,
    durationCount: duration_count,
    startDateStr: start_date,
    startTimeStr: start_time,
    includeFood: Boolean(include_food),
  });

  if (!calc.success) {
    const error = new Error(calc.error);
    error.status = 400;
    throw error;
  }

  const { startDateTime, endDateTime, payableNow } = calc.breakdown;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Purge expired holds so beds become immediately free
    await client.query("DELETE FROM inventory_holds WHERE expires_at <= NOW()");

    let selectedUnit = null;

    if (inventory_unit_id) {
      const check = await checkSpecificUnitAvailable(
        inventory_unit_id,
        startDateTime,
        endDateTime,
        { executor: client, lockRow: true }
      );
      if (!check.available || check.unit?.room_type_id !== room_type_id) {
        const error = new Error(
          check.reason || "Requested unit is not available for this room type"
        );
        error.status = 409;
        throw error;
      }
      selectedUnit = check.unit;
    } else {
      const units = await findAvailableUnits(
        room_type_id,
        startDateTime,
        endDateTime,
        { executor: client, lockRows: true }
      );
      if (units.length === 0) {
        const error = new Error(
          "No rooms or beds of this category are available for the selected schedule"
        );
        error.status = 409;
        throw error;
      }
      selectedUnit = units[0];
    }

    const token = `hold_${crypto.randomBytes(18).toString("hex")}`;
    const expiresAt = new Date(Date.now() + HOLD_TTL_MINUTES * 60 * 1000);

    const holdRes = await client.query(
      `
        INSERT INTO inventory_holds (
          token, room_type_id, inventory_unit_id, duration_type,
          start_time, end_time, expires_at, guest_email, guest_id,
          duration_count, total_amount
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `,
      [
        token,
        room_type_id,
        selectedUnit.id,
        duration_type,
        startDateTime,
        endDateTime,
        expiresAt.toISOString(),
        guest_email || user?.email || null,
        user?.id || null,
        duration_count,
        payableNow,
      ]
    );

    await client.query("COMMIT");

    const hold = holdRes.rows[0];
    return {
      hold_token: hold.token,
      expires_at: hold.expires_at,
      ttl_seconds: HOLD_TTL_MINUTES * 60,
      inventory_unit_id: selectedUnit.id,
      unit: {
        id: selectedUnit.id,
        identifier: selectedUnit.identifier,
        room_number: selectedUnit.room_number,
        floor: selectedUnit.floor,
      },
      breakdown: calc.breakdown,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export const assertHoldAccess = (hold, user, actionLabel = "access") => {
  if (!hold?.guest_id) return;
  if (!user?.id) {
    const error = new Error(`Authentication required to ${actionLabel} this hold`);
    error.status = 401;
    throw error;
  }
  if (hold.guest_id !== user.id && user.role !== "admin") {
    const error = new Error(`You are not authorized to ${actionLabel} this hold`);
    error.status = 403;
    throw error;
  }
};

export const getHoldByTokenService = async (token, user = null) => {
  const res = await pool.query(
    `
      SELECT
        ih.*,
        rt.name AS room_type_name,
        rt.slug AS room_type_slug,
        rt.property_id,
        iu.identifier AS unit_identifier,
        r.room_number,
        r.floor
      FROM inventory_holds ih
      JOIN room_types rt ON ih.room_type_id = rt.id
      LEFT JOIN inventory_units iu ON ih.inventory_unit_id = iu.id
      LEFT JOIN rooms r ON iu.room_id = r.id
      WHERE ih.token = $1
      LIMIT 1
    `,
    [token]
  );

  const hold = res.rows[0];
  if (!hold) {
    const error = new Error("Hold not found or already consumed");
    error.status = 404;
    throw error;
  }

  assertHoldAccess(hold, user, "access");

  const remainingMs = new Date(hold.expires_at).getTime() - Date.now();
  if (remainingMs <= 0) {
    const error = new Error("This reservation hold has expired");
    error.status = 410;
    throw error;
  }

  return {
    hold_token: hold.token,
    room_type_id: hold.room_type_id,
    room_type_name: hold.room_type_name,
    room_type_slug: hold.room_type_slug,
    property_id: hold.property_id,
    inventory_unit_id: hold.inventory_unit_id,
    duration_type: hold.duration_type,
    duration_count: hold.duration_count,
    start_time: hold.start_time,
    end_time: hold.end_time,
    expires_at: hold.expires_at,
    remaining_seconds: Math.max(0, Math.floor(remainingMs / 1000)),
    total_amount: hold.total_amount ? Number.parseFloat(hold.total_amount) : null,
    unit: hold.unit_identifier
      ? {
          id: hold.inventory_unit_id,
          identifier: hold.unit_identifier,
          room_number: hold.room_number,
          floor: hold.floor,
        }
      : null,
  };
};

export const releaseHoldService = async (token, user = null) => {
  const existingRes = await pool.query(
    "SELECT token, guest_id FROM inventory_holds WHERE token = $1 LIMIT 1",
    [token]
  );
  const existing = existingRes.rows[0];
  if (!existing) {
    return {
      token,
      released: false,
    };
  }

  assertHoldAccess(existing, user, "release");

  const res = await pool.query(
    "DELETE FROM inventory_holds WHERE token = $1 RETURNING token",
    [token]
  );

  return {
    token,
    released: res.rowCount > 0,
  };
};
