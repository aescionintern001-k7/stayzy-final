import crypto from "node:crypto";
import bcrypt from "bcrypt";
import pool from "../../database/pool.js";
import {
  calculateBookingPricing,
  getTodayIstYmd,
  addCalendarDays,
} from "../../utils/pricing.js";
import {
  findAvailableUnits,
  checkSpecificUnitAvailable,
} from "../../utils/inventory.js";
import { recordAuditLog } from "../../utils/audit.js";

const SECRET_SETTINGS_PATTERN = /(secret|password|token|private|webhook|api[_-]?key)/i;

const redactSecretsDeep = (val) => {
  if (!val || typeof val !== "object") return val;
  if (Array.isArray(val)) return val.map(redactSecretsDeep);
  const out = {};
  for (const [k, v] of Object.entries(val)) {
    if (SECRET_SETTINGS_PATTERN.test(k)) {
      out[k] = v ? "[REDACTED]" : null;
    } else {
      out[k] = redactSecretsDeep(v);
    }
  }
  return out;
};

// ==========================================
// PHASE A: Users & Customer CRM
// ==========================================

export const createAdminUser = async (
  actor,
  { full_name, email, password, phone = null, role = "guest" }
) => {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await pool.query(
    "SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1",
    [normalizedEmail]
  );
  if (existing.rows.length > 0) {
    const error = new Error("Email is already registered");
    error.status = 409;
    throw error;
  }

  const hash = await bcrypt.hash(password, 12);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const res = await client.query(
      `
        INSERT INTO users (full_name, email, phone, password_hash, role, account_status, is_email_verified)
        VALUES ($1, $2, $3, $4, $5, 'active', TRUE)
        RETURNING id, full_name, email, phone, role, account_status, is_email_verified, created_at
      `,
      [full_name.trim(), normalizedEmail, phone ? phone.trim() : null, hash, role]
    );
    const created = res.rows[0];
    await recordAuditLog(
      {
        actorId: actor.id,
        actorEmail: actor.email,
        action: "ADMIN_CREATE_USER",
        entityType: "user",
        entityId: created.id,
        details: { role, email: normalizedEmail },
      },
      client
    );
    await client.query("COMMIT");
    return created;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

export const updateAdminUserRole = async (actor, targetUserId, { role }) => {
  if (targetUserId === actor.id && role !== "admin") {
    const error = new Error("Administrators cannot demote their own admin role");
    error.status = 400;
    throw error;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const res = await client.query(
      `
        UPDATE users
        SET role = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, full_name, email, phone, role, account_status, is_email_verified, updated_at
      `,
      [role, targetUserId]
    );
    const updated = res.rows[0];
    if (!updated) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    await client.query(
      "UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL",
      [targetUserId]
    );

    await recordAuditLog(
      {
        actorId: actor.id,
        actorEmail: actor.email,
        action: "ADMIN_CHANGE_USER_ROLE",
        entityType: "user",
        entityId: targetUserId,
        details: { newRole: role },
      },
      client
    );

    await client.query("COMMIT");
    return updated;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

export const getAdminCustomers = async ({ page = 1, limit = 20, search } = {}) => {
  const params = [];
  const conditions = [];

  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    conditions.push(
      `(u.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR COALESCE(u.phone, '') ILIKE $${params.length})`
    );
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRes = await pool.query(
    `SELECT COUNT(*)::int AS total FROM users u ${whereClause}`,
    params
  );
  const totalItems = countRes.rows[0].total;
  const offset = (page - 1) * limit;

  const listRes = await pool.query(
    `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.phone,
        u.role,
        u.account_status,
        u.created_at,
        COUNT(DISTINCT b.id)::int AS bookings_count,
        COALESCE(SUM(CASE WHEN p.status = 'captured' THEN p.amount ELSE 0 END), 0)::numeric(12,2) AS total_spent,
        MAX(b.check_in_date) AS last_check_in,
        COUNT(DISTINCT CASE WHEN st.status IN ('open', 'in_progress') THEN st.id END)::int AS open_tickets
      FROM users u
      LEFT JOIN bookings b ON b.guest_id = u.id
      LEFT JOIN payments p ON p.booking_id = b.id
      LEFT JOIN support_tickets st ON st.user_id = u.id
      ${whereClause}
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `,
    [...params, limit, offset]
  );

  return {
    customers: listRes.rows.map((r) => ({
      ...r,
      total_spent: Number.parseFloat(r.total_spent || 0),
    })),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total_items: totalItems,
      total_pages: Math.ceil(totalItems / limit) || 1,
    },
  };
};

// ==========================================
// PHASE B: Rooms, Beds, Blocks, Calendar, Rates, Offline Bookings & Ops
// ==========================================

export const getAdminRooms = async ({ property_id } = {}) => {
  const params = [];
  const where = property_id ? (params.push(property_id), "WHERE rt.property_id = $1") : "";

  const res = await pool.query(
    `
      SELECT
        rt.*,
        p.title AS property_title,
        p.city AS property_city,
        COALESCE((
          SELECT json_agg(rp ORDER BY rp.duration_type ASC)
          FROM rate_plans rp
          WHERE rp.room_type_id = rt.id
        ), '[]'::json) AS rate_plans,
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', rm.id,
            'room_number', rm.room_number,
            'floor', rm.floor,
            'status', rm.status,
            'units', COALESCE((
              SELECT json_agg(iu ORDER BY iu.identifier ASC)
              FROM inventory_units iu
              WHERE iu.room_id = rm.id
            ), '[]'::json)
          ) ORDER BY rm.floor ASC, rm.room_number ASC)
          FROM rooms rm
          WHERE rm.room_type_id = rt.id
        ), '[]'::json) AS physical_rooms
      FROM room_types rt
      JOIN properties p ON rt.property_id = p.id
      ${where}
      ORDER BY rt.created_at DESC
    `,
    params
  );

  return { room_types: res.rows };
};

export const createAdminRoom = async (actor, payload) => {
  const {
    property_id,
    name,
    slug,
    category = "PRIVATE",
    description = "",
    size_sq_ft = 220,
    base_capacity = 1,
    max_capacity = 2,
    has_ac = true,
    bathroom_type = "ATTACHED",
    food_included = false,
    food_details = null,
    gender_eligibility = "COLIVING",
    amenities = [],
    images = [],
    room_numbers = ["101"],
    beds_per_room = 1,
    rate_plans = [],
  } = payload;

  const propCheck = await pool.query("SELECT id FROM properties WHERE id = $1 LIMIT 1", [
    property_id,
  ]);
  if (propCheck.rows.length === 0) {
    const error = new Error("Property not found");
    error.status = 404;
    throw error;
  }

  const finalSlug =
    slug?.trim().toLowerCase() ||
    `${name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}-${crypto.randomBytes(2).toString("hex")}`;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const rtRes = await client.query(
      `
        INSERT INTO room_types (
          property_id, name, slug, category, description, size_sq_ft,
          base_capacity, max_capacity, has_ac, bathroom_type,
          food_included, food_details, gender_eligibility,
          amenities, images, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15::jsonb, TRUE)
        RETURNING *
      `,
      [
        property_id,
        name.trim(),
        finalSlug,
        category,
        description.trim(),
        size_sq_ft,
        base_capacity,
        max_capacity,
        has_ac,
        bathroom_type,
        food_included,
        food_details,
        gender_eligibility,
        JSON.stringify(amenities),
        JSON.stringify(images),
      ]
    );
    const roomType = rtRes.rows[0];

    const isBed = beds_per_room > 1 || ["TWIN_SHARING", "TRIPLE_SHARING", "DORMITORY"].includes(category);
    const createdUnits = [];

    for (let idx = 0; idx < room_numbers.length; idx++) {
      const rn = String(room_numbers[idx]).trim();
      const floorNum = Number.parseInt(rn.charAt(0), 10) || 1;
      const roomRes = await client.query(
        `
          INSERT INTO rooms (room_type_id, room_number, floor, status)
          VALUES ($1, $2, $3, 'active')
          RETURNING *
        `,
        [roomType.id, rn, floorNum]
      );
      const roomRow = roomRes.rows[0];

      for (let b = 1; b <= beds_per_room; b++) {
        const suffix = isBed ? `-${String.fromCharCode(64 + b)}` : "";
        const identifier = `${rn}${suffix}`;
        const unitRes = await client.query(
          `
            INSERT INTO inventory_units (room_id, identifier, is_bed, status)
            VALUES ($1, $2, $3, 'available')
            RETURNING *
          `,
          [roomRow.id, identifier, isBed]
        );
        createdUnits.push(unitRes.rows[0]);
      }
    }

    const plansToCreate =
      rate_plans.length > 0
        ? rate_plans
        : [
            { duration_type: "HOURLY", price: 150, deposit_amount: 0, is_enabled: true },
            { duration_type: "DAILY", price: 1200, deposit_amount: 500, is_enabled: true },
            { duration_type: "WEEKLY", price: 7000, deposit_amount: 2000, is_enabled: true },
            { duration_type: "MONTHLY", price: 20000, deposit_amount: 10000, food_monthly_charge: 3500, is_enabled: true },
            { duration_type: "YEARLY", price: 216000, deposit_amount: 20000, food_monthly_charge: 3500, is_enabled: true },
          ];

    const createdPlans = [];
    for (const plan of plansToCreate) {
      const rpRes = await client.query(
        `
          INSERT INTO rate_plans (
            room_type_id, duration_type, price, is_enabled, min_duration, max_duration,
            allowed_hours_start, allowed_hours_end, deposit_amount, food_monthly_charge, electricity_rule, notes
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING *
        `,
        [
          roomType.id,
          plan.duration_type,
          plan.price,
          plan.is_enabled ?? true,
          plan.min_duration ?? 1,
          plan.max_duration ?? null,
          plan.allowed_hours_start || "08:00",
          plan.allowed_hours_end || "22:00",
          plan.deposit_amount ?? 0,
          plan.food_monthly_charge ?? 0,
          plan.electricity_rule || "Included in rent",
          plan.notes || null,
        ]
      );
      createdPlans.push(rpRes.rows[0]);
    }

    await recordAuditLog(
      {
        actorId: actor.id,
        actorEmail: actor.email,
        action: "ADMIN_CREATE_ROOM_TYPE",
        entityType: "room_type",
        entityId: roomType.id,
        details: { name: roomType.name, unitsCreated: createdUnits.length },
      },
      client
    );

    await client.query("COMMIT");
    return { room_type: roomType, units: createdUnits, rate_plans: createdPlans };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

export const getAdminBeds = async ({ property_id, room_type_id } = {}) => {
  const params = [];
  const conditions = [];
  if (property_id) {
    params.push(property_id);
    conditions.push(`p.id = $${params.length}`);
  }
  if (room_type_id) {
    params.push(room_type_id);
    conditions.push(`rt.id = $${params.length}`);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const res = await pool.query(
    `
      SELECT
        iu.*,
        rm.room_number,
        rm.floor,
        rm.status AS room_status,
        rt.id AS room_type_id,
        rt.name AS room_type_name,
        rt.category AS room_type_category,
        p.id AS property_id,
        p.title AS property_title,
        COALESCE((
          SELECT json_agg(ab ORDER BY ab.start_time ASC)
          FROM availability_blocks ab
          WHERE ab.inventory_unit_id = iu.id AND ab.end_time >= NOW()
        ), '[]'::json) AS active_blocks
      FROM inventory_units iu
      JOIN rooms rm ON iu.room_id = rm.id
      JOIN room_types rt ON rm.room_type_id = rt.id
      JOIN properties p ON rt.property_id = p.id
      ${where}
      ORDER BY p.title ASC, rm.floor ASC, rm.room_number ASC, iu.identifier ASC
    `,
    params
  );

  return { units: res.rows };
};

export const manageAdminBed = async (actor, payload) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (payload.action === "ADD_UNIT") {
      let targetRoomId = payload.room_id || null;
      if (!targetRoomId && payload.room_type_id && payload.room_number) {
        const existingRoom = await client.query(
          "SELECT id FROM rooms WHERE room_type_id = $1 AND room_number = $2 LIMIT 1",
          [payload.room_type_id, payload.room_number.trim()]
        );
        if (existingRoom.rows[0]) {
          targetRoomId = existingRoom.rows[0].id;
        } else {
          const floor = payload.floor || Number.parseInt(payload.room_number, 10) || 1;
          const createdRoom = await client.query(
            "INSERT INTO rooms (room_type_id, room_number, floor, status) VALUES ($1, $2, $3, 'active') RETURNING id",
            [payload.room_type_id, payload.room_number.trim(), floor]
          );
          targetRoomId = createdRoom.rows[0].id;
        }
      }

      if (!targetRoomId) {
        const error = new Error("room_id or (room_type_id + room_number) is required");
        error.status = 400;
        throw error;
      }

      const unitRes = await client.query(
        `
          INSERT INTO inventory_units (room_id, identifier, is_bed, status)
          VALUES ($1, $2, $3, 'available')
          RETURNING *
        `,
        [targetRoomId, payload.identifier.trim(), Boolean(payload.is_bed ?? true)]
      );
      const unit = unitRes.rows[0];
      await recordAuditLog(
        {
          actorId: actor.id,
          actorEmail: actor.email,
          action: "ADMIN_ADD_INVENTORY_UNIT",
          entityType: "inventory_unit",
          entityId: unit.id,
          details: { identifier: unit.identifier, room_id: targetRoomId },
        },
        client
      );
      await client.query("COMMIT");
      return { unit };
    }

    // UPDATE_STATUS
    const updateRes = await client.query(
      "UPDATE inventory_units SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [payload.status, payload.inventory_unit_id]
    );
    const unit = updateRes.rows[0];
    if (!unit) {
      const error = new Error("Inventory unit not found");
      error.status = 404;
      throw error;
    }

    await recordAuditLog(
      {
        actorId: actor.id,
        actorEmail: actor.email,
        action: "ADMIN_UPDATE_UNIT_STATUS",
        entityType: "inventory_unit",
        entityId: unit.id,
        details: { status: payload.status },
      },
      client
    );
    await client.query("COMMIT");
    return { unit };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

export const createAvailabilityBlock = async (actor, payload) => {
  const { inventory_unit_id, reason = "MAINTENANCE", start_time, end_time, notes = null } = payload;

  const unitRes = await pool.query("SELECT id FROM inventory_units WHERE id = $1 LIMIT 1", [
    inventory_unit_id,
  ]);
  if (unitRes.rows.length === 0) {
    const error = new Error("Inventory unit not found");
    error.status = 404;
    throw error;
  }

  const blockRes = await pool.query(
    `
      INSERT INTO availability_blocks (inventory_unit_id, reason, start_time, end_time, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
    [inventory_unit_id, reason, start_time, end_time, notes, actor.id]
  );

  await recordAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "ADMIN_CREATE_AVAILABILITY_BLOCK",
    entityType: "availability_block",
    entityId: blockRes.rows[0].id,
    details: { inventory_unit_id, reason, start_time, end_time },
  });

  return { block: blockRes.rows[0] };
};

export const deleteAvailabilityBlock = async (actor, blockId) => {
  const res = await pool.query(
    "DELETE FROM availability_blocks WHERE id = $1 RETURNING *",
    [blockId]
  );
  if (res.rowCount === 0) {
    const error = new Error("Availability block not found");
    error.status = 404;
    throw error;
  }
  await recordAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "ADMIN_DELETE_AVAILABILITY_BLOCK",
    entityType: "availability_block",
    entityId: blockId,
  });
  return { deleted: true, id: blockId };
};

export const getAdminCalendar = async ({
  from_date,
  days = 10,
  property_id,
} = {}) => {
  const startYmd = from_date || getTodayIstYmd();
  const endYmd = addCalendarDays(startYmd, days);
  const windowStartIso = `${startYmd}T00:00:00+05:30`;
  const windowEndIso = `${endYmd}T23:59:59+05:30`;

  const params = [];
  const propCondition = property_id ? (params.push(property_id), "WHERE p.id = $1") : "";

  const unitsRes = await pool.query(
    `
      SELECT
        iu.id AS unit_id,
        iu.identifier,
        iu.status AS unit_status,
        iu.is_bed,
        rm.room_number,
        rm.floor,
        rt.id AS room_type_id,
        rt.name AS room_type_name,
        p.id AS property_id,
        p.title AS property_title
      FROM inventory_units iu
      JOIN rooms rm ON iu.room_id = rm.id
      JOIN room_types rt ON rm.room_type_id = rt.id
      JOIN properties p ON rt.property_id = p.id
      ${propCondition}
      ORDER BY p.title ASC, rm.floor ASC, rm.room_number ASC, iu.identifier ASC
    `,
    params
  );

  const [bookingsRes, blocksRes, holdsRes] = await Promise.all([
    pool.query(
      `
        SELECT id, booking_reference, inventory_unit_id, guest_name, status, payment_status,
               duration_type, check_in_date, check_out_date, start_time, end_time
        FROM bookings
        WHERE inventory_unit_id IS NOT NULL
          AND status IN ('pending', 'confirmed', 'checked_in')
          AND COALESCE(end_time, check_out_date::timestamptz) >= $1::timestamptz
          AND COALESCE(start_time, check_in_date::timestamptz) <= $2::timestamptz
      `,
      [windowStartIso, windowEndIso]
    ),
    pool.query(
      `
        SELECT id, inventory_unit_id, reason, start_time, end_time, notes
        FROM availability_blocks
        WHERE end_time >= $1::timestamptz AND start_time <= $2::timestamptz
      `,
      [windowStartIso, windowEndIso]
    ),
    pool.query(
      `
        SELECT id, token, inventory_unit_id, start_time, end_time, expires_at, guest_email
        FROM inventory_holds
        WHERE expires_at > NOW()
          AND end_time >= $1::timestamptz AND start_time <= $2::timestamptz
      `,
      [windowStartIso, windowEndIso]
    ),
  ]);

  const byUnit = (rows) => {
    const map = new Map();
    for (const r of rows) {
      const list = map.get(r.inventory_unit_id) || [];
      list.push(r);
      map.set(r.inventory_unit_id, list);
    }
    return map;
  };

  const bookingMap = byUnit(bookingsRes.rows);
  const blockMap = byUnit(blocksRes.rows);
  const holdMap = byUnit(holdsRes.rows);

  return {
    window: { from_date: startYmd, to_date: endYmd, days },
    units: unitsRes.rows.map((u) => ({
      ...u,
      bookings: bookingMap.get(u.unit_id) || [],
      blocks: blockMap.get(u.unit_id) || [],
      holds: holdMap.get(u.unit_id) || [],
    })),
  };
};

export const getAdminRates = async ({ property_id, room_type_id } = {}) => {
  const params = [];
  const conditions = [];
  if (property_id) {
    params.push(property_id);
    conditions.push(`p.id = $${params.length}`);
  }
  if (room_type_id) {
    params.push(room_type_id);
    conditions.push(`rt.id = $${params.length}`);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const res = await pool.query(
    `
      SELECT rp.*, rt.name AS room_type_name, p.id AS property_id, p.title AS property_title
      FROM rate_plans rp
      JOIN room_types rt ON rp.room_type_id = rt.id
      JOIN properties p ON rt.property_id = p.id
      ${where}
      ORDER BY p.title ASC, rt.name ASC, rp.duration_type ASC
    `,
    params
  );

  return {
    rate_plans: res.rows.map((r) => ({
      ...r,
      price: Number.parseFloat(r.price),
      deposit_amount: Number.parseFloat(r.deposit_amount || 0),
      food_monthly_charge: Number.parseFloat(r.food_monthly_charge || 0),
    })),
  };
};

export const updateAdminRate = async (actor, rateId, payload) => {
  const fields = [];
  const params = [];

  const allowed = [
    "price",
    "is_enabled",
    "min_duration",
    "max_duration",
    "allowed_hours_start",
    "allowed_hours_end",
    "deposit_amount",
    "food_monthly_charge",
    "electricity_rule",
    "notes",
  ];

  for (const key of allowed) {
    if (payload[key] !== undefined) {
      params.push(payload[key]);
      fields.push(`${key} = $${params.length}`);
    }
  }

  fields.push("updated_at = NOW()");
  params.push(rateId);

  const res = await pool.query(
    `UPDATE rate_plans SET ${fields.join(", ")} WHERE id = $${params.length} RETURNING *`,
    params
  );
  const updated = res.rows[0];
  if (!updated) {
    const error = new Error("Rate plan not found");
    error.status = 404;
    throw error;
  }

  await recordAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "ADMIN_UPDATE_RATE_PLAN",
    entityType: "rate_plan",
    entityId: rateId,
    details: payload,
  });

  return {
    rate_plan: {
      ...updated,
      price: Number.parseFloat(updated.price),
      deposit_amount: Number.parseFloat(updated.deposit_amount || 0),
      food_monthly_charge: Number.parseFloat(updated.food_monthly_charge || 0),
    },
  };
};

export const createOfflineBooking = async (actor, payload) => {
  const {
    room_type_id,
    inventory_unit_id = null,
    guest_id = null,
    guest_name,
    guest_email,
    guest_phone,
    duration_type = "MONTHLY",
    start_date,
    start_time = "10:00",
    duration_count = 1,
    include_food = false,
    guests_count = 1,
    mark_paid = false,
    payment_notes = "Collected offline at property desk",
  } = payload;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let resolvedGuestId = guest_id;
    const normalizedEmail = guest_email.trim().toLowerCase();
    if (!resolvedGuestId) {
      const existingUser = await client.query(
        "SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1",
        [normalizedEmail]
      );
      if (existingUser.rows[0]) {
        resolvedGuestId = existingUser.rows[0].id;
      } else {
        const tempHash = await bcrypt.hash(crypto.randomBytes(16).toString("hex"), 10);
        const createdGuest = await client.query(
          `
            INSERT INTO users (full_name, email, phone, password_hash, role, account_status, is_email_verified)
            VALUES ($1, $2, $3, $4, 'guest', 'active', TRUE)
            RETURNING id
          `,
          [guest_name.trim(), normalizedEmail, guest_phone.trim(), tempHash]
        );
        resolvedGuestId = createdGuest.rows[0].id;
      }
    }

    const rtRes = await client.query(
      `
        SELECT rt.*, p.id AS property_id, p.title AS property_title, p.currency AS property_currency
        FROM room_types rt
        JOIN properties p ON rt.property_id = p.id
        WHERE rt.id = $1
        FOR UPDATE OF p
      `,
      [room_type_id]
    );
    const roomType = rtRes.rows[0];
    if (!roomType) {
      const error = new Error("Room type not found");
      error.status = 404;
      throw error;
    }

    const rpRes = await client.query(
      "SELECT * FROM rate_plans WHERE room_type_id = $1 AND duration_type = $2 LIMIT 1",
      [room_type_id, duration_type]
    );
    const calc = calculateBookingPricing({
      ratePlan: rpRes.rows[0],
      durationType: duration_type,
      durationCount: duration_count,
      startDateStr: start_date,
      startTimeStr: start_time,
      includeFood: include_food,
    });
    if (!calc.success) {
      const error = new Error(calc.error);
      error.status = 400;
      throw error;
    }

    const b = calc.breakdown;
    let selectedUnit;
    if (inventory_unit_id) {
      const check = await checkSpecificUnitAvailable(
        inventory_unit_id,
        b.startDateTime,
        b.endDateTime,
        { executor: client, lockRow: true }
      );
      if (!check.available) {
        const error = new Error(check.reason || "Unit unavailable");
        error.status = 409;
        throw error;
      }
      selectedUnit = check.unit;
    } else {
      const units = await findAvailableUnits(
        room_type_id,
        b.startDateTime,
        b.endDateTime,
        { executor: client, lockRows: true }
      );
      if (units.length === 0) {
        const error = new Error("No available units for selected dates");
        error.status = 409;
        throw error;
      }
      selectedUnit = units[0];
    }

    const bookingReference = `STY-${new Date().getFullYear()}-${crypto
      .randomBytes(3)
      .toString("hex")
      .toUpperCase()}`;
    const keylessCode = String(100000 + crypto.randomInt(900000));
    const totalNights = Math.max(
      1,
      Math.round(
        (new Date(b.checkOutDate).getTime() - new Date(b.checkInDate).getTime()) /
          86400000
      )
    );

    const insertRes = await client.query(
      `
        INSERT INTO bookings (
          booking_reference, property_id, room_type_id, inventory_unit_id, guest_id,
          duration_type, duration_count, check_in_date, check_out_date,
          start_time, end_time, total_nights, price_per_night,
          base_price, food_charges, taxes, deposit_amount, total_price,
          payable_now, balance_remaining, currency, guests_count,
          status, payment_status, guest_name, guest_email, guest_phone, keyless_code, notes
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12, $13,
          $14, $15, $16, $17, $18,
          $19, $20, $21, $22,
          'confirmed', $23, $24, $25, $26, $27, 'Created offline by Admin'
        )
        RETURNING *
      `,
      [
        bookingReference,
        roomType.property_id,
        room_type_id,
        selectedUnit.id,
        resolvedGuestId,
        duration_type,
        duration_count,
        b.checkInDate,
        b.checkOutDate,
        b.startDateTime,
        b.endDateTime,
        totalNights,
        Math.max(0.01, b.unitPrice),
        b.baseAmount,
        b.foodAmount,
        b.taxes,
        b.depositAmount,
        b.totalAmount,
        b.payableNow,
        b.balanceRemaining,
        roomType.property_currency || "INR",
        guests_count,
        mark_paid ? "paid" : "unpaid",
        guest_name.trim(),
        normalizedEmail,
        guest_phone.trim(),
        keylessCode,
      ]
    );
    const createdBooking = insertRes.rows[0];

    let payment = null;
    if (mark_paid) {
      const orderId = `offline_ord_${crypto.randomBytes(6).toString("hex")}`;
      const payId = `offline_pay_${crypto.randomBytes(6).toString("hex")}`;
      const payRes = await client.query(
        `
          INSERT INTO payments (
            booking_id, user_id, provider, razorpay_order_id, razorpay_payment_id,
            amount, currency, status, verified_at, notes
          )
          VALUES ($1, $2, 'MANUAL_OFFLINE', $3, $4, $5, $6, 'captured', NOW(), $7)
          RETURNING *
        `,
        [
          createdBooking.id,
          resolvedGuestId,
          orderId,
          payId,
          b.payableNow,
          roomType.property_currency || "INR",
          payment_notes,
        ]
      );
      payment = payRes.rows[0];
    }

    await recordAuditLog(
      {
        actorId: actor.id,
        actorEmail: actor.email,
        action: "ADMIN_CREATE_OFFLINE_BOOKING",
        entityType: "booking",
        entityId: createdBooking.id,
        details: { bookingReference, mark_paid },
      },
      client
    );

    await client.query("COMMIT");
    return { booking: createdBooking, payment };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

export const recordOfflinePayment = async (
  actor,
  { booking_id, payment_schedule_id = null, amount, notes = "Manual offline settlement" }
) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const bRes = await client.query(
      "SELECT * FROM bookings WHERE id = $1 FOR UPDATE",
      [booking_id]
    );
    const booking = bRes.rows[0];
    if (!booking) {
      const error = new Error("Booking not found");
      error.status = 404;
      throw error;
    }

    const orderId = `offline_ord_${crypto.randomBytes(6).toString("hex")}`;
    const payId = `offline_pay_${crypto.randomBytes(6).toString("hex")}`;
    const finalAmount = amount ?? Number.parseFloat(booking.payable_now ?? booking.total_price);

    const payRes = await client.query(
      `
        INSERT INTO payments (
          booking_id, user_id, provider, payment_schedule_id,
          razorpay_order_id, razorpay_payment_id, amount, currency,
          status, verified_at, notes
        )
        VALUES ($1, $2, 'MANUAL_OFFLINE', $3, $4, $5, $6, $7, 'captured', NOW(), $8)
        RETURNING *
      `,
      [
        booking.id,
        booking.guest_id,
        payment_schedule_id,
        orderId,
        payId,
        finalAmount,
        booking.currency || "INR",
        notes,
      ]
    );

    if (payment_schedule_id) {
      await client.query(
        "UPDATE payment_schedules SET status = 'PAID', paid_at = NOW(), updated_at = NOW() WHERE id = $1 AND booking_id = $2",
        [payment_schedule_id, booking.id]
      );
      await client.query(
        "UPDATE bookings SET balance_remaining = GREATEST(0, COALESCE(balance_remaining, 0) - $1), updated_at = NOW() WHERE id = $2",
        [finalAmount, booking.id]
      );
    } else {
      await client.query(
        `
          UPDATE bookings
          SET payment_status = 'paid',
              status = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END,
              updated_at = NOW()
          WHERE id = $1
        `,
        [booking.id]
      );
    }

    await recordAuditLog(
      {
        actorId: actor.id,
        actorEmail: actor.email,
        action: "ADMIN_RECORD_OFFLINE_PAYMENT",
        entityType: "payment",
        entityId: payRes.rows[0].id,
        details: { booking_id, amount: finalAmount },
      },
      client
    );

    await client.query("COMMIT");
    return { payment: payRes.rows[0] };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

export const getAdminVisits = async ({ status, page = 1, limit = 20 } = {}) => {
  const params = [];
  const where = status ? (params.push(status), "WHERE vr.status = $1") : "";

  const countRes = await pool.query(
    `SELECT COUNT(*)::int AS total FROM visit_requests vr ${where}`,
    params
  );
  const totalItems = countRes.rows[0].total;
  const offset = (page - 1) * limit;

  const res = await pool.query(
    `
      SELECT vr.*, p.title AS property_title, p.city AS property_city, rt.name AS room_type_name
      FROM visit_requests vr
      JOIN properties p ON vr.property_id = p.id
      LEFT JOIN room_types rt ON vr.room_type_id = rt.id
      ${where}
      ORDER BY vr.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `,
    [...params, limit, offset]
  );

  return {
    visits: res.rows,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total_items: totalItems,
      total_pages: Math.ceil(totalItems / limit) || 1,
    },
  };
};

export const updateAdminVisit = async (actor, visitId, { status, admin_notes }) => {
  const res = await pool.query(
    `
      UPDATE visit_requests
      SET status = $1,
          admin_notes = COALESCE($2, admin_notes),
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `,
    [status, admin_notes ?? null, visitId]
  );
  const visit = res.rows[0];
  if (!visit) {
    const error = new Error("Visit request not found");
    error.status = 404;
    throw error;
  }

  await recordAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "ADMIN_UPDATE_VISIT",
    entityType: "visit_request",
    entityId: visitId,
    details: { status },
  });

  return { visit };
};

export const getAdminSupportTickets = async ({
  status,
  priority,
  page = 1,
  limit = 20,
} = {}) => {
  const params = [];
  const conditions = [];
  if (status) {
    params.push(status);
    conditions.push(`st.status = $${params.length}`);
  }
  if (priority) {
    params.push(priority);
    conditions.push(`st.priority = $${params.length}`);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRes = await pool.query(
    `SELECT COUNT(*)::int AS total FROM support_tickets st ${where}`,
    params
  );
  const totalItems = countRes.rows[0].total;
  const offset = (page - 1) * limit;

  const res = await pool.query(
    `
      SELECT
        st.*,
        u.full_name AS customer_name,
        u.email AS customer_email,
        u.phone AS customer_phone,
        b.booking_reference
      FROM support_tickets st
      JOIN users u ON st.user_id = u.id
      LEFT JOIN bookings b ON st.booking_id = b.id
      ${where}
      ORDER BY st.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `,
    [...params, limit, offset]
  );

  return {
    tickets: res.rows,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total_items: totalItems,
      total_pages: Math.ceil(totalItems / limit) || 1,
    },
  };
};

export const replyAdminSupportTicket = async (
  actor,
  ticketId,
  { admin_reply, status = "resolved" }
) => {
  const res = await pool.query(
    `
      UPDATE support_tickets
      SET admin_reply = $1,
          status = $2,
          replied_by = $3,
          replied_at = NOW(),
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `,
    [admin_reply.trim(), status, actor.id, ticketId]
  );
  const ticket = res.rows[0];
  if (!ticket) {
    const error = new Error("Support ticket not found");
    error.status = 404;
    throw error;
  }

  await recordAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "ADMIN_REPLY_SUPPORT_TICKET",
    entityType: "support_ticket",
    entityId: ticketId,
    details: { status },
  });

  return { ticket };
};

// ==========================================
// PHASE C: CMS Content, Settings & Audit Logs
// ==========================================

export const getAdminContent = async () => {
  const res = await pool.query("SELECT * FROM site_content ORDER BY key ASC");
  const content = {};
  for (const row of res.rows) {
    content[row.key] = row.value;
  }
  return { items: res.rows, content };
};

export const updateAdminContent = async (actor, { key, value }) => {
  const res = await pool.query(
    `
      INSERT INTO site_content (key, value, updated_by, updated_at)
      VALUES ($1, $2::jsonb, $3, NOW())
      ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
      RETURNING *
    `,
    [key.trim(), JSON.stringify(value), actor.id]
  );

  await recordAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "ADMIN_UPDATE_CONTENT",
    entityType: "site_content",
    entityId: key,
  });

  return { item: res.rows[0] };
};

export const getAdminSettings = async () => {
  const res = await pool.query("SELECT * FROM system_settings ORDER BY key ASC");
  const settings = {};
  for (const row of res.rows) {
    settings[row.key] = redactSecretsDeep(row.value);
  }
  return {
    items: res.rows.map((r) => ({ ...r, value: redactSecretsDeep(r.value) })),
    settings,
  };
};

export const updateAdminSettings = async (
  actor,
  { key, value, is_public = true }
) => {
  const res = await pool.query(
    `
      INSERT INTO system_settings (key, value, is_public, updated_by, updated_at)
      VALUES ($1, $2::jsonb, $3, $4, NOW())
      ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value,
          is_public = EXCLUDED.is_public,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
      RETURNING *
    `,
    [key.trim(), JSON.stringify(value), Boolean(is_public), actor.id]
  );

  await recordAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "ADMIN_UPDATE_SETTINGS",
    entityType: "system_settings",
    entityId: key,
  });

  return {
    item: {
      ...res.rows[0],
      value: redactSecretsDeep(res.rows[0].value),
    },
  };
};

export const getAdminAuditLogs = async ({
  page = 1,
  limit = 30,
  action,
  entity_type,
} = {}) => {
  const params = [];
  const conditions = [];
  if (action) {
    params.push(action);
    conditions.push(`action = $${params.length}`);
  }
  if (entity_type) {
    params.push(entity_type);
    conditions.push(`entity_type = $${params.length}`);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRes = await pool.query(
    `SELECT COUNT(*)::int AS total FROM audit_logs ${where}`,
    params
  );
  const totalItems = countRes.rows[0].total;
  const offset = (page - 1) * limit;

  const res = await pool.query(
    `
      SELECT *
      FROM audit_logs
      ${where}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `,
    [...params, limit, offset]
  );

  return {
    logs: res.rows,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total_items: totalItems,
      total_pages: Math.ceil(totalItems / limit) || 1,
    },
  };
};
