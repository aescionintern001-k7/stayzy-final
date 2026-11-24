import pool from "../../database/pool.js";

export const BOOKING_COLUMNS = [
  "id",
  "property_id",
  "guest_id",
  "check_in_date",
  "check_out_date",
  "total_nights",
  "price_per_night",
  "total_price",
  "currency",
  "guests_count",
  "status",
  "payment_status",
  "cancellation_reason",
  "cancelled_at",
  "cancelled_by",
  "special_requests",
  "created_at",
  "updated_at",
];

const SELECT_BOOKING_SQL = BOOKING_COLUMNS.map((col) => `b.${col}`).join(", ");

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
 * Format a raw database row into a structured booking object with nested property & user info.
 */
const formatBookingRow = (row) => {
  if (!row) return null;

  const booking = {
    id: row.id,
    property_id: row.property_id,
    guest_id: row.guest_id,
    check_in_date: formatDateStr(row.check_in_date),
    check_out_date: formatDateStr(row.check_out_date),
    total_nights: row.total_nights,
    price_per_night: Number.parseFloat(row.price_per_night),
    total_price: Number.parseFloat(row.total_price),
    currency: row.currency,
    guests_count: row.guests_count,
    status: row.status,
    payment_status: row.payment_status || "unpaid",
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

  if (row.guest_full_name !== undefined) {
    booking.guest = {
      id: row.guest_id,
      full_name: row.guest_full_name,
      email: row.guest_email,
      phone: row.guest_phone,
      profile_image_url: row.guest_profile_image_url,
    };
  }

  return booking;
};

/**
 * Create a new booking with transaction and row-level locking for zero race conditions.
 */
export const createBooking = async (guestId, bookingData) => {
  // 1. Verify guest account is active
  const guestRes = await pool.query(
    "SELECT id, account_status FROM users WHERE id = $1 LIMIT 1",
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

  // Calculate nights
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

    // 3. Check for overlapping active bookings:
    // Two intervals [check_in_A, check_out_A) and [check_in_B, check_out_B) overlap iff:
    // check_in_A < check_out_B AND check_out_A > check_in_B
    const overlapRes = await client.query(
      `
        SELECT COUNT(*)::int AS count
        FROM bookings
        WHERE property_id = $1
          AND status IN ('pending', 'confirmed')
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

    // 5. Insert booking
    const insertRes = await client.query(
      `
        INSERT INTO bookings (
          property_id, guest_id, check_in_date, check_out_date,
          total_nights, price_per_night, total_price, currency,
          guests_count, status, special_requests
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'confirmed', $10)
        RETURNING *
      `,
      [
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
      ]
    );

    await client.query("COMMIT");

    const bookingRow = insertRes.rows[0];
    bookingRow.property_title = property.title;
    bookingRow.property_host_id = property.host_id;

    return formatBookingRow(bookingRow);
  } catch (error) {
    await client.query("ROLLBACK");
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
      p.host_id AS property_host_id
    FROM bookings b
    JOIN properties p ON p.id = b.property_id
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
      u.full_name AS guest_full_name,
      u.email AS guest_email,
      u.phone AS guest_phone,
      u.profile_image_url AS guest_profile_image_url
    FROM bookings b
    JOIN properties p ON p.id = b.property_id
    JOIN users u ON u.id = b.guest_id
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

  return formatBookingRow(row);
};

/**
 * Cancel a booking (Guest, Host, or Admin).
 */
export const cancelBooking = async (bookingId, user, { reason } = {}) => {
  const query = `
    SELECT
      b.id,
      b.guest_id,
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

  const updateRes = await pool.query(
    `
      UPDATE bookings
      SET
        status = 'cancelled',
        cancellation_reason = $1,
        cancelled_at = NOW(),
        cancelled_by = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `,
    [reason || null, user.id, bookingId]
  );

  return formatBookingRow(updateRes.rows[0]);
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

  // Validate status transition
  if (existing.status === "cancelled") {
    const error = new Error("Cannot change status of a cancelled booking");
    error.status = 400;
    throw error;
  }

  if (existing.status === "completed") {
    const error = new Error("Cannot change status of a completed booking");
    error.status = 400;
    throw error;
  }

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

  const unitPrice = Number(row.price);
  const depositAmount = Number(row.deposit_amount || 0);
  const foodMonthlyCharge = Number(row.food_monthly_charge || 0);
  const baseAmount = Number((unitPrice * durationCount).toFixed(2));

  let foodCharge = 0;
  if (includeFood && foodMonthlyCharge > 0) {
    if (durationType === "MONTHLY") {
      foodCharge = Number((foodMonthlyCharge * durationCount).toFixed(2));
    } else if (durationType === "DAILY") {
      foodCharge = Number(((foodMonthlyCharge / 30) * durationCount).toFixed(2));
    } else if (durationType === "WEEKLY") {
      foodCharge = Number(((foodMonthlyCharge / 4) * durationCount).toFixed(2));
    } else if (durationType === "YEARLY") {
      foodCharge = Number((foodMonthlyCharge * 12 * durationCount).toFixed(2));
    }
  }

  const taxes = Number(((baseAmount + foodCharge) * 0.12).toFixed(2));
  const totalAmount = Number((baseAmount + foodCharge + taxes + depositAmount).toFixed(2));

  // Calculate start and end date
  const [year, month, day] = startDateStr.split("-").map(Number);
  const [hour, minute] = startTimeStr.split(":").map(Number);
  const startDateTime = new Date(year, (month || 1) - 1, day || 1, hour || 10, minute || 0, 0);
  let endDateTime = new Date(startDateTime);

  if (durationType === "HOURLY") {
    endDateTime.setHours(endDateTime.getHours() + durationCount);
  } else if (durationType === "DAILY") {
    endDateTime.setDate(endDateTime.getDate() + durationCount);
  } else if (durationType === "WEEKLY") {
    endDateTime.setDate(endDateTime.getDate() + durationCount * 7);
  } else if (durationType === "MONTHLY") {
    endDateTime.setMonth(endDateTime.getMonth() + durationCount);
  } else if (durationType === "YEARLY") {
    endDateTime.setFullYear(endDateTime.getFullYear() + durationCount);
  }

  const breakdown = {
    unitLabel:
      durationType === "HOURLY"
        ? "/ hour"
        : durationType === "DAILY"
        ? "/ day"
        : durationType === "WEEKLY"
        ? "/ week"
        : durationType === "MONTHLY"
        ? "/ month"
        : "/ year",
    unitPrice,
    durationCount,
    durationType,
    baseAmount,
    foodCharge,
    taxes,
    depositAmount,
    totalAmount,
    payableNow: totalAmount,
    balanceRemaining: 0,
    startDateTime: startDateTime.toISOString(),
    endDateTime: endDateTime.toISOString(),
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
