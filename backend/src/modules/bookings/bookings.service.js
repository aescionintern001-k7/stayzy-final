import crypto from "node:crypto";
import pool from "../../database/pool.js";
import {
  calculateBookingPricing,
  calculateTieredRefund,
  addCalendarDays,
  addCalendarMonths,
  addCalendarYears,
  parseTimeToMinutes,
  GST_RATE,
} from "../../utils/pricing.js";
import {
  findAvailableUnits,
  checkSpecificUnitAvailable,
} from "../../utils/inventory.js";
import { recordAuditLog } from "../../utils/audit.js";

export const BOOKING_COLUMNS = [
  "id",
  "booking_reference",
  "property_id",
  "room_type_id",
  "inventory_unit_id",
  "guest_id",
  "duration_type",
  "duration_count",
  "check_in_date",
  "check_out_date",
  "start_time",
  "end_time",
  "total_nights",
  "price_per_night",
  "base_price",
  "food_charges",
  "taxes",
  "deposit_amount",
  "total_price",
  "payable_now",
  "balance_remaining",
  "currency",
  "guests_count",
  "status",
  "payment_status",
  "guest_name",
  "guest_phone",
  "keyless_code",
  "notes",
  "cancellation_reason",
  "cancelled_at",
  "cancelled_by",
  "special_requests",
  "created_at",
  "updated_at",
];

const SELECT_BOOKING_SQL = `${BOOKING_COLUMNS.map((col) => `b.${col}`).join(", ")}, b.guest_email AS booking_guest_email`;

const generateBookingReference = () => {
  const yr = new Date().getFullYear();
  const hex = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `STY-${yr}-${hex}`;
};

const formatDateStr = (dateVal) => {
  if (!dateVal) return null;
  if (typeof dateVal === "string") return dateVal.split("T")[0];
  if (dateVal instanceof Date) {
    const year = dateVal.getFullYear();
    const month = String(dateVal.getMonth() + 1).padStart(2, "0");
    const day = String(dateVal.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return dateVal;
};

/**
 * Determine whether a booking is eligible to reveal its keyless entry PIN.
 */
export const isKeylessPinEligible = (status, paymentStatus) => {
  const s = String(status || "").toLowerCase();
  const p = String(paymentStatus || "").toLowerCase();
  return (s === "confirmed" || s === "checked_in") && p === "paid";
};

/**
 * Explicit state machine transition allowlist for manual host/admin status updates.
 */
export const ALLOWED_BOOKING_TRANSITIONS = Object.freeze({
  pending: ["confirmed", "cancelled"],
  confirmed: ["checked_in", "completed", "cancelled"],
  checked_in: ["checked_out", "completed", "cancelled"],
  checked_out: ["completed"],
  cancelled: [],
  completed: [],
});

/**
 * Validate whether transitioning a booking from currentStatus -> newStatus is permitted.
 */
export const validateBookingStatusTransition = (currentStatus, newStatus) => {
  const from = String(currentStatus || "").toLowerCase();
  const to = String(newStatus || "").toLowerCase();

  if (from === "cancelled") {
    const error = new Error("Cannot change status of a cancelled booking");
    error.status = 400;
    throw error;
  }
  if (from === "completed") {
    const error = new Error("Cannot change status of a completed booking");
    error.status = 400;
    throw error;
  }
  const allowed = ALLOWED_BOOKING_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    const error = new Error(`Invalid booking status transition from '${from}' to '${to}'`);
    error.status = 400;
    throw error;
  }
};

/**
 * Compute deterministic SHA-256 hash of canonical booking parameters for idempotency checks.
 */
export const computeBookingPayloadHash = (bookingData = {}) => {
  const canonical = {
    property_id: bookingData.property_id || null,
    room_type_id: bookingData.room_type_id || null,
    inventory_unit_id: bookingData.inventory_unit_id || null,
    hold_token: bookingData.hold_token || null,
    duration_type: bookingData.duration_type ? String(bookingData.duration_type).toUpperCase() : null,
    duration_count: bookingData.duration_count !== undefined ? Number(bookingData.duration_count) : null,
    start_date: bookingData.start_date || null,
    start_time: bookingData.start_time || null,
    check_in_date: bookingData.check_in_date || null,
    check_out_date: bookingData.check_out_date || null,
    include_food: Boolean(bookingData.include_food),
    guests_count: Number(bookingData.guests_count || 1),
  };
  return crypto.createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
};

const findExistingIdempotentBooking = async (executor, guestId, idempotencyKey, payloadHash) => {
  if (!idempotencyKey) return null;
  const res = await executor.query(
    `
      SELECT
        b.*,
        b.guest_email AS booking_guest_email,
        p.title AS property_title,
        p.address AS property_address,
        p.city AS property_city,
        p.country AS property_country,
        p.property_type,
        p.images AS property_images,
        p.host_id AS property_host_id,
        rt.name AS room_type_name,
        rt.slug AS room_type_slug,
        rt.category AS room_type_category,
        iu.identifier AS unit_identifier,
        r.room_number AS unit_room_number,
        r.floor AS unit_floor
      FROM bookings b
      JOIN properties p ON b.property_id = p.id
      LEFT JOIN room_types rt ON b.room_type_id = rt.id
      LEFT JOIN inventory_units iu ON b.inventory_unit_id = iu.id
      LEFT JOIN rooms r ON iu.room_id = r.id
      WHERE b.guest_id = $1 AND b.idempotency_key = $2
      LIMIT 1
    `,
    [guestId, idempotencyKey]
  );
  const existing = res.rows[0];
  if (!existing) return null;
  if (
    existing.idempotency_payload_hash &&
    payloadHash &&
    existing.idempotency_payload_hash !== payloadHash
  ) {
    const error = new Error("Idempotency key already used with a different booking payload");
    error.status = 409;
    throw error;
  }
  return formatBookingRow(existing);
};

export const recoverBookingByIdempotencyKey = async (guestId, idempotencyKey) => {
  const booking = await findExistingIdempotentBooking(pool, guestId, idempotencyKey, null);
  if (!booking) {
    const error = new Error("Booking not found for idempotency key");
    error.status = 404;
    throw error;
  }
  return booking;
};

/**
 * Format a raw database row into a structured booking object with nested property & user info.
 */
const formatBookingRow = (row) => {
  if (!row) return null;

  const booking = {
    id: row.id,
    booking_reference: row.booking_reference || null,
    property_id: row.property_id,
    room_type_id: row.room_type_id || null,
    inventory_unit_id: row.inventory_unit_id || null,
    guest_id: row.guest_id,
    duration_type: row.duration_type || null,
    duration_count: row.duration_count ?? null,
    check_in_date: formatDateStr(row.check_in_date),
    check_out_date: formatDateStr(row.check_out_date),
    start_time: row.start_time || null,
    end_time: row.end_time || null,
    total_nights: row.total_nights,
    price_per_night: Number.parseFloat(row.price_per_night),
    base_price: row.base_price !== undefined && row.base_price !== null ? Number.parseFloat(row.base_price) : null,
    food_charges: row.food_charges !== undefined && row.food_charges !== null ? Number.parseFloat(row.food_charges) : 0,
    taxes: row.taxes !== undefined && row.taxes !== null ? Number.parseFloat(row.taxes) : 0,
    deposit_amount: row.deposit_amount !== undefined && row.deposit_amount !== null ? Number.parseFloat(row.deposit_amount) : 0,
    total_price: Number.parseFloat(row.total_price),
    payable_now: row.payable_now !== undefined && row.payable_now !== null ? Number.parseFloat(row.payable_now) : Number.parseFloat(row.total_price),
    balance_remaining: row.balance_remaining !== undefined && row.balance_remaining !== null ? Number.parseFloat(row.balance_remaining) : 0,
    currency: row.currency,
    guests_count: row.guests_count,
    status: row.status,
    payment_status: row.payment_status || "unpaid",
    guest_name: row.guest_name || null,
    guest_email: row.booking_guest_email || null,
    guest_phone: row.guest_phone || null,
    keyless_code: isKeylessPinEligible(row.status, row.payment_status)
      ? row.keyless_code || null
      : null,
    notes: row.notes || null,
    cancellation_reason: row.cancellation_reason,
    cancelled_at: row.cancelled_at,
    cancelled_by: row.cancelled_by,
    special_requests: row.special_requests,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  if (row.property_title !== undefined) {
    booking.property = {
      id: row.property_id,
      title: row.property_title,
      address: row.property_address,
      city: row.property_city,
      country: row.property_country,
      property_type: row.property_type,
      images: Array.isArray(row.property_images)
        ? row.property_images
        : JSON.parse(row.property_images || "[]"),
      host_id: row.property_host_id,
    };
  }

  if (row.room_type_name !== undefined && row.room_type_name !== null) {
    booking.room_type = {
      id: row.room_type_id,
      name: row.room_type_name,
      slug: row.room_type_slug || null,
      category: row.room_type_category || null,
    };
  }

  if (row.unit_identifier !== undefined && row.unit_identifier !== null) {
    booking.unit = {
      id: row.inventory_unit_id,
      identifier: row.unit_identifier,
      room_number: row.unit_room_number || null,
      floor: row.unit_floor ?? null,
    };
  }

  if (row.guest_full_name !== undefined) {
    booking.guest = {
      id: row.guest_id,
      full_name: row.guest_full_name,
      email: row.guest_email,
      phone: row.guest_phone,
      profile_image_url: row.guest_profile_image_url,
    };
  }

  if (Array.isArray(row.schedules)) {
    booking.payment_schedules = row.schedules;
  }

  if (row.refund_summary) {
    booking.refund = row.refund_summary;
  }

  return booking;
};

/**
 * Unified room-type & inventory-hold checkout transaction.
 */
const createUnifiedRoomBooking = async (guestId, guestUser, bookingData) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let holdRecord = null;
    if (bookingData.hold_token) {
      const holdRes = await client.query(
        "SELECT * FROM inventory_holds WHERE token = $1 FOR UPDATE",
        [bookingData.hold_token]
      );
      holdRecord = holdRes.rows[0];

      if (!holdRecord) {
        const error = new Error("Reservation hold not found or already consumed");
        error.status = 404;
        throw error;
      }

      if (new Date(holdRecord.expires_at) <= new Date()) {
        const error = new Error("Your 15-minute checkout hold has expired. Please re-select your room.");
        error.status = 410;
        throw error;
      }

      if (holdRecord.guest_id && holdRecord.guest_id !== guestId) {
        const error = new Error("This hold belongs to another account");
        error.status = 403;
        throw error;
      }
    }

    const roomTypeId = bookingData.room_type_id || holdRecord?.room_type_id;
    const durationType = (
      bookingData.duration_type ||
      holdRecord?.duration_type ||
      "MONTHLY"
    ).toUpperCase();
    const durationCount = Number(
      bookingData.duration_count || holdRecord?.duration_count || 1
    );

    const startDateStr =
      bookingData.start_date ||
      bookingData.check_in_date ||
      (holdRecord?.start_time
        ? new Date(new Date(holdRecord.start_time).getTime() + 330 * 60 * 1000)
            .toISOString()
            .split("T")[0]
        : null);

    let startTimeStr = bookingData.start_time || "10:00";
    if (!bookingData.start_time && holdRecord?.start_time && durationType === "HOURLY") {
      const ist = new Date(new Date(holdRecord.start_time).getTime() + 330 * 60 * 1000);
      startTimeStr = `${String(ist.getUTCHours()).padStart(2, "0")}:${String(
        ist.getUTCMinutes()
      ).padStart(2, "0")}`;
    }

    const rtRes = await client.query(
      `
        SELECT
          rt.*,
          p.id AS property_id,
          p.host_id,
          p.title AS property_title,
          p.currency AS property_currency,
          p.status AS property_status,
          p.is_available AS property_available
        FROM room_types rt
        JOIN properties p ON rt.property_id = p.id
        WHERE rt.id = $1
        FOR UPDATE OF p
      `,
      [roomTypeId]
    );

    const roomType = rtRes.rows[0];

    if (bookingData.idempotency_key) {
      const winner = await findExistingIdempotentBooking(
        client,
        guestId,
        bookingData.idempotency_key,
        bookingData._payloadHash
      );
      if (winner) {
        await client.query("COMMIT");
        return winner;
      }
    }

    if (!roomType || roomType.is_active === false) {
      const error = new Error("Room type not found");
      error.status = 404;
      throw error;
    }

    if (roomType.property_status !== "active" || !roomType.property_available) {
      const error = new Error("Property is not available for booking");
      error.status = 400;
      throw error;
    }

    if (roomType.host_id === guestId) {
      const error = new Error("Hosts cannot book their own property");
      error.status = 400;
      throw error;
    }

    const guestsCount = Number(bookingData.guests_count || 1);
    if (guestsCount > roomType.max_capacity) {
      const error = new Error(
        `Guest count (${guestsCount}) exceeds room maximum capacity of ${roomType.max_capacity}`
      );
      error.status = 400;
      throw error;
    }

    const rateRes = await client.query(
      `
        SELECT *
        FROM rate_plans
        WHERE room_type_id = $1 AND duration_type = $2 AND is_enabled = TRUE
        LIMIT 1
      `,
      [roomTypeId, durationType]
    );
    const ratePlan = rateRes.rows[0];

    const calc = calculateBookingPricing({
      ratePlan,
      durationType,
      durationCount,
      startDateStr,
      startTimeStr,
      includeFood: Boolean(bookingData.include_food),
    });

    if (!calc.success) {
      const error = new Error(calc.error);
      error.status = 400;
      throw error;
    }

    const b = calc.breakdown;
    const requestedUnitId =
      bookingData.inventory_unit_id || holdRecord?.inventory_unit_id || null;

    let selectedUnit;
    if (requestedUnitId) {
      const check = await checkSpecificUnitAvailable(
        requestedUnitId,
        b.startDateTime,
        b.endDateTime,
        {
          executor: client,
          excludeHoldToken: bookingData.hold_token || null,
          lockRow: true,
        }
      );
      if (!check.available || check.unit?.room_type_id !== roomTypeId) {
        const error = new Error(
          check.reason || "Selected bed/unit is not available for this schedule"
        );
        error.status = 409;
        throw error;
      }
      selectedUnit = check.unit;
    } else {
      const availableUnits = await findAvailableUnits(
        roomTypeId,
        b.startDateTime,
        b.endDateTime,
        {
          executor: client,
          excludeHoldToken: bookingData.hold_token || null,
          lockRows: true,
        }
      );
      if (availableUnits.length === 0) {
        const error = new Error(
          "No rooms or beds are available for the selected dates and duration"
        );
        error.status = 409;
        throw error;
      }
      selectedUnit = availableUnits[0];
    }

    const diffMs =
      new Date(b.checkOutDate).getTime() - new Date(b.checkInDate).getTime();
    const totalNights = Math.max(1, Math.round(diffMs / 86400000));
    const pricePerNight = Math.max(0.01, b.unitPrice);
    const bookingReference = generateBookingReference();
    const keylessCode = String(100000 + crypto.randomInt(900000));

    const insertRes = await client.query(
      `
        INSERT INTO bookings (
          booking_reference, property_id, room_type_id, inventory_unit_id, guest_id,
          duration_type, duration_count, check_in_date, check_out_date,
          start_time, end_time, total_nights, price_per_night,
          base_price, food_charges, taxes, deposit_amount, total_price,
          payable_now, balance_remaining, currency, guests_count,
          status, payment_status, guest_name, guest_email, guest_phone,
          keyless_code, special_requests, idempotency_key, idempotency_payload_hash
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12, $13,
          $14, $15, $16, $17, $18,
          $19, $20, $21, $22,
          'pending', 'unpaid', $23, $24, $25,
          $26, $27, $28, $29
        )
        RETURNING *, guest_email AS booking_guest_email
      `,
      [
        bookingReference,
        roomType.property_id,
        roomTypeId,
        selectedUnit.id,
        guestId,
        durationType,
        durationCount,
        b.checkInDate,
        b.checkOutDate,
        b.startDateTime,
        b.endDateTime,
        totalNights,
        pricePerNight,
        b.baseAmount,
        b.foodAmount,
        b.taxes,
        b.depositAmount,
        b.totalAmount,
        b.payableNow,
        b.balanceRemaining,
        roomType.property_currency || "INR",
        guestsCount,
        bookingData.guest_name?.trim() || guestUser.full_name || null,
        bookingData.guest_email?.trim().toLowerCase() || guestUser.email || null,
        bookingData.guest_phone?.trim() || guestUser.phone || null,
        keylessCode,
        bookingData.special_requests || null,
        bookingData.idempotency_key || null,
        bookingData._payloadHash || null,
      ]
    );

    const createdBooking = insertRes.rows[0];
    const insertedSchedules = [];

    for (const item of b.schedule) {
      const schedRes = await client.query(
        `
          INSERT INTO payment_schedules (booking_id, due_date, amount, description, status)
          VALUES ($1, $2, $3, $4, 'PENDING')
          RETURNING *
        `,
        [createdBooking.id, item.dueDate, item.amount, item.description]
      );
      insertedSchedules.push(schedRes.rows[0]);
    }

    if (bookingData.hold_token) {
      await client.query("DELETE FROM inventory_holds WHERE token = $1", [
        bookingData.hold_token,
      ]);
    }

    await client.query("COMMIT");

    createdBooking.property_title = roomType.property_title;
    createdBooking.property_host_id = roomType.host_id;
    createdBooking.room_type_name = roomType.name;
    createdBooking.room_type_slug = roomType.slug;
    createdBooking.room_type_category = roomType.category;
    createdBooking.unit_identifier = selectedUnit.identifier;
    createdBooking.unit_room_number = selectedUnit.room_number;
    createdBooking.unit_floor = selectedUnit.floor;
    createdBooking.schedules = insertedSchedules;

    return formatBookingRow(createdBooking);
  } catch (err) {
    await client.query("ROLLBACK");
    if (err?.code === "23505" && bookingData.idempotency_key) {
      const existing = await findExistingIdempotentBooking(
        pool,
        guestId,
        bookingData.idempotency_key,
        bookingData._payloadHash
      );
      if (existing) return existing;
    }
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Create a new booking with transaction and row-level locking for zero race conditions.
 */
export const createBooking = async (guestId, bookingData) => {
  // 1. Verify guest account is active
  const guestRes = await pool.query(
    "SELECT id, full_name, email, phone, account_status FROM users WHERE id = $1 LIMIT 1",
    [guestId]
  );
  const guest = guestRes.rows[0];

  if (!guest) {
    const error = new Error("Guest user not found");
    error.status = 404;
    throw error;
  }

  if (guest.account_status === "suspended") {
    const error = new Error("Account is suspended");
    error.status = 403;
    throw error;
  }

  const payloadHash = bookingData.idempotency_key
    ? computeBookingPayloadHash(bookingData)
    : null;

  if (bookingData.idempotency_key) {
    const existing = await findExistingIdempotentBooking(
      pool,
      guestId,
      bookingData.idempotency_key,
      payloadHash
    );
    if (existing) return existing;
  }

  if (bookingData.room_type_id || bookingData.hold_token) {
    return createUnifiedRoomBooking(guestId, guest, {
      ...bookingData,
      _payloadHash: payloadHash,
    });
  }

  // Legacy property_id booking path (preserved for full backwards compatibility)
  const checkIn = new Date(bookingData.check_in_date);
  const checkOut = new Date(bookingData.check_out_date);
  const diffTime = checkOut.getTime() - checkIn.getTime();
  const totalNights = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (totalNights < 1) {
    const error = new Error("check_out_date must be after check_in_date");
    error.status = 400;
    throw error;
  }

  // 2. Acquire a dedicated client for atomic transaction with row locking
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Lock the property row with FOR UPDATE to serialize concurrent booking attempts
    const propRes = await client.query(
      `
        SELECT id, host_id, title, price_per_night, currency, max_guests, status, is_available
        FROM properties
        WHERE id = $1
        FOR UPDATE
      `,
      [bookingData.property_id]
    );

    const property = propRes.rows[0];

    if (!property) {
      const error = new Error("Property not found");
      error.status = 404;
      throw error;
    }

    if (property.status !== "active" || !property.is_available) {
      const error = new Error("Property is not available for booking");
      error.status = 400;
      throw error;
    }

    if (property.host_id === guestId) {
      const error = new Error("Hosts cannot book their own property");
      error.status = 400;
      throw error;
    }

    if (bookingData.guests_count > property.max_guests) {
      const error = new Error(
        `Guest count (${bookingData.guests_count}) exceeds property maximum capacity of ${property.max_guests}`
      );
      error.status = 400;
      throw error;
    }

    if (bookingData.idempotency_key) {
      const winner = await findExistingIdempotentBooking(
        client,
        guestId,
        bookingData.idempotency_key,
        payloadHash
      );
      if (winner) {
        await client.query("COMMIT");
        return winner;
      }
    }

    // 3. Check for overlapping active bookings:
    // Two intervals [check_in_A, check_out_A) and [check_in_B, check_out_B) overlap iff:
    // check_in_A < check_out_B AND check_out_A > check_in_B
    const overlapRes = await client.query(
      `
        SELECT COUNT(*)::int AS count
        FROM bookings
        WHERE property_id = $1
          AND status IN ('pending', 'confirmed', 'checked_in')
          AND check_in_date < $2
          AND check_out_date > $3
      `,
      [bookingData.property_id, bookingData.check_out_date, bookingData.check_in_date]
    );

    if (overlapRes.rows[0].count > 0) {
      const error = new Error("Property is already booked for the selected dates");
      error.status = 409;
      throw error;
    }

    // 4. Calculate total price
    const pricePerNight = Number.parseFloat(property.price_per_night);
    const totalPrice = Number((totalNights * pricePerNight).toFixed(2));
    const bookingReference = generateBookingReference();

    // 5. Insert booking
    const insertRes = await client.query(
      `
        INSERT INTO bookings (
          booking_reference, property_id, guest_id, check_in_date, check_out_date,
          start_time, end_time, total_nights, price_per_night, base_price,
          total_price, payable_now, balance_remaining, currency,
          guests_count, status, special_requests, idempotency_key, idempotency_payload_hash
        )
        VALUES (
          $1, $2, $3, $4, $5,
          ($4::date)::timestamptz, ($5::date)::timestamptz, $6, $7, $8,
          $8, $8, 0, $9,
          $10, 'confirmed', $11, $12, $13
        )
        RETURNING *, guest_email AS booking_guest_email
      `,
      [
        bookingReference,
        property.id,
        guestId,
        bookingData.check_in_date,
        bookingData.check_out_date,
        totalNights,
        pricePerNight,
        totalPrice,
        property.currency || "USD",
        bookingData.guests_count,
        bookingData.special_requests || null,
        bookingData.idempotency_key || null,
        payloadHash,
      ]
    );

    await client.query("COMMIT");

    const bookingRow = insertRes.rows[0];
    bookingRow.property_title = property.title;
    bookingRow.property_host_id = property.host_id;

    return formatBookingRow(bookingRow);
  } catch (error) {
    await client.query("ROLLBACK");
    if (error?.code === "23505" && bookingData.idempotency_key) {
      const existing = await findExistingIdempotentBooking(
        pool,
        guestId,
        bookingData.idempotency_key,
        payloadHash
      );
      if (existing) return existing;
    }
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Check availability and calculate pricing for a property and date range.
 */
export const checkPropertyAvailability = async ({
  property_id,
  check_in_date,
  check_out_date,
}) => {
  const propRes = await pool.query(
    "SELECT id, title, price_per_night, currency, max_guests, status, is_available FROM properties WHERE id = $1 LIMIT 1",
    [property_id]
  );
  const property = propRes.rows[0];

  if (!property) {
    const error = new Error("Property not found");
    error.status = 404;
    throw error;
  }

  const checkIn = new Date(check_in_date);
  const checkOut = new Date(check_out_date);
  const diffTime = checkOut.getTime() - checkIn.getTime();
  const totalNights = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (totalNights < 1) {
    const error = new Error("check_out_date must be after check_in_date");
    error.status = 400;
    throw error;
  }

  if (property.status !== "active" || !property.is_available) {
    return {
      available: false,
      property_id,
      reason: "Property is not available for booking",
    };
  }

  const overlapRes = await pool.query(
    `
      SELECT COUNT(*)::int AS count
      FROM bookings
      WHERE property_id = $1
        AND status IN ('pending', 'confirmed')
        AND check_in_date < $2
        AND check_out_date > $3
    `,
    [property_id, check_out_date, check_in_date]
  );

  const isAvailable = overlapRes.rows[0].count === 0;
  const pricePerNight = Number.parseFloat(property.price_per_night);
  const totalPrice = Number((totalNights * pricePerNight).toFixed(2));

  return {
    available: isAvailable,
    property_id,
    check_in_date,
    check_out_date,
    total_nights: totalNights,
    price_per_night: pricePerNight,
    total_price: totalPrice,
    currency: property.currency,
    max_guests: property.max_guests,
    reason: isAvailable ? null : "Dates are already booked",
  };
};

/**
 * Retrieve booking history for the authenticated guest.
 */
export const getGuestBookings = async (guestId, { page = 1, limit = 10, status } = {}) => {
  const whereClauses = ["b.guest_id = $1"];
  const queryParams = [guestId];
  let paramIndex = 2;

  if (status) {
    whereClauses.push(`b.status = $${paramIndex}`);
    queryParams.push(status);
    paramIndex++;
  }

  const whereSql = `WHERE ${whereClauses.join(" AND ")}`;

  const countRes = await pool.query(
    `SELECT COUNT(*)::int AS total FROM bookings b ${whereSql}`,
    queryParams
  );
  const total = countRes.rows[0].total;

  const offset = (page - 1) * limit;
  const dataParams = [...queryParams, limit, offset];
  const query = `
    SELECT
      ${SELECT_BOOKING_SQL},
      p.title AS property_title,
      p.address AS property_address,
      p.city AS property_city,
      p.country AS property_country,
      p.property_type AS property_type,
      p.images AS property_images,
      p.host_id AS property_host_id,
      rt.name AS room_type_name,
      rt.slug AS room_type_slug,
      rt.category AS room_type_category,
      iu.identifier AS unit_identifier,
      rm.room_number AS unit_room_number,
      rm.floor AS unit_floor
    FROM bookings b
    JOIN properties p ON p.id = b.property_id
    LEFT JOIN room_types rt ON rt.id = b.room_type_id
    LEFT JOIN inventory_units iu ON iu.id = b.inventory_unit_id
    LEFT JOIN rooms rm ON rm.id = iu.room_id
    ${whereSql}
    ORDER BY b.created_at DESC, b.id ASC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  const dataRes = await pool.query(query, dataParams);
  const total_pages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    bookings: dataRes.rows.map(formatBookingRow),
    pagination: {
      total,
      page,
      limit,
      total_pages,
    },
  };
};

/**
 * Retrieve aggregated reservations across all properties owned by the authenticated host (or admin).
 */
export const getOwnerReservations = async (user, { page = 1, limit = 20, status } = {}) => {
  if (user.role !== "host" && user.role !== "admin") {
    const error = new Error("Only hosts or administrators can access owner reservations");
    error.status = 403;
    throw error;
  }

  const whereClauses = user.role === "admin" ? [] : ["p.host_id = $1"];
  const queryParams = user.role === "admin" ? [] : [user.id];

  if (status) {
    queryParams.push(status);
    whereClauses.push(`b.status = $${queryParams.length}`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const countRes = await pool.query(
    `SELECT COUNT(*)::int AS total FROM bookings b JOIN properties p ON p.id = b.property_id ${whereSql}`,
    queryParams
  );
  const total = countRes.rows[0].total;

  const offset = (page - 1) * limit;
  const dataParams = [...queryParams, limit, offset];
  const listRes = await pool.query(
    `
      SELECT
        ${SELECT_BOOKING_SQL},
        p.title AS property_title,
        p.address AS property_address,
        p.city AS property_city,
        p.country AS property_country,
        p.property_type AS property_type,
        p.images AS property_images,
        p.host_id AS property_host_id,
        rt.name AS room_type_name,
        rt.slug AS room_type_slug,
        rt.category AS room_type_category,
        iu.identifier AS unit_identifier,
        rm.room_number AS unit_room_number,
        rm.floor AS unit_floor,
        u.full_name AS guest_full_name,
        u.email AS guest_email,
        u.phone AS guest_phone,
        u.profile_image_url AS guest_profile_image_url
      FROM bookings b
      JOIN properties p ON p.id = b.property_id
      JOIN users u ON u.id = b.guest_id
      LEFT JOIN room_types rt ON rt.id = b.room_type_id
      LEFT JOIN inventory_units iu ON iu.id = b.inventory_unit_id
      LEFT JOIN rooms rm ON rm.id = iu.room_id
      ${whereSql}
      ORDER BY b.created_at DESC, b.id ASC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `,
    dataParams
  );

  return {
    reservations: listRes.rows.map(formatBookingRow),
    pagination: {
      total,
      page,
      limit,
      total_pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
};

/**
 * Retrieve all reservations for a specific property owned by the authenticated host.
 */
export const getPropertyReservations = async (
  propertyId,
  user,
  { page = 1, limit = 10, status } = {}
) => {
  const propRes = await pool.query(
    "SELECT id, host_id, title FROM properties WHERE id = $1 LIMIT 1",
    [propertyId]
  );
  const property = propRes.rows[0];

  if (!property) {
    const error = new Error("Property not found");
    error.status = 404;
    throw error;
  }

  const isOwner = user.id === property.host_id;
  const isAdmin = user.role === "admin";

  if (!isOwner && !isAdmin) {
    const error = new Error("You do not have permission to view reservations for this property");
    error.status = 403;
    throw error;
  }

  const whereClauses = ["b.property_id = $1"];
  const queryParams = [propertyId];
  let paramIndex = 2;

  if (status) {
    whereClauses.push(`b.status = $${paramIndex}`);
    queryParams.push(status);
    paramIndex++;
  }

  const whereSql = `WHERE ${whereClauses.join(" AND ")}`;

  const countRes = await pool.query(
    `SELECT COUNT(*)::int AS total FROM bookings b ${whereSql}`,
    queryParams
  );
  const total = countRes.rows[0].total;

  const offset = (page - 1) * limit;
  const dataParams = [...queryParams, limit, offset];
  const query = `
    SELECT
      ${SELECT_BOOKING_SQL},
      u.full_name AS guest_full_name,
      u.email AS guest_email,
      u.phone AS guest_phone,
      u.profile_image_url AS guest_profile_image_url
    FROM bookings b
    JOIN users u ON u.id = b.guest_id
    ${whereSql}
    ORDER BY b.check_in_date ASC, b.id ASC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  const dataRes = await pool.query(query, dataParams);
  const total_pages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    reservations: dataRes.rows.map(formatBookingRow),
    property: {
      id: property.id,
      title: property.title,
    },
    pagination: {
      total,
      page,
      limit,
      total_pages,
    },
  };
};

/**
 * Retrieve booking details by ID with ownership enforcement.
 */
export const getBookingById = async (bookingId, user) => {
  const query = `
    SELECT
      ${SELECT_BOOKING_SQL},
      p.title AS property_title,
      p.address AS property_address,
      p.city AS property_city,
      p.country AS property_country,
      p.property_type AS property_type,
      p.images AS property_images,
      p.host_id AS property_host_id,
      rt.name AS room_type_name,
      rt.slug AS room_type_slug,
      rt.category AS room_type_category,
      iu.identifier AS unit_identifier,
      rm.room_number AS unit_room_number,
      rm.floor AS unit_floor,
      u.full_name AS guest_full_name,
      u.email AS guest_email,
      u.phone AS guest_phone,
      u.profile_image_url AS guest_profile_image_url
    FROM bookings b
    JOIN properties p ON p.id = b.property_id
    JOIN users u ON u.id = b.guest_id
    LEFT JOIN room_types rt ON rt.id = b.room_type_id
    LEFT JOIN inventory_units iu ON iu.id = b.inventory_unit_id
    LEFT JOIN rooms rm ON rm.id = iu.room_id
    WHERE b.id = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [bookingId]);
  const row = result.rows[0];

  if (!row) {
    const error = new Error("Booking not found");
    error.status = 404;
    throw error;
  }

  const isGuest = user.id === row.guest_id;
  const isHost = user.id === row.property_host_id;
  const isAdmin = user.role === "admin";

  if (!isGuest && !isHost && !isAdmin) {
    const error = new Error("You do not have permission to view this booking");
    error.status = 403;
    throw error;
  }

  const schedRes = await pool.query(
    "SELECT id, due_date, amount, description, status, paid_at FROM payment_schedules WHERE booking_id = $1 ORDER BY due_date ASC",
    [bookingId]
  );
  if (schedRes.rows.length > 0) {
    row.schedules = schedRes.rows.map((s) => ({
      ...s,
      due_date: formatDateStr(s.due_date),
      amount: Number.parseFloat(s.amount),
    }));
  }

  return formatBookingRow(row);
};

/**
 * Cancel a booking (Guest, Host, or Admin) with tiered refund calculation & schedule cleanup.
 */
export const cancelBooking = async (bookingId, user, { reason } = {}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
        SELECT
          b.*,
          b.guest_email AS booking_guest_email,
          p.host_id AS property_host_id
        FROM bookings b
        JOIN properties p ON p.id = b.property_id
        WHERE b.id = $1
        FOR UPDATE OF b
      `,
      [bookingId]
    );
    const existing = result.rows[0];

    if (!existing) {
      const error = new Error("Booking not found");
      error.status = 404;
      throw error;
    }

    const isGuest = user.id === existing.guest_id;
    const isHost = user.id === existing.property_host_id;
    const isAdmin = user.role === "admin";

    if (!isGuest && !isHost && !isAdmin) {
      const error = new Error("You do not have permission to cancel this booking");
      error.status = 403;
      throw error;
    }

    if (existing.status === "cancelled") {
      const error = new Error("Booking is already cancelled");
      error.status = 400;
      throw error;
    }

    if (existing.status === "completed") {
      const error = new Error("Cannot cancel a completed booking");
      error.status = 400;
      throw error;
    }

    const paidRes = await client.query(
      `
        SELECT id, amount, COALESCE(refund_amount, 0) AS refund_amount
        FROM payments
        WHERE booking_id = $1 AND status = 'captured'
        ORDER BY created_at DESC
      `,
      [bookingId]
    );

    const netPaid = paidRes.rows.reduce(
      (sum, row) =>
        sum +
        Math.max(
          0,
          Number.parseFloat(row.amount) - Number.parseFloat(row.refund_amount || 0)
        ),
      0
    );

    const tiered = calculateTieredRefund({
      startTime: existing.start_time || existing.check_in_date,
      paidAmount: netPaid,
      basePrice:
        existing.base_price && Number.parseFloat(existing.base_price) > 0
          ? Number.parseFloat(existing.base_price)
          : Number.parseFloat(existing.total_price),
      depositAmount: Number.parseFloat(existing.deposit_amount || 0),
    });

    const updateRes = await client.query(
      `
        UPDATE bookings
        SET
          status = 'cancelled',
          cancellation_reason = $1,
          cancelled_at = NOW(),
          cancelled_by = $2,
          updated_at = NOW()
        WHERE id = $3
        RETURNING *, guest_email AS booking_guest_email
      `,
      [reason || null, user.id, bookingId]
    );

    await client.query(
      `
        UPDATE payment_schedules
        SET status = 'CANCELLED', updated_at = NOW()
        WHERE booking_id = $1 AND status = 'PENDING'
      `,
      [bookingId]
    );

    let createdRefund = null;
    if (tiered.refundAmount > 0) {
      const latestPaymentId = paidRes.rows[0]?.id || null;
      const refundRes = await client.query(
        `
          INSERT INTO refunds (booking_id, payment_id, amount, reason, status, requested_by)
          VALUES ($1, $2, $3, $4, 'REQUESTED', $5)
          RETURNING *
        `,
        [
          bookingId,
          latestPaymentId,
          tiered.refundAmount,
          `${tiered.policyTier}${reason ? `: ${reason}` : ""}`,
          user.id,
        ]
      );
      createdRefund = {
        ...refundRes.rows[0],
        amount: Number.parseFloat(refundRes.rows[0].amount),
        policy_tier: tiered.policyTier,
        hours_until_check_in: tiered.hoursUntilCheckIn,
      };
    }

    await recordAuditLog(
      {
        actorId: user.id,
        actorEmail: user.email,
        action: "CANCEL_BOOKING",
        entityType: "booking",
        entityId: bookingId,
        details: {
          reason: reason || null,
          policyTier: tiered.policyTier,
          refundAmount: tiered.refundAmount,
        },
      },
      client
    );

    await client.query("COMMIT");

    const updated = updateRes.rows[0];
    updated.refund_summary = createdRefund || {
      amount: 0,
      policy_tier: tiered.policyTier,
      hours_until_check_in: tiered.hoursUntilCheckIn,
    };

    return formatBookingRow(updated);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Extend an active booking stay (HOURLY / DAILY / WEEKLY / MONTHLY / YEARLY)
 * with 60-minute buffer conflict checks and delta pricing.
 */
export const extendBooking = async (
  bookingId,
  user,
  { additional_count, include_food } = {}
) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const res = await client.query(
      `
        SELECT b.*, b.guest_email AS booking_guest_email, p.host_id AS property_host_id
        FROM bookings b
        JOIN properties p ON b.property_id = p.id
        WHERE b.id = $1
        FOR UPDATE OF b
      `,
      [bookingId]
    );

    const existing = res.rows[0];
    if (!existing) {
      const error = new Error("Booking not found");
      error.status = 404;
      throw error;
    }

    const isGuest = user.id === existing.guest_id;
    const isHost = user.id === existing.property_host_id;
    const isAdmin = user.role === "admin";
    if (!isGuest && !isHost && !isAdmin) {
      const error = new Error("You do not have permission to extend this booking");
      error.status = 403;
      throw error;
    }

    if (["cancelled", "completed", "checked_out"].includes(existing.status)) {
      const error = new Error(`Cannot extend a booking in '${existing.status}' status`);
      error.status = 400;
      throw error;
    }

    const durationType = (existing.duration_type || "DAILY").toUpperCase();
    const addCount = Number(additional_count);

    let unitPrice = Number.parseFloat(existing.price_per_night);
    let foodMonthlyCharge = 0;
    let allowedHoursEnd = "22:00";

    if (existing.room_type_id && existing.duration_type) {
      const rpRes = await client.query(
        `
          SELECT * FROM rate_plans
          WHERE room_type_id = $1 AND duration_type = $2 AND is_enabled = TRUE
          LIMIT 1
        `,
        [existing.room_type_id, durationType]
      );
      if (rpRes.rows[0]) {
        unitPrice = Number.parseFloat(rpRes.rows[0].price);
        foodMonthlyCharge = Number.parseFloat(rpRes.rows[0].food_monthly_charge || 0);
        allowedHoursEnd = rpRes.rows[0].allowed_hours_end || "22:00";
      }
    }

    const currentEnd = new Date(existing.end_time || existing.check_out_date);
    const oldCheckOutYmd = formatDateStr(existing.check_out_date);
    let newCheckOutYmd = oldCheckOutYmd;
    let newEnd;

    if (durationType === "HOURLY") {
      newEnd = new Date(currentEnd.getTime() + addCount * 3600 * 1000);
      const endIst = new Date(newEnd.getTime() + 330 * 60 * 1000);
      const endMinutes = endIst.getUTCHours() * 60 + endIst.getUTCMinutes();
      const maxMinutes = parseTimeToMinutes(allowedHoursEnd) ?? 22 * 60;
      const startIst = new Date(
        new Date(existing.start_time || existing.check_in_date).getTime() + 330 * 60 * 1000
      );
      if (
        endIst.getUTCDate() !== startIst.getUTCDate() ||
        endMinutes > maxMinutes
      ) {
        const error = new Error(
          `Hourly extensions must conclude by ${allowedHoursEnd} on the same day`
        );
        error.status = 400;
        throw error;
      }
    } else if (durationType === "DAILY") {
      newCheckOutYmd = addCalendarDays(oldCheckOutYmd, addCount);
      newEnd = new Date(`${newCheckOutYmd}T11:00:00+05:30`);
    } else if (durationType === "WEEKLY") {
      newCheckOutYmd = addCalendarDays(oldCheckOutYmd, addCount * 7);
      newEnd = new Date(`${newCheckOutYmd}T11:00:00+05:30`);
    } else if (durationType === "MONTHLY") {
      newCheckOutYmd = addCalendarMonths(oldCheckOutYmd, addCount);
      newEnd = new Date(`${newCheckOutYmd}T11:00:00+05:30`);
    } else if (durationType === "YEARLY") {
      newCheckOutYmd = addCalendarYears(oldCheckOutYmd, addCount);
      newEnd = new Date(`${newCheckOutYmd}T11:00:00+05:30`);
    }

    if (existing.inventory_unit_id) {
      const avail = await checkSpecificUnitAvailable(
        existing.inventory_unit_id,
        currentEnd.toISOString(),
        newEnd.toISOString(),
        {
          executor: client,
          excludeBookingId: existing.id,
          lockRow: true,
        }
      );
      if (!avail.available) {
        const error = new Error(
          avail.reason || "Unit is not available for the extended period"
        );
        error.status = 409;
        throw error;
      }
    } else {
      const propOverlap = await client.query(
        `
          SELECT id FROM bookings
          WHERE property_id = $1
            AND id <> $2
            AND status IN ('pending', 'confirmed', 'checked_in')
            AND check_in_date < $3
            AND check_out_date > $4
          LIMIT 1
        `,
        [existing.property_id, existing.id, newCheckOutYmd, oldCheckOutYmd]
      );
      if (propOverlap.rows.length > 0) {
        const error = new Error("Property has conflicting reservations for the extended dates");
        error.status = 409;
        throw error;
      }
    }

    const withFood =
      include_food !== undefined
        ? Boolean(include_food)
        : Number.parseFloat(existing.food_charges || 0) > 0;

    const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
    const deltaBase = round2(unitPrice * addCount);
    let deltaFood = 0;
    if (withFood && foodMonthlyCharge > 0) {
      if (durationType === "MONTHLY") deltaFood = round2(foodMonthlyCharge * addCount);
      else if (durationType === "WEEKLY") deltaFood = round2((foodMonthlyCharge / 4) * addCount);
      else if (durationType === "DAILY") deltaFood = round2((foodMonthlyCharge / 30) * addCount);
      else if (durationType === "YEARLY") deltaFood = round2(foodMonthlyCharge * 12 * addCount);
    }

    const deltaTax = round2((deltaBase + deltaFood) * GST_RATE);
    const deltaTotal = round2(deltaBase + deltaFood + deltaTax);

    const newDurationCount = (existing.duration_count || 1) + addCount;
    const newTotalNights = Math.max(
      existing.total_nights,
      Math.round(
        (new Date(newCheckOutYmd).getTime() -
          new Date(formatDateStr(existing.check_in_date)).getTime()) /
          86400000
      ) || 1
    );

    const updatedRes = await client.query(
      `
        UPDATE bookings
        SET
          check_out_date = $1,
          end_time = $2,
          duration_count = $3,
          total_nights = $4,
          base_price = COALESCE(base_price, 0) + $5,
          food_charges = COALESCE(food_charges, 0) + $6,
          taxes = COALESCE(taxes, 0) + $7,
          total_price = total_price + $8,
          balance_remaining = COALESCE(balance_remaining, 0) + $8,
          updated_at = NOW()
        WHERE id = $9
        RETURNING *, guest_email AS booking_guest_email
      `,
      [
        newCheckOutYmd,
        newEnd.toISOString(),
        newDurationCount,
        newTotalNights,
        deltaBase,
        deltaFood,
        deltaTax,
        deltaTotal,
        existing.id,
      ]
    );

    await recordAuditLog(
      {
        actorId: user.id,
        actorEmail: user.email,
        action: "EXTEND_BOOKING",
        entityType: "booking",
        entityId: existing.id,
        details: { durationType, addCount, deltaTotal, newCheckOutYmd },
      },
      client
    );

    await client.query("COMMIT");

    return {
      booking: formatBookingRow(updatedRes.rows[0]),
      extension: {
        duration_type: durationType,
        additional_count: addCount,
        delta_base: deltaBase,
        delta_food: deltaFood,
        delta_tax: deltaTax,
        delta_total: deltaTotal,
        new_check_out_date: newCheckOutYmd,
        new_end_time: newEnd.toISOString(),
      },
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Update booking status (Host or Admin).
 */
export const updateBookingStatus = async (bookingId, newStatus, user, { reason } = {}) => {
  const query = `
    SELECT
      b.id,
      b.status,
      p.host_id AS property_host_id
    FROM bookings b
    JOIN properties p ON p.id = b.property_id
    WHERE b.id = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [bookingId]);
  const existing = result.rows[0];

  if (!existing) {
    const error = new Error("Booking not found");
    error.status = 404;
    throw error;
  }

  const isHost = user.id === existing.property_host_id;
  const isAdmin = user.role === "admin";

  if (!isHost && !isAdmin) {
    const error = new Error("You do not have permission to update this booking's status");
    error.status = 403;
    throw error;
  }

  // Validate status transition via explicit allowlist
  validateBookingStatusTransition(existing.status, newStatus);

  const updateParams = [newStatus, bookingId];
  let updateSql;

  if (newStatus === "cancelled") {
    updateSql = `
      UPDATE bookings
      SET
        status = $1,
        cancellation_reason = $3,
        cancelled_at = NOW(),
        cancelled_by = $4,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    updateParams.push(reason || null, user.id);
  } else {
    updateSql = `
      UPDATE bookings
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
  }

  const updateRes = await pool.query(updateSql, updateParams);
  return formatBookingRow(updateRes.rows[0]);
};

/**
 * Authoritatively calculate booking price and breakdown across multi-duration rate plans.
 */
export const calculatePricingService = async (params) => {
  const roomTypeId = params.room_type_id || params.roomTypeId || params.property_id || params.propertyId;
  const durationType = (params.duration_type || params.durationType || "MONTHLY").toUpperCase();
  const startDateStr = params.start_date || params.startDate || new Date().toISOString().split("T")[0];
  const startTimeStr = params.start_time || params.startTime || "10:00";
  const durationCount = Number(params.duration_count || params.durationCount || 1);
  const includeFood = Boolean(params.include_food ?? params.includeFood ?? false);

  if (!roomTypeId) {
    const error = new Error("roomTypeId or propertyId is required");
    error.status = 400;
    throw error;
  }

  // 1. Try to find authoritative rate plan in PostgreSQL
  const query = `
    SELECT 
      rp.id as rate_plan_id,
      rp.duration_type,
      rp.price,
      rp.is_enabled,
      rp.min_duration,
      rp.max_duration,
      rp.allowed_hours_start,
      rp.allowed_hours_end,
      rp.deposit_amount,
      rp.food_monthly_charge,
      rp.electricity_rule,
      rp.notes,
      rt.id as room_type_id,
      rt.name as room_type_name,
      rt.category,
      p.id as property_id,
      p.title as property_title,
      p.price_per_night,
      p.currency
    FROM rate_plans rp
    JOIN room_types rt ON rp.room_type_id = rt.id
    JOIN properties p ON rt.property_id = p.id
    WHERE (rt.id = $1 OR rt.property_id = $1 OR p.id = $1)
      AND rp.duration_type = $2
      AND rp.is_enabled = true
    ORDER BY rp.created_at ASC
    LIMIT 1;
  `;

  let res = await pool.query(query, [roomTypeId, durationType]);
  let row = res.rows[0];

  // 2. Fallback to property base rate if room_types or explicit rate_plans don't exist
  if (!row) {
    const propRes = await pool.query(
      "SELECT id, title, price_per_night, currency FROM properties WHERE id = $1 LIMIT 1",
      [roomTypeId]
    );
    const prop = propRes.rows[0];
    if (prop) {
      const pricePerNight = Number.parseFloat(prop.price_per_night) || 1000;
      let price = pricePerNight;
      let deposit = 0;
      if (durationType === "HOURLY") {
        price = Math.max(100, Math.round(pricePerNight / 10));
      } else if (durationType === "DAILY") {
        price = pricePerNight;
        deposit = 500;
      } else if (durationType === "WEEKLY") {
        price = Math.max(2500, Math.round(pricePerNight * 6));
        deposit = 2000;
      } else if (durationType === "MONTHLY") {
        price = Math.max(8000, Math.round(pricePerNight * 25));
        deposit = Math.round(price * 0.5);
      } else if (durationType === "YEARLY") {
        price = Math.max(90000, Math.round(pricePerNight * 250));
        deposit = Math.round(price * 0.1);
      }

      row = {
        rate_plan_id: null,
        duration_type: durationType,
        price,
        is_enabled: true,
        min_duration: 1,
        max_duration: null,
        allowed_hours_start: "08:00",
        allowed_hours_end: "22:00",
        deposit_amount: deposit,
        food_monthly_charge: 3000,
        electricity_rule: "Included in rent",
        notes: null,
        room_type_id: null,
        room_type_name: prop.title,
        property_id: prop.id,
        property_title: prop.title,
        price_per_night: pricePerNight,
        currency: prop.currency || "INR",
      };
    }
  }

  if (!row) {
    const error = new Error(`Duration "${durationType}" is not offered for this room or property.`);
    error.status = 404;
    throw error;
  }

  const calc = calculateBookingPricing({
    ratePlan: {
      durationType: row.duration_type,
      price: Number(row.price),
      isEnabled: row.is_enabled ?? true,
      minDuration: Number(row.min_duration || 1),
      maxDuration: row.max_duration ? Number(row.max_duration) : null,
      allowedHoursStart: row.allowed_hours_start || "08:00",
      allowedHoursEnd: row.allowed_hours_end || "22:00",
      depositAmount: Number(row.deposit_amount || 0),
      foodMonthlyCharge: Number(row.food_monthly_charge || 0),
    },
    durationType,
    durationCount,
    startDateStr,
    startTimeStr,
    includeFood,
  });

  if (!calc.success) {
    const error = new Error(calc.error);
    error.status = 400;
    throw error;
  }

  const depositAmount = Number(row.deposit_amount || 0);
  const foodMonthlyCharge = Number(row.food_monthly_charge || 0);
  const unitPrice = Number(row.price);

  const breakdown = {
    ...calc.breakdown,
    currency: row.currency || "INR",
  };

  const ratePlan = {
    id: row.rate_plan_id,
    durationType: row.duration_type,
    price: unitPrice,
    minDuration: Number(row.min_duration || 1),
    maxDuration: row.max_duration ? Number(row.max_duration) : null,
    allowedHoursStart: row.allowed_hours_start || "08:00",
    allowedHoursEnd: row.allowed_hours_end || "22:00",
    depositAmount,
    foodMonthlyCharge,
    electricityRule: row.electricity_rule || "Included in rent",
    notes: row.notes || null,
  };

  return { breakdown, ratePlan };
};
