import pool from "../../database/pool.js";
import { VALID_VISIT_SLOTS } from "./visits.validator.js";
import { recordAuditLog } from "../../utils/audit.js";

const normalizeIndianPhone = (raw) => {
  const digits = String(raw || "").replace(/\D/g, "");
  let clean10 = digits;
  if (digits.length === 12 && digits.startsWith("91")) {
    clean10 = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    clean10 = digits.slice(1);
  }
  if (clean10.length !== 10 || !/^[6-9]/.test(clean10)) {
    const error = new Error(
      "Please enter a valid 10-digit Indian mobile number starting with 6-9"
    );
    error.status = 400;
    throw error;
  }
  return `+91 ${clean10.slice(0, 5)} ${clean10.slice(5)}`;
};

const normalizeTimeSlot = (slot) => {
  const trimmed = String(slot || "").trim().toUpperCase();
  const matched = VALID_VISIT_SLOTS.find((s) => s.toUpperCase() === trimmed);
  if (!matched) {
    const error = new Error(
      `Invalid time_slot. Allowed walkthrough hours are ${VALID_VISIT_SLOTS[0]} to ${
        VALID_VISIT_SLOTS[VALID_VISIT_SLOTS.length - 1]
      }`
    );
    error.status = 400;
    throw error;
  }
  return matched;
};

export const scheduleVisitService = async (payload, user = null) => {
  const normalizedPhone = normalizeIndianPhone(payload.customer_phone);
  const normalizedSlot = normalizeTimeSlot(payload.time_slot);

  let property = null;
  let roomTypeId = payload.room_type_id || null;

  if (payload.room_type_id || payload.room_slug) {
    const rtRes = await pool.query(
      `
        SELECT rt.id AS room_type_id, rt.name AS room_type_name, p.id AS property_id, p.title, p.city, p.address
        FROM room_types rt
        JOIN properties p ON rt.property_id = p.id
        WHERE ${payload.room_type_id ? "rt.id = $1" : "rt.slug = $1"}
          AND p.status = 'active'
        LIMIT 1
      `,
      [payload.room_type_id || payload.room_slug]
    );
    if (rtRes.rows[0]) {
      roomTypeId = rtRes.rows[0].room_type_id;
      property = {
        id: rtRes.rows[0].property_id,
        title: rtRes.rows[0].title,
        city: rtRes.rows[0].city,
        address: rtRes.rows[0].address,
      };
    }
  }

  if (!property && payload.property_id) {
    const propRes = await pool.query(
      "SELECT id, title, city, address FROM properties WHERE id = $1 AND status = 'active' LIMIT 1",
      [payload.property_id]
    );
    property = propRes.rows[0] || null;
  }

  if (!property && !payload.property_id && !payload.room_type_id && !payload.room_slug) {
    const fallbackRes = await pool.query(
      "SELECT id, title, city, address FROM properties WHERE status = 'active' ORDER BY created_at ASC LIMIT 1"
    );
    property = fallbackRes.rows[0] || null;
  }

  if (!property) {
    const error = new Error("Target property for walkthrough visit was not found");
    error.status = 404;
    throw error;
  }

  const insertRes = await pool.query(
    `
      INSERT INTO visit_requests (
        property_id, room_type_id, user_id,
        customer_name, customer_phone, customer_email,
        preferred_date, time_slot, status, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'scheduled', $9)
      RETURNING *
    `,
    [
      property.id,
      roomTypeId,
      user?.id || null,
      payload.customer_name.trim(),
      normalizedPhone,
      payload.customer_email.trim().toLowerCase(),
      payload.preferred_date,
      normalizedSlot,
      payload.notes ? payload.notes.trim() : null,
    ]
  );

  return {
    visit: {
      ...insertRes.rows[0],
      property_title: property.title,
      property_city: property.city,
      property_address: property.address,
    },
  };
};

export const getMyVisitsService = async (userId) => {
  const res = await pool.query(
    `
      SELECT
        vr.*,
        p.title AS property_title,
        p.city AS property_city,
        p.address AS property_address,
        rt.name AS room_type_name
      FROM visit_requests vr
      JOIN properties p ON vr.property_id = p.id
      LEFT JOIN room_types rt ON vr.room_type_id = rt.id
      WHERE vr.user_id = $1
      ORDER BY vr.preferred_date DESC, vr.created_at DESC
    `,
    [userId]
  );

  return { visits: res.rows };
};

export const getOwnerVisitsService = async (user) => {
  if (user.role !== "host" && user.role !== "admin") {
    const error = new Error("Host or admin access required");
    error.status = 403;
    throw error;
  }

  const params = user.role === "admin" ? [] : [user.id];
  const where = user.role === "admin" ? "" : "WHERE p.host_id = $1";

  const res = await pool.query(
    `
      SELECT
        vr.*,
        p.title AS property_title,
        p.city AS property_city,
        p.host_id AS property_host_id,
        rt.name AS room_type_name
      FROM visit_requests vr
      JOIN properties p ON vr.property_id = p.id
      LEFT JOIN room_types rt ON vr.room_type_id = rt.id
      ${where}
      ORDER BY vr.created_at DESC
    `,
    params
  );

  return { visits: res.rows };
};

export const updateVisitStatusService = async (visitId, user, { status, admin_notes }) => {
  const visitRes = await pool.query(
    `
      SELECT vr.*, p.host_id AS property_host_id
      FROM visit_requests vr
      JOIN properties p ON vr.property_id = p.id
      WHERE vr.id = $1
      LIMIT 1
    `,
    [visitId]
  );

  const visit = visitRes.rows[0];
  if (!visit) {
    const error = new Error("Visit request not found");
    error.status = 404;
    throw error;
  }

  const isGuest = user.id === visit.user_id;
  const isHost = user.id === visit.property_host_id;
  const isAdmin = user.role === "admin";

  if (!isHost && !isAdmin && !(isGuest && status === "cancelled")) {
    const error = new Error("You are not authorized to update this visit request");
    error.status = 403;
    throw error;
  }

  const updateRes = await pool.query(
    `
      UPDATE visit_requests
      SET
        status = $1,
        admin_notes = COALESCE($2, admin_notes),
        updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `,
    [status, admin_notes ?? null, visitId]
  );

  if (isAdmin || isHost) {
    await recordAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      action: "UPDATE_VISIT_STATUS",
      entityType: "visit_request",
      entityId: visitId,
      details: { status },
    });
  }

  return { visit: updateRes.rows[0] };
};
