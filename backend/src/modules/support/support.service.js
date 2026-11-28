import pool from "../../database/pool.js";

export const createSupportTicketService = async (user, payload) => {
  if (payload.booking_id) {
    const bookingRes = await pool.query(
      "SELECT id, guest_id FROM bookings WHERE id = $1 LIMIT 1",
      [payload.booking_id]
    );
    const booking = bookingRes.rows[0];
    if (!booking) {
      const error = new Error("Referenced booking not found");
      error.status = 404;
      throw error;
    }
    if (booking.guest_id !== user.id && user.role !== "admin") {
      const error = new Error("You cannot open a support ticket for another guest's booking");
      error.status = 403;
      throw error;
    }
  }

  const res = await pool.query(
    `
      INSERT INTO support_tickets (
        user_id, booking_id, category, priority, subject, message, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'open')
      RETURNING *
    `,
    [
      user.id,
      payload.booking_id || null,
      payload.category,
      payload.priority,
      payload.subject.trim(),
      payload.message.trim(),
    ]
  );

  return { ticket: res.rows[0] };
};

export const listMySupportTicketsService = async (
  userId,
  { page = 1, limit = 20, status } = {}
) => {
  const params = [userId];
  const conditions = ["st.user_id = $1"];

  if (status) {
    params.push(status);
    conditions.push(`st.status = $${params.length}`);
  }

  const whereSql = `WHERE ${conditions.join(" AND ")}`;
  const countRes = await pool.query(
    `SELECT COUNT(*)::int AS total FROM support_tickets st ${whereSql}`,
    params
  );
  const total = countRes.rows[0].total;

  const offset = (page - 1) * limit;
  const listRes = await pool.query(
    `
      SELECT
        st.*,
        b.booking_reference,
        p.title AS property_title
      FROM support_tickets st
      LEFT JOIN bookings b ON st.booking_id = b.id
      LEFT JOIN properties p ON b.property_id = p.id
      ${whereSql}
      ORDER BY st.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `,
    [...params, limit, offset]
  );

  return {
    tickets: listRes.rows,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total_items: total,
      total_pages: Math.ceil(total / limit) || 1,
    },
  };
};
