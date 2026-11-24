import pool from "../../database/pool.js";
import { deleteReview } from "../reviews/reviews.service.js";

/**
 * Administrative platform dashboard statistics.
 * Aggregates real database records into structured platform metrics.
 */
export const getDashboardStats = async () => {
  // 1. Users overview
  const userStatsRes = await pool.query(`
    SELECT
      COUNT(*)::int AS total_users,
      COUNT(*) FILTER (WHERE role = 'guest')::int AS guests_count,
      COUNT(*) FILTER (WHERE role = 'host')::int AS hosts_count,
      COUNT(*) FILTER (WHERE role = 'admin')::int AS admins_count,
      COUNT(*) FILTER (WHERE account_status = 'active')::int AS active_users,
      COUNT(*) FILTER (WHERE account_status = 'suspended')::int AS suspended_users
    FROM users
  `);
  const userStats = userStatsRes.rows[0];

  // 2. Properties overview
  const propStatsRes = await pool.query(`
    SELECT
      COUNT(*)::int AS total_properties,
      COUNT(*) FILTER (WHERE status = 'active')::int AS active_properties,
      COUNT(*) FILTER (WHERE status = 'inactive')::int AS inactive_properties,
      COUNT(*) FILTER (WHERE status = 'archived')::int AS archived_properties,
      COUNT(*) FILTER (WHERE status = 'draft')::int AS draft_properties,
      COUNT(*) FILTER (WHERE is_available = true)::int AS available_properties
    FROM properties
  `);
  const propStats = propStatsRes.rows[0];

  // 3. Bookings overview
  const bookingStatsRes = await pool.query(`
    SELECT
      COUNT(*)::int AS total_bookings,
      COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_bookings,
      COUNT(*) FILTER (WHERE status = 'confirmed')::int AS confirmed_bookings,
      COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_bookings,
      COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_bookings,
      COUNT(*) FILTER (WHERE payment_status = 'paid')::int AS paid_bookings,
      COUNT(*) FILTER (WHERE payment_status = 'unpaid')::int AS unpaid_bookings,
      COUNT(*) FILTER (WHERE payment_status = 'refunded')::int AS refunded_bookings
    FROM bookings
  `);
  const bookingStats = bookingStatsRes.rows[0];

  // 4. Financial & Revenue overview (segregated by currency)
  const revenueStatsRes = await pool.query(`
    SELECT
      currency,
      COUNT(*)::int AS total_transactions,
      COUNT(*) FILTER (WHERE status = 'captured')::int AS captured_transactions,
      COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_transactions,
      COUNT(*) FILTER (WHERE status = 'refunded')::int AS refunded_transactions,
      COALESCE(SUM(amount) FILTER (WHERE status IN ('captured', 'refunded')), 0.00)::numeric(12, 2) AS gross_revenue,
      COALESCE(SUM(refund_amount), 0.00)::numeric(12, 2) AS total_refunded,
      COALESCE(
        SUM(amount) FILTER (WHERE status IN ('captured', 'refunded')) - SUM(refund_amount),
        0.00
      )::numeric(12, 2) AS net_revenue
    FROM payments
    GROUP BY currency
  `);

  const revenueByCurrency = {};
  for (const row of revenueStatsRes.rows) {
    revenueByCurrency[row.currency] = {
      total_transactions: Number.parseInt(row.total_transactions, 10),
      captured_transactions: Number.parseInt(row.captured_transactions, 10),
      failed_transactions: Number.parseInt(row.failed_transactions, 10),
      refunded_transactions: Number.parseInt(row.refunded_transactions, 10),
      gross_revenue: Number.parseFloat(row.gross_revenue),
      total_refunded: Number.parseFloat(row.total_refunded),
      net_revenue: Number.parseFloat(row.net_revenue),
    };
  }

  // 5. Reviews overview
  const reviewStatsRes = await pool.query(`
    SELECT
      COUNT(*)::int AS total_reviews,
      COALESCE(ROUND(AVG(rating)::numeric, 2), 0.00)::float AS average_rating
    FROM reviews
  `);
  const reviewStats = reviewStatsRes.rows[0];

  return {
    users: userStats,
    properties: propStats,
    bookings: bookingStats,
    financials: revenueByCurrency,
    reviews: {
      total_reviews: reviewStats.total_reviews,
      average_rating: Number.parseFloat(reviewStats.average_rating),
    },
  };
};

/**
 * List all properties platform-wide with administrative filters.
 */
export const getAdminProperties = async ({
  page = 1,
  limit = 10,
  status,
  search,
  city,
}) => {
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];

  if (status) {
    params.push(status);
    conditions.push(`p.status = $${params.length}`);
  }

  if (city) {
    params.push(city);
    conditions.push(`p.city ILIKE $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    conditions.push(
      `(p.title ILIKE $${params.length} OR p.description ILIKE $${params.length} OR u.email ILIKE $${params.length})`
    );
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRes = await pool.query(
    `SELECT COUNT(*)::int AS total FROM properties p JOIN users u ON p.host_id = u.id ${whereClause}`,
    params
  );
  const totalItems = countRes.rows[0].total;

  params.push(limit, offset);
  const listRes = await pool.query(
    `
      SELECT p.*,
             u.full_name AS host_name,
             u.email AS host_email,
             admin_user.full_name AS moderated_by_name
      FROM properties p
      JOIN users u ON p.host_id = u.id
      LEFT JOIN users admin_user ON p.moderated_by = admin_user.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `,
    params
  );

  return {
    properties: listRes.rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      property_type: row.property_type,
      room_type: row.room_type,
      price_per_night: Number.parseFloat(row.price_per_night),
      currency: row.currency,
      address: row.address,
      city: row.city,
      country: row.country,
      status: row.status,
      is_available: row.is_available,
      average_rating: Number.parseFloat(row.average_rating || 0),
      reviews_count: Number.parseInt(row.reviews_count || 0, 10),
      moderation_note: row.moderation_note,
      moderated_at: row.moderated_at,
      moderated_by: row.moderated_by_name,
      host: {
        id: row.host_id,
        name: row.host_name,
        email: row.host_email,
      },
      created_at: row.created_at,
      updated_at: row.updated_at,
    })),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total_items: totalItems,
      total_pages: Math.ceil(totalItems / limit) || 1,
    },
  };
};

/**
 * Moderate property status (approve, suspend, archive).
 */
export const moderateProperty = async (
  adminId,
  propertyId,
  { status, moderation_note }
) => {
  const propRes = await pool.query(
    "SELECT id, status FROM properties WHERE id = $1 LIMIT 1",
    [propertyId]
  );
  const property = propRes.rows[0];
  if (!property) {
    const error = new Error("Property not found");
    error.status = 404;
    throw error;
  }

  const updateRes = await pool.query(
    `
      UPDATE properties
      SET status = $1,
          moderation_note = $2,
          moderated_at = NOW(),
          moderated_by = $3,
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `,
    [status, moderation_note || null, adminId, propertyId]
  );

  return updateRes.rows[0];
};

/**
 * List all bookings platform-wide with administrative filters.
 */
export const getAdminBookings = async ({
  page = 1,
  limit = 10,
  status,
  payment_status,
  property_id,
  guest_id,
}) => {
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];

  if (status) {
    params.push(status);
    conditions.push(`b.status = $${params.length}`);
  }

  if (payment_status) {
    params.push(payment_status);
    conditions.push(`b.payment_status = $${params.length}`);
  }

  if (property_id) {
    params.push(property_id);
    conditions.push(`b.property_id = $${params.length}`);
  }

  if (guest_id) {
    params.push(guest_id);
    conditions.push(`b.guest_id = $${params.length}`);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRes = await pool.query(
    `SELECT COUNT(*)::int AS total FROM bookings b ${whereClause}`,
    params
  );
  const totalItems = countRes.rows[0].total;

  params.push(limit, offset);
  const listRes = await pool.query(
    `
      SELECT b.*,
             u.full_name AS guest_name,
             u.email AS guest_email,
             p.title AS property_title,
             p.city AS property_city,
             p.country AS property_country,
             host.id AS host_id,
             host.full_name AS host_name
      FROM bookings b
      JOIN users u ON b.guest_id = u.id
      JOIN properties p ON b.property_id = p.id
      JOIN users host ON p.host_id = host.id
      ${whereClause}
      ORDER BY b.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `,
    params
  );

  return {
    bookings: listRes.rows.map((row) => ({
      id: row.id,
      property_id: row.property_id,
      guest_id: row.guest_id,
      check_in_date: row.check_in_date,
      check_out_date: row.check_out_date,
      total_nights: row.total_nights,
      price_per_night: Number.parseFloat(row.price_per_night),
      total_price: Number.parseFloat(row.total_price),
      currency: row.currency,
      guests_count: row.guests_count,
      status: row.status,
      payment_status: row.payment_status,
      cancellation_reason: row.cancellation_reason,
      cancelled_at: row.cancelled_at,
      special_requests: row.special_requests,
      guest: {
        id: row.guest_id,
        name: row.guest_name,
        email: row.guest_email,
      },
      property: {
        id: row.property_id,
        title: row.property_title,
        city: row.property_city,
        country: row.property_country,
        host_id: row.host_id,
        host_name: row.host_name,
      },
      created_at: row.created_at,
      updated_at: row.updated_at,
    })),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total_items: totalItems,
      total_pages: Math.ceil(totalItems / limit) || 1,
    },
  };
};

/**
 * Administratively update booking status.
 */
export const updateAdminBookingStatus = async (bookingId, { status }) => {
  const bookingRes = await pool.query(
    "SELECT id, status FROM bookings WHERE id = $1 LIMIT 1",
    [bookingId]
  );
  const booking = bookingRes.rows[0];
  if (!booking) {
    const error = new Error("Booking not found");
    error.status = 404;
    throw error;
  }

  const updateRes = await pool.query(
    `
      UPDATE bookings
      SET status = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `,
    [status, bookingId]
  );

  return updateRes.rows[0];
};

/**
 * Administratively cancel a booking.
 */
export const cancelAdminBooking = async (
  adminId,
  bookingId,
  { cancellation_reason } = {}
) => {
  const bookingRes = await pool.query(
    "SELECT id, status FROM bookings WHERE id = $1 LIMIT 1",
    [bookingId]
  );
  const booking = bookingRes.rows[0];
  if (!booking) {
    const error = new Error("Booking not found");
    error.status = 404;
    throw error;
  }

  if (booking.status === "cancelled") {
    const error = new Error("Booking is already cancelled");
    error.status = 400;
    throw error;
  }

  const updateRes = await pool.query(
    `
      UPDATE bookings
      SET status = 'cancelled',
          cancellation_reason = $1,
          cancelled_at = NOW(),
          cancelled_by = $2,
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `,
    [
      cancellation_reason || "Cancelled by platform administrator",
      adminId,
      bookingId,
    ]
  );

  return updateRes.rows[0];
};

/**
 * List all payments platform-wide with administrative filters.
 */
export const getAdminPayments = async ({ page = 1, limit = 10, status }) => {
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];

  if (status) {
    params.push(status);
    conditions.push(`p.status = $${params.length}`);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRes = await pool.query(
    `SELECT COUNT(*)::int AS total FROM payments p ${whereClause}`,
    params
  );
  const totalItems = countRes.rows[0].total;

  params.push(limit, offset);
  const listRes = await pool.query(
    `
      SELECT p.*,
             u.full_name AS payer_name,
             u.email AS payer_email,
             b.property_id,
             prop.title AS property_title
      FROM payments p
      JOIN users u ON p.user_id = u.id
      JOIN bookings b ON p.booking_id = b.id
      JOIN properties prop ON b.property_id = prop.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `,
    params
  );

  return {
    payments: listRes.rows.map((row) => ({
      id: row.id,
      booking_id: row.booking_id,
      user_id: row.user_id,
      razorpay_order_id: row.razorpay_order_id,
      razorpay_payment_id: row.razorpay_payment_id,
      amount: Number.parseFloat(row.amount),
      currency: row.currency,
      status: row.status,
      error_code: row.error_code,
      error_description: row.error_description,
      refund_id: row.refund_id,
      refund_amount: Number.parseFloat(row.refund_amount || 0),
      refund_status: row.refund_status,
      payer: {
        id: row.user_id,
        name: row.payer_name,
        email: row.payer_email,
      },
      property: {
        id: row.property_id,
        title: row.property_title,
      },
      created_at: row.created_at,
      updated_at: row.updated_at,
    })),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total_items: totalItems,
      total_pages: Math.ceil(totalItems / limit) || 1,
    },
  };
};

/**
 * Time-based revenue reporting endpoint.
 */
export const getRevenueReport = async ({
  from_date,
  to_date,
  interval = "day",
}) => {
  const conditions = ["status IN ('captured', 'refunded')"];
  const params = [];

  if (from_date) {
    params.push(from_date);
    conditions.push(`created_at >= $${params.length}::date`);
  }

  if (to_date) {
    params.push(to_date);
    conditions.push(`created_at < ($${params.length}::date + INTERVAL '1 day')`);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const dateTruncUnit = interval === "month" ? "month" : "day";

  const reportRes = await pool.query(
    `
      SELECT
        DATE_TRUNC('${dateTruncUnit}', created_at)::date AS date_bucket,
        currency,
        COUNT(*)::int AS transaction_count,
        SUM(amount)::numeric(12, 2) AS gross_amount,
        SUM(refund_amount)::numeric(12, 2) AS refund_amount,
        (SUM(amount) - SUM(refund_amount))::numeric(12, 2) AS net_amount
      FROM payments
      ${whereClause}
      GROUP BY date_bucket, currency
      ORDER BY date_bucket DESC, currency ASC
    `,
    params
  );

  return {
    interval,
    from_date: from_date || null,
    to_date: to_date || null,
    report: reportRes.rows.map((row) => ({
      date: row.date_bucket,
      currency: row.currency,
      transaction_count: Number.parseInt(row.transaction_count, 10),
      gross_amount: Number.parseFloat(row.gross_amount),
      refund_amount: Number.parseFloat(row.refund_amount),
      net_amount: Number.parseFloat(row.net_amount),
    })),
  };
};

/**
 * List all reviews platform-wide with administrative filters.
 */
export const getAdminReviews = async ({
  page = 1,
  limit = 10,
  rating,
  property_id,
}) => {
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];

  if (rating) {
    params.push(rating);
    conditions.push(`r.rating = $${params.length}`);
  }

  if (property_id) {
    params.push(property_id);
    conditions.push(`r.property_id = $${params.length}`);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRes = await pool.query(
    `SELECT COUNT(*)::int AS total FROM reviews r ${whereClause}`,
    params
  );
  const totalItems = countRes.rows[0].total;

  params.push(limit, offset);
  const listRes = await pool.query(
    `
      SELECT r.*,
             u.full_name AS author_name,
             u.email AS author_email,
             p.title AS property_title
      FROM reviews r
      JOIN users u ON r.guest_id = u.id
      JOIN properties p ON r.property_id = p.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `,
    params
  );

  return {
    reviews: listRes.rows.map((row) => ({
      id: row.id,
      booking_id: row.booking_id,
      property_id: row.property_id,
      guest_id: row.guest_id,
      rating: Number.parseInt(row.rating, 10),
      title: row.title,
      comment: row.comment,
      author: {
        id: row.guest_id,
        name: row.author_name,
        email: row.author_email,
      },
      property: {
        id: row.property_id,
        title: row.property_title,
      },
      created_at: row.created_at,
      updated_at: row.updated_at,
    })),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total_items: totalItems,
      total_pages: Math.ceil(totalItems / limit) || 1,
    },
  };
};

/**
 * Administratively delete a review (reusing review service to ensure rating re-aggregation).
 */
export const deleteAdminReview = async (adminUser, reviewId) => {
  return await deleteReview(adminUser, reviewId);
};

export default {
  getDashboardStats,
  getAdminProperties,
  moderateProperty,
  getAdminBookings,
  updateAdminBookingStatus,
  cancelAdminBooking,
  getAdminPayments,
  getRevenueReport,
  getAdminReviews,
  deleteAdminReview,
};
