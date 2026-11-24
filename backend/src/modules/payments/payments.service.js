import pool from "../../database/pool.js";
import { env } from "../../config/env.js";
import {
  createRazorpayOrder,
  processRazorpayRefund,
  verifyRazorpaySignature,
  verifyWebhookSignature,
} from "../../config/razorpay.js";

const PAYMENT_COLUMNS = [
  "id",
  "booking_id",
  "user_id",
  "razorpay_order_id",
  "razorpay_payment_id",
  "razorpay_signature",
  "amount",
  "currency",
  "status",
  "error_code",
  "error_description",
  "refund_id",
  "refund_amount",
  "refund_status",
  "created_at",
  "updated_at",
];

const SELECT_PAYMENT_SQL = PAYMENT_COLUMNS.map((col) => `p.${col}`).join(", ");

const formatPaymentRow = (row) => {
  if (!row) return null;

  const payment = {
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
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  if (row.booking_total_price !== undefined) {
    payment.booking = {
      id: row.booking_id,
      total_price: Number.parseFloat(row.booking_total_price),
      currency: row.booking_currency,
      status: row.booking_status,
      payment_status: row.booking_payment_status,
      check_in_date: row.booking_check_in_date,
      check_out_date: row.booking_check_out_date,
      property_id: row.booking_property_id,
    };
  }

  return payment;
};

/**
 * Create a new payment order for a booking.
 */
export const createPaymentOrder = async (userId, { booking_id }) => {
  // 1. Verify user exists and is active
  const userRes = await pool.query(
    "SELECT id, account_status FROM users WHERE id = $1 LIMIT 1",
    [userId]
  );
  const user = userRes.rows[0];
  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }
  if (user.account_status === "suspended") {
    const error = new Error("Your account has been suspended");
    error.status = 403;
    throw error;
  }

  // 2. Fetch booking details
  const bookingRes = await pool.query(
    `
      SELECT b.id, b.guest_id, b.property_id, b.total_price, b.currency,
             b.status, b.payment_status, p.title AS property_title
      FROM bookings b
      JOIN properties p ON b.property_id = p.id
      WHERE b.id = $1
      LIMIT 1
    `,
    [booking_id]
  );

  const booking = bookingRes.rows[0];
  if (!booking) {
    const error = new Error("Booking not found");
    error.status = 404;
    throw error;
  }

  // Check ownership: user must be the guest who created the booking (or admin)
  const isAdmin = user.role === "admin";
  if (booking.guest_id !== userId && !isAdmin) {
    const error = new Error("You are not authorized to pay for this booking");
    error.status = 403;
    throw error;
  }

  if (booking.status === "cancelled") {
    const error = new Error("Cannot make payment for a cancelled booking");
    error.status = 400;
    throw error;
  }

  if (booking.payment_status === "paid") {
    const error = new Error("This booking has already been paid for");
    error.status = 400;
    throw error;
  }

  const amount = Number.parseFloat(booking.total_price);
  const currency = booking.currency === "USD" ? "USD" : "INR";
  const amountSubunit = Math.round(amount * 100);

  // 3. Create Razorpay order
  const rzpOrder = await createRazorpayOrder({
    amount: amountSubunit,
    currency,
    receipt: booking.id,
    notes: {
      booking_id: booking.id,
      guest_id: userId,
    },
  });

  // 4. Save payment transaction record
  const insertRes = await pool.query(
    `
      INSERT INTO payments (
        booking_id, user_id, razorpay_order_id, amount, currency, status
      )
      VALUES ($1, $2, $3, $4, $5, 'created')
      RETURNING *
    `,
    [booking.id, userId, rzpOrder.id, amount, currency]
  );

  const paymentRecord = formatPaymentRow(insertRes.rows[0]);

  return {
    payment: paymentRecord,
    order: {
      id: rzpOrder.id,
      amount,
      amount_subunit: amountSubunit,
      currency,
      receipt: booking.id,
      key_id: env.RAZORPAY_KEY_ID, // Safe public key for Razorpay Checkout
    },
  };
};

/**
 * Verify payment signature and capture payment transaction.
 */
export const verifyPayment = async (
  userId,
  { razorpay_order_id, razorpay_payment_id, razorpay_signature }
) => {
  // 1. Fetch payment by order ID
  const paymentRes = await pool.query(
    `
      SELECT p.*, b.status AS booking_status, b.payment_status AS booking_payment_status,
             b.guest_id AS booking_guest_id
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      WHERE p.razorpay_order_id = $1
      LIMIT 1
    `,
    [razorpay_order_id]
  );

  const payment = paymentRes.rows[0];
  if (!payment) {
    const error = new Error("Payment record for this order ID was not found");
    error.status = 404;
    throw error;
  }

  if (payment.user_id !== userId) {
    const error = new Error("You are not authorized to verify this payment");
    error.status = 403;
    throw error;
  }

  if (payment.status === "captured") {
    return {
      payment: formatPaymentRow(payment),
      message: "Payment has already been verified and captured",
    };
  }

  // 2. Cryptographic signature verification
  const isValidSignature = verifyRazorpaySignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
    secret: env.RAZORPAY_KEY_SECRET,
  });

  if (!isValidSignature) {
    // Record signature verification failure
    await pool.query(
      `
        UPDATE payments
        SET status = 'failed',
            error_code = 'SIGNATURE_VERIFICATION_FAILED',
            error_description = 'Payment signature does not match expected HMAC signature',
            updated_at = NOW()
        WHERE id = $1
      `,
      [payment.id]
    );

    await pool.query(
      "UPDATE bookings SET payment_status = 'failed', updated_at = NOW() WHERE id = $1",
      [payment.booking_id]
    );

    const error = new Error("Payment signature verification failed");
    error.status = 400;
    throw error;
  }

  // 3. Signature is valid -> execute transaction to update payment and booking atomically
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const updatedPaymentRes = await client.query(
      `
        UPDATE payments
        SET status = 'captured',
            razorpay_payment_id = $1,
            razorpay_signature = $2,
            error_code = NULL,
            error_description = NULL,
            updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `,
      [razorpay_payment_id, razorpay_signature, payment.id]
    );

    const updatedBookingRes = await client.query(
      `
        UPDATE bookings
        SET payment_status = 'paid',
            status = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [payment.booking_id]
    );

    await client.query("COMMIT");

    return {
      payment: formatPaymentRow(updatedPaymentRes.rows[0]),
      booking: updatedBookingRes.rows[0],
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Handle payment failure safely.
 */
export const recordPaymentFailure = async (
  userId,
  { razorpay_order_id, error_code, error_description }
) => {
  const paymentRes = await pool.query(
    "SELECT * FROM payments WHERE razorpay_order_id = $1 LIMIT 1",
    [razorpay_order_id]
  );

  const payment = paymentRes.rows[0];
  if (!payment) {
    const error = new Error("Payment record not found for this order ID");
    error.status = 404;
    throw error;
  }

  if (payment.user_id !== userId) {
    const error = new Error("You are not authorized to update this payment");
    error.status = 403;
    throw error;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const updatedPaymentRes = await client.query(
      `
        UPDATE payments
        SET status = 'failed',
            error_code = $1,
            error_description = $2,
            updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `,
      [
        error_code || "PAYMENT_FAILED",
        error_description || "Payment was declined or cancelled by the user",
        payment.id,
      ]
    );

    await client.query(
      "UPDATE bookings SET payment_status = 'failed', updated_at = NOW() WHERE id = $1",
      [payment.booking_id]
    );

    await client.query("COMMIT");

    return formatPaymentRow(updatedPaymentRes.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Process a refund workflow hook for a captured payment.
 */
export const processRefund = async (user, paymentId, { amount, reason } = {}) => {
  // 1. Fetch payment with booking and property ownership
  const paymentRes = await pool.query(
    `
      SELECT p.*, b.status AS booking_status, b.guest_id, b.property_id,
             prop.host_id
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN properties prop ON b.property_id = prop.id
      WHERE p.id = $1
      LIMIT 1
    `,
    [paymentId]
  );

  const payment = paymentRes.rows[0];
  if (!payment) {
    const error = new Error("Payment transaction not found");
    error.status = 404;
    throw error;
  }

  // Authorization: Admin, Property Host, or Guest (if booking cancelled)
  const isAdmin = user.role === "admin";
  const isHost = payment.host_id === user.id;
  const isGuest = payment.guest_id === user.id;

  if (!isAdmin && !isHost && (!isGuest || payment.booking_status !== "cancelled")) {
    const error = new Error(
      "You are not authorized to request a refund for this payment"
    );
    error.status = 403;
    throw error;
  }

  if (payment.status === "refunded") {
    const error = new Error("This payment has already been fully refunded");
    error.status = 400;
    throw error;
  }

  if (payment.status !== "captured") {
    const error = new Error(
      `Cannot refund a payment with status '${payment.status}'. Only captured payments can be refunded.`
    );
    error.status = 400;
    throw error;
  }

  const originalAmount = Number.parseFloat(payment.amount);
  const alreadyRefunded = Number.parseFloat(payment.refund_amount || 0);
  const maxRefundable = Number((originalAmount - alreadyRefunded).toFixed(2));

  if (maxRefundable <= 0) {
    const error = new Error("This payment has already been fully refunded");
    error.status = 400;
    throw error;
  }

  const refundAmount = amount !== undefined ? Number(amount) : maxRefundable;

  if (refundAmount <= 0) {
    const error = new Error("Refund amount must be greater than zero");
    error.status = 400;
    throw error;
  }

  if (refundAmount > maxRefundable) {
    const error = new Error(
      `Requested refund amount (${refundAmount}) exceeds maximum refundable balance (${maxRefundable})`
    );
    error.status = 400;
    throw error;
  }

  // 2. Call Razorpay refund API
  const amountSubunit = Math.round(refundAmount * 100);
  const rzpRefund = await processRazorpayRefund(payment.razorpay_payment_id, {
    amount: amountSubunit,
    notes: {
      reason: reason || "User requested refund",
      payment_id: payment.id,
      booking_id: payment.booking_id,
    },
  });

  // 3. Atomically update payment and booking
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const newTotalRefund = Number((alreadyRefunded + refundAmount).toFixed(2));
    const isFullyRefunded = newTotalRefund >= originalAmount;

    const updatedPaymentRes = await client.query(
      `
        UPDATE payments
        SET refund_id = $1,
            refund_amount = $2,
            refund_status = 'processed',
            status = $3,
            updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `,
      [
        rzpRefund.id,
        newTotalRefund,
        isFullyRefunded ? "refunded" : "captured",
        payment.id,
      ]
    );

    await client.query(
      `
        UPDATE bookings
        SET payment_status = $1,
            updated_at = NOW()
        WHERE id = $2
      `,
      [isFullyRefunded ? "refunded" : "paid", payment.booking_id]
    );

    await client.query("COMMIT");

    return {
      payment: formatPaymentRow(updatedPaymentRes.rows[0]),
      refund: {
        id: rzpRefund.id,
        amount: refundAmount,
        currency: payment.currency,
        status: "processed",
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
 * Get payment details by ID with ownership authorization.
 */
export const getPaymentById = async (user, paymentId) => {
  const paymentRes = await pool.query(
    `
      SELECT ${SELECT_PAYMENT_SQL},
             b.total_price AS booking_total_price,
             b.currency AS booking_currency,
             b.status AS booking_status,
             b.payment_status AS booking_payment_status,
             b.check_in_date AS booking_check_in_date,
             b.check_out_date AS booking_check_out_date,
             b.property_id AS booking_property_id,
             prop.host_id AS property_host_id
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN properties prop ON b.property_id = prop.id
      WHERE p.id = $1
      LIMIT 1
    `,
    [paymentId]
  );

  const payment = paymentRes.rows[0];
  if (!payment) {
    const error = new Error("Payment transaction not found");
    error.status = 404;
    throw error;
  }

  // Authorization: Payer, Property Host, or Admin
  const isPayer = payment.user_id === user.id;
  const isHost = payment.property_host_id === user.id;
  const isAdmin = user.role === "admin";

  if (!isPayer && !isHost && !isAdmin) {
    const error = new Error("You are not authorized to view this payment");
    error.status = 403;
    throw error;
  }

  return formatPaymentRow(payment);
};

/**
 * Get payment records for a specific booking.
 */
export const getPaymentsByBookingId = async (user, bookingId) => {
  const bookingRes = await pool.query(
    `
      SELECT b.id, b.guest_id, prop.host_id
      FROM bookings b
      JOIN properties prop ON b.property_id = prop.id
      WHERE b.id = $1
      LIMIT 1
    `,
    [bookingId]
  );

  const booking = bookingRes.rows[0];
  if (!booking) {
    const error = new Error("Booking not found");
    error.status = 404;
    throw error;
  }

  const isGuest = booking.guest_id === user.id;
  const isHost = booking.host_id === user.id;
  const isAdmin = user.role === "admin";

  if (!isGuest && !isHost && !isAdmin) {
    const error = new Error(
      "You are not authorized to view payments for this booking"
    );
    error.status = 403;
    throw error;
  }

  const paymentsRes = await pool.query(
    `
      SELECT ${SELECT_PAYMENT_SQL}
      FROM payments p
      WHERE p.booking_id = $1
      ORDER BY p.created_at DESC
    `,
    [bookingId]
  );

  return paymentsRes.rows.map(formatPaymentRow);
};

/**
 * Get paginated payments made by the authenticated user.
 */
export const getMyPayments = async (userId, { page = 1, limit = 10, status }) => {
  const offset = (page - 1) * limit;
  const params = [userId];
  const conditions = ["p.user_id = $1"];

  if (status) {
    params.push(status);
    conditions.push(`p.status = $${params.length}`);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  const countRes = await pool.query(
    `SELECT COUNT(*)::int AS total FROM payments p ${whereClause}`,
    params
  );
  const total = countRes.rows[0].total;

  params.push(limit, offset);
  const listRes = await pool.query(
    `
      SELECT ${SELECT_PAYMENT_SQL},
             b.total_price AS booking_total_price,
             b.currency AS booking_currency,
             b.status AS booking_status,
             b.payment_status AS booking_payment_status,
             b.check_in_date AS booking_check_in_date,
             b.check_out_date AS booking_check_out_date,
             b.property_id AS booking_property_id
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `,
    params
  );

  return {
    payments: listRes.rows.map(formatPaymentRow),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total_items: total,
      total_pages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Handle incoming Razorpay Webhook safely.
 */
export const handleWebhook = async (rawPayload, signature) => {
  const isValid = verifyWebhookSignature({
    payload: rawPayload,
    signature,
    secret: env.RAZORPAY_WEBHOOK_SECRET,
  });

  if (!isValid) {
    const error = new Error("Invalid webhook signature");
    error.status = 400;
    throw error;
  }

  const event =
    typeof rawPayload === "string" ? JSON.parse(rawPayload) : rawPayload;
  const eventType = event.event;

  if (eventType === "payment.captured") {
    const paymentEntity = event.payload?.payment?.entity;
    if (paymentEntity) {
      await pool.query(
        `
          UPDATE payments
          SET status = 'captured',
              razorpay_payment_id = $1,
              updated_at = NOW()
          WHERE razorpay_order_id = $2
        `,
        [paymentEntity.id, paymentEntity.order_id]
      );
    }
  } else if (eventType === "payment.failed") {
    const paymentEntity = event.payload?.payment?.entity;
    if (paymentEntity) {
      await pool.query(
        `
          UPDATE payments
          SET status = 'failed',
              error_code = $1,
              error_description = $2,
              updated_at = NOW()
          WHERE razorpay_order_id = $3
        `,
        [
          paymentEntity.error_code || "FAILED",
          paymentEntity.error_description || "Payment failed",
          paymentEntity.order_id,
        ]
      );
    }
  }

  return { received: true, event: eventType };
};

export default {
  createPaymentOrder,
  verifyPayment,
  recordPaymentFailure,
  processRefund,
  getPaymentById,
  getPaymentsByBookingId,
  getMyPayments,
  handleWebhook,
};
